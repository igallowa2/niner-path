import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { JobSearch } from './JobSearch'
import { FILTER_PREFS_KEY } from '../lib/findJobs'
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
  localStorage.clear()
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
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** URLs of every request except the tracker's own /api/applications calls. */
const liveCalls = () => fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => !u.startsWith('/api/applications'))
const subtitle = () => screen.getByText(/sample opening/)
const opportunities = () => within(screen.getByRole('region', { name: 'Opportunities for you' }))
const companies = () => opportunities().queryAllByRole('listitem').map((li) => li.querySelector('.fj-company')?.textContent)
const detail = () => within(screen.getByRole('article'))

async function search(text: string, location = '') {
  const user = userEvent.setup()
  if (text) await user.type(screen.getByLabelText('Job title, company or keyword'), text)
  if (location) await user.type(screen.getByLabelText('City or remote'), location)
  else screen.getByLabelText('Job title, company or keyword').focus()
  await user.keyboard('{Enter}')
  return user
}

describe('Find Jobs: layout from the profile and sample data', () => {
  it('shows the header, profile subtitle, and the default view', () => {
    render(<JobSearch />)
    expect(screen.getByText('Welcome back, Ivory')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Find Jobs', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Economics · Software Development minor · Graduating May 2027 · Targeting Data Analyst roles')).toBeInTheDocument()
    expect(subtitle()).toHaveTextContent('5 sample openings · Paid · Best match')
    expect(companies()).toEqual(['Bank of America', 'Truist', 'Wells Fargo', 'Ally Financial', 'Duke Energy'])
    expect(screen.getByText('3 strong matches · Based on your skills')).toBeInTheDocument()
    expect(screen.getByText('3 deadlines · October 9–12')).toBeInTheDocument()
  })

  it('shows the first job in the detail panel with skills, timeline, and follow-up', () => {
    render(<JobSearch />)
    expect(detail().getByRole('heading', { name: 'Data Analyst Program' })).toBeInTheDocument()
    expect(detail().getByText('You match 6 of 9 skills')).toBeInTheDocument()
    expect(detail().getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6')
    expect(detail().getByText('SQL')).toBeInTheDocument()
    expect(detail().getByText('Sep 22, 2026 · Current')).toBeInTheDocument()
    expect(detail().getByText('Applied 2 weeks ago. Send a follow-up?')).toBeInTheDocument()
    expect(detail().getByText('14 days since Sep 22 · No recruiter reply yet.')).toBeInTheDocument()
  })

  it('updates the detail panel when another card is clicked', async () => {
    render(<JobSearch />)
    const card = screen.getByRole('button', { name: /^Truist Commercial Credit Analyst/ })
    await userEvent.setup().click(card)
    expect(detail().getByRole('heading', { name: 'Commercial Credit Analyst' })).toBeInTheDocument()
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Find Jobs: search', () => {
  it('filters by keyword when Enter is pressed, and also searches live listings', async () => {
    render(<JobSearch />)
    await search('credit')
    expect(companies()).toEqual(['Truist'])
    expect(subtitle()).toHaveTextContent('1 sample opening')
    expect(liveCalls()[0]).toContain('/api/jobs?what=credit')
  })

  it('matches "remote" to remote jobs and shows a friendly empty state', async () => {
    render(<JobSearch />)
    const user = await search('', 'remote')
    expect(screen.getByText('No openings match')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(companies()).toHaveLength(5)
    expect(subtitle()).toHaveTextContent('5 sample openings · Best match')
    expect(screen.getByLabelText('City or remote')).toHaveValue('')
  })

  it('does not call the live search when the keyword box is empty', async () => {
    render(<JobSearch />)
    await search('')
    expect(liveCalls()).toEqual([])
    expect(screen.getByText('Search above to see real openings from Adzuna.')).toBeInTheDocument()
  })
})

describe('Find Jobs: collapsible filters', () => {
  it('starts collapsed with Paid selected and shown as a removable chip', async () => {
    render(<JobSearch />)
    const toggle = screen.getByRole('button', { name: /^Filters/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('(1)')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Paid filter' }))
    expect(toggle).not.toHaveTextContent('(1)')
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it('opens with the keyboard and applies OR within a group, AND across groups', async () => {
    render(<JobSearch />)
    const user = userEvent.setup()
    screen.getByRole('button', { name: /^Filters/ }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Internship' }))
    expect(companies()).toEqual(['Wells Fargo', 'Duke Energy'])
    expect(screen.getByRole('button', { name: 'Internship' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Co-op' })) // same group: OR
    expect(companies()).toEqual(['Wells Fargo', 'Duke Energy'])

    await user.click(screen.getByRole('button', { name: 'Sponsors visas' })) // same group as Paid: OR
    expect(companies()).toEqual(['Wells Fargo', 'Duke Energy'])

    await user.click(screen.getByRole('button', { name: 'Remote' })) // different group: AND
    expect(companies()).toEqual([])
    expect(subtitle()).toHaveTextContent('0 sample openings · Internship, Co-op, Remote, Paid, Sponsors visas · Best match')

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(companies()).toHaveLength(5)
  })

  it('collapses each group on its own', async () => {
    render(<JobSearch />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const group = screen.getByRole('button', { name: 'Location' })
    expect(group).toHaveAttribute('aria-expanded', 'true')
    await user.click(group)
    expect(group).toHaveAttribute('aria-expanded', 'false')
  })

  it('remembers the open panel and selected filters after a reload', async () => {
    const { unmount } = render(<JobSearch />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    await user.click(screen.getByRole('button', { name: 'Internship' }))
    unmount()

    render(<JobSearch />)
    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Internship' })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem(FILTER_PREFS_KEY)!).selected).toEqual(['Paid', 'Internship'])
  })

  it('still works when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(<JobSearch />)
    expect(subtitle()).toHaveTextContent('5 sample openings · Paid · Best match')
  })
})

describe('Find Jobs: bookmarks and quick links', () => {
  it('saves a sample job to the tracker from its save icon', async () => {
    render(<JobSearch />)
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: 'Save job to tracker' })[0])
    expect(await screen.findByText('Saved to Job Tracker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true')
    expect(savedToTracker[0]).toMatchObject({ company: 'Bank of America', role: 'Data Analyst Program', status: 'Saved' })
  })

  it('applies each quick-link view, and clicking again goes back to Best match', async () => {
    render(<JobSearch />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Closing this week/ }))
    expect(companies()).toEqual(['Truist', 'Ally Financial', 'Bank of America', 'Wells Fargo', 'Duke Energy'])
    expect(subtitle()).toHaveTextContent('Closing soon')

    await user.click(screen.getByRole('button', { name: /Top matches for you/ }))
    expect(companies().slice(0, 3)).toEqual(['Truist', 'Wells Fargo', 'Duke Energy'])

    await user.click(screen.getByRole('button', { name: /Because you saved Goldman Sachs/ }))
    expect(companies()).toEqual(['Bank of America', 'Truist', 'Wells Fargo', 'Ally Financial'])

    await user.click(screen.getByRole('button', { name: /Because you saved Goldman Sachs/ }))
    expect(subtitle()).toHaveTextContent('Best match')
  })
})

describe('Find Jobs: live listings', () => {
  it('shows live results from our own /api/jobs route and saves one to the tracker', async () => {
    render(<JobSearch />)
    const user = await search('data analyst', 'Charlotte')

    const live = within(screen.getByRole('region', { name: 'Live listings' }))
    expect(await live.findByText(/Showing 1 of 37 for “data analyst” near Charlotte/)).toHaveTextContent("Paid can't be checked for live listings")
    expect(liveCalls()[0]).toBe('/api/jobs?what=data+analyst&where=Charlotte&page=1')
    expect(screen.getByRole('link', { name: 'Adzuna' })).toBeInTheDocument()

    await user.click(live.getByRole('button', { name: /Data Analyst Intern/ }))
    expect(detail().getByText(/\$50,000 – \$60,000/)).toBeInTheDocument()

    await user.click(detail().getByRole('button', { name: 'Save to tracker' }))
    expect(await detail().findByRole('button', { name: 'In tracker ✓' })).toBeDisabled()
    expect(savedToTracker[0]).toMatchObject({ company: 'Sample Bank', role: 'Data Analyst Intern', status: 'Saved', jobType: 'Internship' })
  })

  it('searches remote live jobs anywhere when the location is "remote"', async () => {
    render(<JobSearch />)
    await search('analyst', 'remote')
    expect(liveCalls()[0]).toBe('/api/jobs?what=analyst+remote&page=1')
  })

  it('shows friendly messages when the live search fails', async () => {
    apiReply = async () => json({ error: { code: 'rate_limited', message: 'Adzuna rate limit reached.' } }, 429)
    render(<JobSearch />)
    await search('analyst')
    expect(await screen.findByRole('alert')).toHaveTextContent('free search limit')
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
    await user.click(screen.getByRole('button', { name: /Data Scientists/ }))

    expect(await screen.findByRole('heading', { name: 'Find Jobs' })).toBeInTheDocument()
    expect(screen.getByLabelText('Job title, company or keyword')).toHaveValue('Data Scientists')
    expect(await screen.findByRole('button', { name: /Data Analyst Intern/ })).toBeInTheDocument()
    expect(liveCalls().some((u) => u.includes('/api/jobs?what=Data+Scientists'))).toBe(true)
    expect(screen.getByRole('link', { name: 'Find Jobs' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows Find Jobs and Explore Careers in the sidebar next to the Job Tracker', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Job Tracker' })).toHaveAttribute('href', '#/jobs')
    expect(screen.getByRole('link', { name: 'Find Jobs' })).toHaveAttribute('href', '#/find-jobs')
    expect(screen.getByRole('link', { name: 'Explore Careers' })).toHaveAttribute('href', '#/careers')
  })
})
