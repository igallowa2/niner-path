import { describe, expect, it } from 'vitest'
import { isValidUrl, validateApplication } from './validation'
import type { ApplicationInput } from '../types'

const valid: ApplicationInput = {
  company: 'Capital One',
  role: 'Data Analytics Intern',
  location: 'Richmond, VA',
  jobType: 'Internship',
  industry: 'Data analytics',
  deadline: '2026-10-20',
  status: 'Saved',
  postingUrl: 'https://example.com/job',
}

describe('validateApplication', () => {
  it('accepts a complete application', () => {
    expect(validateApplication(valid)).toEqual({})
  })

  it('requires a company', () => {
    expect(validateApplication({ ...valid, company: '   ' }).company).toBe('Company is required.')
  })

  it('requires a role title', () => {
    expect(validateApplication({ ...valid, role: '' }).role).toBe('Role title is required.')
  })

  it('rejects a posting link that is not a web address', () => {
    expect(validateApplication({ ...valid, postingUrl: 'not a link' }).postingUrl).toBeDefined()
  })

  it('allows the posting link to be left blank', () => {
    expect(validateApplication({ ...valid, postingUrl: '' })).toEqual({})
  })
})

describe('isValidUrl', () => {
  it('only allows http and https links', () => {
    expect(isValidUrl('https://jobs.example.com')).toBe(true)
    expect(isValidUrl('ftp://jobs.example.com')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false)
  })
})
