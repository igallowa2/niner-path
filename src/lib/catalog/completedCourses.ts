/**
 * The student's completed and in-progress courses.
 *
 * Saved in localStorage for now. This is the only file that knows where they're stored:
 * when the team adds a CompletedCourse table to the database (or a transcript import),
 * change `loadCompletedCourses` / `saveCompletedCourses` and nothing else.
 */
import { useEffect, useState } from 'react'
import { normalizeCode } from './progress'
import type { CompletedCourse, LetterGrade } from './types'

export const COMPLETED_COURSES_KEY = 'niner-path.completedCourses'

const GRADES: LetterGrade[] = ['A', 'B', 'C', 'D', 'F', 'P', 'S', 'U', 'W', 'I']
export const GRADE_OPTIONS = GRADES

function isCompletedCourse(v: unknown): v is CompletedCourse {
  const c = v as CompletedCourse | null
  return (
    !!c &&
    typeof c.code === 'string' &&
    (c.status === 'completed' || c.status === 'in-progress') &&
    (c.grade === undefined || GRADES.includes(c.grade)) &&
    (c.term === undefined || typeof c.term === 'string')
  )
}

/** Reads saved courses. Returns [] if storage is blocked, empty, or holds bad data. */
export function loadCompletedCourses(): CompletedCourse[] {
  try {
    const raw = localStorage.getItem(COMPLETED_COURSES_KEY)
    const value: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter(isCompletedCourse).map((c) => ({ ...c, code: normalizeCode(c.code) })) : []
  } catch {
    return []
  }
}

export function saveCompletedCourses(courses: CompletedCourse[]): void {
  try {
    localStorage.setItem(COMPLETED_COURSES_KEY, JSON.stringify(courses))
  } catch {
    // Storage blocked (e.g. private browsing): the list still works until the page closes.
  }
}

/** React state for the course list, saved automatically. */
export function useCompletedCourses() {
  const [courses, setCourses] = useState<CompletedCourse[]>(loadCompletedCourses)
  useEffect(() => saveCompletedCourses(courses), [courses])

  return {
    courses,
    add: (course: CompletedCourse) =>
      setCourses((list) => [...list.filter((c) => c.code !== normalizeCode(course.code)), { ...course, code: normalizeCode(course.code) }]),
    update: (code: string, changes: Partial<Omit<CompletedCourse, 'code'>>) =>
      setCourses((list) => list.map((c) => (c.code === code ? { ...c, ...changes } : c))),
    remove: (code: string) => setCourses((list) => list.filter((c) => c.code !== code)),
  }
}
