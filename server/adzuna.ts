/**
 * Adzuna job search.
 * Docs: https://developer.adzuna.com/docs/search
 * Endpoint: GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
 * Auth: app_id and app_key as query parameters. That's why this must run on the server.
 */
import type { JobListing, JobSearchResponse } from '../shared/api'
import { ApiError, errorFromUpstreamStatus, fetchWithTimeout } from './errors'

/** The parts of Adzuna's raw reply that we use. */
export interface AdzunaJobRaw {
  id: string | number
  title?: string
  description?: string
  redirect_url?: string
  created?: string
  contract_time?: string
  salary_min?: number
  salary_max?: number
  company?: { display_name?: string }
  location?: { display_name?: string }
  category?: { label?: string }
}

export interface AdzunaSearchRaw {
  count?: number
  results?: AdzunaJobRaw[]
}

export interface AdzunaConfig {
  appId: string
  appKey: string
  country: string
  fetchImpl: typeof fetch
}

export interface JobQuery {
  what: string
  where: string
  page: number
}

export const RESULTS_PER_PAGE = 20

/** Removes HTML tags and extra spaces (Adzuna snippets sometimes include <strong> etc.). */
export function toPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Only keep http(s) links, so a bad value can never become a javascript: link in the UI. */
function safeUrl(value: string | undefined): string {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function normalizeJob(raw: AdzunaJobRaw): JobListing {
  return {
    id: String(raw.id),
    title: toPlainText(raw.title ?? 'Untitled job'),
    company: raw.company?.display_name?.trim() || 'Company not listed',
    location: raw.location?.display_name?.trim() || '',
    category: raw.category?.label?.trim() || '',
    contractTime: raw.contract_time ?? null,
    salaryMin: typeof raw.salary_min === 'number' ? raw.salary_min : null,
    salaryMax: typeof raw.salary_max === 'number' ? raw.salary_max : null,
    url: safeUrl(raw.redirect_url),
    created: raw.created ?? '',
    snippet: toPlainText(raw.description ?? ''),
  }
}

export async function searchAdzuna(query: JobQuery, config: AdzunaConfig): Promise<JobSearchResponse> {
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(config.country)}/search/${query.page}`,
  )
  url.searchParams.set('app_id', config.appId)
  url.searchParams.set('app_key', config.appKey)
  url.searchParams.set('results_per_page', String(RESULTS_PER_PAGE))
  url.searchParams.set('what', query.what)
  if (query.where) url.searchParams.set('where', query.where)
  url.searchParams.set('content-type', 'application/json')

  const res = await fetchWithTimeout(config.fetchImpl, 'Adzuna', url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw errorFromUpstreamStatus('Adzuna', res.status)

  let body: AdzunaSearchRaw
  try {
    body = (await res.json()) as AdzunaSearchRaw
  } catch {
    throw new ApiError('upstream', 'Adzuna sent a reply we could not read.')
  }

  const jobs = (body.results ?? []).map(normalizeJob)
  return { jobs, total: body.count ?? jobs.length, page: query.page }
}
