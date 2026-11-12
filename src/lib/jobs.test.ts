import { describe, expect, it } from 'vitest'
import type { JobListing } from '../../shared/api'
import { formatSalary, guessJobType, jobToApplication, toJobKeyword } from './jobs'

const job: JobListing = {
  id: '1',
  title: 'Data Analyst Intern',
  company: 'Sample Bank',
  location: 'Charlotte, NC',
  category: 'IT Jobs',
  contractTime: 'full_time',
  salaryMin: 50000,
  salaryMax: 60000,
  url: 'https://www.adzuna.com/details/1',
  created: '2026-11-01T10:00:00Z',
  snippet: '',
}

describe('toJobKeyword', () => {
  it('shortens long O*NET titles into good job-search keywords', () => {
    expect(toJobKeyword('Architects, Except Landscape and Naval')).toBe('Architects')
    expect(toJobKeyword('Data Scientists')).toBe('Data Scientists')
    expect(toJobKeyword('Nurse Anesthetists (CRNA)')).toBe('Nurse Anesthetists')
  })
})

describe('guessJobType', () => {
  it('spots internships, co-ops, and part-time jobs', () => {
    expect(guessJobType(job)).toBe('Internship')
    expect(guessJobType({ ...job, title: 'Engineering Co-op' })).toBe('Co-op')
    expect(guessJobType({ ...job, title: 'Cashier', contractTime: 'part_time' })).toBe('Part-time')
    expect(guessJobType({ ...job, title: 'Analyst', contractTime: null })).toBe('Full-time')
  })
})

describe('jobToApplication', () => {
  it('turns a listing into a Saved tracker application', () => {
    expect(jobToApplication(job)).toEqual({
      company: 'Sample Bank',
      role: 'Data Analyst Intern',
      location: 'Charlotte, NC',
      jobType: 'Internship',
      industry: 'IT',
      deadline: '',
      status: 'Saved',
      postingUrl: 'https://www.adzuna.com/details/1',
    })
  })
})

describe('formatSalary', () => {
  it('formats a range, a single value, or nothing', () => {
    expect(formatSalary(50000, 60000)).toBe('$50,000 – $60,000')
    expect(formatSalary(55000, 55000)).toBe('$55,000')
    expect(formatSalary(null, 70000)).toBe('$70,000')
    expect(formatSalary(null, null)).toBe('')
  })
})
