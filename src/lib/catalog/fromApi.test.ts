import { describe, expect, it } from 'vitest'
import type { CatalogCourse, ProgramDetail, RequirementGroup } from '../../types'
import { programFromApi } from './fromApi'
import { getDegreeProgress } from './progress'

const course = (code: string, title: string, extra: Partial<CatalogCourse> = {}, slot = 1) => ({
  code, title, minCredits: 3, maxCredits: 3, creditsText: '3', description: '', prerequisites: '', corequisites: '', restrictions: '', slot, note: '', ...extra,
})

let nextId = 1
const group = (label: string, rule: RequirementGroup['rule'], extra: Partial<RequirementGroup> = {}): RequirementGroup => ({
  id: nextId++, label, rule, chooseCount: null, chooseCredits: null, minCredits: null, maxCredits: null, notes: '', courses: [], children: [], ...extra,
})

// Same shape as "Economics, Business Concentration, B.S." in prisma/catalog.json.
const detail: ProgramDetail = {
  id: 7,
  name: 'Economics, Business Concentration, B.S.',
  type: 'Major',
  degree: 'B.S.',
  catalogYear: '2026-2027',
  collegeCode: 'BCOB',
  collegeName: 'College of Business',
  totalCredits: 120,
  catalogUrl: 'https://catalog.charlotte.edu/preview_program.php?catoid=42&poid=12771',
  groups: [
    group('Degree Requirements', 'ALL', {
      children: [
        group('General Education Courses', 'OPEN', { minCredits: 31, notes: 'For details on required courses, refer to the General Education Program.' }),
        group('Business Core Courses', 'CHOOSE', {
          chooseCount: 2,
          minCredits: 6,
          notes: 'Select two of the following:',
          courses: [course('BLAW 3150', 'Business Law I', {}, 1), course('MKTG 3110', 'Marketing Concepts', {}, 2)],
        }),
        group('Major Courses', 'ALL', {
          minCredits: 24,
          notes: 'A grade of C or above is required.',
          courses: [
            course('ECON 3112', 'Intermediate Microeconomics', { prerequisites: 'ECON 2101 and ECON 2102 with grades of C or above.' }, 1),
            course('ECON 3125', 'Applied Econometrics', { description: 'Regression analysis with real data.' }, 2),
            course('STAT 3122', 'Statistics II', {}, 2),
          ],
          children: [
            group('Quantitative Skills Courses', 'CHOOSE', { chooseCount: 1, courses: [course('ECON 4100', 'Mathematical Economics'), course('INFO 3236', 'Data Mining', {}, 2)], children: [group('Note:', 'OPEN', { notes: 'MATH 1241 is recommended.' })] }),
          ],
        }),
        group('Restricted Elective Courses', 'OPEN', { minCredits: 9, notes: 'Select three ECON Electives from the 3000- or 4000- level, excluding the courses listed above.' }),
      ],
    }),
    group('High-Impact Experience', 'OPEN', { notes: 'Students must complete at least one high-impact experience.' }),
  ],
}

const { program, catalog } = programFromApi(detail)
const req = (label: RegExp) => program.sections.flatMap((s) => s.requirements).find((r) => label.test(r.label))!

describe('programFromApi', () => {
  it('turns container headings into sections and skips groups with no rules', () => {
    expect(program.sections.map((s) => s.title)).toEqual(['Business Core Courses', 'Major Courses', 'Restricted Elective Courses'])
    expect(program).toMatchObject({ id: '7', college: 'College of Business', totalCredits: 120 })
  })

  it('converts CHOOSE groups, including lists in sub-groups', () => {
    expect(req(/Business Core/)).toMatchObject({ kind: 'chooseN', count: 2, from: ['BLAW 3150', 'MKTG 3110'] })
    expect(req(/Quantitative/)).toMatchObject({ kind: 'chooseN', count: 1, from: ['ECON 4100', 'INFO 3236'] })
  })

  it('converts ALL groups into one requirement per slot, with "or" alternatives and minimum grades', () => {
    expect(req(/Intermediate Micro/)).toMatchObject({ kind: 'course', course: 'ECON 3112', minGrade: 'C' })
    expect(req(/Econometrics/)).toMatchObject({ kind: 'course', course: 'ECON 3125', alternatives: ['STAT 3122'], label: 'Applied Econometrics or Statistics II' })
  })

  it('reads "select three ECON electives from the 3000- or 4000-level" as a credit-hour rule', () => {
    expect(req(/Restricted Elective/)).toMatchObject({
      kind: 'creditsFrom', credits: 9, subjects: ['ECON'], minLevel: 3000, maxLevel: 4999,
      exclude: ['BLAW 3150', 'MKTG 3110', 'ECON 3112', 'ECON 3125', 'STAT 3122', 'ECON 4100', 'INFO 3236'],
    })
  })

  it('puts rules it cannot check in the needs-review list', () => {
    expect(program.needsReview.map((r) => r.where)).toEqual(['General Education Courses', 'High-Impact Experience'])
    expect(program.sections.find((s) => s.title === 'Major Courses')?.note).toBe('24 credit hours · MATH 1241 is recommended.')
  })

  it('builds the course index with parsed prerequisites and skills', () => {
    expect(catalog['ECON 3112']).toMatchObject({ prereqStatus: 'parsed', prerequisites: { type: 'and' } })
    expect(catalog['ECON 3125'].skills).toEqual(['Statistics'])
    expect(catalog['BLAW 3150'].skills).toEqual(['Business Law'])
  })

  it('works with getDegreeProgress end to end', () => {
    const p = getDegreeProgress([{ code: 'BLAW 3150', status: 'completed', grade: 'B' }, { code: 'ECON 3500', status: 'completed', grade: 'A' }], program, catalog)
    expect(p.sections[0].requirements[0]).toMatchObject({ have: 1, need: 2 })
    expect(p.sections[2].requirements[0]).toMatchObject({ have: 3, need: 9, unit: 'credits' })
  })
})
