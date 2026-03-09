import { describe, it, expect } from 'vitest'
import { getISOWeekNumber, getISOWeekYear, formatWeekNumber, getWeekNumberFromDate } from '../weekNumber.js'

describe('getISOWeekNumber', () => {
  it('returns correct week for 2025-01-01 (Wednesday, Week 1)', () => {
    expect(getISOWeekNumber('2025-01-01')).toBe(1)
  })

  it('returns correct week for 2025-01-06 (Monday, Week 2)', () => {
    expect(getISOWeekNumber('2025-01-06')).toBe(2)
  })

  it('returns correct week for 2025-06-30 (Monday, Week 27)', () => {
    expect(getISOWeekNumber('2025-06-30')).toBe(27)
  })

  it('returns correct week for 2025-07-07 (Monday, Week 28)', () => {
    expect(getISOWeekNumber('2025-07-07')).toBe(28)
  })

  it('handles year boundary (2025-12-29 = 2026 Week 1)', () => {
    expect(getISOWeekNumber('2025-12-29')).toBe(1)
  })

  it('accepts Date objects', () => {
    expect(getISOWeekNumber(new Date('2025-06-30'))).toBe(27)
  })

  it('throws for invalid dates', () => {
    expect(() => getISOWeekNumber('invalid')).toThrow('Invalid date')
  })
})

describe('getISOWeekYear', () => {
  it('returns correct year for standard dates', () => {
    expect(getISOWeekYear('2025-06-30')).toBe(2025)
  })

  it('returns next year for year boundary weeks', () => {
    expect(getISOWeekYear('2025-12-29')).toBe(2026)
  })

  it('throws for invalid dates', () => {
    expect(() => getISOWeekYear('invalid')).toThrow('Invalid date')
  })
})

describe('formatWeekNumber', () => {
  it('formats week number with year', () => {
    expect(formatWeekNumber('2025-06-30')).toBe('2025년 27주차')
  })

  it('handles year boundary', () => {
    expect(formatWeekNumber('2025-12-29')).toBe('2026년 1주차')
  })
})

describe('getWeekNumberFromDate', () => {
  it('returns week number from date string', () => {
    expect(getWeekNumberFromDate('2025-06-30')).toBe(27)
  })

  it('throws for empty input', () => {
    expect(() => getWeekNumberFromDate('')).toThrow('week_start_date is required')
    expect(() => getWeekNumberFromDate(null)).toThrow('week_start_date is required')
  })
})
