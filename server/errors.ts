import type { ApiErrorCode } from '../shared/api'

/** HTTP status our server sends to the browser for each error code. */
const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  not_configured: 503,
  bad_key: 502,
  rate_limited: 429,
  network: 504,
  upstream: 502,
}

/**
 * An error we expect and know how to explain.
 * Messages must never contain API keys or full upstream URLs (Adzuna's URL contains the key).
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.code = code
    this.status = STATUS[code]
  }
}

/** Turns an HTTP status from Adzuna / O*NET into one of our error codes. */
export function errorFromUpstreamStatus(service: string, status: number): ApiError {
  if (status === 401 || status === 403) return new ApiError('bad_key', `${service} rejected the API key.`)
  if (status === 429) return new ApiError('rate_limited', `${service} rate limit reached.`)
  return new ApiError('upstream', `${service} returned an error (HTTP ${status}).`)
}

/** Calls fetch, but gives up after a timeout and converts network failures into an ApiError. */
export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  service: string,
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch {
    throw new ApiError('network', `${service} did not respond.`)
  }
}

/** True if a key is filled in (not empty and not the .env.example placeholder). */
export function isConfigured(value: string | undefined): value is string {
  return !!value && value.trim() !== '' && !value.startsWith('your-')
}
