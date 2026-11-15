// @vitest-environment node
// Tests the data-access layer against the local SQLite database (run `npm run db:migrate` first).
// Every record created here starts with "TEST-" and is deleted afterwards, so your own data is not touched.
import { afterAll, describe, expect, it } from 'vitest'
import type { ApplicationInput } from '../src/types'
import {
  createApplication,
  listApplications,
  NotFoundError,
  toApplicationInput,
  updateApplicationStatus,
  ValidationError,
} from './applicationRepository'
import { prisma } from './db'

const valid: ApplicationInput = {
  company: 'TEST-Duke Energy',
  role: 'Cybersecurity Intern',
  location: 'Charlotte, NC',
  jobType: 'Internship',
  industry: 'Energy',
  deadline: '2026-12-01',
  status: 'Saved',
  postingUrl: 'https://example.com/job',
}

afterAll(async () => {
  await prisma.jobApplication.deleteMany({ where: { company: { startsWith: 'TEST-' } } })
  await prisma.$disconnect()
})

describe('application repository', () => {
  it('saves a valid application with a first timeline entry', async () => {
    const created = await createApplication(valid)
    expect(created.id).toBeTruthy()
    expect(created.status).toBe('Saved')
    expect(created.timeline).toHaveLength(1)

    const all = await listApplications()
    expect(all.find((a) => a.id === created.id)?.company).toBe('TEST-Duke Energy')
  })

  it('keeps data in the database (a fresh query finds it)', async () => {
    const created = await createApplication({ ...valid, company: 'TEST-Persist Co' })
    const row = await prisma.jobApplication.findUnique({ where: { id: created.id } })
    expect(row?.role).toBe('Cybersecurity Intern')
  })

  it('rejects a blank company and role and saves nothing', async () => {
    const before = (await listApplications()).length
    await expect(createApplication({ ...valid, company: ' ', role: '' })).rejects.toBeInstanceOf(ValidationError)
    expect((await listApplications()).length).toBe(before)
  })

  it('rejects a bad posting link', async () => {
    await expect(createApplication({ ...valid, postingUrl: 'truist jobs' })).rejects.toMatchObject({
      errors: { postingUrl: expect.any(String) },
    })
  })

  it('rejects an unknown status or job type', async () => {
    const bad = toApplicationInput({ ...valid, status: 'Hired', jobType: 'Gig' })
    await expect(createApplication(bad)).rejects.toMatchObject({
      errors: { status: expect.any(String), jobType: expect.any(String) },
    })
  })

  it('updates the status and adds it to the timeline', async () => {
    const created = await createApplication({ ...valid, company: 'TEST-Status Co' })
    const updated = await updateApplicationStatus(created.id, 'Applied')
    expect(updated.status).toBe('Applied')
    expect(updated.timeline.map((t) => t.status)).toEqual(['Saved', 'Applied'])
  })

  it('returns NotFoundError for an id that does not exist', async () => {
    await expect(updateApplicationStatus('does-not-exist', 'Applied')).rejects.toBeInstanceOf(NotFoundError)
  })
})
