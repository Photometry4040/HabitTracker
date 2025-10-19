import React, { useState } from 'react';
import { useMonthlyStats } from '@/hooks/useDashboardData';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import ChildSelector from '../../common/ChildSelector';
import LoadingSpinner from '../../common/LoadingSpinner';
import MonthlyCalendar from './MonthlyCalendar';
import MonthlyComparison from './MonthlyComparison';

/**
 * Monthly Dashboard
 * 월간 상세 분석 및 비교
 *
 * Features:
 * - 월간 캘린더 뷰 (주별 완료율)
 * - 월간 통계
 * - 지난달 비교
 * - 상위 월간 성과
 */
export default function MonthlyDashboard({ childId, onChildSelect }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading, error } = useMonthlyStats(childId, year, month);

  if (!childId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📅 월간 상세 분석</h2>
          <p className="text-gray-600 mt-1">과거 모든 달의 데이터를 조회합니다</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-900 font-medium">아이를 선택해주세요</p>
          <div className="mt-4">
            <ChildSelector onSelect={onChildSelect} />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">오류 발생</h3>
        <p className="text-red-800">{error.message}</p>
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg">아직 월간 데이터가 없습니다.</p>
        <p className="text-gray-500 mt-2">습관을 기록한 후 확인해주세요.</p>
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📅 월간 상세 분석</h2>
        <p className="text-gray-600 mt-1">과거 모든 달의 데이터를 조회합니다</p>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          ← 이전
        </button>
        <h3 className="text-xl font-bold text-gray-900">{data.summary.month_name}</h3>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          다음 →
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">평균 달성률</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {data.summary.average_completion}%
          </p>
          <p className="text-xs text-gray-600 mt-2">{data.summary.total_weeks}주 평균</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">최고 주차</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {data.summary.best_week.completion_rate}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {data.summary.best_week.week}주차
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">최저 주차</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {data.summary.worst_week.completion_rate}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {data.summary.worst_week.week}주차
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">총 주차</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {data.summary.total_weeks}주
          </p>
          <p className="text-xs text-gray-600 mt-2">이번 달</p>
        </div>
      </div>

      {/* Monthly Calendar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 주간 완료율</h3>
        <MonthlyCalendar weeks={data.summary.weeks} />
      </div>

      {/* Comparison with Last Month */}
      <MonthlyComparison comparison={data.comparison} />

      {/* Top Months */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 상위 월간 성과</h3>
        <div className="space-y-3">
          {data.top_months.map((month, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'} {month.month_name}
              </span>
              <span className="text-lg font-bold text-gray-900">{month.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 팁: 월간 성과를 추적하면 장기 목표 달성에 도움이 됩니다. 매달 조금씩 개선해보세요!
        </p>
      </div>
    </div>
  );
}
