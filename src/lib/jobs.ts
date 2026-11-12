import type { JobListing } from '../../shared/api'
import type { ApplicationInput, JobType } from '../types'

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

/** "$55,000 – $70,000", "$60,000", or '' when Adzuna has no salary. */
export function formatSalary(min: number | null, max: number | null): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  if (min !== null && max !== null && Math.round(min) !== Math.round(max)) return `${fmt(min)} – ${fmt(max)}`
  const one = min ?? max
  return one !== null ? fmt(one) : ''
}
