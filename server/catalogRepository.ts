// Data-access layer for the course catalog (read-only). The API (server/app.ts) talks to the
// catalog tables only through these functions.
import type { Course as CourseRow, Prisma } from '@prisma/client'
import {
  PROGRAM_TYPES,
  type College,
  type CatalogCourse,
  type ProgramDetail,
  type ProgramSummary,
  type ProgramType,
  type RequirementGroup,
  type RequirementRule,
} from '../src/types'
import { prisma } from './db'

export class CatalogNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} was not found`)
    this.name = 'CatalogNotFoundError'
  }
}

function toCourse(row: CourseRow): CatalogCourse {
  return {
    code: row.code,
    title: row.title,
    minCredits: row.minCredits,
    maxCredits: row.maxCredits,
    creditsText: row.creditsText,
    description: row.description,
    prerequisites: row.prerequisites,
    corequisites: row.corequisites,
    restrictions: row.restrictions,
  }
}

export async function listColleges(): Promise<College[]> {
  const rows = await prisma.college.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { programs: true } } },
  })
  return rows.map((c) => ({ code: c.code, name: c.name, programCount: c._count.programs }))
}

export interface ProgramFilters {
  college?: string // "CCI"
  type?: string // "Major"
  search?: string // matches part of the name, e.g. "computer"
}

export async function listPrograms(filters: ProgramFilters = {}): Promise<ProgramSummary[]> {
  const where: Prisma.ProgramWhereInput = {}
  if (filters.college) where.collegeCode = filters.college.toUpperCase()
  if (filters.type) {
    const type = PROGRAM_TYPES.find((t) => t.toLowerCase() === filters.type!.toLowerCase())
    where.type = type ?? filters.type
  }
  if (filters.search) where.name = { contains: filters.search }

  const rows = await prisma.program.findMany({ where, orderBy: { name: 'asc' }, include: { college: true } })
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as ProgramType,
    degree: p.degree,
    catalogYear: p.catalogYear,
    collegeCode: p.collegeCode,
    collegeName: p.college?.name ?? null,
  }))
}

/** One program with its requirements as a tree (top-level groups, each with its sub-groups). */
export async function getProgram(id: number): Promise<ProgramDetail> {
  const p = await prisma.program.findUnique({
    where: { id },
    include: {
      college: true,
      groups: {
        orderBy: { sortOrder: 'asc' },
        include: { courses: { orderBy: { id: 'asc' }, include: { course: true } } },
      },
    },
  })
  if (!p) throw new CatalogNotFoundError(`Program ${id}`)

  const byId = new Map<number, RequirementGroup>()
  const roots: RequirementGroup[] = []
  for (const g of p.groups) {
    byId.set(g.id, {
      id: g.id,
      label: g.label,
      rule: g.rule as RequirementRule,
      chooseCount: g.chooseCount,
      chooseCredits: g.chooseCredits,
      minCredits: g.minCredits,
      maxCredits: g.maxCredits,
      notes: g.notes,
      courses: g.courses.map((rc) => ({ ...toCourse(rc.course), slot: rc.slot, note: rc.note })),
      children: [],
    })
  }
  for (const g of p.groups) {
    const node = byId.get(g.id)!
    const parent = g.parentId === null ? undefined : byId.get(g.parentId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return {
    id: p.id,
    name: p.name,
    type: p.type as ProgramType,
    degree: p.degree,
    catalogYear: p.catalogYear,
    collegeCode: p.collegeCode,
    collegeName: p.college?.name ?? null,
    totalCredits: p.totalCredits,
    catalogUrl: p.catalogUrl,
    groups: roots,
  }
}

/** All courses, optionally only one subject (e.g. "ECON"). Sorted by code. */
export async function listCourses(prefix?: string): Promise<CatalogCourse[]> {
  const rows = await prisma.course.findMany({
    where: prefix ? { prefix: prefix.toUpperCase() } : undefined,
    orderBy: { code: 'asc' },
  })
  return rows.map(toCourse)
}

/** "ITSC 3155", "itsc3155", or "ITSC-3155" all work. */
export async function getCourse(code: string): Promise<CatalogCourse> {
  const m = code.toUpperCase().match(/^([A-Z]{2,5})[\s-]*(\d{4}[A-Z]{0,2})$/)
  const row = m ? await prisma.course.findUnique({ where: { code: `${m[1]} ${m[2]}` } }) : null
  if (!row) throw new CatalogNotFoundError(`Course ${code}`)
  return toCourse(row)
}
