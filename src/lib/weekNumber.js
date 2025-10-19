/**
 * Week Number Utility (ISO 8601 Standard)
 *
 * ISO 8601 정의:
 * - 주의 시작은 월요일
 * - 1주차는 해당 연도의 첫 번째 목요일이 포함된 주
 * - 즉, 1월 4일이 항상 1주차에 포함됨
 */

/**
 * Get ISO 8601 week number for a given date
 *
 * @param {Date|string} date - Date object or ISO date string (YYYY-MM-DD)
 * @returns {number} ISO week number (1-53)
 *
 * @example
 * getISOWeekNumber(new Date('2025-06-30')) // Returns 27
 * getISOWeekNumber('2025-06-30') // Returns 27
 */
export function getISOWeekNumber(date) {
  // 1. Date 객체로 변환
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)

  // 2. 유효한 날짜인지 확인
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided')
  }

  // 3. 타겟 날짜의 복사본 생성 (원본 날짜 보존)
  const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))

  // 4. 해당 주의 목요일로 이동
  // ISO 8601: 주의 시작은 월요일(1), 목요일은 4
  // getDay(): 0=일요일, 1=월요일, ..., 6=토요일
  const dayNum = d.getUTCDay() || 7 // 일요일(0)을 7로 변환
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // 목요일로 이동

  // 5. 해당 연도의 1월 1일 구하기
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))

  // 6. 주차 계산
  // 목요일과 1월 1일 사이의 일수 차이를 7로 나누고 올림
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)

  return weekNo
}

/**
 * Get ISO week year for a given date
 * (주차가 속한 ISO 연도 - 12월 마지막 주가 다음해 1주차일 수 있음)
 *
 * @param {Date|string} date - Date object or ISO date string
 * @returns {number} ISO week year
 *
 * @example
 * getISOWeekYear(new Date('2025-01-01')) // Returns 2025
 */
export function getISOWeekYear(date) {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)

  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided')
  }

  const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)

  return d.getUTCFullYear()
}

/**
 * Format week number with year
 *
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} Formatted string "YYYY년 W주차"
 *
 * @example
 * formatWeekNumber(new Date('2025-06-30')) // Returns "2025년 27주차"
 */
export function formatWeekNumber(date) {
  const weekYear = getISOWeekYear(date)
  const weekNum = getISOWeekNumber(date)
  return `${weekYear}년 ${weekNum}주차`
}

/**
 * Get week number from week_start_date string
 * Helper function for database week_start_date format
 *
 * @param {string} weekStartDate - ISO date string (YYYY-MM-DD)
 * @returns {number} ISO week number
 *
 * @example
 * getWeekNumberFromDate('2025-06-30') // Returns 27
 */
export function getWeekNumberFromDate(weekStartDate) {
  if (!weekStartDate) {
    throw new Error('week_start_date is required')
  }

  return getISOWeekNumber(weekStartDate)
}

/**
 * Test function to verify ISO 8601 compliance
 * Run this to validate the implementation
 */
export function testISOWeekNumber() {
  const testCases = [
    { date: '2025-01-01', expected: 1, description: '2025년 1월 1일은 수요일 (1주차)' },
    { date: '2025-01-06', expected: 2, description: '2025년 1월 6일은 월요일 (2주차 시작)' },
    { date: '2025-06-30', expected: 27, description: '2025년 6월 30일은 월요일 (27주차)' },
    { date: '2025-07-07', expected: 28, description: '2025년 7월 7일은 월요일 (28주차)' },
    { date: '2025-12-29', expected: 1, description: '2025년 12월 29일은 월요일 (2026년 1주차)' },
  ]

  console.log('🧪 ISO 8601 Week Number Tests')
  console.log('=' .repeat(60))

  let passed = 0
  let failed = 0

  testCases.forEach(({ date, expected, description }) => {
    try {
      const result = getISOWeekNumber(date)
      const weekYear = getISOWeekYear(date)
      const status = result === expected ? '✅' : '❌'

      if (result === expected) {
        passed++
      } else {
        failed++
      }

      console.log(`${status} ${date}: ${weekYear}년 ${result}주차 (기대값: ${expected}주차)`)
      console.log(`   ${description}`)
    } catch (error) {
      failed++
      console.log(`❌ ${date}: Error - ${error.message}`)
    }
  })

  console.log('=' .repeat(60))
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)

  return { passed, failed, total: testCases.length }
}
