import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobTracker } from './JobTracker'
import type { Application } from '../types'

/**
 * A pretend API server that keeps applications in memory, so these tests don't need
 * the real server or database. Its data survives unmount/re-render, like a real database.
 * `override` lets a test force a specific reply (for example, an error).
 */
function fakeApi(override?: (method: string, url: string) => Response | undefined) {
  let db: Application[] = []
  let nextId = 1
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const forced = override?.(method, url)
    if (forced) return forced

    if (url === '/api/applications' && method === 'GET') return json(200, db)
    if (url === '/api/applications' && method === 'POST') {
      const input = JSON.parse(String(init.body))
      const app: Application = { ...input, id: `id-${nextId++}`, timeline: [{ status: input.status, date: '2026-11-15' }] }
      db = [app, ...db]
      return json(201, app)
    }
    const match = url.match(/^\/api\/applications\/([^/]+)(\/status)?$/)
    const existing = match && db.find((a) => a.id === decodeURIComponent(match[1]))
    if (!existing) return json(404, { error: 'Application was not found' })
    if (method === 'PATCH') {
      const { status } = JSON.parse(String(init.body))
      const updated = { ...existing, status, timeline: [...existing.timeline, { status, date: '2026-11-15' }] }
      db = db.map((a) => (a.id === existing.id ? updated : a))
      return json(200, updated)
    }
    db = db.filter((a) => a.id !== existing.id) // DELETE
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Renders the tracker and waits until the (empty) list has loaded from the fake API. */
async function renderTracker() {
  const result = render(<JobTracker />)
  await screen.findByText('No applications yet')
  return result
}

async function openForm() {
  const user = userEvent.setup()
  await user.click(screen.getAllByRole('button', { name: '+ Add application' })[0])
  return user
}

async function addApp(user: ReturnType<typeof userEvent.setup>, company: string, role: string) {
  await user.type(screen.getByLabelText('Company *'), company)
  await user.type(screen.getByLabelText('Role title *'), role)
  await user.click(screen.getByRole('button', { name: 'Save application' }))
  return screen.findByRole('article', { name: `${company}, ${role}` })
}

describe('Job Tracker: loading', () => {
  it('shows a loading message, then the empty message', async () => {
    fakeApi()
    render(<JobTracker />)
    expect(screen.getByText('Loading your applications…')).toBeInTheDocument()
    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
  })

  it('shows a clear error when the server is down, and loads after "Try again"', async () => {
    let serverUp = false
    fakeApi(() => (serverUp ? undefined : new Response('', { status: 500 })))
    render(<JobTracker />)

    expect(await screen.findByText("Couldn't load your applications")).toBeInTheDocument()
    expect(screen.getByText(/Make sure the API is running/)).toBeInTheDocument()

    serverUp = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
  })
})

describe('Job Tracker: add an application', () => {
  it('opens the form when "+ Add application" is clicked', async () => {
    fakeApi()
    await renderTracker()
    await openForm()
    expect(screen.getByRole('dialog', { name: 'Add application' })).toBeInTheDocument()
  })

  it('shows errors and sends nothing when company and role are empty', async () => {
    const fetchMock = fakeApi()
    await renderTracker()
    const user = await openForm()
    await user.click(screen.getByRole('button', { name: 'Save application' }))
    expect(screen.getByText('Company is required.')).toBeInTheDocument()
    expect(screen.getByText('Role title is required.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1) // only the first GET, no POST
  })

  it('shows an error for an invalid posting link', async () => {
    fakeApi()
    await renderTracker()
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Truist')
    await user.type(screen.getByLabelText('Role title *'), 'Risk Analyst')
    await user.type(screen.getByLabelText('Posting link'), 'truist jobs')
    await user.click(screen.getByRole('button', { name: 'Save application' }))
    expect(screen.getByText(/starts with http/)).toBeInTheDocument()
  })

  it('saves a valid application through the API, defaulting to Saved, and closes the form', async () => {
    const fetchMock = fakeApi()
    await renderTracker()
    const user = await openForm()
    const card = await addApp(user, 'Wells Fargo', 'Finance Analyst Program')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(card).getByTestId('status-badge')).toHaveTextContent('Saved')
    expect(screen.getByTestId('app-count')).toHaveTextContent('1')
    expect(fetchMock).toHaveBeenCalledWith('/api/applications', expect.objectContaining({ method: 'POST' }))
  })

  it('keeps the form open and shows the message when the server cannot save', async () => {
    fakeApi((method) => (method === 'POST' ? new Response('', { status: 500 }) : undefined))
    await renderTracker()
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Lowe’s')
    await user.type(screen.getByLabelText('Role title *'), 'IT Intern')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText(/Make sure the API is running/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Company *')).toHaveValue('Lowe’s') // nothing typed is lost
  })

  it('closes the form without saving when Cancel is clicked', async () => {
    fakeApi()
    await renderTracker()
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Lowe’s')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-count')).toHaveTextContent('0')
  })
})

describe('Job Tracker: status, delete, and saving', () => {
  it('updates the status badge through the API', async () => {
    fakeApi()
    await renderTracker()
    const user = await openForm()
    await addApp(user, 'Duke Energy', 'Economic Analyst Intern')

    await user.selectOptions(screen.getByLabelText('Change status for Duke Energy'), 'Applied')
    expect(await screen.findByText('Applied', { selector: '[data-testid="status-badge"]' })).toBeInTheDocument()
  })

  it('shows an error and keeps the old status when the update fails', async () => {
    fakeApi((method) => (method === 'PATCH' ? new Response(JSON.stringify({ error: 'Something went wrong on the server.' }), { status: 500 }) : undefined))
    await renderTracker()
    const user = await openForm()
    await addApp(user, 'Duke Energy', 'Economic Analyst Intern')

    await user.selectOptions(screen.getByLabelText('Change status for Duke Energy'), 'Applied')
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't update the status. Something went wrong on the server.")
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Saved')
  })

  it('deletes an application after confirming', async () => {
    fakeApi()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await renderTracker()
    const user = await openForm()
    await addApp(user, 'Atrium Health', 'Data Intern')

    await user.click(screen.getByRole('button', { name: 'Delete Atrium Health, Data Intern' }))
    expect(await screen.findByText('Deleted Data Intern at Atrium Health.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-count')).toHaveTextContent('0')
  })

  it('does not delete when the user cancels the confirmation', async () => {
    const fetchMock = fakeApi()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderTracker()
    const user = await openForm()
    await addApp(user, 'Atrium Health', 'Data Intern')

    await user.click(screen.getByRole('button', { name: 'Delete Atrium Health, Data Intern' }))
    expect(screen.getByRole('article', { name: 'Atrium Health, Data Intern' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'DELETE' }))
  })

  it('loads saved applications from the server after the page reloads', async () => {
    fakeApi()
    const { unmount } = await renderTracker()
    const user = await openForm()
    await addApp(user, 'Ally Financial', 'Credit Analyst')
    unmount()

    render(<JobTracker />) // simulates a refresh: the list must come back from the server
    expect(await screen.findByRole('article', { name: 'Ally Financial, Credit Analyst' })).toBeInTheDocument()
  })
})
