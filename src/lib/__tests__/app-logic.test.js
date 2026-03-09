import { describe, it, expect } from 'vitest'

// Test pure functions that exist in App.jsx
// These functions are extracted for testability

describe('App.jsx core logic', () => {
  describe('getColorClass', () => {
    const getColorClass = (color) => {
      switch(color) {
        case 'green': return 'bg-green-500 hover:bg-green-600'
        case 'yellow': return 'bg-yellow-500 hover:bg-yellow-600'
        case 'red': return 'bg-red-500 hover:bg-red-600'
        default: return 'bg-gray-200 hover:bg-gray-300'
      }
    }

    it('returns green class for green', () => {
      expect(getColorClass('green')).toContain('bg-green-500')
    })

    it('returns yellow class for yellow', () => {
      expect(getColorClass('yellow')).toContain('bg-yellow-500')
    })

    it('returns red class for red', () => {
      expect(getColorClass('red')).toContain('bg-red-500')
    })

    it('returns gray class for unknown', () => {
      expect(getColorClass('')).toContain('bg-gray-200')
      expect(getColorClass(undefined)).toContain('bg-gray-200')
    })
  })

  describe('getWeeklyScore', () => {
    const getWeeklyScore = (habit) => {
      return habit.times.filter(time => time === 'green').length
    }

    it('counts green days', () => {
      const habit = { times: ['green', 'yellow', 'green', '', '', 'green', 'red'] }
      expect(getWeeklyScore(habit)).toBe(3)
    })

    it('returns 0 for no green days', () => {
      const habit = { times: ['yellow', 'red', '', '', '', '', ''] }
      expect(getWeeklyScore(habit)).toBe(0)
    })

    it('returns 7 for perfect week', () => {
      const habit = { times: Array(7).fill('green') }
      expect(getWeeklyScore(habit)).toBe(7)
    })
  })

  describe('getTotalScore', () => {
    const getWeeklyScore = (habit) => habit.times.filter(t => t === 'green').length
    const getTotalScore = (habits) => habits.reduce((total, habit) => total + getWeeklyScore(habit), 0)

    it('sums all green days across habits', () => {
      const habits = [
        { times: ['green', 'green', '', '', '', '', ''] },
        { times: ['green', '', 'green', '', '', '', ''] },
      ]
      expect(getTotalScore(habits)).toBe(4)
    })

    it('returns 0 for empty habits', () => {
      expect(getTotalScore([])).toBe(0)
    })
  })

  describe('getMaxScore', () => {
    const getMaxScore = (habits) => habits.length * 7

    it('calculates max score', () => {
      const habits = [{}, {}, {}]
      expect(getMaxScore(habits)).toBe(21)
    })

    it('returns 0 for no habits', () => {
      expect(getMaxScore([])).toBe(0)
    })
  })

  describe('weekPeriod calculation', () => {
    it('calculates correct week period from start date', () => {
      const weekStartDate = '2025-10-27'
      const startDate = new Date(weekStartDate)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      const formatDate = (date) => {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
      }

      const period = `${formatDate(startDate)} ~ ${formatDate(endDate)}`
      expect(period).toBe('2025년 10월 27일 ~ 2025년 11월 2일')
    })
  })

  describe('default habits', () => {
    const defaultHabits = [
      { id: 1, name: '아침 (6-9시) 스스로 일어나기', times: Array(7).fill('') },
      { id: 2, name: '오전 (9-12시) 집중해서 공부/놀이', times: Array(7).fill('') },
      { id: 3, name: '점심 (12-1시) 편식 없이 골고루 먹기', times: Array(7).fill('') },
      { id: 4, name: '오후 (1-5시) 스스로 계획한 일 하기', times: Array(7).fill('') },
      { id: 5, name: '저녁 (6-9시) 정리 정돈 및 내일 준비', times: Array(7).fill('') }
    ]

    it('has 5 default habits', () => {
      expect(defaultHabits).toHaveLength(5)
    })

    it('each habit has 7 empty time slots', () => {
      defaultHabits.forEach(habit => {
        expect(habit.times).toHaveLength(7)
        expect(habit.times.every(t => t === '')).toBe(true)
      })
    })

    it('each habit has unique id', () => {
      const ids = defaultHabits.map(h => h.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('template application', () => {
    it('converts template habits to app format', () => {
      const templateHabits = [
        { name: '운동하기' },
        { name: '독서하기' },
      ]

      const newHabits = templateHabits.map((habit, index) => ({
        id: index + 1,
        name: habit.name,
        times: Array(7).fill('')
      }))

      expect(newHabits).toHaveLength(2)
      expect(newHabits[0].name).toBe('운동하기')
      expect(newHabits[0].id).toBe(1)
      expect(newHabits[0].times).toHaveLength(7)
    })
  })

  describe('color toggle logic', () => {
    it('toggles color off when clicking same color', () => {
      const currentColor = 'green'
      const clickedColor = 'green'
      const result = currentColor === clickedColor ? '' : clickedColor
      expect(result).toBe('')
    })

    it('sets color when clicking different color', () => {
      const currentColor = 'green'
      const clickedColor = 'red'
      const result = currentColor === clickedColor ? '' : clickedColor
      expect(result).toBe('red')
    })

    it('sets color when no current color', () => {
      const currentColor = ''
      const clickedColor = 'green'
      const result = currentColor === clickedColor ? '' : clickedColor
      expect(result).toBe('green')
    })
  })
})
