import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobSearch } from './JobSearch'
import { JobTracker } from './JobTracker'
import type { Application } from '../types'

/**
 * A pretend API server that keeps applications in memory, shared by Find Jobs and the
 * Job Tracker, so a job saved on one page shows up on the other (like the real database).
 */
function fakeServer(initial: Application[] = []) {
  let db = [...initial]
  let nextId = 1
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url === '/api/applications' && init.method === 'POST') {
      const input = JSON.parse(String(init.body))
      const app: Application = { ...input, id: `id-${nextId++}`, timeline: [{ status: input.status, date: '2026-11-16' }] }
      db = [app, ...db]
      return json(201, app)
    }
    if (url === '/api/applications') return json(200, db)
    return json(404, { error: { code: 'bad_request', message: 'Unknown API route.' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
  return { posts, rows: () => db }
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const saveButtons = () => screen.getAllByRole('button', { name: 'Save job to tracker' })

describe('Find Jobs save icon → Job Tracker', () => {
  it('adds the job to the Job Tracker with status "Saved"', async () => {
    const server = fakeServer()
    const { unmount } = render(<JobSearch />)
    const user = userEvent.setup()

    // The first card is Bank of America, Data Analyst Program.
    await user.click(saveButtons()[0])
    expect(await screen.findByText('Saved to Job Tracker')).toBeInTheDocument()
    const saved = screen.getByRole('button', { name: 'Saved' })
    expect(saved).toHaveAttribute('aria-pressed', 'true')
    expect(saved).toHaveAccessibleDescription('Data Analyst Program')
    unmount()

    expect(server.rows()[0]).toMatchObject({
      company: 'Bank of America',
      role: 'Data Analyst Program',
      location: 'Charlotte, NC',
      jobType: 'Full-time',
      industry: 'Finance',
      deadline: '2026-10-12',
      status: 'Saved',
      postingUrl: 'https://careers.bankofamerica.com/',
    })

    render(<JobTracker />)
    const card = await screen.findByRole('article', { name: 'Bank of America, Data Analyst Program' })
    expect(within(card).getByTestId('status-badge')).toHaveTextContent('Saved')
    expect(screen.getByTestId('app-count')).toHaveTextContent('1')
  })

  it('does not create a duplicate when clicked twice', async () => {
    const server = fakeServer()
    render(<JobSearch />)
    const user = userEvent.setup()

    await user.dblClick(saveButtons()[1]) // a fast double-click on Truist
    await screen.findByText('Saved to Job Tracker')
    await user.click(screen.getByRole('button', { name: 'Saved' })) // and once more after it's saved

    expect(server.posts()).toHaveLength(1)
    expect(server.rows().filter((a) => a.company === 'Truist')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows jobs that are already in the tracker as saved', async () => {
    fakeServer([
      {
        id: 'existing',
        company: 'Wells Fargo',
        role: 'Data & Insights Summer Analyst',
        location: 'Charlotte, NC',
        jobType: 'Internship',
        industry: 'Finance',
        deadline: '',
        status: 'Applied',
        postingUrl: 'https://www.wellsfargojobs.com/',
        timeline: [{ status: 'Applied', date: '2026-10-01' }],
      },
    ])
    render(<JobSearch />)
    const saved = await screen.findByRole('button', { name: 'Saved' })
    expect(saved).toHaveAccessibleDescription('Data & Insights Summer Analyst')
    expect(saveButtons()).toHaveLength(4)
  })

  it('shows an error and stays unsaved when the server is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 502 })))
    render(<JobSearch />)
    await userEvent.setup().click(saveButtons()[0])
    expect(await screen.findByText(/Couldn't save "Data Analyst Program" to your tracker/)).toBeInTheDocument()
    expect(saveButtons()).toHaveLength(5)
  })
})
