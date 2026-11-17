import type { CourseIndex } from './progress'
import type { Course } from './types'

/** Matches "econ 2101", "econ2101", "2101", or words from the title. Sorted by code. */
export function searchCourses(catalog: CourseIndex, query: string, exclude: string[] = [], max = 8): Course[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const compact = q.replace(/\s+/g, '')
  const words = q.split(/\s+/)
  return Object.values(catalog)
    .filter((c) => !exclude.includes(c.code))
    .filter((c) => {
      const code = c.code.toLowerCase()
      return code.replace(' ', '').includes(compact) || words.every((w) => `${code} ${c.title.toLowerCase()}`.includes(w))
    })
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, max)
}
