import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Day of Week Chart Component
 * 요일별 완료율을 시각화
 */
export default function DayOfWeekChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-600">데이터가 없습니다</p>
      </div>
    );
  }

  // 요일별 색상 설정
  const dayColors = {
    '월요일': '#3B82F6',
    '화요일': '#8B5CF6',
    '수요일': '#EC4899',
    '목요일': '#F59E0B',
    '금요일': '#10B981',
    '토요일': '#06B6D4',
    '일요일': '#F87171',
  };

  const chartData = data.map((item) => ({
    ...item,
    fill: dayColors[item.day] || '#6B7280',
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value) => `${value}%`}
          />
          <Bar dataKey="rate" fill="#3B82F6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Day Analysis List */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {chartData.map((day) => (
          <div
            key={day.day}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{day.day}</span>
              <span className="text-lg">{day.emoji}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{day.rate}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
