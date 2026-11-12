import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { JobSearch } from './JobSearch'
import type { CareerSearchResponse, JobSearchResponse } from '../../shared/api'

// The browser code only calls OUR /api routes. Here we fake those replies,
// so these tests never touch the real server, Adzuna, or O*NET.
const jobsReply: JobSearchResponse = {
  total: 37,
  page: 1,
  jobs: [
    {
      id: '101',
      title: 'Data Analyst Intern',
      company: 'Sample Bank',
      location: 'Charlotte, NC',
      category: 'IT Jobs',
      contractTime: 'full_time',
      salaryMin: 50000,
      salaryMax: 60000,
      url: 'https://www.adzuna.com/details/101',
      created: '2026-11-01T10:00:00Z',
      snippet: 'Work with SQL and Python.',
    },
  ],
}

const careersReply: CareerSearchResponse = {
  total: 2,
  careers: [
    { code: '15-2051.00', title: 'Data Scientists', brightOutlook: true },
    { code: '19-3011.00', title: 'Economists', brightOutlook: false },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
/** What the fake /api/jobs and /api/careers routes reply in the current test. */
let apiReply: (url: string) => Promise<Response>
/** Bodies sent to the fake POST /api/applications. */
let savedToTracker: unknown[]

beforeEach(() => {
  window.location.hash = ''
  savedToTracker = []
  apiReply = async () => json(jobsReply)
  // The tracker routes act like an empty database; everything else goes to apiReply.
  fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url === '/api/applications' && init.method === 'POST') {
      const input = JSON.parse(String(init.body))
      savedToTracker.push(input)
      return json({ ...input, id: 'new-1', timeline: [] }, 201)
    }
    if (url === '/api/applications') return json([])
    return apiReply(url)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

/** URLs of every request except the tracker's own /api/applications calls. */
const searchCalls = () => fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => !u.startsWith('/api/applications'))

async function search(what: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Job title or keyword'), what)
  await user.click(screen.getByRole('button', { name: 'Search jobs' }))
  return user
}

describe('Find Jobs', () => {
  it('shows results from our own /api/jobs route', async () => {
    render(<JobSearch />)
    await search('data analyst')

    const card = await screen.findByRole('article', { name: 'Sample Bank, Data Analyst Intern' })
    expect(within(card).getByText(/\$50,000 – \$60,000/)).toBeInTheDocument()
    expect(screen.getByText(/Showing 1 of 37 jobs/)).toBeInTheDocument()

    const calledUrl = searchCalls()[0]
    expect(calledUrl.startsWith('/api/jobs?')).toBe(true) // never Adzuna directly
    expect(calledUrl).toContain('what=data+analyst')
    expect(screen.getByRole('link', { name: 'Adzuna' })).toBeInTheDocument()
  })

  it('saves a job to the Job Tracker through the API', async () => {
    render(<JobSearch />)
    const user = await search('data analyst')

    await user.click(await screen.findByRole('button', { name: 'Save to tracker' }))
    expect(await screen.findByRole('button', { name: 'In tracker ✓' })).toBeDisabled()
    expect(savedToTracker[0]).toMatchObject({ company: 'Sample Bank', role: 'Data Analyst Intern', status: 'Saved', jobType: 'Internship' })
  })

  it('asks for a keyword instead of searching when the box is empty', async () => {
    render(<JobSearch />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Search jobs' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a job title or keyword')
    expect(searchCalls()).toEqual([])
  })

  it('shows a friendly message when nothing matches', async () => {
    apiReply = async () => json({ jobs: [], total: 0, page: 1 })
    render(<JobSearch />)
    await search('underwater basket weaver')
    expect(await screen.findByText('No jobs found')).toBeInTheDocument()
  })

  it('shows a friendly message when the free limit is reached', async () => {
    apiReply = async () => json({ error: { code: 'rate_limited', message: 'Adzuna rate limit reached.' } }, 429)
    render(<JobSearch />)
    await search('analyst')
    expect(await screen.findByRole('alert')).toHaveTextContent('free search limit')
  })

  it('shows a friendly message when the key is wrong', async () => {
    apiReply = async () => json({ error: { code: 'bad_key', message: 'Adzuna rejected the API key.' } }, 502)
    render(<JobSearch />)
    await search('analyst')
    expect(await screen.findByRole('alert')).toHaveTextContent('rejected our API key')
  })

  it('shows a friendly message when our server cannot be reached', async () => {
    apiReply = async () => { throw new TypeError('Failed to fetch') }
    render(<JobSearch />)
    await search('analyst')
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the Niner Path server")
  })
})

describe('Explore Careers → Find Jobs', () => {
  it('lists careers and searches jobs for the one the student clicks', async () => {
    apiReply = async (url) => (url.startsWith('/api/careers') ? json(careersReply) : json(jobsReply))
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('link', { name: 'Explore Careers' }))
    expect(await screen.findByLabelText('Major, interest, or keyword')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Major, interest, or keyword'), 'economics')
    await user.click(screen.getByRole('button', { name: 'Explore careers' }))

    expect(await screen.findByText('Bright outlook')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'O*NET Web Services' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Data Scientists/ }))

    expect(await screen.findByRole('heading', { name: 'Find Jobs' })).toBeInTheDocument()
    expect(screen.getByLabelText('Job title or keyword')).toHaveValue('Data Scientists')
    expect(await screen.findByRole('article', { name: 'Sample Bank, Data Analyst Intern' })).toBeInTheDocument()
    expect(searchCalls().some((u) => u.includes('/api/jobs?what=Data+Scientists'))).toBe(true)
    expect(screen.getByRole('link', { name: 'Find Jobs' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows Find Jobs and Explore Careers in the sidebar next to the Job Tracker', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Job Tracker' })).toHaveAttribute('href', '#/jobs')
    expect(screen.getByRole('link', { name: 'Find Jobs' })).toHaveAttribute('href', '#/find-jobs')
    expect(screen.getByRole('link', { name: 'Explore Careers' })).toHaveAttribute('href', '#/careers')
  })
})
