import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobTracker } from './JobTracker'
import { STORAGE_KEY } from '../lib/storage'

// Each test starts with an empty list so results are predictable.
beforeEach(() => {
  localStorage.setItem(STORAGE_KEY, '[]')
})

async function openForm() {
  const user = userEvent.setup()
  await user.click(screen.getAllByRole('button', { name: '+ Add application' })[0])
  return user
}

describe('Job Tracker: add an application', () => {
  it('shows an empty message when there are no applications', () => {
    render(<JobTracker />)
    expect(screen.getByText('No applications yet')).toBeInTheDocument()
  })

  it('opens the form when "+ Add application" is clicked', async () => {
    render(<JobTracker />)
    await openForm()
    expect(screen.getByRole('dialog', { name: 'Add application' })).toBeInTheDocument()
  })

  it('shows errors and does not save when company and role are empty', async () => {
    render(<JobTracker />)
    const user = await openForm()
    await user.click(screen.getByRole('button', { name: 'Save application' }))
    expect(screen.getByText('Company is required.')).toBeInTheDocument()
    expect(screen.getByText('Role title is required.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('app-count')).toHaveTextContent('0')
  })

  it('shows an error for an invalid posting link', async () => {
    render(<JobTracker />)
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Truist')
    await user.type(screen.getByLabelText('Role title *'), 'Risk Analyst')
    await user.type(screen.getByLabelText('Posting link'), 'truist jobs')
    await user.click(screen.getByRole('button', { name: 'Save application' }))
    expect(screen.getByText(/starts with http/)).toBeInTheDocument()
  })

  it('adds a valid application to the list, defaulting to Saved, and closes the form', async () => {
    render(<JobTracker />)
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Wells Fargo')
    await user.type(screen.getByLabelText('Role title *'), 'Finance Analyst Program')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const card = screen.getByRole('article', { name: 'Wells Fargo, Finance Analyst Program' })
    expect(within(card).getByTestId('status-badge')).toHaveTextContent('Saved')
    expect(screen.getByTestId('app-count')).toHaveTextContent('1')
  })

  it('closes the form without saving when Cancel is clicked', async () => {
    render(<JobTracker />)
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Lowe’s')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-count')).toHaveTextContent('0')
  })
})

describe('Job Tracker: status and saving', () => {
  it('updates the status badge when the status is changed', async () => {
    render(<JobTracker />)
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Duke Energy')
    await user.type(screen.getByLabelText('Role title *'), 'Economic Analyst Intern')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    await user.selectOptions(screen.getByLabelText('Change status for Duke Energy'), 'Applied')
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Applied')
  })

  it('keeps applications after the page reloads', async () => {
    const { unmount } = render(<JobTracker />)
    const user = await openForm()
    await user.type(screen.getByLabelText('Company *'), 'Ally Financial')
    await user.type(screen.getByLabelText('Role title *'), 'Credit Analyst')
    await user.click(screen.getByRole('button', { name: 'Save application' }))
    unmount()

    render(<JobTracker />) // simulates a refresh
    expect(screen.getByRole('article', { name: 'Ally Financial, Credit Analyst' })).toBeInTheDocument()
  })
})
