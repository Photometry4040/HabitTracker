import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart,
} from 'recharts';
import { getISOWeekNumber } from '@/lib/weekNumber.js';

/**
 * Trend Chart Component
 * 습관 달성률 추세를 라인/면적 차트로 표시
 *
 * Shows:
 * - 주별 추세 라인
 * - 목표선 (80%)
 * - 인터랙티브 툴팁
 */
export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-600">데이터가 없습니다</p>
      </div>
    );
  }

  // 차트 데이터 포맷팅 (ISO 주차 번호 사용)
  const chartData = data.map((week, index) => {
    // ISO 8601 주차 계산
    let weekLabel;
    try {
      const isoWeekNum = getISOWeekNumber(week.week_start_date);
      weekLabel = `${isoWeekNum}주`;
    } catch (error) {
      // 폴백: 배열 인덱스 사용
      weekLabel = `${index + 1}주`;
    }

    return {
      week: weekLabel,
      rate: week.has_data ? week.completion_rate : null,
      habits: week.total_habits,
      completed: week.completed_habits,
      has_data: week.has_data !== false, // 데이터 존재 여부
      date: week.week_start_date,
    };
  });

  // 커스텀 커서 렌더러
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-300">
          <p className="font-semibold text-gray-900">{data.week}</p>
          {data.has_data ? (
            <>
              <p className="text-blue-600 font-medium">{Math.round(data.rate)}%</p>
              <p className="text-xs text-gray-600">
                {data.completed}/{data.habits} 완료
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">데이터 없음</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{data.date}</p>
        </div>
      );
    }
    return null;
  };

  // Filter data to show only weeks with actual data for scatter plot
  const scatterData = chartData.filter(d => d.rate !== null && d.rate !== undefined);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 280 : 400}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={Math.floor(chartData.length / 10)} // Show approximately 10 labels
          />
          <YAxis
            domain={[0, 100]}
            label={{ value: '달성률 (%)', angle: -90, position: 'insideLeft' }}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />

          {/* 목표선 (80%) */}
          <ReferenceLine
            y={80}
            stroke="#10B981"
            strokeDasharray="5 5"
            label={{ value: "목표 80%", position: "right", fill: "#10B981", fontSize: 12 }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Area filling for visual effect */}
          <Area
            type="monotone"
            dataKey="rate"
            stroke="none"
            fill="url(#colorRate)"
            connectNulls={false}
          />

          {/* Main data line */}
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#3B82F6"
            strokeWidth={2}
            connectNulls={false}
            dot={(props) => {
              const { cx, cy, value, payload, index } = props;
              // Only render dots for actual data points
              if (value === null || value === undefined) {
                return null;
              }

              return (
                <g key={`dot-${payload.date || index}`}>
                  {/* Outer white circle for visibility */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill="#ffffff"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                  {/* Inner colored circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#3B82F6"
                  />
                  {/* Label for 100% achievements */}
                  {value === 100 && (
                    <text
                      x={cx}
                      y={cy - 12}
                      fill="#3B82F6"
                      fontSize={11}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      💯
                    </text>
                  )}
                </g>
              );
            }}
            activeDot={{ r: 10, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Goal Line Indicator */}
      <div className="flex items-center justify-center mt-4 space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-1 bg-blue-500"></div>
          <span className="text-sm text-gray-700">현재 달성률</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-1 border-t-2 border-dashed border-green-500"></div>
          <span className="text-sm text-gray-700">목표 (80%)</span>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-900">📊 추세 분석</p>
          <p className="text-sm text-blue-800">
            {getTrendMessage(chartData)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 추세를 분석하여 메시지 생성
 */
function getTrendMessage(data) {
  if (!data || data.length < 2) {
    return '데이터가 부족합니다.';
  }

  // 데이터가 있는 주만 필터링
  const dataWithValues = data.filter(d => d.rate !== null && d.rate !== undefined);
  const missingWeeks = data.filter(d => d.rate === null || d.rate === undefined).length;

  if (dataWithValues.length < 1) {
    return '기록된 데이터가 없습니다.';
  }

  const firstRate = dataWithValues[0].rate;
  const lastRate = dataWithValues[dataWithValues.length - 1].rate;
  const avgRate = dataWithValues.reduce((sum, d) => sum + d.rate, 0) / dataWithValues.length;
  const maxRate = Math.max(...dataWithValues.map((d) => d.rate));
  const minRate = Math.min(...dataWithValues.map((d) => d.rate));

  let message = `평균 달성률은 ${Math.round(avgRate)}%입니다 (기록된 주: ${dataWithValues.length}주). `;

  if (missingWeeks > 0) {
    message += `${missingWeeks}주 동안은 기록이 없습니다. `;
  }

  if (lastRate > firstRate) {
    const improvement = Math.round((lastRate - firstRate) * 10) / 10;
    message += `최근 ${improvement}% 개선되고 있어요! 👍`;
  } else if (lastRate < firstRate) {
    const decline = Math.round((firstRate - lastRate) * 10) / 10;
    message += `최근 ${decline}% 하락했어요. 다시 열심히 해봐요! 💪`;
  } else {
    message += `현재 안정적으로 유지하고 있어요.`;
  }

  if (avgRate >= 80) {
    message += ' 목표를 잘 달성하고 있습니다! 🎉';
  }

  return message;
}
