import { STATUSES, type Application, type Status } from '../types'

interface Props {
  app: Application
  onStatusChange: (id: string, status: Status) => void
}

function initials(company: string) {
  return company.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ApplicationCard({ app, onStatusChange }: Props) {
  const meta = [app.location, app.jobType, app.industry].filter(Boolean).join(' · ')
  const lastChange = app.timeline[app.timeline.length - 1]

  return (
    <article className="card" aria-label={`${app.company}, ${app.role}`}>
      <div className="logo" aria-hidden="true">{initials(app.company)}</div>
      <div className="card-body">
        <p className="company">{app.company}</p>
        <h3 className="role">{app.role}</h3>
        {meta && <p className="muted small">{meta}</p>}
        <p className="muted small">
          {app.deadline ? `Apply by ${formatDate(app.deadline)}` : 'No deadline set'}
          {lastChange && ` · ${lastChange.status} on ${formatDate(lastChange.date)}`}
        </p>
      </div>
      <div className="card-side">
        <span className={`badge badge-${app.status.toLowerCase()}`} data-testid="status-badge">{app.status}</span>
        <label className="sr-only" htmlFor={`status-${app.id}`}>Change status for {app.company}</label>
        <select
          id={`status-${app.id}`}
          className="status-select"
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value as Status)}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </article>
  )
}
