/**
 * Test ISO 8601 Week Number Calculation
 */

import { testISOWeekNumber, getISOWeekNumber, formatWeekNumber } from '../src/lib/weekNumber.js'

console.log('🧪 Testing ISO 8601 Week Number Utility\n')

// Run automated tests
const results = testISOWeekNumber()

console.log('\n📝 Additional Manual Tests:')
console.log('=' .repeat(60))

// Test the specific case from the screenshot
const testDate = '2025-06-30'
const weekNum = getISOWeekNumber(testDate)
const formatted = formatWeekNumber(testDate)

console.log(`\n📅 ${testDate} (월요일)`)
console.log(`   결과: ${formatted}`)
console.log(`   기대값: 2025년 27주차`)
console.log(`   ${weekNum === 27 ? '✅ 정확함' : '❌ 불일치'}`)

// Test range from screenshot (Week 4-8 in the image)
console.log('\n📊 스크린샷의 주차 검증:')
const screenshotWeeks = [
  { date: '2025-06-30', label: '8주' },
  { date: '2025-07-07', label: '7주' },
  { date: '2025-07-14', label: '6주' },
  { date: '2025-07-21', label: '5주' },
  { date: '2025-07-28', label: '4주' },
  { date: '2025-08-04', label: '3주' },
  { date: '2025-08-11', label: '2주' },
  { date: '2025-08-18', label: '1주' }
]

screenshotWeeks.forEach(({ date, label }) => {
  const weekNum = getISOWeekNumber(date)
  const formatted = formatWeekNumber(date)
  console.log(`   ${date}: ${formatted} (화면 표시: ${label})`)
})

console.log('\n💡 결론:')
console.log('   화면의 "8주"는 역순 카운트(최신이 1주)')
console.log('   올바른 표현: "2025년 27주차" (ISO 8601 표준)')
console.log('   수정 필요: Dashboard 컴포넌트에서 ISO 주차 사용')

console.log('\n' + '=' .repeat(60))
if (results.failed === 0) {
  console.log('✅ 모든 테스트 통과!')
} else {
  console.log(`❌ ${results.failed}개 테스트 실패`)
  process.exit(1)
}
