export const STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const
export type Status = (typeof STATUSES)[number]

export const JOB_TYPES = ['Internship', 'Co-op', 'Part-time', 'Full-time'] as const
export type JobType = (typeof JOB_TYPES)[number]

export interface TimelineEntry {
  status: Status
  date: string // YYYY-MM-DD
}

export interface Application {
  id: string
  company: string
  role: string
  location: string
  jobType: JobType
  industry: string
  deadline: string // YYYY-MM-DD or ''
  status: Status
  postingUrl: string
  timeline: TimelineEntry[]
}

/** What the Add Application form collects (no id or timeline yet). */
export type ApplicationInput = Omit<Application, 'id' | 'timeline'>
