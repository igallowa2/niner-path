import { describe, expect, it } from 'vitest'
import { onetFor, tagSkills } from './skills'

describe('tagSkills', () => {
  it('maps keywords to skills, including word endings', () => {
    expect(tagSkills('Introduction to regression and statistical inference.')).toEqual(['Statistics'])
    expect(tagSkills('Students write SQL queries against a relational database.')).toEqual(['Databases'])
  })

  it('matches whole words only and ignores case', () => {
    expect(tagSkills('Uses EXCEL for budgeting.')).toEqual(['Spreadsheets'])
    expect(tagSkills('Covers lawn care.')).toEqual([]) // "law" must be a whole word
  })

  it('tags several skills from one description', () => {
    expect(tagSkills('Microeconomic theory with calculus-based optimization and a written research paper.')).toEqual([
      'Economic Analysis',
      'Mathematics',
      'Writing',
    ])
  })

  it('gives the O*NET element for a skill', () => {
    expect(onetFor('Databases')).toEqual({ type: 'Technology', element: 'Database management system software' })
    expect(onetFor('Nope')).toBeUndefined()
  })
})
