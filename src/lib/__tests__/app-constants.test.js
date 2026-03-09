import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HABITS, DAYS, COLORS, THEME_OPTIONS, DEFAULT_REFLECTION,
  getColorClass, getWeeklyScore, getTotalScore, getMaxScore,
  formatWeekPeriod, createDefaultHabits
} from '../app-constants.js'

describe('Constants', () => {
  it('has 5 default habits', () => {
    expect(DEFAULT_HABITS).toHaveLength(5)
  })

  it('has 7 days starting with Monday', () => {
    expect(DAYS).toHaveLength(7)
    expect(DAYS[0]).toBe('월요일')
    expect(DAYS[6]).toBe('일요일')
  })

  it('has 3 colors (green, yellow, red)', () => {
    expect(COLORS).toHaveLength(3)
    expect(COLORS.map(c => c.value)).toEqual(['green', 'yellow', 'red'])
  })

  it('has theme options', () => {
    expect(THEME_OPTIONS.length).toBeGreaterThan(0)
  })

  it('has default reflection structure', () => {
    expect(DEFAULT_REFLECTION).toEqual({ bestDay: '', easiestHabit: '', nextWeekGoal: '' })
  })
})

describe('getColorClass', () => {
  it('returns correct classes', () => {
    expect(getColorClass('green')).toContain('bg-green')
    expect(getColorClass('yellow')).toContain('bg-yellow')
    expect(getColorClass('red')).toContain('bg-red')
    expect(getColorClass('')).toContain('bg-gray')
  })
})

describe('getWeeklyScore', () => {
  it('counts green days', () => {
    expect(getWeeklyScore({ times: ['green', 'green', '', 'red', '', '', 'green'] })).toBe(3)
  })
})

describe('getTotalScore', () => {
  it('sums scores', () => {
    expect(getTotalScore([
      { times: ['green', '', '', '', '', '', ''] },
      { times: ['green', 'green', '', '', '', '', ''] },
    ])).toBe(3)
  })
})

describe('getMaxScore', () => {
  it('calculates max', () => {
    expect(getMaxScore([{}, {}, {}])).toBe(21)
  })
})

describe('formatWeekPeriod', () => {
  it('formats date range', () => {
    expect(formatWeekPeriod('2025-10-27')).toBe('2025년 10월 27일 ~ 2025년 11월 2일')
  })

  it('returns empty for no date', () => {
    expect(formatWeekPeriod('')).toBe('')
  })
})

describe('createDefaultHabits', () => {
  it('creates independent copies', () => {
    const h1 = createDefaultHabits()
    const h2 = createDefaultHabits()
    h1[0].times[0] = 'green'
    expect(h2[0].times[0]).toBe('')
  })
})
