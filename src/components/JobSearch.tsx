import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { JobListing } from '../../shared/api'
import { friendlyMessage, searchJobs } from '../lib/api'
import { formatSalary, jobToApplication } from '../lib/jobs'
import { appendApplication, loadApplications } from '../lib/storage'

interface Props {
  /** Pre-filled keyword (e.g. a career picked on Explore Careers). */
  initialWhat?: string
  /** Run the search right away (used when arriving from Explore Careers). */
  autoSearch?: boolean
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; jobs: JobListing[]; total: number; what: string; where: string }

function formatPosted(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function JobSearch({ initialWhat = '', autoSearch = false }: Props) {
  const [what, setWhat] = useState(initialWhat)
  const [where, setWhere] = useState('Charlotte, NC')
  const [state, setState] = useState<State>({ kind: 'idle' })
  // Posting links already in the tracker, so we can show "In tracker" instead of saving twice.
  const [savedUrls, setSavedUrls] = useState<Set<string>>(() => new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  // Ignore replies from older searches if the student searched again in the meantime.
  const latestRequest = useRef(0)

  async function runSearch(searchWhat: string, searchWhere: string) {
    const w = searchWhat.trim()
    if (!w) {
      setState({ kind: 'error', message: 'Enter a job title or keyword to search.' })
      return
    }
    const id = ++latestRequest.current
    setState({ kind: 'loading' })
    try {
      const result = await searchJobs(w, searchWhere.trim())
      if (id === latestRequest.current) {
        setState({ kind: 'done', jobs: result.jobs, total: result.total, what: w, where: searchWhere.trim() })
      }
    } catch (err) {
      if (id === latestRequest.current) setState({ kind: 'error', message: friendlyMessage(err) })
    }
  }

  // Ask the database which postings are already tracked. If that fails, saving still works;
  // the Job Tracker page shows the connection error.
  useEffect(() => {
    let ignore = false
    loadApplications()
      .then((list) => { if (!ignore) setSavedUrls(new Set(list.map((a) => a.postingUrl).filter(Boolean))) })
      .catch(() => {})
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    if (autoSearch && initialWhat) void runSearch(initialWhat, where)
    // Only on first render: later searches come from the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void runSearch(what, where)
  }

  async function saveJob(job: JobListing) {
    setSaveError('')
    setSavingId(job.id)
    try {
      await appendApplication(jobToApplication(job))
      setSavedUrls((s) => new Set(s).add(job.url))
    } catch (err) {
      setSaveError(`Couldn't save "${job.title}" to your tracker. ${err instanceof Error ? err.message : ''}`.trim())
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="tracker" aria-labelledby="find-jobs-title">
      <header className="tracker-header">
        <div>
          <h1 id="find-jobs-title">Find Jobs</h1>
          <p className="muted">Search real job listings and save the ones you like to your tracker.</p>
        </div>
      </header>

      <form className="search-form" role="search" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="job-what">Job title or keyword</label>
          <input id="job-what" value={what} maxLength={100} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. data analyst intern" />
        </div>
        <div className="field">
          <label htmlFor="job-where">Location</label>
          <input id="job-where" value={where} maxLength={100} onChange={(e) => setWhere(e.target.value)} placeholder="City, State (blank = anywhere)" />
        </div>
        <button type="submit" className="btn primary" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Searching…' : 'Search jobs'}
        </button>
      </form>

      {state.kind === 'loading' && <p className="muted" role="status">Searching for jobs…</p>}
      {state.kind === 'error' && <p className="alert" role="alert">{state.message}</p>}
      {saveError && <p className="alert" role="alert">{saveError}</p>}

      {state.kind === 'done' && state.jobs.length === 0 && (
        <div className="empty">
          <h2>No jobs found</h2>
          <p className="muted">
            Nothing matched “{state.what}”{state.where ? ` near ${state.where}` : ''}. Try a broader keyword or clear the location.
          </p>
        </div>
      )}

      {state.kind === 'done' && state.jobs.length > 0 && (
        <>
          <p className="muted small results-count" role="status">
            Showing {state.jobs.length} of {state.total.toLocaleString('en-US')} jobs for “{state.what}”
            {state.where ? ` near ${state.where}` : ''}
          </p>
          <div className="list">
            {state.jobs.map((job) => {
              const salary = formatSalary(job.salaryMin, job.salaryMax)
              const meta = [job.location, salary, formatPosted(job.created)].filter(Boolean).join(' · ')
              const inTracker = !!job.url && savedUrls.has(job.url)
              return (
                <article className="card" key={job.id} aria-label={`${job.company}, ${job.title}`}>
                  <div className="card-body">
                    <p className="company">{job.company}</p>
                    <h3 className="role">{job.title}</h3>
                    {meta && <p className="muted small">{meta}</p>}
                    {job.snippet && <p className="snippet">{job.snippet}</p>}
                  </div>
                  <div className="card-side">
                    <button type="button" className="btn primary small-btn" onClick={() => saveJob(job)} disabled={inTracker || savingId === job.id}>
                      {inTracker ? 'In tracker ✓' : savingId === job.id ? 'Saving…' : 'Save to tracker'}
                    </button>
                    {job.url && (
                      <a className="link" href={job.url} target="_blank" rel="noopener noreferrer">
                        View posting<span className="sr-only"> for {job.title} (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      <p className="attribution">
        Jobs by{' '}
        <a href="https://www.adzuna.com" target="_blank" rel="noopener noreferrer">Adzuna</a>
      </p>
    </section>
  )
}
