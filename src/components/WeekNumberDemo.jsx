import { useState } from 'react'
import { getISOWeekNumber, getISOWeekYear, formatWeekNumber } from '@/lib/weekNumber.js'

/**
 * Week Number Demo Component
 *
 * ISO 8601 표준을 사용하여 주차를 계산하고 표시합니다.
 *
 * ISO 8601 기준:
 * - 주의 시작: 월요일
 * - 1주차: 해당 연도의 첫 번째 목요일이 포함된 주
 * - 1월 4일은 항상 1주차에 포함됨
 */
export function WeekNumberDemo() {
  // 하드코딩된 테스트 날짜: 2025-06-30
  const testDate = '2025-06-30'
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // 컴포넌트 마운트 시 주차 계산
  useState(() => {
    try {
      // ISO 8601 주차 계산
      const weekNumber = getISOWeekNumber(testDate)
      const weekYear = getISOWeekYear(testDate)
      const formatted = formatWeekNumber(testDate)

      // 계산 결과 저장
      setResult({
        inputDate: testDate,
        weekNumber,
        weekYear,
        formatted,
        dayOfWeek: new Date(testDate).toLocaleDateString('ko-KR', { weekday: 'long' })
      })

      setError(null)
    } catch (err) {
      // 에러 처리
      setError(`주차 계산 오류: ${err.message}`)
      setResult(null)
    }
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          📅 ISO 8601 주차 계산 데모
        </h2>

        {/* 입력 날짜 표시 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">입력 날짜 (하드코딩)</p>
          <p className="text-xl font-semibold text-blue-800">{testDate}</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">⚠️ {error}</p>
            <p className="text-sm text-red-600 mt-2">
              올바른 날짜 형식을 사용해주세요 (YYYY-MM-DD)
            </p>
          </div>
        )}

        {/* 계산 결과 */}
        {result && (
          <div className="space-y-4">
            {/* 주차 결과 - 메인 디스플레이 */}
            <div className="p-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white">
              <p className="text-sm opacity-90 mb-2">ISO 8601 주차</p>
              <p className="text-4xl font-bold">{result.formatted}</p>
            </div>

            {/* 상세 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">주차 번호</p>
                <p className="text-2xl font-bold text-gray-800">{result.weekNumber}주</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">ISO 연도</p>
                <p className="text-2xl font-bold text-gray-800">{result.weekYear}년</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-sm text-gray-600">요일</p>
                <p className="text-xl font-bold text-gray-800">{result.dayOfWeek}</p>
              </div>
            </div>

            {/* 설명 */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                💡 ISO 8601 표준이란?
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 주의 시작: 월요일</li>
                <li>• 1주차: 해당 연도의 첫 번째 목요일이 포함된 주</li>
                <li>• 1월 4일은 항상 1주차에 포함됨</li>
                <li>• 국제 표준으로 전 세계적으로 일관된 주차 계산</li>
              </ul>
            </div>

            {/* 계산 로직 설명 */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                🔍 계산 로직 보기
              </summary>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-2">
                <p><strong>1단계:</strong> 날짜를 Date 객체로 변환</p>
                <p><strong>2단계:</strong> 해당 주의 목요일 날짜 찾기</p>
                <p className="ml-4 text-xs text-gray-600">
                  (ISO 8601에서 주차는 목요일 기준으로 결정됨)
                </p>
                <p><strong>3단계:</strong> 해당 연도 1월 1일과의 일수 차이 계산</p>
                <p><strong>4단계:</strong> 차이를 7로 나누고 올림하여 주차 계산</p>
                <code className="block mt-2 p-2 bg-white rounded text-xs">
                  weekNumber = Math.ceil((daysSince + 1) / 7)
                </code>
              </div>
            </details>
          </div>
        )}

        {/* 테스트 케이스 표 */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            📊 테스트 케이스
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">날짜</th>
                  <th className="p-3 text-left">요일</th>
                  <th className="p-3 text-left">주차</th>
                  <th className="p-3 text-left">설명</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono">2025-01-01</td>
                  <td className="p-3">수요일</td>
                  <td className="p-3 font-bold">1주차</td>
                  <td className="p-3 text-xs text-gray-600">2025년 첫 주</td>
                </tr>
                <tr className="hover:bg-gray-50 bg-purple-50">
                  <td className="p-3 font-mono font-bold">2025-06-30</td>
                  <td className="p-3 font-bold">월요일</td>
                  <td className="p-3 font-bold text-purple-700">27주차</td>
                  <td className="p-3 text-xs text-gray-600">테스트 대상 날짜</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono">2025-12-29</td>
                  <td className="p-3">월요일</td>
                  <td className="p-3 font-bold">2026년 1주차</td>
                  <td className="p-3 text-xs text-gray-600">연도 경계 케이스</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
