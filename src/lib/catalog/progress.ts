/**
 * Degree progress and "what can I take next" logic. Pure functions: no data loading,
 * no React, so they're easy to test and reuse (e.g. with a transcript import later).
 */
import type {
  CompletedCourse,
  Course,
  LetterGrade,
  PrereqNode,
  Program,
  Requirement,
  RequirementSection,
  TermOffering,
} from './types'

export type CourseIndex = Record<string, Course>
export type RequirementStatus = 'done' | 'in-progress' | 'needed'

const DEFAULT_CREDITS = 3
const GRADE_RANK: Record<LetterGrade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0, P: 1, S: 1, U: 0, W: -1, I: -1 }

// ---------- Grades and course codes ----------

/** No grade entered counts as passing; F, U, W and I don't. */
export function isPassing(grade?: LetterGrade): boolean {
  return grade === undefined || GRADE_RANK[grade] >= 1
}

export function meetsMinGrade(grade: LetterGrade | undefined, minGrade?: LetterGrade): boolean {
  if (!isPassing(grade)) return false
  if (!minGrade || grade === undefined) return true
  // Pass/satisfactory only meets a "D or better" requirement.
  if (grade === 'P' || grade === 'S') return GRADE_RANK[minGrade] <= 1
  return GRADE_RANK[grade] >= GRADE_RANK[minGrade]
}

/** "econ  2101" -> "ECON 2101" */
export function normalizeCode(code: string): string {
  const m = code.trim().toUpperCase().match(/^([A-Z]{2,4})\s*(\d{4}[A-Z]?)$/)
  return m ? `${m[1]} ${m[2]}` : code.trim().toUpperCase()
}

function subjectOf(code: string): string {
  return code.split(' ')[0]
}

function levelOf(code: string): number {
  return Number.parseInt(code.split(' ')[1] ?? '0', 10)
}

export function creditsOf(code: string, catalog: CourseIndex): number {
  return catalog[code]?.credits ?? DEFAULT_CREDITS
}

/** One record per course: a passing completed attempt beats in-progress, and the best grade wins. */
function bestRecords(completed: CompletedCourse[]): Map<string, CompletedCourse> {
  const best = new Map<string, CompletedCourse>()
  const score = (r: CompletedCourse) =>
    r.status === 'completed' ? (isPassing(r.grade) ? 10 + (r.grade ? GRADE_RANK[r.grade] : 4) : 0) : 5
  for (const raw of completed) {
    const r = { ...raw, code: normalizeCode(raw.code) }
    const current = best.get(r.code)
    if (!current || score(r) > score(current)) best.set(r.code, r)
  }
  return best
}

// ---------- Degree progress ----------

export interface AppliedCourse {
  code: string
  status: 'completed' | 'in-progress'
  credits: number
}

export interface RequirementProgress {
  requirement: Requirement
  status: RequirementStatus
  applied: AppliedCourse[]
  /** How much is done, e.g. 1 of 2 courses or 6 of 12 credits. */
  have: number
  inProgress: number
  need: number
  unit: 'courses' | 'credits'
}

export interface SectionProgress {
  section: RequirementSection
  status: RequirementStatus
  requirements: RequirementProgress[]
}

export interface DegreeProgress {
  sections: SectionProgress[]
  /** Passing completed credits (all courses, not only ones used for requirements). */
  completedCredits: number
  inProgressCredits: number
  totalCredits: number
  /** 0–100, completed credits out of total. */
  percent: number
  requirementsDone: number
  requirementsTotal: number
}

function statusFrom(have: number, inProgress: number, need: number): RequirementStatus {
  if (have >= need) return 'done'
  if (have + inProgress >= need) return 'in-progress'
  return 'needed'
}

/** Specific courses claim courses first, then "choose N", then credit-hour pools. */
const KIND_ORDER: Record<Requirement['kind'], number> = { course: 0, chooseN: 1, creditsFrom: 2 }

function matchesCreditsRule(code: string, req: Extract<Requirement, { kind: 'creditsFrom' }>): boolean {
  const level = levelOf(code)
  return (
    req.subjects.includes(subjectOf(code)) &&
    level >= req.minLevel &&
    (req.maxLevel === undefined || level <= req.maxLevel) &&
    !(req.exclude ?? []).map(normalizeCode).includes(code)
  )
}

/**
 * Shows each requirement as done, in progress, or still needed, plus credit totals.
 * A course counts toward only one requirement unless that requirement sets `allowDoubleCount`.
 */
export function getDegreeProgress(completed: CompletedCourse[], program: Program, catalog: CourseIndex = {}): DegreeProgress {
  const records = bestRecords(completed)
  const used = new Set<string>()

  // Usable for a requirement: passing (and meeting its minimum grade) or currently in progress.
  const candidates = (req: Requirement, codes: string[]): CompletedCourse[] =>
    codes
      .map((c) => records.get(normalizeCode(c)))
      .filter((r): r is CompletedCourse => !!r)
      .filter((r) => r.status === 'in-progress' || meetsMinGrade(r.grade, req.minGrade))
      .filter((r) => req.allowDoubleCount || !used.has(r.code))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'completed' ? -1 : 1))

  const claim = (req: Requirement, r: CompletedCourse): AppliedCourse => {
    if (!req.allowDoubleCount) used.add(r.code)
    return { code: r.code, status: r.status, credits: creditsOf(r.code, catalog) }
  }

  const all = program.sections.flatMap((s) => s.requirements)
  const ordered = [...all].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
  const results = new Map<string, RequirementProgress>()

  for (const req of ordered) {
    let applied: AppliedCourse[] = []
    let need = 1
    let unit: RequirementProgress['unit'] = 'courses'

    if (req.kind === 'course') {
      const pick = candidates(req, [req.course, ...(req.alternatives ?? [])])[0]
      if (pick) applied = [claim(req, pick)]
    } else if (req.kind === 'chooseN' && req.credits === undefined) {
      need = req.count
      applied = candidates(req, req.from).slice(0, req.count).map((r) => claim(req, r))
    } else {
      // Credit-hour rules: "N credits from this list" or "N credits of 3000+ ECON".
      need = req.kind === 'chooseN' ? req.credits! : req.credits
      unit = 'credits'
      const pool = req.kind === 'chooseN' ? req.from : [...records.keys()].filter((c) => matchesCreditsRule(c, req))
      let total = 0
      for (const r of candidates(req, pool)) {
        if (total >= need) break
        const a = claim(req, r)
        applied.push(a)
        total += a.credits
      }
    }

    const amount = (status: AppliedCourse['status']) =>
      applied.filter((a) => a.status === status).reduce((sum, a) => sum + (unit === 'credits' ? a.credits : 1), 0)
    const have = amount('completed')
    const inProgress = amount('in-progress')
    results.set(req.id, { requirement: req, status: statusFrom(have, inProgress, need), applied, have, inProgress, need, unit })
  }

  const sections: SectionProgress[] = program.sections.map((section) => {
    const requirements = section.requirements.map((r) => results.get(r.id)!)
    const status: RequirementStatus = requirements.every((r) => r.status === 'done')
      ? 'done'
      : requirements.every((r) => r.status !== 'needed')
        ? 'in-progress'
        : 'needed'
    return { section, status, requirements }
  })

  let completedCredits = 0
  let inProgressCredits = 0
  for (const r of records.values()) {
    if (r.status === 'in-progress') inProgressCredits += creditsOf(r.code, catalog)
    else if (isPassing(r.grade)) completedCredits += creditsOf(r.code, catalog)
  }

  return {
    sections,
    completedCredits,
    inProgressCredits,
    totalCredits: program.totalCredits,
    percent: program.totalCredits ? Math.min(100, Math.round((completedCredits / program.totalCredits) * 100)) : 0,
    requirementsDone: all.filter((r) => results.get(r.id)!.status === 'done').length,
    requirementsTotal: all.length,
  }
}

// ---------- What can I take next? ----------

/**
 * Are the prerequisites met? Completed courses must meet the minimum grade. Courses in progress
 * count too (planning for next term assumes you'll pass them).
 */
export function prerequisitesMet(node: PrereqNode | null, records: Map<string, CompletedCourse>): boolean {
  if (!node) return true
  if (node.type === 'and') return node.items.every((n) => prerequisitesMet(n, records))
  if (node.type === 'or') return node.items.some((n) => prerequisitesMet(n, records))
  const r = records.get(node.code)
  if (!r) return false
  return r.status === 'in-progress' || meetsMinGrade(r.grade, node.minGrade)
}

export interface AvailableCourse {
  code: string
  course?: Course
  /** Requirements this course would count toward. */
  forRequirements: string[]
  /** true when the prerequisite text needs a person to check it. */
  prereqNeedsReview: boolean
  /** true/false when the term's offerings are known, null when they aren't. */
  offered: boolean | null
}

/**
 * Courses the student has the prerequisites for and still needs.
 * With `term`, uses the hand-edited term offerings (if that term is listed) to mark what's offered.
 */
export function getAvailableCourses(
  completed: CompletedCourse[],
  program: Program,
  termOfferings: TermOffering[],
  catalog: CourseIndex,
  term?: string,
): AvailableCourse[] {
  const records = bestRecords(completed)
  const progress = getDegreeProgress(completed, program, catalog)
  const taken = (code: string) => {
    const r = records.get(code)
    return !!r && (r.status === 'in-progress' || isPassing(r.grade))
  }

  // Which courses would help an unfinished requirement?
  const wanted = new Map<string, Set<string>>()
  const want = (code: string, label: string) => {
    const c = normalizeCode(code)
    if (taken(c)) return
    if (!wanted.has(c)) wanted.set(c, new Set())
    wanted.get(c)!.add(label)
  }
  for (const { requirements } of progress.sections) {
    for (const { requirement: req, status } of requirements) {
      if (status !== 'needed') continue
      if (req.kind === 'course') [req.course, ...(req.alternatives ?? [])].forEach((c) => want(c, req.label))
      else if (req.kind === 'chooseN') req.from.forEach((c) => want(c, req.label))
      else Object.keys(catalog).filter((c) => matchesCreditsRule(c, req)).forEach((c) => want(c, req.label))
    }
  }

  const offering = term ? termOfferings.find((t) => t.term === term) : undefined
  const offeredSet = offering ? new Set(offering.courses.map(normalizeCode)) : null

  const result: AvailableCourse[] = []
  for (const [code, labels] of wanted) {
    const course = catalog[code]
    const needsReview = course?.prereqStatus === 'needs-review'
    // Skip courses whose prerequisites aren't met. If the rule couldn't be parsed at all,
    // we can't check it, so the course is shown with a "check prerequisites" flag instead.
    if (course?.prerequisites && !prerequisitesMet(course.prerequisites, records)) continue
    const offered = offeredSet ? offeredSet.has(code) : null
    if (offered === false) continue
    result.push({ code, course, forRequirements: [...labels], prereqNeedsReview: needsReview, offered })
  }
  return result.sort((a, b) => a.code.localeCompare(b.code))
}
