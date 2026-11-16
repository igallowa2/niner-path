import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { JobListing } from '../../shared/api'
import { SAMPLE_AS_OF, sampleOpportunities } from '../data/sampleJobs'
import { friendlyMessage, searchJobs } from '../lib/api'
import {
  applyView,
  BOOKMARKS_KEY,
  closingSoon,
  deadlineRange,
  DEFAULT_FILTER_PREFS,
  FILTER_PREFS_KEY,
  filtersNotAppliedToLive,
  isFilterPrefs,
  isStringArray,
  liveJobHasFilter,
  matchesSearch,
  opportunityHasFilter,
  passesFilters,
  readStored,
  resultsSummary,
  strongMatchCount,
  wantsRemote,
  writeStored,
  type FilterGroupId,
  type FilterId,
  type FilterPrefs,
  type SearchQuery,
  type View,
} from '../lib/findJobs'
import { jobToApplication } from '../lib/jobs'
import { getProfile, profileSummary } from '../lib/profile'
import { appendApplication, loadApplications } from '../lib/storage'
import { AppHeader } from './AppHeader'
import { FiltersPanel } from './find-jobs/FiltersPanel'
import { LiveJobCard, OpportunityCard } from './find-jobs/JobCards'
import { LiveJobDetail, OpportunityDetail } from './find-jobs/JobDetail'
import { ChevronRightIcon, ClockIcon, PinIcon, SearchIcon, SparkIcon, TargetIcon } from './icons'
import './FindJobs.css'

interface Props {
  /** Pre-filled keyword (e.g. a career picked on Explore Careers). */
  initialWhat?: string
  /** Run the live search right away (used when arriving from Explore Careers). */
  autoSearch?: boolean
}

type LiveState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; jobs: JobListing[]; total: number; what: string; where: string }

type Selection = { kind: 'sample' | 'live'; id: string } | null

export function JobSearch({ initialWhat = '', autoSearch = false }: Props) {
  const profile = getProfile()

  // What's typed in the boxes vs. the search that was actually run (on Search / Enter).
  const [draft, setDraft] = useState<SearchQuery>({ text: initialWhat, location: '' })
  const [query, setQuery] = useState<SearchQuery>({ text: initialWhat, location: '' })
  const [prefs, setPrefs] = useState<FilterPrefs>(() => readStored(FILTER_PREFS_KEY, DEFAULT_FILTER_PREFS, isFilterPrefs))
  const [view, setView] = useState<View>('best')
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(readStored(BOOKMARKS_KEY, [], isStringArray)))
  const [selection, setSelection] = useState<Selection>(null)

  const [live, setLive] = useState<LiveState>({ kind: 'idle' })
  const latestRequest = useRef(0) // ignore replies from older live searches
  const [trackedUrls, setTrackedUrls] = useState<Set<string>>(() => new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const detailRef = useRef<HTMLDivElement>(null)

  // Remember filter choices and bookmarks between visits.
  useEffect(() => writeStored(FILTER_PREFS_KEY, prefs), [prefs])
  useEffect(() => writeStored(BOOKMARKS_KEY, [...bookmarks]), [bookmarks])

  // Which live postings are already in the Job Tracker (so we can show "In tracker ✓").
  useEffect(() => {
    let ignore = false
    loadApplications()
      .then((list) => { if (!ignore) setTrackedUrls(new Set(list.map((a) => a.postingUrl).filter(Boolean))) })
      .catch(() => {}) // The Job Tracker page shows connection errors; saving still works here.
    return () => { ignore = true }
  }, [])

  async function runLiveSearch(q: SearchQuery) {
    const text = q.text.trim()
    if (!text) {
      setLive({ kind: 'idle' })
      return
    }
    // Adzuna has no "remote" location, so search for remote jobs anywhere instead.
    const remote = wantsRemote(q.location)
    const what = remote ? `${text} remote` : text
    const where = remote ? '' : q.location.trim()
    const id = ++latestRequest.current
    setLive({ kind: 'loading' })
    try {
      const result = await searchJobs(what, where)
      if (id === latestRequest.current) setLive({ kind: 'done', jobs: result.jobs, total: result.total, what: text, where: q.location.trim() })
    } catch (err) {
      if (id === latestRequest.current) setLive({ kind: 'error', message: friendlyMessage(err) })
    }
  }

  useEffect(() => {
    if (autoSearch && initialWhat) void runLiveSearch({ text: initialWhat, location: '' })
    // Only on first render: later searches come from the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setQuery(draft)
    void runLiveSearch(draft)
  }

  function toggleFilter(f: FilterId) {
    setPrefs((p) => ({ ...p, selected: p.selected.includes(f) ? p.selected.filter((x) => x !== f) : [...p.selected, f] }))
  }

  function clearEverything() {
    setPrefs((p) => ({ ...p, selected: [] }))
    setView('best')
    setQuery({ text: '', location: '' })
    setDraft({ text: '', location: '' })
  }

  function toggleBookmark(id: string) {
    setBookmarks((b) => {
      const next = new Set(b)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function select(next: Selection) {
    setSelection(next)
    setSaveError('')
    // On narrow screens the detail panel is below the list, so bring it into view.
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1099px)').matches) {
      detailRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }

  async function saveLiveJob(job: JobListing) {
    setSaveError('')
    setSavingId(job.id)
    try {
      await appendApplication(jobToApplication(job))
      setTrackedUrls((s) => new Set(s).add(job.url))
    } catch (err) {
      setSaveError(`Couldn't save "${job.title}" to your tracker. ${err instanceof Error ? err.message : ''}`.trim())
    } finally {
      setSavingId(null)
    }
  }

  // ----- What to show -----
  const visible = applyView(
    sampleOpportunities.filter((o) => matchesSearch(o, query) && passesFilters(o, prefs.selected, opportunityHasFilter)),
    view,
  )
  const liveJobs = live.kind === 'done' ? live.jobs.filter((j) => passesFilters(j, prefs.selected, liveJobHasFilter)) : []
  const liveSkipped = filtersNotAppliedToLive(prefs.selected)

  // Keep the selection if it's still visible; otherwise fall back to the first result.
  const selectedSample = selection?.kind === 'sample' ? visible.find((o) => o.id === selection.id) : undefined
  const selectedLive = selection?.kind === 'live' ? liveJobs.find((j) => j.id === selection.id) : undefined
  const shownSample = selectedLive ? undefined : selectedSample ?? visible[0]
  const shownLive = selectedLive ?? (shownSample ? undefined : liveJobs[0])

  const closing = closingSoon(sampleOpportunities, SAMPLE_AS_OF)
  const strong = strongMatchCount(sampleOpportunities)

  function quickLink(target: View) {
    setView((v) => (v === target ? 'best' : target)) // clicking the active one goes back to Best match
  }

  return (
    <section className="fj-page" aria-labelledby="find-jobs-title">
      <AppHeader />

      <header className="fj-heading">
        <h1 id="find-jobs-title">Find Jobs</h1>
        <p className="muted">{profileSummary(profile)}</p>
      </header>

      <form className="fj-search" role="search" onSubmit={handleSearch} noValidate>
        <div className="fj-inputs">
          <label className="fj-input">
            <SearchIcon />
            <span className="sr-only">Job title, company or keyword</span>
            <input
              value={draft.text}
              maxLength={100}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              placeholder="Job title, company or keyword"
            />
          </label>
          <label className="fj-input">
            <PinIcon />
            <span className="sr-only">City or remote</span>
            <input
              value={draft.location}
              maxLength={100}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="City or remote"
            />
          </label>
        </div>
        <button type="submit" className="btn primary fj-search-btn" disabled={live.kind === 'loading'}>
          {live.kind === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      <FiltersPanel
        prefs={prefs}
        onToggleFilter={toggleFilter}
        onClearAll={() => setPrefs((p) => ({ ...p, selected: [] }))}
        onToggleOpen={() => setPrefs((p) => ({ ...p, open: !p.open }))}
        onToggleGroup={(g: FilterGroupId) => setPrefs((p) => ({ ...p, groupsOpen: { ...p.groupsOpen, [g]: !p.groupsOpen[g] } }))}
      />

      <nav className="fj-quick" aria-label="Quick views">
        <QuickLink icon={<TargetIcon />} title="Top matches for you" subtitle={`${strong} strong matches · Based on your skills`} active={view === 'top'} onClick={() => quickLink('top')} />
        <QuickLink icon={<ClockIcon />} title="Closing this week" subtitle={`${closing.length} deadlines · ${deadlineRange(closing)}`} active={view === 'closing'} onClick={() => quickLink('closing')} />
        <QuickLink icon={<SparkIcon />} title={`Because you saved ${profile.recentlySavedCompany}`} subtitle="Explore finance & research roles" active={view === 'saved-company'} onClick={() => quickLink('saved-company')} />
      </nav>

      <div className="fj-layout">
        <div className="fj-results">
          <section aria-labelledby="fj-opps-title">
            <h2 className="fj-h2" id="fj-opps-title">Opportunities for you</h2>
            <p className="muted small fj-subtitle" aria-live="polite">{resultsSummary(visible.length, prefs.selected, view)}</p>

            {visible.length === 0 ? (
              <div className="fj-empty">
                <h3>No openings match</h3>
                <p className="muted">Try a broader keyword, a different location, or fewer filters.</p>
                <button type="button" className="btn primary" onClick={clearEverything}>Clear filters</button>
              </div>
            ) : (
              <ul className="fj-list">
                {visible.map((job) => (
                  <OpportunityCard
                    key={job.id}
                    job={job}
                    selected={shownSample?.id === job.id}
                    bookmarked={bookmarks.has(job.id)}
                    onSelect={() => select({ kind: 'sample', id: job.id })}
                    onToggleBookmark={() => toggleBookmark(job.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="fj-live" aria-labelledby="fj-live-title">
            <h2 className="fj-h2" id="fj-live-title">Live listings</h2>
            {live.kind === 'idle' && <p className="muted small fj-subtitle">Search above to see real openings from Adzuna.</p>}
            {live.kind === 'loading' && <p className="muted small fj-subtitle" role="status">Searching live listings…</p>}
            {live.kind === 'error' && <p className="alert" role="alert">{live.message}</p>}
            {live.kind === 'done' && (
              <>
                <p className="muted small fj-subtitle" role="status">
                  Showing {liveJobs.length} of {live.total.toLocaleString('en-US')} for “{live.what}”{live.where ? ` near ${live.where}` : ''}
                  {liveSkipped.length > 0 && ` · ${liveSkipped.join(', ')} can't be checked for live listings`}
                </p>
                {liveJobs.length === 0 ? (
                  <p className="muted fj-empty-inline">No live listings match. Try a broader keyword or fewer filters.</p>
                ) : (
                  <ul className="fj-list">
                    {liveJobs.map((job) => (
                      <LiveJobCard
                        key={job.id}
                        job={job}
                        selected={shownLive?.id === job.id}
                        inTracker={!!job.url && trackedUrls.has(job.url)}
                        onSelect={() => select({ kind: 'live', id: job.id })}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
            <p className="attribution">
              Jobs by <a href="https://www.adzuna.com" target="_blank" rel="noopener noreferrer">Adzuna</a>
            </p>
          </section>
        </div>

        <div className="fj-detail-col" ref={detailRef}>
          {shownSample && <OpportunityDetail job={shownSample} asOf={SAMPLE_AS_OF} />}
          {shownLive && (
            <LiveJobDetail
              job={shownLive}
              inTracker={!!shownLive.url && trackedUrls.has(shownLive.url)}
              saving={savingId === shownLive.id}
              saveError={saveError}
              onSave={() => void saveLiveJob(shownLive)}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function QuickLink({ icon, title, subtitle, active, onClick }: { icon: ReactNode; title: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`fj-quick-card${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}>
      <span className="fj-quick-icon" aria-hidden="true">{icon}</span>
      <span className="fj-quick-text">
        <span className="fj-quick-title">{title}</span>
        <span className="fj-meta">{subtitle}</span>
      </span>
      <ChevronRightIcon />
    </button>
  )
}
