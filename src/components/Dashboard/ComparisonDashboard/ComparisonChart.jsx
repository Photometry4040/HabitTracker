import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * Comparison Chart Component
 * 아이별 달성률 비교 막대 그래프
 *
 * Shows:
 * - 각 아이의 현재 주 달성률
 * - 컬러 코딩 (녹색: 80%+, 노랑: 50-79%, 빨강: <50%)
 * - 상호작용: 클릭하면 상세 정보로 이동
 */
export default function ComparisonChart({ data, onChildClick }) {
  // 데이터 정렬 (달성률 순)
  const sortedData = [...data].sort((a, b) => b.current_rate - a.current_rate);

  // 색상 결정
  const getBarColor = (rate) => {
    if (rate >= 80) return '#10B981'; // 녹색
    if (rate >= 50) return '#F59E0B'; // 노랑
    return '#EF4444'; // 빨강
  };

  // 차트용 데이터 포맷
  const chartData = sortedData.map((child, index) => ({
    name: `${child.rank_emoji} ${child.child_name}`,
    rate: child.current_rate,
    completed: child.completed_habits,
    total: child.total_habits,
    childId: child.child_id,
    color: getBarColor(child.current_rate),
    rank: child.rank,
  }));

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">달성률 비교</h3>
        <p className="text-sm text-gray-600">아이들의 이번 주 습관 달성률을 비교합니다.</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            domain={[0, 100]}
            label={{ value: '달성률 (%)', angle: -90, position: 'insideLeft' }}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value, name) => {
              if (name === 'rate') return [`${Math.round(value)}%`, '달성률'];
              return [value, name];
            }}
            labelFormatter={(label) => label}
          />
          <Bar
            dataKey="rate"
            fill="#8884d8"
            onClick={(data) => {
              onChildClick(data.childId);
            }}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <LegendItem
          color="bg-green-500"
          label="우수 (80%+)"
          description="목표 달성"
        />
        <LegendItem
          color="bg-yellow-500"
          label="보통 (50-79%)"
          description="진행 중"
        />
        <LegendItem
          color="bg-red-500"
          label="미흡 (<50%)"
          description="개선 필요"
        />
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 팁: 막대 그래프를 클릭하면 해당 아이의 상세 정보를 볼 수 있습니다.
        </p>
      </div>
    </div>
  );
}

/**
 * Legend Item Component
 */
function LegendItem({ color, label, description }) {
  return (
    <div className="flex items-start space-x-3">
      <div className={`w-4 h-4 rounded mt-1 ${color}`} />
      <div>
        <p className="font-semibold text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </div>
  );
}
