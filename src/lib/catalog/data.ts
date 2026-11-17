/**
 * Loads the catalog data produced by scripts/catalog (src/data/catalog/).
 * Programs are discovered automatically: adding programs/finance-bs.json makes "finance-bs" available.
 */
import offeringsFile from '../../data/catalog/term-offerings.json'
import type { CourseIndex } from './progress'
import type { Course, Program, TermOffering } from './types'

const courseFiles = import.meta.glob<Course[]>('../../data/catalog/courses.json', { eager: true, import: 'default' })
const programFiles = import.meta.glob<Program>('../../data/catalog/programs/*.json', { eager: true, import: 'default' })

export const catalog: CourseIndex = Object.fromEntries(Object.values(courseFiles).flat().map((c) => [c.code, c]))

const programsById: Record<string, Program> = Object.fromEntries(Object.values(programFiles).map((p) => [p.id, p]))

export const termOfferings: TermOffering[] = offeringsFile.terms

/** The student's program until onboarding lets them choose one. */
export const DEFAULT_PROGRAM_ID = 'economics-bs'

/** A program with its shared requirement sets (e.g. the business core) merged in, shared ones first. */
export function getProgram(id: string, seen = new Set<string>()): Program | undefined {
  const program = programsById[id]
  if (!program || seen.has(id)) return program
  seen.add(id)
  const included = (program.includes ?? []).map((inc) => getProgram(inc, seen)).filter((p): p is Program => !!p)
  return {
    ...program,
    sections: [...included.flatMap((p) => p.sections), ...program.sections],
    needsReview: [...included.flatMap((p) => p.needsReview), ...program.needsReview],
  }
}

export function hasCatalogData(): boolean {
  return Object.keys(catalog).length > 0 && !!programsById[DEFAULT_PROGRAM_ID]
}
