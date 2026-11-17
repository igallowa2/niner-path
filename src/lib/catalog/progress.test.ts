import { describe, expect, it } from 'vitest'
import { getAvailableCourses, getDegreeProgress, meetsMinGrade, normalizeCode, type CourseIndex } from './progress'
import type { CompletedCourse, Course, PrereqNode, Program } from './types'

function course(code: string, credits = 3, prerequisites: PrereqNode | null = null, prereqStatus: Course['prereqStatus'] = prerequisites ? 'parsed' : 'none'): Course {
  const [subject, number] = code.split(' ')
  return {
    code, subject, number, title: code, credits, creditsMax: credits, description: '',
    prerequisitesRaw: '', corequisitesRaw: '', prerequisites, corequisites: null,
    prereqStatus, prereqReviewReasons: prereqStatus === 'needs-review' ? ['class standing'] : [], skills: [], sourceUrl: '',
  }
}

const c = (code: string, minGrade?: 'C'): PrereqNode => ({ type: 'course', code, ...(minGrade ? { minGrade } : {}) })

const catalog: CourseIndex = Object.fromEntries(
  [
    course('ECON 2101'),
    course('ECON 2102'),
    course('STAT 1220'),
    course('ECON 3112', 3, { type: 'and', items: [c('ECON 2101', 'C'), c('ECON 2102', 'C')] }),
    course('ECON 3113', 3, c('ECON 3112')),
    course('ECON 3125', 3, { type: 'or', items: [c('STAT 1220'), c('STAT 1222')] }),
    course('ECON 3150', 3, null, 'needs-review'),
    course('ECON 4000', 3, c('ECON 3112')),
    course('ECON 2000', 1),
    course('FINN 3120', 3, c('ECON 2102')),
  ].map((x) => [x.code, x]),
)

const program: Program = {
  id: 'test',
  name: 'Test Economics',
  college: 'Belk',
  catalogYear: '2026-2027',
  totalCredits: 120,
  needsReview: [],
  sourceUrl: '',
  sections: [
    {
      id: 'core',
      title: 'Core',
      requirements: [
        { id: 'micro', kind: 'course', label: 'Principles of Microeconomics', course: 'ECON 2101', minGrade: 'C' },
        { id: 'macro', kind: 'course', label: 'Principles of Macroeconomics', course: 'ECON 2102', minGrade: 'C' },
        { id: 'stats', kind: 'course', label: 'Statistics', course: 'STAT 1220', alternatives: ['STAT 1222'] },
      ],
    },
    {
      id: 'major',
      title: 'Economics major',
      requirements: [
        { id: 'theory', kind: 'chooseN', label: 'Intermediate theory', count: 2, from: ['ECON 3112', 'ECON 3113', 'ECON 3125'] },
        { id: 'electives', kind: 'creditsFrom', label: '6 hours of 3000+ ECON', credits: 6, subjects: ['ECON'], minLevel: 3000 },
        { id: 'finance', kind: 'course', label: 'Business Finance', course: 'FINN 3120' },
      ],
    },
  ],
}

const done = (code: string, grade?: CompletedCourse['grade']): CompletedCourse => ({ code, status: 'completed', grade })
const taking = (code: string): CompletedCourse => ({ code, status: 'in-progress' })
const status = (p: ReturnType<typeof getDegreeProgress>, id: string) =>
  p.sections.flatMap((s) => s.requirements).find((r) => r.requirement.id === id)!

describe('grades and codes', () => {
  it('checks minimum grades', () => {
    expect(meetsMinGrade('B', 'C')).toBe(true)
    expect(meetsMinGrade('D', 'C')).toBe(false)
    expect(meetsMinGrade('F')).toBe(false)
    expect(meetsMinGrade('W')).toBe(false)
    expect(meetsMinGrade('P', 'C')).toBe(false)
    expect(meetsMinGrade('P')).toBe(true)
    expect(meetsMinGrade(undefined, 'C')).toBe(true) // no grade entered yet
  })

  it('normalizes course codes', () => {
    expect(normalizeCode(' econ2101 ')).toBe('ECON 2101')
  })
})

describe('getDegreeProgress', () => {
  it('shows everything as needed with no courses', () => {
    const p = getDegreeProgress([], program, catalog)
    expect(p.requirementsDone).toBe(0)
    expect(p.requirementsTotal).toBe(6)
    expect(p.sections.every((s) => s.status === 'needed')).toBe(true)
    expect(p.completedCredits).toBe(0)
  })

  it('marks requirements done, in progress, or needed and totals credits', () => {
    const p = getDegreeProgress([done('ECON 2101', 'A'), done('ECON 2102', 'B'), taking('STAT 1222'), done('ECON 2000', 'A')], program, catalog)
    expect(status(p, 'micro').status).toBe('done')
    expect(status(p, 'stats')).toMatchObject({ status: 'in-progress', applied: [{ code: 'STAT 1222', status: 'in-progress' }] })
    expect(p.sections[0].status).toBe('in-progress')
    expect(p.completedCredits).toBe(7) // 3 + 3 + 1
    expect(p.inProgressCredits).toBe(3)
    expect(p.percent).toBe(6)
  })

  it('does not count a grade below the minimum', () => {
    const p = getDegreeProgress([done('ECON 2101', 'D')], program, catalog)
    expect(status(p, 'micro').status).toBe('needed')
    expect(p.completedCredits).toBe(3) // still earns credit toward the degree
  })

  it('uses the best attempt when a course is repeated', () => {
    const p = getDegreeProgress([done('ECON 2101', 'F'), done('econ 2101', 'B')], program, catalog)
    expect(status(p, 'micro').status).toBe('done')
    expect(p.completedCredits).toBe(3)
  })

  it('handles "choose N" with partial progress', () => {
    const p = getDegreeProgress([done('ECON 3112', 'A')], program, catalog)
    expect(status(p, 'theory')).toMatchObject({ status: 'needed', have: 1, need: 2, unit: 'courses' })
  })

  it('counts a course toward only one requirement by default', () => {
    // ECON 3112 and 3113 are used by "choose 2", so the 3000+ elective pool only gets ECON 4000.
    const p = getDegreeProgress([done('ECON 3112'), done('ECON 3113'), done('ECON 4000')], program, catalog)
    expect(status(p, 'theory').status).toBe('done')
    expect(status(p, 'electives')).toMatchObject({ status: 'needed', have: 3, need: 6, unit: 'credits' })
  })

  it('lets a course count twice when the requirement allows it', () => {
    const doubled: Program = {
      ...program,
      sections: program.sections.map((s) => ({
        ...s,
        requirements: s.requirements.map((r) => (r.id === 'electives' ? { ...r, allowDoubleCount: true } : r)),
      })),
    }
    const p = getDegreeProgress([done('ECON 3112'), done('ECON 3113')], doubled, catalog)
    expect(status(p, 'theory').status).toBe('done')
    expect(status(p, 'electives')).toMatchObject({ status: 'done', have: 6 })
  })
})

describe('getAvailableCourses', () => {
  const codes = (list: { code: string }[]) => list.map((x) => x.code)

  it('only lists needed courses whose prerequisites are met', () => {
    const list = getAvailableCourses([done('ECON 2101', 'B'), done('ECON 2102', 'C')], program, [], catalog)
    expect(codes(list)).toContain('ECON 3112')
    expect(codes(list)).toContain('FINN 3120')
    expect(codes(list)).not.toContain('ECON 2101') // already done
    expect(codes(list)).not.toContain('ECON 3113') // needs ECON 3112 first
    expect(codes(list)).not.toContain('ECON 3125') // needs STAT 1220 or 1222
  })

  it('applies minimum grades on prerequisites', () => {
    const list = getAvailableCourses([done('ECON 2101', 'D'), done('ECON 2102', 'B')], program, [], catalog)
    expect(codes(list)).not.toContain('ECON 3112')
  })

  it('counts in-progress courses toward prerequisites for next term', () => {
    const list = getAvailableCourses([taking('STAT 1220')], program, [], catalog)
    expect(codes(list)).toContain('ECON 3125')
    expect(codes(list)).not.toContain('STAT 1220')
  })

  it('flags courses whose prerequisites need review instead of hiding them', () => {
    const list = getAvailableCourses([], program, [], catalog)
    expect(list.find((x) => x.code === 'ECON 3150')).toMatchObject({ prereqNeedsReview: true })
  })

  it('filters to a term when its offerings are known', () => {
    const offerings = [{ term: 'Spring 2027', courses: ['ECON 3112'] }]
    const ready = [done('ECON 2101', 'A'), done('ECON 2102', 'A')]
    expect(codes(getAvailableCourses(ready, program, offerings, catalog, 'Spring 2027'))).toEqual(['ECON 3112'])
    // Unknown term: nothing is filtered, and `offered` is null.
    const fall = getAvailableCourses(ready, program, offerings, catalog, 'Fall 2027')
    expect(fall.length).toBeGreaterThan(1)
    expect(fall.every((x) => x.offered === null)).toBe(true)
  })

  it('lists which requirements a course would count toward', () => {
    const list = getAvailableCourses([done('ECON 2101'), done('ECON 2102')], program, [], catalog)
    expect(list.find((x) => x.code === 'ECON 3112')?.forRequirements).toEqual(['Intermediate theory', '6 hours of 3000+ ECON'])
  })
})
