import React from 'react';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getISOWeekNumber } from '@/lib/weekNumber.js';

/**
 * Trend Table Component
 * 주별 상세 데이터 테이블
 */
export default function TrendTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">데이터가 없습니다</p>
      </div>
    );
  }

  // 데이터 정렬 (최신순)
  const sortedData = [...data].reverse();

  // 데이터 통계
  const dataWithValues = sortedData.filter(d => d.has_data !== false);
  const missingData = sortedData.filter(d => d.has_data === false);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-700">주차</th>
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-semibold text-gray-700">기간</th>
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs font-semibold text-gray-700">습관 수</th>
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs font-semibold text-gray-700">완료</th>
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs font-semibold text-gray-700">달성률</th>
            <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-semibold text-gray-700">상태</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((week, index) => {
            const startDate = parseISO(week.week_start_date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            // ISO 8601 주차 계산
            let weekLabel;
            try {
              const isoWeekNum = getISOWeekNumber(week.week_start_date);
              weekLabel = `${isoWeekNum}주차`;
            } catch (error) {
              // 폴백: 인덱스 기반
              weekLabel = `${sortedData.length - index}주 전`;
            }

            // 빈 주차 체크
            const hasData = week.has_data !== false;

            // 달성률에 따른 상태
            const rate = week.completion_rate;
            const statusColor = hasData
              ? (rate >= 80 ? 'bg-green-100' : rate >= 50 ? 'bg-yellow-100' : 'bg-red-100')
              : 'bg-gray-100';
            const statusText = hasData
              ? (rate >= 80 ? '🟢 우수' : rate >= 50 ? '🟡 보통' : '🔴 미흡')
              : '⚪ 기록 없음';

            // 빈 주차는 시각적으로 구분
            return (
              <tr
                key={week.week_id || `empty-${index}`}
                className={`border-b border-gray-200 transition-colors ${
                  hasData
                    ? 'hover:bg-gray-50'
                    : 'bg-gray-50 opacity-60 hover:opacity-80'
                }`}
              >
                <td className={`px-3 py-3 sm:px-6 sm:py-4 text-sm ${hasData ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  {weekLabel}
                </td>
                <td className={`px-3 py-3 sm:px-6 sm:py-4 text-sm ${hasData ? 'text-gray-700' : 'text-gray-400'}`}>
                  {format(startDate, 'M/d')} ~ {format(endDate, 'M/d')}
                </td>
                <td className={`px-3 py-3 sm:px-6 sm:py-4 text-sm text-right ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>
                  {hasData ? week.total_habits : '-'}
                </td>
                <td className={`px-3 py-3 sm:px-6 sm:py-4 text-sm text-right ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>
                  {hasData ? week.completed_habits : '-'}
                </td>
                <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-right">
                  {hasData ? (
                    <span className="font-bold text-lg text-blue-600">
                      {Math.round(week.completion_rate)}%
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">기록 없음</span>
                  )}
                </td>
                <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusText}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-3 py-3 sm:px-6 sm:py-4 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <SummaryItem
            label="평균"
            value={dataWithValues.length > 0 ? `${Math.round(
              dataWithValues.reduce((sum, d) => sum + d.completion_rate, 0) / dataWithValues.length
            )}%` : '-'}
            icon="📊"
          />
          <SummaryItem
            label="최고"
            value={dataWithValues.length > 0 ? `${Math.max(...dataWithValues.map((d) => d.completion_rate))}%` : '-'}
            icon="🏆"
          />
          <SummaryItem
            label="최저"
            value={dataWithValues.length > 0 ? `${Math.min(...dataWithValues.map((d) => d.completion_rate))}%` : '-'}
            icon="📉"
          />
          <SummaryItem
            label="주차"
            value={`${dataWithValues.length}/${sortedData.length}주`}
            icon="📅"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Summary Item Component
 */
function SummaryItem({ label, value, icon }) {
  return (
    <div className="text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs text-gray-600 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
