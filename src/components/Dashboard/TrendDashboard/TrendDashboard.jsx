import React, { useState } from 'react';
import { useTrendData } from '@/hooks/useDashboardData';
import { BarChart2, Table2, Download } from 'lucide-react';
import TrendChart from './TrendChart';
import TrendTable from './TrendTable';
import TrendStats from './TrendStats';
import ChildSelector from '../../common/ChildSelector';
import LoadingSpinner from '../../common/LoadingSpinner';

/**
 * Trend Dashboard
 * 기간별 습관 달성률 추세 분석
 *
 * Features:
 * - 라인 차트로 추세 시각화
 * - 주별 상세 데이터 테이블
 * - 기간 선택 (4주, 8주, 12주, 3개월, 6개월, 1년)
 * - 통계 요약
 * - 데이터 내보내기 (CSV, Excel)
 */
export default function TrendDashboard({ childId, onChildSelect }) {
  const [weeks, setWeeks] = useState(8);
  const [viewType, setViewType] = useState('chart'); // 'chart' or 'table'

  const { data, isLoading, error } = useTrendData(childId, weeks);

  if (!childId) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <p className="text-blue-900 font-medium">아이를 선택해주세요</p>
        <p className="text-blue-800 text-sm mt-2">
          비교 대시보드에서 아이를 선택하거나 아래에서 선택할 수 있습니다.
        </p>
        <div className="mt-4">
          <ChildSelector onSelect={onChildSelect} />
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

  if (!data || !data.weeks || data.weeks.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg">아직 추적 데이터가 없습니다.</p>
        <p className="text-gray-500 mt-2">습관을 기록한 후 확인해주세요.</p>
      </div>
    );
  }

  const periodOptions = [
    { value: 4, label: '4주' },
    { value: 8, label: '8주' },
    { value: 12, label: '12주' },
    { value: 26, label: '6개월' },
    { value: 52, label: '1년' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📈 습관 추세 분석</h2>
        <p className="text-gray-600 mt-1">아이의 장기 성과를 추적하세요</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">기간:</label>
            <select
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value))}
              className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 text-sm"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Type Toggle */}
          <div className="flex items-center bg-gray-200 rounded-lg p-1 ml-4">
            <button
              onClick={() => setViewType('chart')}
              className={`flex items-center space-x-1 px-3 py-2 rounded text-sm ${
                viewType === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>차트</span>
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center space-x-1 px-3 py-2 rounded text-sm ${
                viewType === 'table'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>테이블</span>
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button className="flex items-center space-x-2 px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">내보내기</span>
        </button>
      </div>

      {/* Chart View */}
      {viewType === 'chart' && (
        <div className="bg-white rounded-lg shadow p-6">
          <TrendChart data={data.weeks} />
        </div>
      )}

      {/* Table View */}
      {viewType === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <TrendTable data={data.weeks} />
        </div>
      )}

      {/* Statistics */}
      <TrendStats stats={data.stats} />

      {/* Tips */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-900">
          💡 팁: 장기 추세를 보면 아이의 습관 개선 여부를 명확하게 파악할 수 있습니다.
          꾸준한 개선이 보이면 격려해주세요!
        </p>
      </div>
    </div>
  );
}
