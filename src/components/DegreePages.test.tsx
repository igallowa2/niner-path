// My Degree, Course Planner, and Dashboard with a fake catalog API (no server or database needed).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoursePlanner } from './CoursePlanner'
import { Dashboard } from './Dashboard'
import { MyDegree } from './MyDegree'
import { ADVISOR_NOTE } from './degree/DegreeParts'
import { clearCatalogCache, PROGRAM_KEY } from '../lib/catalog/data'
import { COMPLETED_COURSES_KEY } from '../lib/catalog/completedCourses'
import type { CatalogCourse, ProgramDetail, ProgramSummary } from '../types'

const course = (code: string, title: string, prerequisites = ''): CatalogCourse => ({
  code, title, minCredits: 3, maxCredits: 3, creditsText: '3', description: '', prerequisites, corequisites: '', restrictions: '',
})
const inGroup = (c: CatalogCourse, slot: number) => ({ ...c, slot, note: '' })

const majors: ProgramSummary[] = [
  { id: 1, name: 'Economics, Business Concentration, B.S.', type: 'Major', degree: 'B.S.', catalogYear: '2026-2027', collegeCode: 'BCOB', collegeName: 'College of Business' },
  { id: 2, name: 'Finance, Finance Concentration, B.S.B.A.', type: 'Major', degree: 'B.S.B.A.', catalogYear: '2026-2027', collegeCode: 'BCOB', collegeName: 'College of Business' },
]

const econ: ProgramDetail = {
  ...majors[0],
  totalCredits: 120,
  catalogUrl: 'https://catalog.charlotte.edu/preview_program.php?catoid=42&poid=12771',
  groups: [
    {
      id: 10, label: 'Major Courses', rule: 'ALL', chooseCount: null, chooseCredits: null, minCredits: 6, maxCredits: 6, notes: '', children: [],
      courses: [inGroup(course('ECON 3112', 'Intermediate Microeconomics'), 1), inGroup(course('ECON 3125', 'Applied Econometrics', 'ECON 3112'), 2)],
    },
    {
      id: 11, label: 'General Education Courses', rule: 'OPEN', chooseCount: null, chooseCredits: null, minCredits: 31, maxCredits: 31,
      notes: 'Refer to the General Education Program.', children: [], courses: [],
    },
  ],
}
const finance: ProgramDetail = { ...econ, ...majors[1], groups: [{ ...econ.groups[0], id: 20, label: 'Finance Core' }] }
const allCourses = [course('ECON 3112', 'Intermediate Microeconomics'), course('ECON 3125', 'Applied Econometrics', 'ECON 3112'), course('ECON 3500', 'Topics')]

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let serverUp = true

beforeEach(() => {
  localStorage.clear()
  clearCatalogCache()
  serverUp = true
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!serverUp) throw new TypeError('Failed to fetch')
    if (url === '/api/programs?type=Major') return json(majors)
    if (url === '/api/courses') return json(allCourses)
    if (url === '/api/programs/1') return json(econ)
    if (url === '/api/programs/2') return json(finance)
    return json({ error: 'Not found' }, 404)
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('My Degree', () => {
  it('loads the program from the API, with the advisor note', async () => {
    render(<MyDegree />)
    expect(screen.getByText('Loading your degree requirements…')).toBeInTheDocument()
    expect(await screen.findByText('Economics, Business Concentration, B.S. · 2026-2027 catalog')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(ADVISOR_NOTE)
    expect(screen.getByRole('heading', { name: 'Major Courses' })).toBeInTheDocument()
    expect(screen.getByText('1 catalog rules aren\'t checked automatically yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View in catalog/ })).toHaveAttribute('href', econ.catalogUrl)
  })

  it('adds a course with the searchable picker and updates progress', async () => {
    render(<MyDegree />)
    const user = userEvent.setup()
    await user.type(await screen.findByRole('combobox', { name: 'Add a course' }), 'micro')
    await user.keyboard('{Enter}')

    const section = within(screen.getByRole('region', { name: 'Major Courses' }))
    expect(section.getAllByText('Done')).toHaveLength(1) // ECON 3112 is done, ECON 3125 is still needed
    expect(screen.getByRole('progressbar', { name: 'Degree credits completed' })).toHaveAttribute('aria-valuenow', '3')
    expect(JSON.parse(localStorage.getItem(COMPLETED_COURSES_KEY)!)).toEqual([{ code: 'ECON 3112', status: 'completed' }])
  })

  it('lets you add a course code that is not in the catalog data', async () => {
    render(<MyDegree />)
    const user = userEvent.setup()
    await user.type(await screen.findByRole('combobox', { name: 'Add a course' }), 'engl 1101')
    expect(screen.getByRole('option', { name: /ENGL 1101 Not in the catalog data/ })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Remove ENGL 1101' })).toBeInTheDocument()
  })

  it('switches programs and remembers the choice by name', async () => {
    render(<MyDegree />)
    const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText('Program'), 'Finance, Finance Concentration, B.S.B.A.')
    expect(await screen.findByRole('heading', { name: 'Finance Core' })).toBeInTheDocument()
    expect(localStorage.getItem(PROGRAM_KEY)).toBe('Finance, Finance Concentration, B.S.B.A.')
  })

  it('shows a clear error with Try again when the server is down', async () => {
    serverUp = false
    render(<MyDegree />)
    expect(await screen.findByText(/Can't reach the Niner Path server/)).toBeInTheDocument()
    serverUp = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Major Courses' })).toBeInTheDocument()
  })
})

describe('Course Planner', () => {
  it('lists needed courses whose prerequisites are met, with the advisor note', async () => {
    localStorage.setItem(COMPLETED_COURSES_KEY, JSON.stringify([{ code: 'ECON 3112', status: 'completed', grade: 'B' }]))
    render(<CoursePlanner />)
    expect(await screen.findByRole('heading', { name: 'Applied Econometrics' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Intermediate Microeconomics' })).not.toBeInTheDocument() // already done
    expect(screen.getByRole('note')).toHaveTextContent(ADVISOR_NOTE)
    // "Econometrics" in the title tags the course with Statistics.
    expect(within(screen.getByRole('list', { name: 'Skills from ECON 3125' })).getByText('Statistics')).toBeInTheDocument()
  })

  it('hides courses whose prerequisites are not met', async () => {
    render(<CoursePlanner />)
    expect(await screen.findByRole('heading', { name: 'Intermediate Microeconomics' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Applied Econometrics' })).not.toBeInTheDocument()
  })
})

describe('Dashboard', () => {
  it('shows real credit progress from the catalog', async () => {
    localStorage.setItem(COMPLETED_COURSES_KEY, JSON.stringify([{ code: 'ECON 3112', status: 'completed' }]))
    render(<Dashboard />)
    expect(await screen.findByText('2026-2027')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
  })
})
