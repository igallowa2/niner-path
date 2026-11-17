// Tests the frontend data functions. fetch is replaced with a fake, so no real server is needed.
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Application, ApplicationInput } from '../types'
import {
  ApiRequestError,
  appendApplication,
  deleteApplication,
  loadApplications,
  SERVER_DOWN_MESSAGE,
  updateApplicationStatus,
} from './storage'

const input: ApplicationInput = {
  company: 'Duke Energy',
  role: 'Economic Analyst Intern',
  location: 'Charlotte, NC',
  jobType: 'Internship',
  industry: 'Energy',
  deadline: '',
  status: 'Saved',
  postingUrl: '',
}
const saved: Application = { ...input, id: 'abc123', timeline: [{ status: 'Saved', date: '2026-11-15' }] }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Replaces fetch with a fake that always gives this reply. */
function mockFetch(reply: Response | Error) {
  const fn = vi.fn(async () => {
    if (reply instanceof Error) throw reply
    return reply
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('storage: talking to the applications API', () => {
  it('loads applications with GET /api/applications', async () => {
    const fetchMock = mockFetch(jsonResponse(200, [saved]))
    expect(await loadApplications()).toEqual([saved])
    expect(fetchMock).toHaveBeenCalledWith('/api/applications', expect.objectContaining({}))
  })

  it('creates an application with POST and returns what the server saved', async () => {
    const fetchMock = mockFetch(jsonResponse(201, saved))
    expect(await appendApplication(input)).toEqual(saved)
    expect(fetchMock).toHaveBeenCalledWith('/api/applications', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('does not send anything when company and role are empty', async () => {
    const fetchMock = mockFetch(jsonResponse(201, saved))
    const error = await appendApplication({ ...input, company: '  ', role: '' }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error.fieldErrors).toEqual({ company: 'Company is required.', role: 'Role title is required.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('updates the status with PATCH', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { ...saved, status: 'Applied' }))
    expect((await updateApplicationStatus('abc123', 'Applied')).status).toBe('Applied')
    expect(fetchMock).toHaveBeenCalledWith('/api/applications/abc123/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'Applied' }),
    }))
  })

  it('deletes with DELETE and accepts the empty 204 reply', async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }))
    await expect(deleteApplication('abc123')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/applications/abc123', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('storage: errors', () => {
  it('passes along field errors when the server rejects the data (400)', async () => {
    mockFetch(jsonResponse(400, { errors: { postingUrl: 'Enter a full link that starts with http:// or https://' } }))
    const error = await appendApplication(input).catch((e) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error.fieldErrors).toEqual({ postingUrl: 'Enter a full link that starts with http:// or https://' })
  })

  it("shows the server's message when the application was not found (404)", async () => {
    mockFetch(jsonResponse(404, { error: 'Application abc123 was not found' }))
    await expect(deleteApplication('abc123')).rejects.toThrow('Application abc123 was not found')
  })

  it('gives a clear message when the server is not running', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    await expect(loadApplications()).rejects.toThrow(SERVER_DOWN_MESSAGE)
  })

  it('gives the same message when the dev proxy cannot reach the server (500, no JSON)', async () => {
    mockFetch(new Response('', { status: 500 }))
    await expect(loadApplications()).rejects.toThrow(SERVER_DOWN_MESSAGE)
  })

  it('shows the server error message on a 500 with JSON', async () => {
    mockFetch(jsonResponse(500, { error: 'Something went wrong on the server.' }))
    await expect(loadApplications()).rejects.toThrow('Something went wrong on the server.')
  })
})
