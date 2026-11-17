import { useId } from 'react'
import type { JobListing } from '../../../shared/api'
import type { Opportunity } from '../../data/sampleJobs'
import { formatDate, formatPosted, initialsFor, matchLabel } from '../../lib/findJobs'
import { formatSalary, guessJobType } from '../../lib/jobs'
import { BookmarkIcon } from '../icons'

interface SaveProps {
  /** true when this job is already in the Job Tracker */
  saved: boolean
  /** true while the save request is in progress */
  saving: boolean
  onSave: () => void
}

/** The bookmark icon: adds the job to the Job Tracker. Clicking a saved job does nothing (no un-save yet). */
function SaveButton({ saved, saving, onSave, titleId }: SaveProps & { titleId: string }) {
  return (
    <button
      type="button"
      className={`fj-bookmark${saved ? ' on' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? 'Saved' : 'Save job to tracker'}
      aria-describedby={titleId}
      aria-busy={saving || undefined}
      onClick={() => { if (!saved && !saving) onSave() }}
    >
      <BookmarkIcon filled={saved || saving} />
    </button>
  )
}

interface OpportunityCardProps extends SaveProps {
  job: Opportunity
  selected: boolean
  onSelect: () => void
}

export function OpportunityCard({ job, selected, onSelect, ...save }: OpportunityCardProps) {
  const titleId = useId()
  return (
    <li className={`fj-card${selected ? ' selected' : ''}`}>
      {/* The whole card is one button; the save icon is a separate button on top of it. */}
      <button type="button" className="fj-card-main" aria-pressed={selected} onClick={onSelect}>
        <span className="fj-badge" aria-hidden="true">{job.initials}</span>
        <span className="fj-card-body">
          <span className="fj-company">{job.company}</span>{' '}
          <span className="fj-title" id={titleId}>{job.title}</span>{' '}
          <span className="fj-meta">{job.location} · {job.workMode} · {job.jobType}</span>{' '}
          <span className="fj-card-foot">
            <span className="fj-match">{matchLabel(job.match)} · {job.match}%</span>{' '}
            <span className="fj-deadline">Apply by {formatDate(job.deadline)}</span>
          </span>
        </span>
      </button>
      <SaveButton {...save} titleId={titleId} />
    </li>
  )
}

interface LiveCardProps extends SaveProps {
  job: JobListing
  selected: boolean
  onSelect: () => void
}

export function LiveJobCard({ job, selected, onSelect, ...save }: LiveCardProps) {
  const titleId = useId()
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  return (
    <li className={`fj-card${selected ? ' selected' : ''}`}>
      <button type="button" className="fj-card-main" aria-pressed={selected} onClick={onSelect}>
        <span className="fj-badge" aria-hidden="true">{initialsFor(job.company)}</span>
        <span className="fj-card-body">
          <span className="fj-company">{job.company}</span>{' '}
          <span className="fj-title" id={titleId}>{job.title}</span>{' '}
          <span className="fj-meta">{[job.location, guessJobType(job), salary].filter(Boolean).join(' · ')}</span>{' '}
          <span className="fj-card-foot">
            <span className="fj-live-tag">{save.saved ? 'In tracker ✓' : 'Live listing'}</span>{' '}
            <span className="fj-deadline">{formatPosted(job.created)}</span>
          </span>
        </span>
      </button>
      <SaveButton {...save} titleId={titleId} />
    </li>
  )
}
