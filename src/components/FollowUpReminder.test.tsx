import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { Application } from '../types'
import { FollowUpReminder } from './FollowUpReminder'

const application: Application = {
  id: 'app-1',
  company: 'Acme',
  role: 'Analyst',
  location: '',
  jobType: 'Internship',
  industry: '',
  deadline: '',
  status: 'Applied',
  postingUrl: '',
  timeline: [{ status: 'Applied', date: '2026-11-01' }],
}

describe('FollowUpReminder', () => {
  it('shows the days since applying after 14 days', () => {
    render(<FollowUpReminder app={application} now={new Date(2026, 10, 17)} />)

    expect(screen.getByRole('complementary', { name: 'Follow-up reminder' }))
      .toHaveTextContent('Applied 16 days ago. Send a follow-up?')
  })

  it('hides before 14 days and when the status is no longer Applied', () => {
    const { rerender } = render(
      <FollowUpReminder app={application} now={new Date(2026, 10, 14)} />,
    )
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    rerender(
      <FollowUpReminder
        app={{ ...application, status: 'Interviewing' }}
        now={new Date(2026, 10, 17)}
      />,
    )
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
