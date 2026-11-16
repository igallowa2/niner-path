import type { JobListing } from '../../../shared/api'
import type { Opportunity } from '../../data/sampleJobs'
import { formatDate, formatPosted, initialsFor, matchLabel } from '../../lib/findJobs'
import { formatSalary, guessJobType } from '../../lib/jobs'
import { BookmarkIcon } from '../icons'

interface OpportunityCardProps {
  job: Opportunity
  selected: boolean
  bookmarked: boolean
  onSelect: () => void
  onToggleBookmark: () => void
}

export function OpportunityCard({ job, selected, bookmarked, onSelect, onToggleBookmark }: OpportunityCardProps) {
  return (
    <li className={`fj-card${selected ? ' selected' : ''}`}>
      {/* The whole card is one button; the bookmark is a separate button on top of it. */}
      <button type="button" className="fj-card-main" aria-pressed={selected} onClick={onSelect}>
        <span className="fj-badge" aria-hidden="true">{job.initials}</span>
        <span className="fj-card-body">
          <span className="fj-company">{job.company}</span>{' '}
          <span className="fj-title">{job.title}</span>{' '}
          <span className="fj-meta">{job.location} · {job.workMode} · {job.jobType}</span>{' '}
          <span className="fj-card-foot">
            <span className="fj-match">{matchLabel(job.match)} · {job.match}%</span>{' '}
            <span className="fj-deadline">Apply by {formatDate(job.deadline)}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`fj-bookmark${bookmarked ? ' on' : ''}`}
        aria-pressed={bookmarked}
        aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${job.title} at ${job.company}`}
        onClick={onToggleBookmark}
      >
        <BookmarkIcon filled={bookmarked} />
      </button>
    </li>
  )
}

interface LiveCardProps {
  job: JobListing
  selected: boolean
  inTracker: boolean
  onSelect: () => void
}

export function LiveJobCard({ job, selected, inTracker, onSelect }: LiveCardProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  return (
    <li className={`fj-card${selected ? ' selected' : ''}`}>
      <button type="button" className="fj-card-main" aria-pressed={selected} onClick={onSelect}>
        <span className="fj-badge" aria-hidden="true">{initialsFor(job.company)}</span>
        <span className="fj-card-body">
          <span className="fj-company">{job.company}</span>{' '}
          <span className="fj-title">{job.title}</span>{' '}
          <span className="fj-meta">{[job.location, guessJobType(job), salary].filter(Boolean).join(' · ')}</span>{' '}
          <span className="fj-card-foot">
            <span className="fj-live-tag">{inTracker ? 'In tracker ✓' : 'Live listing'}</span>{' '}
            <span className="fj-deadline">{formatPosted(job.created)}</span>
          </span>
        </span>
      </button>
    </li>
  )
}
