import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

/**
 * Comparison Card Component
 * 개별 아이의 달성률 카드
 *
 * Shows:
 * - 순위 (🥇🥈🥉)
 * - 아이 이름
 * - 현재 주 달성률 (%)
 * - 지난주 비교 (↑↓→)
 * - 진행률 바
 * - 상세 보기 버튼
 */
export default function ComparisonCard({ child, showLastWeek, onViewDetails }) {
  const {
    rank,
    rank_emoji,
    child_name,
    current_rate,
    last_week_rate,
    trend,
    trend_value,
    total_habits,
    completed_habits,
    has_data,
    no_data_message,
  } = child;

  // 데이터 없는 경우 특별한 스타일
  const isNoData = has_data === false;

  // 색상 결정 (달성률에 따라)
  const getColorClass = () => {
    if (isNoData) return 'bg-gray-50 border-gray-300 border-dashed';
    if (current_rate >= 80) return 'bg-green-100 border-green-200';
    if (current_rate >= 50) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const getTextColorClass = () => {
    if (current_rate >= 80) return 'text-green-700';
    if (current_rate >= 50) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getProgressBarColor = () => {
    if (current_rate >= 80) return 'bg-green-500';
    if (current_rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 추세 아이콘 및 색상
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // 데이터 없는 경우 별도 렌더링
  if (isNoData) {
    return (
      <div
        className={`rounded-lg border-2 shadow hover:shadow-md transition-shadow duration-200 p-6 ${getColorClass()}`}
      >
        {/* Rank & Name */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl opacity-30">{rank_emoji}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-600">{child_name}</h3>
              <p className="text-sm text-gray-500">{rank}위</p>
            </div>
          </div>
        </div>

        {/* No Data Message */}
        <div className="text-center py-8">
          <div className="text-5xl mb-3 opacity-20">📭</div>
          <p className="text-gray-600 font-medium mb-1">{no_data_message || '기록 없음'}</p>
          <p className="text-sm text-gray-500">이 기간에 습관 기록이 없습니다</p>
        </div>

        {/* View Details Button */}
        <button
          onClick={() => onViewDetails()}
          className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300 transition-colors"
        >
          <span>자세히 보기</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 데이터 있는 경우 기존 렌더링
  return (
    <div
      className={`rounded-lg border-2 shadow hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer ${getColorClass()}`}
      onClick={onViewDetails}
    >
      {/* Rank & Name */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{rank_emoji}</span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{child_name}</h3>
            <p className="text-sm text-gray-600">{rank}위</p>
          </div>
        </div>
      </div>

      {/* Main Rate */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-4xl font-bold ${getTextColorClass()}`}>
            {Math.round(current_rate)}%
          </span>
          {showLastWeek && last_week_rate !== null && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-semibold">
                {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
                {Math.round(trend_value)}%
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(current_rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-white bg-opacity-50 rounded px-3 py-2">
          <p className="text-gray-600">완료 습관</p>
          <p className="font-semibold text-gray-900">
            {completed_habits}/{total_habits}
          </p>
        </div>
        <div className="bg-white bg-opacity-50 rounded px-3 py-2">
          <p className="text-gray-600">상태</p>
          <p className="font-semibold text-gray-900">
            {current_rate >= 80 ? '🟢 우수' : current_rate >= 50 ? '🟡 보통' : '🔴 미흡'}
          </p>
        </div>
      </div>

      {/* Last Week Comparison (if enabled) */}
      {showLastWeek && last_week_rate !== null && (
        <div className="bg-white bg-opacity-50 rounded px-3 py-2 mb-4">
          <p className="text-xs text-gray-600">이전 주 달성률</p>
          <p className="text-sm font-semibold text-gray-900">{Math.round(last_week_rate)}%</p>
        </div>
      )}

      {/* View Details Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300 transition-colors"
      >
        <span>자세히 보기</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
