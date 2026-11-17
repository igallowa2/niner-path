/**
 * Course catalog and degree-requirement types.
 * Data comes from scripts/catalog (UNC Charlotte's public catalog) and lives in src/data/catalog/.
 */

/** Undergraduate grades at UNC Charlotte (A–F, plus pass/satisfactory and non-grade marks). */
export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F' | 'P' | 'S' | 'U' | 'W' | 'I'

// ---------- Courses ----------

/** Structured prerequisite logic. `concurrentOk` = may be taken at the same time ("pre- or corequisite"). */
export type PrereqNode =
  | { type: 'course'; code: string; minGrade?: LetterGrade; concurrentOk?: boolean }
  | { type: 'and'; items: PrereqNode[] }
  | { type: 'or'; items: PrereqNode[] }

/** none = no prerequisites; parsed = turned into rules; needs-review = a person should check the raw text. */
export type ParseStatus = 'none' | 'parsed' | 'needs-review'

export interface Course {
  /** "ECON 2101" */
  code: string
  subject: string
  /** "2101" */
  number: string
  title: string
  /** Credit hours (the minimum, for variable-credit courses). */
  credits: number
  /** Upper end for variable-credit courses ("1-6"), otherwise the same as `credits`. */
  creditsMax: number
  description: string
  prerequisitesRaw: string
  corequisitesRaw: string
  prerequisites: PrereqNode | null
  corequisites: PrereqNode | null
  prereqStatus: ParseStatus
  /** Why the prerequisite text needs a person to check it. */
  prereqReviewReasons: string[]
  /** O*NET-style skill names, from skill-keywords.ts. */
  skills: string[]
  sourceUrl: string
}

// ---------- Requirements ----------

interface RequirementBase {
  id: string
  label: string
  /** e.g. 'C': a lower grade doesn't count toward this requirement. */
  minGrade?: LetterGrade
  /** true = a course used here may also count toward another requirement. */
  allowDoubleCount?: boolean
  note?: string
}

/** One specific course, e.g. ECON 2101. `alternatives` = courses accepted instead. */
export interface CourseRequirement extends RequirementBase {
  kind: 'course'
  course: string
  alternatives?: string[]
}

/** "Choose N of these courses", or with `credits`, "choose N credit hours from these courses". */
export interface ChooseRequirement extends RequirementBase {
  kind: 'chooseN'
  count: number
  /** When set, the student needs this many credit hours from the list instead of `count` courses. */
  credits?: number
  from: string[]
}

/** "N credit hours from a subject at a certain level", e.g. 12 hours of 3000+ ECON. */
export interface CreditsRequirement extends RequirementBase {
  kind: 'creditsFrom'
  credits: number
  subjects: string[]
  /** e.g. 3000 = 3000-level and above */
  minLevel: number
  /** e.g. 4999 to stop at 4000-level courses */
  maxLevel?: number
  /** Courses that don't count, e.g. ones already required elsewhere. */
  exclude?: string[]
}

export type Requirement = CourseRequirement | ChooseRequirement | CreditsRequirement

export interface RequirementSection {
  id: string
  title: string
  requirements: Requirement[]
  note?: string
}

/** Something the script couldn't turn into a rule; a person checks it against the catalog. */
export interface ReviewItem {
  where: string
  text: string
  reason: string
}

export interface Program {
  id: string
  name: string
  college: string
  catalogYear: string
  /** Total credit hours for the degree (including general education and electives). */
  totalCredits: number
  /** Ids of shared requirement sets this program includes, e.g. ["belk-business-core"]. */
  includes?: string[]
  sections: RequirementSection[]
  needsReview: ReviewItem[]
  sourceUrl: string
}

// ---------- Student data ----------

/** One course from the student's record. Shaped like a transcript line so an importer can produce it later. */
export interface CompletedCourse {
  code: string
  status: 'completed' | 'in-progress'
  /** Missing = not entered; counts as passing. */
  grade?: LetterGrade
  /** "Fall 2025" */
  term?: string
}

/** Courses offered in a term (hand-edited: there's no public API for this). */
export interface TermOffering {
  term: string
  courses: string[]
  note?: string
}
