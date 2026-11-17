/**
 * Loads degree data from our API (the catalog tables in the database, see docs/catalog-import.md)
 * and the hand-edited term offerings file.
 */
import { useEffect, useState } from 'react'
import offeringsFile from '../../data/catalog/term-offerings.json'
import type { CatalogCourse, ProgramDetail, ProgramSummary } from '../../types'
import { programFromApi, toCourse } from './fromApi'
import type { CourseIndex } from './progress'
import type { Program, TermOffering } from './types'

export const termOfferings: TermOffering[] = offeringsFile.terms

/** The student's program until onboarding lets them choose one. */
export const DEFAULT_PROGRAM_NAME = 'Economics, Business Concentration, B.S.'
export const PROGRAM_KEY = 'niner-path.programName'

const SERVER_DOWN = "Can't reach the Niner Path server. Make sure it's running (npm run server) and try again."

async function getJson<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error(SERVER_DOWN)
  }
  const body: unknown = await res.json().catch(() => undefined)
  if (res.ok && body !== undefined) return body as T
  const message = (body as { error?: unknown } | undefined)?.error
  throw new Error(typeof message === 'string' ? message : body === undefined ? SERVER_DOWN : `The server returned an error (${res.status}).`)
}

// Fetch each thing once per page load; every page that needs it shares the same request.
let majorsRequest: Promise<ProgramSummary[]> | null = null
let coursesRequest: Promise<CatalogCourse[]> | null = null
const programRequests = new Map<number, Promise<ProgramDetail>>()

function once<T>(get: () => Promise<T> | null, set: (p: Promise<T> | null) => void, load: () => Promise<T>): Promise<T> {
  const existing = get()
  if (existing) return existing
  const p = load().catch((err) => {
    set(null) // let "Try again" fetch it again
    throw err
  })
  set(p)
  return p
}

const fetchMajors = () => once(() => majorsRequest, (p) => (majorsRequest = p), () => getJson<ProgramSummary[]>('/api/programs?type=Major'))
const fetchCourses = () => once(() => coursesRequest, (p) => (coursesRequest = p), () => getJson<CatalogCourse[]>('/api/courses'))
const fetchProgram = (id: number) =>
  once(
    () => programRequests.get(id) ?? null,
    (p) => (p ? programRequests.set(id, p) : programRequests.delete(id)),
    () => getJson<ProgramDetail>(`/api/programs/${id}`),
  )

/** For tests: forget cached requests. */
export function clearCatalogCache() {
  majorsRequest = null
  coursesRequest = null
  programRequests.clear()
}

function readProgramName(): string {
  try {
    return localStorage.getItem(PROGRAM_KEY) || DEFAULT_PROGRAM_NAME
  } catch {
    return DEFAULT_PROGRAM_NAME
  }
}

export type DegreeData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; majors: ProgramSummary[]; program: Program; catalog: CourseIndex }

/** The student's program (requirements + courses) from the API, and a way to switch programs. */
export function useDegreeProgram() {
  const [programName, setProgramName] = useState(readProgramName)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<DegreeData>({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const [majors, allCourses] = await Promise.all([fetchMajors(), fetchCourses()])
        if (majors.length === 0) throw new Error('No programs are in the database yet. Run npm run db:seed.')
        const summary = majors.find((m) => m.name === programName) ?? majors.find((m) => m.name === DEFAULT_PROGRAM_NAME) ?? majors[0]
        const { program, catalog: programCourses } = programFromApi(await fetchProgram(summary.id))
        // All courses (for the picker and "any 3000+ ECON" rules), with the program's own on top.
        const catalog: CourseIndex = { ...Object.fromEntries(allCourses.map((c) => [c.code, toCourse(c)])), ...programCourses }
        if (!ignore) setData({ status: 'ready', majors, program, catalog })
      } catch (err) {
        if (!ignore) setData({ status: 'error', message: err instanceof Error ? err.message : SERVER_DOWN })
      }
    })()
    return () => { ignore = true }
  }, [programName, reloadKey])

  return {
    data,
    programName,
    selectProgram(name: string) {
      try {
        localStorage.setItem(PROGRAM_KEY, name)
      } catch {
        // Storage blocked: the choice lasts until the page closes.
      }
      setData({ status: 'loading' })
      setProgramName(name)
    },
    retry() {
      setData({ status: 'loading' })
      setReloadKey((k) => k + 1)
    },
  }
}
