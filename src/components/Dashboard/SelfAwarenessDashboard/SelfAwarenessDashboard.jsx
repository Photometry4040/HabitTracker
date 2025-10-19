import React, { useState } from 'react';
import { useInsights } from '@/hooks/useDashboardData';
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';
import ChildSelector from '../../common/ChildSelector';
import LoadingSpinner from '../../common/LoadingSpinner';
import InsightCard from './InsightCard';
import DayOfWeekChart from './DayOfWeekChart';

/**
 * Self-Awareness Dashboard
 * 아이의 습관별 강점과 약점을 분석하고 패턴을 파악
 *
 * Features:
 * - 강점 습관 TOP 3
 * - 약점 습관 TOP 3
 * - 요일별 완료율 분석
 * - 개인화된 피드백 메시지
 * - 추천 개선 사항
 */
export default function SelfAwarenessDashboard({ childId, onChildSelect }) {
  const [weeksCount, setWeeksCount] = useState(4);
  const { data, isLoading, error } = useInsights(childId, weeksCount);

  if (!childId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧠 자기인식 분석</h2>
          <p className="text-gray-600 mt-1">아이의 약점과 강점을 분석합니다</p>
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
        <p className="text-gray-600 text-lg">아직 분석 데이터가 없습니다.</p>
        <p className="text-gray-500 mt-2">습관을 기록한 후 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🧠 자기인식 분석</h2>
        <p className="text-gray-600 mt-1">아이의 약점과 강점을 분석합니다</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="text-sm font-medium text-gray-700">분석 기간:</label>
        <select
          value={weeksCount}
          onChange={(e) => setWeeksCount(parseInt(e.target.value))}
          className="mt-2 px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 text-sm"
        >
          <option value={1}>1주</option>
          <option value={2}>2주</option>
          <option value={4}>4주</option>
          <option value={8}>8주</option>
        </select>
      </div>

      {/* Feedback Message */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-6">
        <p className="text-lg font-semibold text-gray-900 mb-2">
          📢 {data.summary.feedback_message}
        </p>
        <p className="text-sm text-gray-600">
          평균 달성률: <span className="font-bold text-lg text-blue-600">{data.summary.average_completion}%</span>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard
          title="평균 달성률"
          value={`${data.summary.average_completion}%`}
          icon="📊"
          color="blue"
        />
        <InsightCard
          title="총 습관 수"
          value={data.summary.total_habits}
          icon="🎯"
          color="green"
        />
        <InsightCard
          title="분석 기간"
          value={data.summary.period}
          icon="📅"
          color="purple"
        />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Award className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">💪 강점 습관 TOP 3</h3>
          </div>
          <div className="space-y-3">
            {data.strengths.map((habit, index) => (
              <div key={`strength-${habit.habit_name}-${index}`} className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{habit.habit_name}</p>
                  <span className="text-2xl">
                    {habit.rank === 1 ? '🥇' : habit.rank === 2 ? '🥈' : '🥉'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-green-600">
                    {habit.completion_rate}%
                  </div>
                  <div className="flex items-center">
                    {habit.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="ml-1 text-sm text-gray-600">
                      {habit.trend_value}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {habit.completed_days}/{habit.total_days} 완료
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">⚠️ 약점 습관 TOP 3</h3>
          </div>
          <div className="space-y-3">
            {data.weaknesses.map((habit, index) => (
              <div key={`weakness-${habit.habit_name}-${index}`} className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{habit.habit_name}</p>
                  <span className="text-sm font-semibold text-red-600">
                    {habit.rank === 1 ? '⬇️⬇️' : habit.rank === 2 ? '⬇️' : '→'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-red-600">
                    {habit.completion_rate}%
                  </div>
                  <div className="flex items-center">
                    {habit.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="ml-1 text-sm text-gray-600">
                      {habit.trend_value}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  개선 권고: 주 3회 이상 실천하기
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day of Week Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 요일별 완료율</h3>
        <DayOfWeekChart data={data.day_of_week_stats} />
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 분석 결과 & 조언</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <p className="font-semibold text-gray-900">최고 요일</p>
              <p className="text-sm text-gray-600">
                {data.insights.best_day.day} ({data.insights.best_day.rate}%) - {data.insights.best_day.emoji}
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <p className="font-semibold text-gray-900">개선 필요 요일</p>
              <p className="text-sm text-gray-600">
                {data.insights.worst_day.day} ({data.insights.worst_day.rate}%) - 이 요일에 집중 관찰 필요!
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mr-3">📊</span>
            <div>
              <p className="font-semibold text-gray-900">전체 추세</p>
              <p className="text-sm text-gray-600">
                {data.insights.trend_summary === 'improving' ? '✨ 계속 개선 중입니다!' : '→ 현재 안정적입니다'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          💚 팁: 강점 습관을 유지하면서 약점 습관을 주 1회씩 더 실천해보세요. 작은 변화가 모여 큰 성장이 됩니다!
        </p>
      </div>
    </div>
  );
}
