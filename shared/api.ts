/**
 * Data shapes shared by our server (server/) and the React app (src/).
 *
 * The server calls Adzuna and O*NET, then converts their replies into these
 * simpler shapes. The browser only ever sees these, never the raw replies or keys.
 */

/** One job listing (simplified from Adzuna). */
export interface JobListing {
  id: string
  title: string
  company: string
  location: string
  /** e.g. "IT Jobs"; '' if unknown */
  category: string
  /** 'full_time' | 'part_time' | null */
  contractTime: string | null
  salaryMin: number | null
  salaryMax: number | null
  /** Adzuna's link to the posting */
  url: string
  /** ISO date the job was posted */
  created: string
  /** Short plain-text preview of the description */
  snippet: string
}

export interface JobSearchResponse {
  jobs: JobListing[]
  /** Total matches Adzuna reports (may be larger than jobs.length) */
  total: number
  page: number
}

/** One career (occupation) from O*NET. */
export interface Career {
  /** O*NET-SOC code, e.g. "15-2051.00" */
  code: string
  title: string
  /** O*NET's "Bright Outlook" tag: growing fast or many openings expected */
  brightOutlook: boolean
}

export interface CareerSearchResponse {
  careers: Career[]
  total: number
}

/** Error codes our server can send back. */
export type ApiErrorCode =
  | 'bad_request' // missing or too-long search text
  | 'not_configured' // API keys missing from the server's .env
  | 'bad_key' // Adzuna / O*NET rejected the key
  | 'rate_limited' // too many requests to Adzuna / O*NET
  | 'network' // Adzuna / O*NET did not respond in time
  | 'upstream' // Adzuna / O*NET had some other problem

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string }
}
