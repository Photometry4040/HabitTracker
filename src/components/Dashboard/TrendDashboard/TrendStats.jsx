import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

/**
 * Trend Statistics Component
 * 추세 분석 통계 요약
 */
export default function TrendStats({ stats }) {
  if (!stats) {
    return null;
  }

  const {
    average,
    max,
    min,
    trend,
    trend_value,
  } = stats;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-6 h-6 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-6 h-6 text-red-600" />;
      default:
        return <Activity className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTrendMessage = () => {
    switch (trend) {
      case 'up':
        return `최근 ${Math.round(trend_value)}% 상승 추세입니다 📈`;
      case 'down':
        return `최근 ${Math.round(trend_value)}% 하락 추세입니다 📉`;
      default:
        return '현재 안정적입니다 →';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Average */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">평균 달성률</h3>
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-3xl font-bold text-blue-600">{Math.round(average)}%</p>
        <p className="text-xs text-gray-600 mt-2">전 기간 평균</p>
      </div>

      {/* Maximum */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">최고 달성률</h3>
          <span className="text-2xl">🏆</span>
        </div>
        <p className="text-3xl font-bold text-green-600">{Math.round(max)}%</p>
        <p className="text-xs text-gray-600 mt-2">최고 기록</p>
      </div>

      {/* Minimum */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">최저 달성률</h3>
          <span className="text-2xl">📉</span>
        </div>
        <p className="text-3xl font-bold text-orange-600">{Math.round(min)}%</p>
        <p className="text-xs text-gray-600 mt-2">최저 기록</p>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">최근 추세</h3>
          {getTrendIcon()}
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-2">
          {getTrendMessage()}
        </p>
      </div>
    </div>
  );
}
