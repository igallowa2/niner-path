import type { JobListing } from '../../../shared/api'
import type { Opportunity, TimelineStep } from '../../data/sampleJobs'
import { daysBetween, formatDate, formatPosted, formatShortDate, initialsFor, matchLabel, timeAgo } from '../../lib/findJobs'
import { formatSalary, guessJobType } from '../../lib/jobs'
import { CheckIcon } from '../icons'

function DetailTop({ initials, company, location, tag }: { initials: string; company: string; location: string; tag?: string }) {
  return (
    <div className="fj-detail-top">
      <span className="fj-badge" aria-hidden="true">{initials}</span>
      <div>
        <p className="fj-company">{company}</p>
        <p className="fj-meta">{location}</p>
      </div>
      {tag && <span className="fj-tag">{tag}</span>}
    </div>
  )
}

type StepState = 'complete' | 'current' | 'upcoming'

/** The latest step with a date is "current"; earlier dated steps are complete. */
function stepStates(steps: TimelineStep[]): StepState[] {
  const lastDated = steps.map((s) => !!s.date).lastIndexOf(true)
  return steps.map((s, i) => (!s.date ? 'upcoming' : i === lastDated ? 'current' : 'complete'))
}

const STATE_TEXT: Record<StepState, string> = { complete: 'Complete', current: 'Current', upcoming: '' }

export function OpportunityDetail({ job, asOf }: { job: Opportunity; asOf: string }) {
  const have = job.skills.filter((s) => s.have)
  const missing = job.skills.filter((s) => !s.have).slice(0, 3)
  const states = stepStates(job.timeline)
  const started = states.some((s) => s !== 'upcoming')

  const applied = job.timeline.find((s) => s.label === 'Applied' && s.date)
  const daysSinceApplied = applied ? daysBetween(applied.date, asOf) : 0
  const interviewing = job.timeline.some((s) => s.label === 'Interview' && s.date)
  const showFollowUp = !!applied && !interviewing && !job.recruiterReplied && daysSinceApplied >= 7

  const followUpLink = `mailto:?subject=${encodeURIComponent(`Following up on my ${job.title} application`)}&body=${encodeURIComponent(
    `Hello,\n\nI applied for the ${job.title} role at ${job.company} on ${formatDate(applied?.date || asOf)} and wanted to follow up. I'm still very interested and would be glad to share anything else you need.\n\nThank you,\n`,
  )}`

  return (
    <article className="fj-detail" aria-labelledby="fj-detail-title">
      <DetailTop initials={job.initials} company={job.company} location={`${job.location} · ${job.workMode}`} tag={job.isNew ? 'New' : undefined} />

      <h2 className="fj-detail-title" id="fj-detail-title">{job.title}</h2>
      <p className="fj-meta">{job.jobType} · Apply by {formatDate(job.deadline)}</p>
      <a className="fj-ext-link" href={job.postingUrl} target="_blank" rel="noopener noreferrer">
        View posting ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p className="fj-description">{job.description}</p>

      <section className="fj-skills" aria-label="Skills match">
        <div className="fj-skills-head">
          <p><strong>You match {have.length} of {job.skills.length} skills</strong></p>
          <span className="fj-match">{matchLabel(job.match)}</span>
        </div>
        <div className="fj-progress" role="progressbar" aria-label="Skills matched" aria-valuemin={0} aria-valuemax={job.skills.length} aria-valuenow={have.length}>
          <div className="fj-progress-fill" style={{ width: `${(have.length / job.skills.length) * 100}%` }} />
        </div>
        <ul className="fj-skill-list">
          {have.map((s) => (
            <li key={s.name}><span className="fj-checkbox" aria-hidden="true"><CheckIcon size={12} /></span>{s.name}</li>
          ))}
        </ul>
      </section>

      {missing.length > 0 && (
        <section className="fj-section" aria-labelledby="fj-next-skills">
          <h3 className="fj-eyebrow" id="fj-next-skills">Build your next {missing.length === 3 ? 'three' : missing.length} skills</h3>
          <ul className="fj-gap-list">
            {missing.map((s) => (
              <li key={s.name}>
                <span className="fj-dashed" aria-hidden="true" />
                <span className="fj-gap-name">{s.name}</span>
                {s.learnUrl && (
                  <a className="fj-ext-link" href={s.learnUrl} target="_blank" rel="noopener noreferrer">
                    Close the gap ↗<span className="sr-only"> for {s.name} (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="fj-section" aria-labelledby="fj-timeline-title">
        <h3 className="fj-section-title" id="fj-timeline-title">Application timeline</h3>
        {started ? (
          <ol className="fj-timeline">
            {job.timeline.map((step, i) => (
              <li key={step.label} className={`fj-step ${states[i]}`}>
                <span className="fj-marker" aria-hidden="true">{states[i] === 'complete' && <CheckIcon size={12} />}</span>
                <span>
                  <strong>{step.label}</strong>
                  <span className="fj-meta">
                    {step.date ? `${formatDate(step.date)} · ${STATE_TEXT[states[i]]}` : 'Not yet scheduled'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="fj-meta">Not started yet. Save this job to start tracking it.</p>
        )}
      </section>

      {showFollowUp && applied && (
        <aside className="fj-followup" aria-label="Follow-up reminder">
          <div>
            <p><strong>Applied {timeAgo(daysSinceApplied)}. Send a follow-up?</strong></p>
            <p className="fj-meta">{daysSinceApplied} days since {formatShortDate(applied.date)} · No recruiter reply yet.</p>
          </div>
          <a className="fj-followup-link" href={followUpLink}>Draft follow-up →</a>
        </aside>
      )}
    </article>
  )
}

interface LiveDetailProps {
  job: JobListing
  inTracker: boolean
  saving: boolean
  saveError: string
  onSave: () => void
}

export function LiveJobDetail({ job, inTracker, saving, saveError, onSave }: LiveDetailProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  return (
    <article className="fj-detail" aria-labelledby="fj-detail-title">
      <DetailTop initials={initialsFor(job.company)} company={job.company} location={job.location} tag="Live" />

      <h2 className="fj-detail-title" id="fj-detail-title">{job.title}</h2>
      <p className="fj-meta">{[guessJobType(job), salary, formatPosted(job.created)].filter(Boolean).join(' · ')}</p>
      {job.url && (
        <a className="fj-ext-link" href={job.url} target="_blank" rel="noopener noreferrer">
          View posting ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      {job.snippet && <p className="fj-description">{job.snippet}</p>}

      <button type="button" className="btn primary fj-save-btn" onClick={onSave} disabled={inTracker || saving}>
        {inTracker ? 'In tracker ✓' : saving ? 'Saving…' : 'Save to tracker'}
      </button>
      {saveError && <p className="alert" role="alert">{saveError}</p>}
      <p className="fj-meta fj-note">Live listing from Adzuna. Match scores and skills are shown for sample openings only.</p>
    </article>
  )
}
