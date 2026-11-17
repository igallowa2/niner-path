/**
 * O*NET Web Services (API v2) career search.
 * Docs: https://services.onetcenter.org/reference/online/search
 * Endpoint: GET https://api-v2.onetcenter.org/online/search?keyword=...&start=1&end=20
 * Auth: X-API-Key header.
 */
import type { Career, CareerSearchResponse } from '../shared/api'
import { ApiError, errorFromUpstreamStatus, fetchWithTimeout } from './errors'

/** The parts of O*NET's raw reply that we use. */
export interface OnetOccupationRaw {
  code: string
  title: string
  href?: string
  tags?: { bright_outlook?: boolean }
}

export interface OnetSearchRaw {
  start?: number
  end?: number
  total?: number
  occupation?: OnetOccupationRaw[]
}

export interface OnetConfig {
  apiKey: string
  fetchImpl: typeof fetch
}

export const MAX_CAREERS = 20

export function normalizeCareer(raw: OnetOccupationRaw): Career {
  return { code: raw.code, title: raw.title, brightOutlook: raw.tags?.bright_outlook === true }
}

export async function searchOnet(keyword: string, config: OnetConfig): Promise<CareerSearchResponse> {
  const url = new URL('https://api-v2.onetcenter.org/online/search')
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('start', '1')
  url.searchParams.set('end', String(MAX_CAREERS))

  const res = await fetchWithTimeout(config.fetchImpl, 'O*NET', url.toString(), {
    headers: { 'X-API-Key': config.apiKey, Accept: 'application/json' },
  })

  // O*NET uses 422 for "no data for this request"; treat it as no results, not a failure.
  if (res.status === 422) return { careers: [], total: 0 }
  if (!res.ok) throw errorFromUpstreamStatus('O*NET', res.status)

  let body: OnetSearchRaw
  try {
    body = (await res.json()) as OnetSearchRaw
  } catch {
    throw new ApiError('upstream', 'O*NET sent a reply we could not read.')
  }

  const careers = (body.occupation ?? []).map(normalizeCareer)
  return { careers, total: body.total ?? careers.length }
}
