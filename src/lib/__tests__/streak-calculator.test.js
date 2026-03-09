import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateStreak, calculateGreenStreak } from '../streak-calculator.js'

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-27'))
  })

  it('returns 0 for empty records', () => {
    expect(calculateStreak([])).toBe(0)
    expect(calculateStreak(null)).toBe(0)
    expect(calculateStreak(undefined)).toBe(0)
  })

  it('counts consecutive days from today', () => {
    const records = [
      { record_date: '2025-10-27', status: 'green' },
      { record_date: '2025-10-26', status: 'yellow' },
      { record_date: '2025-10-25', status: 'red' },
    ]
    expect(calculateStreak(records)).toBe(3)
  })

  it('stops at gaps', () => {
    const records = [
      { record_date: '2025-10-27', status: 'green' },
      { record_date: '2025-10-26', status: 'green' },
      // gap on 2025-10-25
      { record_date: '2025-10-24', status: 'green' },
    ]
    expect(calculateStreak(records)).toBe(2)
  })

  it('requires status to count', () => {
    const records = [
      { record_date: '2025-10-27', status: null },
    ]
    expect(calculateStreak(records)).toBe(0)
  })

  it('handles unsorted records', () => {
    const records = [
      { record_date: '2025-10-25', status: 'green' },
      { record_date: '2025-10-27', status: 'green' },
      { record_date: '2025-10-26', status: 'green' },
    ]
    expect(calculateStreak(records)).toBe(3)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('calculateGreenStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-27'))
  })

  it('returns 0 for empty records', () => {
    expect(calculateGreenStreak([])).toBe(0)
    expect(calculateGreenStreak(null)).toBe(0)
  })

  it('counts only green days', () => {
    const records = [
      { record_date: '2025-10-27', status: 'green' },
      { record_date: '2025-10-26', status: 'green' },
      { record_date: '2025-10-25', status: 'yellow' }, // stops here
    ]
    expect(calculateGreenStreak(records)).toBe(2)
  })

  it('stops at non-green status', () => {
    const records = [
      { record_date: '2025-10-27', status: 'green' },
      { record_date: '2025-10-26', status: 'red' },
      { record_date: '2025-10-25', status: 'green' },
    ]
    expect(calculateGreenStreak(records)).toBe(1)
  })

  it('returns 0 when first record is not green', () => {
    const records = [
      { record_date: '2025-10-27', status: 'yellow' },
    ]
    expect(calculateGreenStreak(records)).toBe(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
