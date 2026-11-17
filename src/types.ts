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

// ---- Course catalog ----

export const PROGRAM_TYPES = ['Major', 'Minor', 'Certificate', 'Honors', 'Early Entry', 'Other'] as const
export type ProgramType = (typeof PROGRAM_TYPES)[number]

/**
 * ALL    = take every course in the group (courses sharing a slot are "or" choices).
 * CHOOSE = take chooseCount courses, or chooseCredits credit hours, from the group.
 * OPEN   = no course list; the notes say what counts (e.g. "any 3000-level CCI course").
 */
export const REQUIREMENT_RULES = ['ALL', 'CHOOSE', 'OPEN'] as const
export type RequirementRule = (typeof REQUIREMENT_RULES)[number]

export interface College {
  code: string
  name: string
  programCount: number
}

/** A course as the catalog API sends it (see server/catalogRepository.ts). */
export interface CatalogCourse {
  code: string // "ITSC 3155"
  title: string
  minCredits: number | null
  maxCredits: number | null
  creditsText: string
  description: string
  prerequisites: string
  corequisites: string
  restrictions: string
}

export interface RequirementCourse extends CatalogCourse {
  slot: number // same slot = alternatives ("or")
  note: string
}

export interface RequirementGroup {
  id: number
  label: string
  rule: RequirementRule
  chooseCount: number | null
  chooseCredits: number | null
  minCredits: number | null
  maxCredits: number | null
  notes: string
  courses: RequirementCourse[]
  children: RequirementGroup[]
}

/** Short version used in lists and dropdowns. */
export interface ProgramSummary {
  id: number
  name: string
  type: ProgramType
  degree: string
  catalogYear: string
  collegeCode: string | null
  collegeName: string | null
}

/** Full program with its requirements as a tree of groups. */
export interface ProgramDetail extends ProgramSummary {
  totalCredits: number | null
  catalogUrl: string
  groups: RequirementGroup[]
}
