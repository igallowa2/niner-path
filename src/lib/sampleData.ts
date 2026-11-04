import type { Application } from '../types'

// Sample data shown the first time the app loads. Companies and dates are illustrative.
export const sampleApplications: Application[] = [
  {
    id: 'sample-1',
    company: 'Capital One',
    role: 'Data Analytics Intern',
    location: 'Richmond, VA',
    jobType: 'Internship',
    industry: 'Data analytics',
    deadline: '2026-10-20',
    status: 'Applied',
    postingUrl: '',
    timeline: [
      { status: 'Saved', date: '2026-09-20' },
      { status: 'Applied', date: '2026-09-22' },
    ],
  },
  {
    id: 'sample-2',
    company: 'Bank of America',
    role: 'Financial Analyst Program',
    location: 'Charlotte, NC',
    jobType: 'Full-time',
    industry: 'Finance',
    deadline: '2026-10-08',
    status: 'Saved',
    postingUrl: '',
    timeline: [{ status: 'Saved', date: '2026-09-25' }],
  },
  {
    id: 'sample-3',
    company: 'Truist',
    role: 'Risk Analyst Program',
    location: 'Charlotte, NC',
    jobType: 'Full-time',
    industry: 'Risk',
    deadline: '',
    status: 'Interviewing',
    postingUrl: '',
    timeline: [
      { status: 'Saved', date: '2026-09-10' },
      { status: 'Applied', date: '2026-09-12' },
      { status: 'Interviewing', date: '2026-10-01' },
    ],
  },
]
