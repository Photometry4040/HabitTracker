import React, { useState } from 'react';
import { useComparisonData } from '@/hooks/useDashboardData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ComparisonChart from './ComparisonChart';
import ComparisonCard from './ComparisonCard';
import ComparisonFilters from './ComparisonFilters';
import LoadingSpinner from '../../common/LoadingSpinner';

/**
 * Comparison Dashboard
 * 모든 아이들의 습관 달성률을 한눈에 비교
 *
 * Features:
 * - 아이별 현재 주 달성률 시각화
 * - 순위 표시 (🥇🥈🥉)
 * - 지난주 비교 (↑↓→)
 * - 아이 선택 시 개별 대시보드로 이동
 */
export default function ComparisonDashboard({ userId, onChildSelect, onSwitchTab }) {
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'chart'
  const [showLastWeek, setShowLastWeek] = useState(true);

  const { data, isLoading, error } = useComparisonData(userId);

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

  if (!data || !data.children || data.children.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg">등록된 아이가 없습니다.</p>
        <p className="text-gray-500 mt-2">먼저 아이를 등록해주세요.</p>
      </div>
    );
  }

  const children = data.children;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 우리 아이들의 습관 성적표</h2>
          <p className="text-gray-600 mt-1">주: {data.week}</p>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center space-x-4">
          {/* View Type Toggle */}
          <div className="flex items-center bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewType('grid')}
              className={`px-3 py-2 rounded ${
                viewType === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="카드 뷰"
            >
              📋
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={`px-3 py-2 rounded ${
                viewType === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="차트 뷰"
            >
              📈
            </button>
          </div>

          {/* Last Week Comparison Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLastWeek}
              onChange={(e) => setShowLastWeek(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">지난주 비교</span>
          </label>
        </div>
      </div>

      {/* Chart View */}
      {viewType === 'chart' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ComparisonChart
            data={children}
            onChildClick={(childId) => {
              onChildSelect(childId);
              onSwitchTab('trends');
            }}
          />
        </div>
      )}

      {/* Grid View */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <ComparisonCard
              key={child.child_id}
              child={child}
              showLastWeek={showLastWeek}
              onViewDetails={() => {
                onChildSelect(child.child_id);
                onSwitchTab('trends');
              }}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <SummaryStat
          label="평균 달성률"
          value={`${Math.round(children.reduce((sum, c) => sum + c.current_rate, 0) / children.length)}%`}
          icon="📊"
        />
        <SummaryStat
          label="최고 달성률"
          value={`${Math.max(...children.map((c) => c.current_rate))}%`}
          icon="🏆"
        />
        <SummaryStat
          label="아이 수"
          value={children.length}
          icon="👨‍👩‍👧‍👦"
        />
        <SummaryStat
          label="추적 데이터"
          value={children.reduce((sum, c) => sum + c.total_habits, 0)}
          icon="📝"
        />
      </div>
    </div>
  );
}

/**
 * Summary Stat Component
 */
function SummaryStat({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
