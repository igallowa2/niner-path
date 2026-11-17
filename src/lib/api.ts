/**
 * Calls OUR server (/api/...). The browser never talks to Adzuna or O*NET
 * directly and never sees any API key.
 */
import type { ApiErrorBody, ApiErrorCode, CareerSearchResponse, JobSearchResponse } from '../../shared/api'

/** Server error codes, plus 'offline' for when our own server can't be reached. */
export type ClientErrorCode = ApiErrorCode | 'offline'

const FRIENDLY: Record<ClientErrorCode, string> = {
  bad_request: 'Please check your search and try again.',
  not_configured: "Search isn't set up yet: the API keys are missing from the server's .env file.",
  bad_key: 'The job or career service rejected our API key. Ask the team to check the keys in .env.',
  rate_limited: "We've hit the free search limit for now. Please wait a minute and try again.",
  network: "The job or career service didn't respond. Please try again in a moment.",
  upstream: 'Something went wrong on the job or career service. Please try again.',
  offline: "Can't reach the Niner Path server. Check your internet connection and make sure the server is running.",
}

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode
  constructor(code: ClientErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/** A message that is safe and friendly to show to a student. */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    // Input problems: the server's message says exactly what to fix.
    return err.code === 'bad_request' && err.message ? err.message : FRIENDLY[err.code]
  }
  return FRIENDLY.upstream
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ''))
  let res: Response
  try {
    res = await fetch(`${path}?${query}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiRequestError('offline', FRIENDLY.offline)
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Not JSON: usually the dev proxy saying our server isn't running.
  }

  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error
    if (error?.code) throw new ApiRequestError(error.code, error.message)
    throw new ApiRequestError(res.status === 429 ? 'rate_limited' : 'offline', FRIENDLY.offline)
  }
  if (body === null) throw new ApiRequestError('upstream', FRIENDLY.upstream)
  return body as T
}

export function searchJobs(what: string, where: string, page = 1): Promise<JobSearchResponse> {
  return getJson<JobSearchResponse>('/api/jobs', { what, where, page: String(page) })
}

export function searchCareers(keyword: string): Promise<CareerSearchResponse> {
  return getJson<CareerSearchResponse>('/api/careers', { keyword })
}
