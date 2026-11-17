import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JobListing } from '../../shared/api'
import { SAMPLE_AS_OF, sampleOpportunities as jobs } from '../data/sampleJobs'
import {
  applyView,
  closingSoon,
  deadlineRange,
  DEFAULT_FILTER_PREFS,
  isFilterPrefs,
  liveJobHasFilter,
  matchesSearch,
  opportunityHasFilter,
  passesFilters,
  readStored,
  resultsSummary,
  strongMatchCount,
  timeAgo,
  writeStored,
  type FilterId,
} from './findJobs'
import { getProfile, profileSummary } from './profile'

const ids = (list: { id: string }[]) => list.map((j) => j.id)
const filtered = (selected: FilterId[]) => jobs.filter((o) => passesFilters(o, selected, opportunityHasFilter))

afterEach(() => vi.restoreAllMocks())

describe('filters', () => {
  it('treats chips in the same group as OR', () => {
    expect(filtered(['Internship']).map((j) => j.company)).toEqual(['Wells Fargo', 'Duke Energy'])
    expect(filtered(['Internship', 'Full-time'])).toHaveLength(5)
  })

  it('treats chips in different groups as AND', () => {
    expect(filtered(['Internship', 'Sponsors visas']).map((j) => j.company)).toEqual(['Wells Fargo'])
    expect(filtered(['Internship', 'Remote'])).toHaveLength(0)
  })

  it('ignores filters that live listings cannot be checked for', () => {
    const live = { title: 'Remote Data Analyst Intern', location: 'Anywhere', snippet: '', contractTime: null } as JobListing
    expect(passesFilters(live, ['Paid', 'Sponsors visas'], liveJobHasFilter)).toBe(true)
    expect(passesFilters(live, ['Internship', 'Remote'], liveJobHasFilter)).toBe(true)
    expect(passesFilters(live, ['Full-time'], liveJobHasFilter)).toBe(false)
  })
})

describe('search', () => {
  it('matches every word against title, company, and keywords', () => {
    expect(ids(jobs.filter((o) => matchesSearch(o, { text: 'credit', location: '' })))).toEqual(['truist-credit-analyst'])
    expect(jobs.filter((o) => matchesSearch(o, { text: 'wells data', location: '' }))).toHaveLength(1)
    expect(jobs.filter((o) => matchesSearch(o, { text: 'ANALYST', location: 'charlotte' })).length).toBeGreaterThan(1)
  })

  it('matches "remote" to remote jobs only', () => {
    expect(jobs.filter((o) => matchesSearch(o, { text: '', location: 'Remote' }))).toHaveLength(0)
    expect(matchesSearch({ ...jobs[0], workMode: 'Remote' }, { text: '', location: 'remote' })).toBe(true)
  })
})

describe('quick views', () => {
  it('sorts by match, by deadline, or keeps finance & research roles', () => {
    expect(applyView(jobs, 'top').slice(0, 3).every((o) => o.match === 80)).toBe(true)
    expect(applyView(jobs, 'closing').map((o) => o.deadline)).toEqual(['2026-10-09', '2026-10-11', '2026-10-12', '2026-10-19', '2026-10-23'])
    expect(applyView(jobs, 'saved-company').map((o) => o.company)).not.toContain('Duke Energy')
    expect(applyView(jobs, 'best')).toEqual(jobs)
  })

  it('builds the quick-link counts from the data', () => {
    expect(strongMatchCount(jobs)).toBe(3)
    const closing = closingSoon(jobs, SAMPLE_AS_OF)
    expect(closing).toHaveLength(3)
    expect(deadlineRange(closing)).toBe('October 9–12')
  })

  it('summarizes results for the subtitle', () => {
    expect(resultsSummary(5, ['Paid'], 'best')).toBe('5 sample openings · Paid · Best match')
    expect(resultsSummary(1, [], 'closing')).toBe('1 sample opening · Closing soon')
  })
})

describe('helpers', () => {
  it('describes time since applying', () => {
    expect(timeAgo(14)).toBe('2 weeks ago')
    expect(timeAgo(3)).toBe('3 days ago')
    expect(timeAgo(1)).toBe('1 day ago')
  })

  it("builds the subtitle from the student's profile", () => {
    expect(profileSummary(getProfile())).toBe('Economics · Software Development minor · Graduating May 2027 · Targeting Data Analyst roles')
  })
})

describe('saved preferences', () => {
  it('falls back to defaults when stored data is broken', () => {
    localStorage.setItem('test-key', '{"open": "yes"}')
    expect(readStored('test-key', DEFAULT_FILTER_PREFS, isFilterPrefs)).toEqual(DEFAULT_FILTER_PREFS)
    localStorage.setItem('test-key', 'not json')
    expect(readStored('test-key', DEFAULT_FILTER_PREFS, isFilterPrefs)).toEqual(DEFAULT_FILTER_PREFS)
  })

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readStored('x', DEFAULT_FILTER_PREFS, isFilterPrefs)).toEqual(DEFAULT_FILTER_PREFS)
    expect(() => writeStored('x', { a: 1 })).not.toThrow()
  })
})
