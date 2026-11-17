import { describe, expect, it } from 'vitest'
import { coursesIn, parseRequisites } from './prereqParser'

describe('parseRequisites: confident cases', () => {
  it('returns none for empty text', () => {
    expect(parseRequisites('')).toEqual({ node: null, status: 'none', reasons: [] })
    expect(parseRequisites('Prerequisite(s): None.').status).toBe('none')
  })

  it('parses a single course', () => {
    expect(parseRequisites('Prerequisite(s): ECON 2101.')).toEqual({
      node: { type: 'course', code: 'ECON 2101' },
      status: 'parsed',
      reasons: [],
    })
  })

  it('parses AND with a minimum grade for every course', () => {
    const r = parseRequisites('Prerequisite(s): ECON 2101 and ECON 2102 with grades of C or above.')
    expect(r.status).toBe('parsed')
    expect(r.node).toEqual({
      type: 'and',
      items: [
        { type: 'course', code: 'ECON 2101', minGrade: 'C' },
        { type: 'course', code: 'ECON 2102', minGrade: 'C' },
      ],
    })
  })

  it('parses comma lists with or', () => {
    const r = parseRequisites('MATH 1120, MATH 1241, or MATH 1242')
    expect(r.node).toEqual({ type: 'or', items: ['MATH 1120', 'MATH 1241', 'MATH 1242'].map((code) => ({ type: 'course', code })) })
  })

  it('parses parentheses and semicolon clauses as AND', () => {
    const r = parseRequisites('(STAT 1220 or STAT 1222) and ECON 2101; MATH 1120 with a minimum grade of C')
    expect(r.status).toBe('parsed')
    expect(r.node).toEqual({
      type: 'and',
      items: [
        { type: 'or', items: [{ type: 'course', code: 'STAT 1220' }, { type: 'course', code: 'STAT 1222' }] },
        { type: 'course', code: 'ECON 2101' },
        { type: 'course', code: 'MATH 1120', minGrade: 'C' },
      ],
    })
  })

  it('marks pre- or corequisites as allowed at the same time', () => {
    expect(parseRequisites('Pre- or Corequisite(s): STAT 1221', true).node).toEqual({ type: 'course', code: 'STAT 1221', concurrentOk: true })
  })

  it('lists every course in a rule', () => {
    expect(coursesIn(parseRequisites('(ECON 2101 or ECON 2102) and (MATH 1120 or MATH 1241)').node)).toEqual(['ECON 2101', 'ECON 2102', 'MATH 1120', 'MATH 1241'])
  })
})

describe('parseRequisites: flags for review instead of guessing', () => {
  it.each([
    ['Junior standing.', 'class standing'],
    ['ECON 2101 or permission of the instructor.', 'permission required'],
    ['ECON 2101 and ECON 2102 or STAT 1220.', 'mixes "and" and "or" without parentheses'],
    ['MATH 1120 with a grade of C or above, or MATH 1241.', 'minimum grade applies to only part of the list'],
    ['ECON 2101 or equivalent.', '"or equivalent"'],
    ['Admission to the Belk College of Business.', 'program admission or major'],
    ['ECON 2101 ECON 2102', 'courses listed without "and" or "or"'],
  ])('%s', (text, reason) => {
    const r = parseRequisites(text)
    expect(r.status).toBe('needs-review')
    expect(r.reasons).toContain(reason)
  })

  it('keeps the clear course part when only an extra condition needs review', () => {
    const r = parseRequisites('ECON 2101 and ECON 2102; junior standing.')
    expect(r.status).toBe('needs-review')
    expect(coursesIn(r.node)).toEqual(['ECON 2101', 'ECON 2102'])
  })

  it('drops the structure when the course logic itself is unclear', () => {
    expect(parseRequisites('ECON 2101 and ECON 2102 or STAT 1220').node).toBeNull()
  })
})
