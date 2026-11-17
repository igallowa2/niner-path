import express, { type NextFunction, type Request, type Response } from 'express'
import {
  createApplication,
  listApplications,
  NotFoundError,
  toApplicationInput,
  updateApplicationStatus,
  ValidationError,
} from './applicationRepository'
import { CatalogNotFoundError, getCourse, getProgram, listColleges, listCourses, listPrograms } from './catalogRepository'

/** Builds the REST API. Express 5 passes errors from async handlers to the error handler below. */
export function createApp() {
  const app = express()
  app.use(express.json())

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

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) return void res.status(400).json({ errors: err.errors })
    if (err instanceof NotFoundError || err instanceof CatalogNotFoundError) return void res.status(404).json({ error: err.message })
    if (err instanceof SyntaxError) return void res.status(400).json({ error: 'Request body must be valid JSON.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on the server.' })
  })

  return app
}
