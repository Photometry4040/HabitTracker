import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Monthly Comparison Component
 * 지난달과 비교
 */
export default function MonthlyComparison({ comparison }) {
  if (!comparison) {
    return null;
  }

  const improvement = comparison.improvement;
  const isImproving = improvement > 0;
  const isStable = improvement === 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 지난달 비교</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Month */}
        <div className="bg-white rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 mb-2">이번 달</p>
          <p className="text-2xl font-bold text-blue-600">{comparison.current_month}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {comparison.current_avg}%
          </p>
        </div>

        {/* Comparison Arrow */}
        <div className="flex items-center justify-center">
          {isImproving ? (
            <div className="flex flex-col items-center">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-2xl font-bold text-green-600">+{improvement}%</span>
              <span className="text-xs text-green-600 mt-1">상승 중!</span>
            </div>
          ) : isStable ? (
            <div className="flex flex-col items-center">
              <Minus className="w-8 h-8 text-gray-600 mb-2" />
              <span className="text-lg font-bold text-gray-600">동일</span>
              <span className="text-xs text-gray-600 mt-1">안정적</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <TrendingDown className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-2xl font-bold text-red-600">{improvement}%</span>
              <span className="text-xs text-red-600 mt-1">하락 중</span>
            </div>
          )}
        </div>

        {/* Last Month */}
        <div className="bg-white rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 mb-2">지난 달</p>
          <p className="text-2xl font-bold text-purple-600">{comparison.last_month}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {comparison.last_month_avg}%
          </p>
        </div>
      </div>

      {/* Message */}
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        {isImproving ? (
          <p className="text-sm text-blue-900">
            🎉 지난달보다 <strong>{improvement}%</strong> 개선되었습니다! 계속 이 조건을 유지해주세요.
          </p>
        ) : isStable ? (
          <p className="text-sm text-blue-900">
            → 지난달과 동일한 수준을 유지하고 있습니다. 조금 더 노력하면 개선될 수 있습니다!
          </p>
        ) : (
          <p className="text-sm text-blue-900">
            ⚠️ 지난달보다 <strong>{Math.abs(improvement)}%</strong> 하락했습니다. 다시 노력해봅시다!
          </p>
        )}
      </div>
    </div>
  );
}
