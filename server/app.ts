/**
 * Our API server. The React app calls these routes, never Adzuna, O*NET, or the database directly:
 *   GET    /api/applications                  -> Application[] (newest first)
 *   POST   /api/applications                  -> 201 Application, or 400 { errors: {field: message} }
 *   PATCH  /api/applications/:id/status       -> Application, or 400 / 404 { error }
 *   DELETE /api/applications/:id              -> 204, or 404 { error }
 *   GET    /api/jobs?what=...&where=...&page=1 -> JobSearchResponse
 *   GET    /api/careers?keyword=...           -> CareerSearchResponse
 *   GET    /api/colleges, /api/programs[?college&type&search], /api/programs/:id
 *   GET    /api/courses[?prefix=ECON], /api/courses/:code   -> course catalog (read-only)
 *   GET    /api/health                        -> which services are configured (no secrets)
 *
 * Express 5 passes errors from async handlers to the error handler at the bottom.
 */
import express, { type NextFunction, type Request, type Response } from 'express'
import type { ApiErrorBody, CareerSearchResponse, JobSearchResponse } from '../shared/api'
import { searchAdzuna } from './adzuna'
import {
  createApplication,
  deleteApplication,
  listApplications,
  NotFoundError,
  toApplicationInput,
  updateApplicationStatus,
  ValidationError,
} from './applicationRepository'
import { CatalogNotFoundError, getCourse, getProgram, listColleges, listCourses, listPrograms } from './catalogRepository'
import { TtlCache } from './cache'
import { ApiError, isConfigured } from './errors'
import { searchOnet } from './onet'

export interface AppConfig {
  adzunaAppId?: string
  adzunaAppKey?: string
  adzunaCountry?: string
  onetApiKey?: string
  /** Swappable so tests can fake Adzuna / O*NET without real calls. */
  fetchImpl?: typeof fetch
  /** Swappable clock so tests can check cache expiry. */
  now?: () => number
}

export const MAX_QUERY_LENGTH = 100
const MAX_PAGE = 50
const JOBS_TTL_MS = 10 * 60 * 1000 // 10 minutes: listings change often
const CAREERS_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours: O*NET updates quarterly

/** Reads a text query parameter, trimmed. Throws bad_request if required and missing, or too long. */
function readText(req: Request, name: string, label: string, required: boolean): string {
  const raw = req.query[name]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (required && !value) throw new ApiError('bad_request', `Please enter ${label}.`)
  if (value.length > MAX_QUERY_LENGTH) {
    throw new ApiError('bad_request', `${label[0].toUpperCase()}${label.slice(1)} must be ${MAX_QUERY_LENGTH} characters or fewer.`)
  }
  return value
}

function readPage(req: Request): number {
  const page = Number(req.query.page ?? 1)
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new ApiError('bad_request', `Page must be a whole number from 1 to ${MAX_PAGE}.`)
  }
  return page
}

export function createApp(config: AppConfig = {}) {
  const fetchImpl = config.fetchImpl ?? fetch
  const jobsCache = new TtlCache<JobSearchResponse>(JOBS_TTL_MS, 200, config.now)
  const careersCache = new TtlCache<CareerSearchResponse>(CAREERS_TTL_MS, 200, config.now)

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      adzunaConfigured: isConfigured(config.adzunaAppId) && isConfigured(config.adzunaAppKey),
      onetConfigured: isConfigured(config.onetApiKey),
    })
  })

  // ---- Job applications (database) ----

  app.get('/api/applications', async (_req, res) => {
    res.json(await listApplications())
  })

  app.post('/api/applications', async (req, res) => {
    const created = await createApplication(toApplicationInput(req.body))
    res.status(201).json(created)
  })

  app.patch('/api/applications/:id/status', async (req, res) => {
    res.json(await updateApplicationStatus(req.params.id, req.body?.status))
  })

  // 204 No Content = deleted. 404 if the id does not exist.
  app.delete('/api/applications/:id', async (req, res) => {
    await deleteApplication(req.params.id)
    res.status(204).end()
  })

  // ---- Course catalog (read-only) ----

  app.get('/api/colleges', async (_req, res) => {
    res.json(await listColleges())
  })

  // Optional filters: /api/programs?college=CCI&type=Major&search=computer
  app.get('/api/programs', async (req, res) => {
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    res.json(await listPrograms({ college: text(req.query.college), type: text(req.query.type), search: text(req.query.search) }))
  })

  app.get('/api/programs/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return void res.status(400).json({ error: 'Program id must be a number.' })
    res.json(await getProgram(id))
  })

  // All courses, or one subject: /api/courses?prefix=ECON
  app.get('/api/courses', async (req, res) => {
    const prefix = typeof req.query.prefix === 'string' && req.query.prefix.trim() ? req.query.prefix.trim() : undefined
    res.json(await listCourses(prefix))
  })

  app.get('/api/courses/:code', async (req, res) => {
    res.json(await getCourse(req.params.code))
  })

  // ---- Find Jobs (Adzuna) ----

  app.get('/api/jobs', async (req, res) => {
    const what = readText(req, 'what', 'a job title or keyword', true)
    const where = readText(req, 'where', 'a location', false)
    const page = readPage(req)

    const { adzunaAppId: appId, adzunaAppKey: appKey } = config
    if (!isConfigured(appId) || !isConfigured(appKey)) {
      throw new ApiError('not_configured', 'Adzuna keys are missing from the server .env file.')
    }

    const key = `${what.toLowerCase()}|${where.toLowerCase()}|${page}`
    const cached = jobsCache.get(key)
    if (cached) {
      res.set('X-Cache', 'HIT').json(cached)
      return
    }
    const result = await searchAdzuna(
      { what, where, page },
      { appId, appKey, country: config.adzunaCountry || 'us', fetchImpl },
    )
    jobsCache.set(key, result)
    res.set('X-Cache', 'MISS').json(result)
  })

  // ---- Explore Careers (O*NET) ----

  app.get('/api/careers', async (req, res) => {
    const keyword = readText(req, 'keyword', 'a major, interest, or keyword', true)

    const apiKey = config.onetApiKey
    if (!isConfigured(apiKey)) {
      throw new ApiError('not_configured', 'The O*NET key is missing from the server .env file.')
    }

    const key = keyword.toLowerCase()
    const cached = careersCache.get(key)
    if (cached) {
      res.set('X-Cache', 'HIT').json(cached)
      return
    }
    const result = await searchOnet(keyword, { apiKey, fetchImpl })
    careersCache.set(key, result)
    res.set('X-Cache', 'MISS').json(result)
  })

  // Any other /api address
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'bad_request', message: 'Unknown API route.' } } satisfies ApiErrorBody)
  })

  // Turn every error into a JSON reply the React app understands.
  // Application routes reply { error: "message" } or { errors: {...} }; jobs/careers reply ApiErrorBody.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) return void res.status(400).json({ errors: err.errors })
    if (err instanceof NotFoundError || err instanceof CatalogNotFoundError) return void res.status(404).json({ error: err.message })
    if (err instanceof SyntaxError) return void res.status(400).json({ error: 'Request body must be valid JSON.' })
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } } satisfies ApiErrorBody)
      return
    }
    // Unexpected bug: log a short note (never the request URL, which could contain keys).
    console.error('Unexpected server error:', err instanceof Error ? err.name : typeof err)
    // The app's own data routes (applications, catalog) reply { error: "message" }.
    if (/^\/api\/(applications|colleges|programs|courses)/.test(req.path)) {
      res.status(500).json({ error: 'Something went wrong on the server.' })
      return
    }
    res.status(500).json({ error: { code: 'upstream', message: 'Something went wrong on our server.' } } satisfies ApiErrorBody)
  })

  return app
}
