import React from 'react';

/**
 * Monthly Calendar Component
 * 주별 완료율을 색상으로 표시
 */
export default function MonthlyCalendar({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600">
        주간 데이터가 없습니다
      </div>
    );
  }

  const getColorClass = (rate) => {
    if (rate >= 80) return 'bg-green-100 border-green-300';
    if (rate >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getEmoji = (rate) => {
    if (rate >= 80) return '🟢';
    if (rate >= 50) return '🟡';
    return '🔴';
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
          <span className="text-gray-700">80% 이상</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></span>
          <span className="text-gray-700">50-79%</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
          <span className="text-gray-700">50% 미만</span>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weeks.map((week) => (
          <div
            key={week.week}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-transform hover:scale-105 ${getColorClass(
              week.completion_rate
            )}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{week.week}주차</span>
              <span className="text-2xl">{getEmoji(week.completion_rate)}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              {week.week_start} ~ {week.week_end}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {week.completion_rate}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
