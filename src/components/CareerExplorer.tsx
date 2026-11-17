import { useRef, useState, type FormEvent } from 'react'
import type { Career } from '../../shared/api'
import { friendlyMessage, searchCareers } from '../lib/api'

interface Props {
  /** Called when a student clicks a career, to search jobs with that title. */
  onFindJobs: (careerTitle: string) => void
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; careers: Career[]; keyword: string }

export function CareerExplorer({ onFindJobs }: Props) {
  const [keyword, setKeyword] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const latestRequest = useRef(0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const k = keyword.trim()
    if (!k) {
      setState({ kind: 'error', message: 'Enter a major, interest, or keyword to explore careers.' })
      return
    }
    const id = ++latestRequest.current
    setState({ kind: 'loading' })
    try {
      const result = await searchCareers(k)
      if (id === latestRequest.current) setState({ kind: 'done', careers: result.careers, keyword: k })
    } catch (err) {
      if (id === latestRequest.current) setState({ kind: 'error', message: friendlyMessage(err) })
    }
  }

  return (
    <section className="tracker" aria-labelledby="explore-title">
      <header className="tracker-header">
        <div>
          <h1 id="explore-title">Explore Careers</h1>
          <p className="muted">Enter your major or an interest to see matching careers, then find jobs for any of them.</p>
        </div>
      </header>

      <form className="search-form" role="search" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="career-keyword">Major, interest, or keyword</label>
          <input
            id="career-keyword"
            value={keyword}
            maxLength={100}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. economics, cybersecurity, helping people"
          />
        </div>
        <button type="submit" className="btn primary" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Searching…' : 'Explore careers'}
        </button>
      </form>

      {state.kind === 'loading' && <p className="muted" role="status">Finding careers…</p>}
      {state.kind === 'error' && <p className="alert" role="alert">{state.message}</p>}

      {state.kind === 'done' && state.careers.length === 0 && (
        <div className="empty">
          <h2>No careers found</h2>
          <p className="muted">Nothing matched “{state.keyword}”. Try a different or broader word, like “business” or “health”.</p>
        </div>
      )}

      {state.kind === 'done' && state.careers.length > 0 && (
        <>
          <p className="muted small results-count" role="status">
            {state.careers.length} careers match “{state.keyword}”. Click one to find jobs.
          </p>
          <ul className="career-list">
            {state.careers.map((c) => (
              <li key={c.code}>
                <button type="button" className="career" onClick={() => onFindJobs(c.title)}>
                  <span className="career-title">{c.title}</span>
                  <span className="career-meta">
                    {c.brightOutlook && <span className="badge badge-offer">Bright outlook</span>}
                    <span className="muted small">Find jobs →</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="attribution">
        This page includes information from{' '}
        <a href="https://services.onetcenter.org/" target="_blank" rel="noopener noreferrer">O*NET Web Services</a>{' '}
        by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a trademark of USDOL/ETA.
      </p>
    </section>
  )
}
