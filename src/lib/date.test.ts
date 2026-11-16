import { describe, expect, it } from 'vitest'
import { daysSinceApplying } from './date'

describe('daysSinceApplying', () => {
  it('calculates the number of calendar days since applying', () => {
    expect(daysSinceApplying('2026-11-01', new Date(2026, 10, 17, 15))).toBe(16)
  })

  it('returns zero when the application date is today', () => {
    expect(daysSinceApplying('2026-11-17', new Date(2026, 10, 17))).toBe(0)
  })
})
