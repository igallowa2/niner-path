/**
 * Converts a program from the catalog API (GET /api/programs/:id, built from the database)
 * into the requirement rules used by progress.ts.
 *
 * Only clear rules are converted. Groups that can't be turned into a rule with confidence
 * (General Education, "unrestricted electives", experiences, unclear "select" text) go into
 * `needsReview` so a person can check them against the catalog.
 */
import type { CatalogCourse, ProgramDetail, RequirementGroup } from '../../types'
import { parseRequisites } from './prereqParser'
import type { CourseIndex } from './progress'
import { tagSkills } from './skills'
import type { Course, LetterGrade, Program, Requirement, RequirementSection, ReviewItem } from './types'

const DEFAULT_CREDITS = 3
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
const toNumber = (w: string) => (/^\d+$/.test(w) ? Number(w) : NUMBER_WORDS[w.toLowerCase()])

/** A catalog course plus parsed prerequisites and skills. */
export function toCourse(c: CatalogCourse, sourceUrl = ''): Course {
  const [subject, number = ''] = c.code.split(' ')
  const prereqs = parseRequisites(c.prerequisites)
  const coreqs = parseRequisites(c.corequisites, true)
  const credits = c.minCredits ?? DEFAULT_CREDITS
  return {
    code: c.code,
    subject,
    number,
    title: c.title,
    credits,
    creditsMax: c.maxCredits ?? credits,
    description: c.description,
    prerequisitesRaw: c.prerequisites,
    corequisitesRaw: c.corequisites,
    prerequisites: prereqs.node,
    corequisites: coreqs.node,
    prereqStatus: prereqs.status,
    prereqReviewReasons: prereqs.reasons,
    // Titles count too, so courses get skills even before descriptions are imported.
    skills: tagSkills(`${c.title}. ${c.description}`),
    sourceUrl,
  }
}

/** "with a grade of C or above" in a group's notes. */
function minGradeFrom(notes: string): LetterGrade | undefined {
  return notes.match(/grades?\s+of\s+([A-D])\b(?:\s+or\s+(?:above|better|higher))?/i)?.[1].toUpperCase() as LetterGrade | undefined
}

/** "Select three ECON Electives from the 3000- or 4000- level, excluding the courses listed above." */
function parseOpenRule(group: RequirementGroup, programCodes: string[]): Requirement | null {
  const m = group.notes.match(/select\s+(\w+)\s+([A-Z]{2,4})\s+(?:courses|electives?)\s+(?:from\s+)?(?:at\s+)?the\s+(\d)000-?\s*(?:or\s+(\d)000-?\s*)?levels?/i)
  if (!m) return null
  const count = toNumber(m[1])
  if (!count) return null
  const minLevel = Number(m[3]) * 1000
  const maxLevel = (m[4] ? Number(m[4]) : Number(m[3])) * 1000 + 999
  return {
    id: `g${group.id}`,
    kind: 'creditsFrom',
    label: group.label,
    credits: group.minCredits ?? count * DEFAULT_CREDITS,
    subjects: [m[2].toUpperCase()],
    minLevel,
    maxLevel,
    exclude: /excluding the courses listed/i.test(group.notes) ? programCodes : undefined,
    note: group.notes,
  }
}

const isNoteHeading = (g: RequirementGroup) => /^notes?:?$/i.test(g.label.trim())

function allCodes(group: RequirementGroup): string[] {
  return [...new Set([...group.courses.map((c) => c.code), ...group.children.flatMap(allCodes)])]
}

interface Context {
  programCodes: string[]
  review: ReviewItem[]
  titles: Map<string, string>
}

function review(ctx: Context, group: RequirementGroup, reason: string) {
  ctx.review.push({ where: group.label, text: group.notes.slice(0, 400), reason })
}

/** Requirements for one group and its sub-groups. */
function requirementsFrom(group: RequirementGroup, ctx: Context, inheritedGrade?: LetterGrade): Requirement[] {
  if (isNoteHeading(group)) return []
  const minGrade = minGradeFrom(group.notes) ?? inheritedGrade
  const base = (id: string, label: string) => ({ id, label, ...(minGrade ? { minGrade } : {}) })

  if (group.rule === 'CHOOSE') {
    // "Select one of the following" covers the lists in its sub-groups too.
    const from = allCodes(group)
    if (from.length === 0) {
      review(ctx, group, 'no course list to choose from')
      return []
    }
    if (group.chooseCount) return [{ ...base(`g${group.id}`, `${group.label} (choose ${group.chooseCount})`), kind: 'chooseN', count: group.chooseCount, from }]
    if (group.chooseCredits) {
      return [{ ...base(`g${group.id}`, `${group.label} (${group.chooseCredits} credit hours)`), kind: 'chooseN', count: 0, credits: group.chooseCredits, from }]
    }
    review(ctx, group, "doesn't say how many courses or credits to choose")
    return []
  }

  if (group.rule === 'OPEN') {
    const rule = parseOpenRule(group, ctx.programCodes)
    if (rule) return [{ ...rule, ...(minGrade ? { minGrade } : {}) }]
    review(ctx, group, 'no course list; check the catalog notes')
    return []
  }

  // ALL: one requirement per slot; courses sharing a slot are "or" choices.
  const slots = new Map<number, string[]>()
  for (const c of group.courses) slots.set(c.slot, [...(slots.get(c.slot) ?? []), c.code])
  const own: Requirement[] = [...slots.entries()].map(([slot, codes]) => ({
    ...base(`g${group.id}-s${slot}`, codes.map((c) => ctx.titles.get(c) ?? c).join(' or ')),
    kind: 'course',
    course: codes[0],
    ...(codes.length > 1 ? { alternatives: codes.slice(1) } : {}),
  }))
  return [...own, ...group.children.flatMap((child) => requirementsFrom(child, ctx, minGrade))]
}

function sectionFrom(group: RequirementGroup, ctx: Context): RequirementSection | null {
  const requirements = requirementsFrom(group, ctx)
  if (requirements.length === 0) return null
  const credits = group.minCredits ? `${group.minCredits}${group.maxCredits && group.maxCredits !== group.minCredits ? `–${group.maxCredits}` : ''} credit hours` : ''
  const descendants = (g: RequirementGroup): RequirementGroup[] => g.children.flatMap((c) => [c, ...descendants(c)])
  const notes = [credits, ...descendants(group).filter(isNoteHeading).map((n) => n.notes)].filter(Boolean).join(' · ')
  return { id: `g${group.id}`, title: group.label, requirements, ...(notes ? { note: notes } : {}) }
}

/** Converts a program from the API into requirement rules plus a course index. */
export function programFromApi(detail: ProgramDetail): { program: Program; catalog: CourseIndex } {
  const flat = (g: RequirementGroup): RequirementGroup[] => [g, ...g.children.flatMap(flat)]
  const groups = detail.groups.flatMap(flat)
  const courses = groups.flatMap((g) => g.courses)

  const catalog: CourseIndex = {}
  for (const c of courses) catalog[c.code] ??= toCourse(c, detail.catalogUrl)

  const ctx: Context = {
    programCodes: [...new Set(courses.map((c) => c.code))],
    review: [],
    titles: new Map(courses.map((c) => [c.code, c.title])),
  }

  // A top-level heading with no courses of its own (e.g. "Degree Requirements") is just a
  // container: each of its sub-groups becomes its own section.
  const sections: RequirementSection[] = []
  for (const root of detail.groups) {
    const parts = root.rule === 'ALL' && root.courses.length === 0 && root.children.length > 0 ? root.children : [root]
    for (const g of parts) {
      const section = sectionFrom(g, ctx)
      if (section) sections.push(section)
    }
  }

  return {
    program: {
      id: String(detail.id),
      name: detail.name,
      college: detail.collegeName ?? '',
      catalogYear: detail.catalogYear,
      totalCredits: detail.totalCredits ?? 120,
      sections,
      needsReview: ctx.review,
      sourceUrl: detail.catalogUrl,
    },
    catalog,
  }
}
