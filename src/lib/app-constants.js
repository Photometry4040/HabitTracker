/**
 * App-level constants and pure helper functions
 * Extracted from App.jsx for reusability and testability
 */

export const DEFAULT_HABITS = [
  { id: 1, name: '아침 (6-9시) 스스로 일어나기', times: Array(7).fill('') },
  { id: 2, name: '오전 (9-12시) 집중해서 공부/놀이', times: Array(7).fill('') },
  { id: 3, name: '점심 (12-1시) 편식 없이 골고루 먹기', times: Array(7).fill('') },
  { id: 4, name: '오후 (1-5시) 스스로 계획한 일 하기', times: Array(7).fill('') },
  { id: 5, name: '저녁 (6-9시) 정리 정돈 및 내일 준비', times: Array(7).fill('') }
]

export const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']

export const COLORS = [
  { name: '녹색', value: 'green', emoji: '😊', description: '목표 달성!' },
  { name: '노랑', value: 'yellow', emoji: '🤔', description: '조금 아쉽지만 잘했어!' },
  { name: '빨강', value: 'red', emoji: '😔', description: '괜찮아, 내일 다시 해보자!' }
]

export const THEME_OPTIONS = [
  '시간대별 색상 챌린지',
  '매일매일 습관 형성',
  '주간 목표 달성',
  '성장하는 나',
  '즐거운 습관 만들기',
  '꾸준함의 힘'
]

export const DEFAULT_REFLECTION = {
  bestDay: '',
  easiestHabit: '',
  nextWeekGoal: ''
}

export function getColorClass(color) {
  switch(color) {
    case 'green': return 'bg-green-500 hover:bg-green-600'
    case 'yellow': return 'bg-yellow-500 hover:bg-yellow-600'
    case 'red': return 'bg-red-500 hover:bg-red-600'
    default: return 'bg-gray-200 hover:bg-gray-300'
  }
}

export function getWeeklyScore(habit) {
  return habit.times.filter(time => time === 'green').length
}

export function getTotalScore(habits) {
  return habits.reduce((total, habit) => total + getWeeklyScore(habit), 0)
}

export function getMaxScore(habits) {
  return habits.length * 7
}

export function formatWeekPeriod(weekStartDate) {
  if (!weekStartDate) return ''
  const startDate = new Date(weekStartDate)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  const formatDate = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`
}

export function createDefaultHabits() {
  return DEFAULT_HABITS.map(h => ({
    ...h,
    times: Array(7).fill('')
  }))
}
