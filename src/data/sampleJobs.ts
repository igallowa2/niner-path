/**
 * Sample openings for the "Opportunities for you" list on Find Jobs.
 * Swap this file for real data later: the page only depends on the `Opportunity` shape.
 */
import type { JobType } from '../types'

export type WorkMode = 'On-site' | 'Hybrid' | 'Remote'

export interface Skill {
  name: string
  /** true = the student already has this skill */
  have: boolean
  /** Where to learn it ("Close the gap ↗"). */
  learnUrl?: string
}

export interface TimelineStep {
  label: 'Saved' | 'Applied' | 'Interview' | 'Offer'
  /** YYYY-MM-DD, or '' when it hasn't happened yet */
  date: string
}

export interface Opportunity {
  id: string
  company: string
  /** Short badge text, e.g. "BA" */
  initials: string
  title: string
  /** "City, ST" */
  location: string
  workMode: WorkMode
  jobType: JobType
  /** Industries, used by "Because you saved …" (finance & research roles). */
  industries: string[]
  /** Extra words people might search for. */
  keywords: string[]
  /** 0–100 */
  match: number
  /** YYYY-MM-DD */
  deadline: string
  onCampus: boolean
  paid: boolean
  sponsorsVisas: boolean
  isNew: boolean
  postingUrl: string
  description: string
  skills: Skill[]
  timeline: TimelineStep[]
  /** true once a recruiter has replied (hides the follow-up reminder) */
  recruiterReplied: boolean
}

/**
 * "Today" for the sample data, so deadlines and "days since applied" read as designed.
 * With real data, use the real date instead.
 */
export const SAMPLE_AS_OF = '2026-10-06'

const learn = (skill: string) => `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`

/** The skills a Data Analyst role usually asks for, with what Ivory already has. */
function analystSkills(missing: string[]): Skill[] {
  const all = ['Excel', 'Python', 'Statistics', 'Economic research', 'Data cleaning', 'Communication', 'SQL', 'Tableau', 'Financial modeling']
  return all.map((name) => ({ name, have: !missing.includes(name), learnUrl: learn(name) }))
}

export const sampleOpportunities: Opportunity[] = [
  {
    id: 'boa-data-analyst',
    company: 'Bank of America',
    initials: 'BA',
    title: 'Data Analyst Program',
    location: 'Charlotte, NC',
    workMode: 'Hybrid',
    jobType: 'Full-time',
    industries: ['Finance', 'Banking'],
    keywords: ['data', 'analytics', 'reporting', 'banking'],
    match: 70,
    deadline: '2026-10-12',
    onCampus: false,
    paid: true,
    sponsorsVisas: false,
    isNew: true,
    postingUrl: 'https://careers.bankofamerica.com/',
    description:
      'Join a two-year rotational program analyzing customer and market data. You will build reports, clean large datasets, and present findings to business partners across the bank.',
    skills: analystSkills(['SQL', 'Tableau', 'Financial modeling']),
    timeline: [
      { label: 'Saved', date: '2026-09-20' },
      { label: 'Applied', date: '2026-09-22' },
      { label: 'Interview', date: '' },
    ],
    recruiterReplied: false,
  },
  {
    id: 'truist-credit-analyst',
    company: 'Truist',
    initials: 'T',
    title: 'Commercial Credit Analyst',
    location: 'Charlotte, NC',
    workMode: 'Hybrid',
    jobType: 'Full-time',
    industries: ['Finance', 'Banking'],
    keywords: ['credit', 'risk', 'underwriting', 'commercial banking'],
    match: 80,
    deadline: '2026-10-09',
    onCampus: false,
    paid: true,
    sponsorsVisas: false,
    isNew: false,
    postingUrl: 'https://careers.truist.com/',
    description:
      'Assess the financial health of commercial clients. You will analyze financial statements, build credit memos, and support relationship managers on lending decisions.',
    skills: analystSkills(['Tableau', 'Financial modeling']),
    timeline: [
      { label: 'Saved', date: '2026-09-28' },
      { label: 'Applied', date: '' },
      { label: 'Interview', date: '' },
    ],
    recruiterReplied: false,
  },
  {
    id: 'wf-summer-analyst',
    company: 'Wells Fargo',
    initials: 'WF',
    title: 'Data & Insights Summer Analyst',
    location: 'Charlotte, NC',
    workMode: 'Hybrid',
    jobType: 'Internship',
    industries: ['Finance', 'Research'],
    keywords: ['data', 'insights', 'summer', 'analytics', 'research'],
    match: 80,
    deadline: '2026-10-19',
    onCampus: false,
    paid: true,
    sponsorsVisas: true,
    isNew: true,
    postingUrl: 'https://www.wellsfargojobs.com/',
    description:
      'A 10-week summer internship on the Data & Insights team. You will research customer trends, build dashboards, and share recommendations with senior leaders.',
    skills: analystSkills(['SQL', 'Financial modeling']),
    timeline: [
      { label: 'Saved', date: '' },
      { label: 'Applied', date: '' },
      { label: 'Interview', date: '' },
    ],
    recruiterReplied: false,
  },
  {
    id: 'ally-treasury-analytics',
    company: 'Ally Financial',
    initials: 'AF',
    title: 'Treasury Analytics Analyst',
    location: 'Charlotte, NC',
    workMode: 'Hybrid',
    jobType: 'Full-time',
    industries: ['Finance'],
    keywords: ['treasury', 'liquidity', 'forecasting', 'analytics'],
    match: 70,
    deadline: '2026-10-11',
    onCampus: false,
    paid: true,
    sponsorsVisas: false,
    isNew: false,
    postingUrl: 'https://www.ally.com/about/careers/',
    description:
      'Support the treasury team with liquidity and funding analysis. You will forecast cash flows, automate reports in Python, and explain results to finance partners.',
    skills: analystSkills(['SQL', 'Tableau', 'Financial modeling']),
    timeline: [
      { label: 'Saved', date: '' },
      { label: 'Applied', date: '' },
      { label: 'Interview', date: '' },
    ],
    recruiterReplied: false,
  },
  {
    id: 'duke-fpa-intern',
    company: 'Duke Energy',
    initials: 'DE',
    title: 'Financial Planning Intern',
    location: 'Charlotte, NC',
    workMode: 'Hybrid',
    jobType: 'Internship',
    industries: ['Energy', 'Utilities'],
    keywords: ['financial planning', 'budgeting', 'forecasting', 'energy'],
    match: 80,
    deadline: '2026-10-23',
    onCampus: false,
    paid: true,
    sponsorsVisas: false,
    isNew: false,
    postingUrl: 'https://www.duke-energy.com/our-company/careers',
    description:
      'Help the financial planning team build budgets and forecasts for energy projects. You will update models, track spending, and prepare monthly variance reports.',
    skills: analystSkills(['SQL', 'Tableau']),
    timeline: [
      { label: 'Saved', date: '' },
      { label: 'Applied', date: '' },
      { label: 'Interview', date: '' },
    ],
    recruiterReplied: false,
  },
]
