import type { JobListing } from '../../shared/api'
import type { Opportunity } from '../data/sampleJobs'
import type { Application, ApplicationInput, JobType } from '../types'

/**
 * Turns an O*NET career title into a good job-search keyword.
 * "Architects, Except Landscape and Naval" -> "Architects"
 * "Data Scientists" -> "Data Scientists"
 */
export function toJobKeyword(careerTitle: string): string {
  return careerTitle.split(',')[0].replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
}

/** Guesses our job type from an Adzuna listing. */
export function guessJobType(job: JobListing): JobType {
  const title = job.title.toLowerCase()
  if (/\bco-?op\b/.test(title)) return 'Co-op'
  if (/\bintern(ship)?\b/.test(title)) return 'Internship'
  if (job.contractTime === 'part_time') return 'Part-time'
  return 'Full-time'
}

/** Turns an Adzuna listing into a Job Tracker application (status "Saved"). */
export function jobToApplication(job: JobListing): ApplicationInput {
  return {
    company: job.company,
    role: job.title,
    location: job.location,
    jobType: guessJobType(job),
    industry: job.category.replace(/\s+Jobs$/i, ''),
    deadline: '',
    status: 'Saved',
    postingUrl: job.url,
  }
}

/** Turns a Find Jobs opportunity into a Job Tracker application (status "Saved"). */
export function opportunityToApplication(o: Opportunity): ApplicationInput {
  return {
    company: o.company,
    role: o.title,
    location: o.location,
    jobType: o.jobType,
    industry: o.industries[0] ?? '',
    deadline: o.deadline,
    status: 'Saved',
    postingUrl: o.postingUrl,
  }
}

type TrackedFields = Pick<Application, 'company' | 'role' | 'postingUrl'>

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Is this job already in the tracker? Matches on the posting link, or on
 * company + role when the job has no link.
 */
export function isAlreadyTracked(tracked: readonly TrackedFields[], job: TrackedFields): boolean {
  const url = norm(job.postingUrl)
  if (url) return tracked.some((t) => norm(t.postingUrl) === url)
  return tracked.some((t) => norm(t.company) === norm(job.company) && norm(t.role) === norm(job.role))
}

/** "$55,000 – $70,000", "$60,000", or '' when Adzuna has no salary. */
export function formatSalary(min: number | null, max: number | null): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  if (min !== null && max !== null && Math.round(min) !== Math.round(max)) return `${fmt(min)} – ${fmt(max)}`
  const one = min ?? max
  return one !== null ? fmt(one) : ''
}
