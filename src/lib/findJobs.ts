/**
 * Logic for the Find Jobs page: search, filters, sorting ("views"), quick-link counts,
 * dates, and saving preferences. No React here, so it is easy to test.
 */
import type { JobListing } from '../../shared/api'
import type { Opportunity } from '../data/sampleJobs'
import { guessJobType } from './jobs'

// ---------- Filters ----------

export const FILTER_GROUPS = [
  { id: 'type', label: 'Job type', filters: ['Internship', 'Full-time', 'Part-time', 'Co-op'] },
  { id: 'location', label: 'Location', filters: ['On-campus', 'Remote'] },
  { id: 'other', label: 'Other', filters: ['Paid', 'Sponsors visas'] },
] as const

export type FilterGroupId = (typeof FILTER_GROUPS)[number]['id']
export type FilterId = (typeof FILTER_GROUPS)[number]['filters'][number]

export const ALL_FILTERS: FilterId[] = FILTER_GROUPS.flatMap((g) => [...g.filters])

/**
 * Does `item` pass the selected filters?
 * Filters in the same group are OR ("Internship or Co-op"); different groups are AND.
 * `test` returns null when a filter can't be checked for this kind of item (it is then ignored).
 */
export function passesFilters<T>(item: T, selected: readonly FilterId[], test: (item: T, f: FilterId) => boolean | null): boolean {
  return FILTER_GROUPS.every((group) => {
    const results = group.filters
      .filter((f) => selected.includes(f))
      .map((f) => test(item, f))
      .filter((r): r is boolean => r !== null)
    return results.length === 0 || results.some(Boolean)
  })
}

export function opportunityHasFilter(o: Opportunity, f: FilterId): boolean {
  switch (f) {
    case 'On-campus': return o.onCampus
    case 'Remote': return o.workMode === 'Remote'
    case 'Paid': return o.paid
    case 'Sponsors visas': return o.sponsorsVisas
    default: return o.jobType === f
  }
}

const REMOTE = /\bremote\b/i

/** Live Adzuna listings only tell us job type and (from the text) whether they're remote. */
export function liveJobHasFilter(job: JobListing, f: FilterId): boolean | null {
  switch (f) {
    case 'Internship':
    case 'Full-time':
    case 'Part-time':
    case 'Co-op':
      return guessJobType(job) === f
    case 'Remote':
      return REMOTE.test(`${job.title} ${job.location} ${job.snippet}`)
    default:
      return null
  }
}

/** Selected filters that live listings can't be checked against (shown as a note). */
export function filtersNotAppliedToLive(selected: readonly FilterId[]): FilterId[] {
  return selected.filter((f) => f === 'On-campus' || f === 'Paid' || f === 'Sponsors visas')
}

// ---------- Search ----------

export interface SearchQuery {
  text: string
  location: string
}

export function wantsRemote(location: string): boolean {
  return REMOTE.test(location)
}

/** Every word of the search text must appear in the job; location matches the city or "remote". */
export function matchesSearch(o: Opportunity, q: SearchQuery): boolean {
  const words = q.text.toLowerCase().split(/\s+/).filter(Boolean)
  const haystack = [o.title, o.company, o.jobType, o.description, ...o.keywords, ...o.industries].join(' ').toLowerCase()
  if (!words.every((w) => haystack.includes(w))) return false

  const loc = q.location.trim().toLowerCase()
  if (!loc) return true
  if (wantsRemote(loc)) return o.workMode === 'Remote'
  return o.location.toLowerCase().includes(loc)
}

// ---------- Views (quick links + sort) ----------

export type View = 'best' | 'top' | 'closing' | 'saved-company'

export const VIEW_LABELS: Record<View, string> = {
  best: 'Best match',
  top: 'Highest match',
  closing: 'Closing soon',
  'saved-company': 'Finance & research',
}

const SAVED_COMPANY_INDUSTRIES = ['Finance', 'Research']

/** "best" keeps the recommended order from the data file. */
export function applyView(list: Opportunity[], view: View): Opportunity[] {
  switch (view) {
    case 'top': return [...list].sort((a, b) => b.match - a.match)
    case 'closing': return [...list].sort((a, b) => a.deadline.localeCompare(b.deadline))
    case 'saved-company': return list.filter((o) => o.industries.some((i) => SAVED_COMPANY_INDUSTRIES.includes(i)))
    default: return list
  }
}

export const STRONG_MATCH = 80

export function matchLabel(match: number): string {
  if (match >= STRONG_MATCH) return 'Strong match'
  if (match >= 60) return 'Good match'
  return 'Fair match'
}

export function strongMatchCount(list: Opportunity[]): number {
  return list.filter((o) => o.match >= STRONG_MATCH).length
}

/** Openings with a deadline from `asOf` through 7 days later, soonest first. */
export function closingSoon(list: Opportunity[], asOf: string, days = 7): Opportunity[] {
  const end = addDays(asOf, days)
  return list.filter((o) => o.deadline >= asOf && o.deadline <= end).sort((a, b) => a.deadline.localeCompare(b.deadline))
}

/** "October 9–12", or "September 30 – October 2" across months. */
export function deadlineRange(list: Opportunity[]): string {
  if (list.length === 0) return ''
  const first = toDate(list[0].deadline)
  const last = toDate(list[list.length - 1].deadline)
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'long' })
  if (first.getTime() === last.getTime()) return `${month(first)} ${first.getDate()}`
  if (first.getMonth() === last.getMonth()) return `${month(first)} ${first.getDate()}–${last.getDate()}`
  return `${month(first)} ${first.getDate()} – ${month(last)} ${last.getDate()}`
}

/** "5 sample openings · Paid · Best match" */
export function resultsSummary(count: number, selected: readonly FilterId[], view: View): string {
  const parts = [`${count} sample ${count === 1 ? 'opening' : 'openings'}`]
  // Show filters in the same order as the chips.
  const active = ALL_FILTERS.filter((f) => selected.includes(f))
  if (active.length) parts.push(active.join(', '))
  parts.push(VIEW_LABELS[view])
  return parts.join(' · ')
}

// ---------- Display helpers ----------

/** "Wells Fargo" -> "WF", "Truist" -> "T" */
export function initialsFor(company: string): string {
  return company.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
}

/** "Posted Nov 1" from an ISO timestamp, or '' if it can't be read. */
export function formatPosted(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ---------- Dates ----------

/** Parses YYYY-MM-DD as a local date (no time-zone shift). */
export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(iso: string, days: number): string {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Oct 12, 2026" */
export function formatDate(iso: string): string {
  return toDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Sep 22" */
export function formatShortDate(iso: string): string {
  return toDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / 86_400_000)
}

/** "today", "3 days ago", "2 weeks ago" */
export function timeAgo(days: number): string {
  if (days <= 0) return 'today'
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  const weeks = Math.floor(days / 7)
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
}

// ---------- Saved preferences (localStorage) ----------

export interface FilterPrefs {
  open: boolean
  groupsOpen: Record<FilterGroupId, boolean>
  selected: FilterId[]
}

export const DEFAULT_FILTER_PREFS: FilterPrefs = {
  open: false,
  groupsOpen: { type: true, location: true, other: true },
  selected: ['Paid'],
}

export const FILTER_PREFS_KEY = 'niner-path.findJobs.filters'

/** Reads JSON from localStorage. Returns `fallback` if storage is blocked, empty, or holds bad data. */
export function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

/** Saves JSON to localStorage. Silently does nothing if storage is blocked (e.g. private browsing). */
export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The page still works for this visit.
  }
}

export function isFilterPrefs(value: unknown): value is FilterPrefs {
  const v = value as FilterPrefs | null
  return (
    !!v &&
    typeof v.open === 'boolean' &&
    !!v.groupsOpen &&
    FILTER_GROUPS.every((g) => typeof v.groupsOpen[g.id] === 'boolean') &&
    Array.isArray(v.selected) &&
    v.selected.every((f) => (ALL_FILTERS as string[]).includes(f))
  )
}
