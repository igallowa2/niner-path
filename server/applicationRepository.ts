// Data-access layer for job applications. The API (server/app.ts) talks to the
// database only through these functions, never through Prisma directly.
import type { JobApplication, StatusChange } from '@prisma/client'
import { validateApplication, type FormErrors } from '../src/lib/validation'
import { JOB_TYPES, STATUSES, type Application, type ApplicationInput, type JobType, type Status } from '../src/types'
import { prisma } from './db'

export class ValidationError extends Error {
  errors: FormErrors & { status?: string; jobType?: string }
  constructor(errors: FormErrors & { status?: string; jobType?: string }) {
    super('Invalid application data')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Application ${id} was not found`)
    this.name = 'NotFoundError'
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

function isJobType(value: unknown): value is JobType {
  return typeof value === 'string' && (JOB_TYPES as readonly string[]).includes(value)
}

type Row = JobApplication & { timeline: StatusChange[] }

/** Converts a database row into the Application shape the React app already uses. */
function toApplication(row: Row): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    jobType: row.jobType as JobType,
    industry: row.industry,
    deadline: row.deadline,
    status: row.status as Status,
    postingUrl: row.postingUrl,
    timeline: row.timeline.map((t) => ({ status: t.status as Status, date: t.date })),
  }
}

/** Turns an untrusted request body into an ApplicationInput (missing fields become ""). */
export function toApplicationInput(body: unknown): ApplicationInput {
  const b = (body ?? {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    company: text(b.company),
    role: text(b.role),
    location: text(b.location),
    jobType: (text(b.jobType) || 'Internship') as JobType,
    industry: text(b.industry),
    deadline: text(b.deadline),
    status: (text(b.status) || 'Saved') as Status,
    postingUrl: text(b.postingUrl),
  }
}

const withTimeline = { timeline: { orderBy: { id: 'asc' as const } } }

/** All applications, newest first. */
export async function listApplications(): Promise<Application[]> {
  const rows = await prisma.jobApplication.findMany({ include: withTimeline, orderBy: { createdAt: 'desc' } })
  return rows.map(toApplication)
}

/** Saves a new application and its first timeline entry. Throws ValidationError on bad input. */
export async function createApplication(input: ApplicationInput): Promise<Application> {
  const errors: ValidationError['errors'] = validateApplication(input)
  if (!isStatus(input.status)) errors.status = 'Status must be one of: ' + STATUSES.join(', ')
  if (!isJobType(input.jobType)) errors.jobType = 'Job type must be one of: ' + JOB_TYPES.join(', ')
  if (Object.keys(errors).length > 0) throw new ValidationError(errors)

  const row = await prisma.jobApplication.create({
    data: {
      company: input.company.trim(),
      role: input.role.trim(),
      location: input.location.trim(),
      jobType: input.jobType,
      industry: input.industry.trim(),
      deadline: input.deadline,
      status: input.status,
      postingUrl: input.postingUrl.trim(),
      timeline: { create: { status: input.status, date: today() } },
    },
    include: withTimeline,
  })
  return toApplication(row)
}

/** Changes an application's status and records the change in its timeline. */
export async function updateApplicationStatus(id: string, status: unknown): Promise<Application> {
  if (!isStatus(status)) throw new ValidationError({ status: 'Status must be one of: ' + STATUSES.join(', ') })

  const existing = await prisma.jobApplication.findUnique({ where: { id }, include: withTimeline })
  if (!existing) throw new NotFoundError(id)
  if (existing.status === status) return toApplication(existing)

  const row = await prisma.jobApplication.update({
    where: { id },
    data: { status, timeline: { create: { status, date: today() } } },
    include: withTimeline,
  })
  return toApplication(row)
}
