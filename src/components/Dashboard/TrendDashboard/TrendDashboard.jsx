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

  // data is an array directly or has weeks property
  const trendData = Array.isArray(data) ? data : data?.weeks;

  if (!trendData || trendData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg">아직 추적 데이터가 없습니다.</p>
        <p className="text-gray-500 mt-2">습관을 기록한 후 확인해주세요.</p>
      </div>
    );
  }

  // Calculate stats from trend data (누락된 주 제외)
  const dataWithValues = trendData.filter(d => d.has_data !== false);
  const missingWeeks = trendData.filter(d => d.has_data === false).length;

  const stats = {
    average: dataWithValues.length > 0 ?
      dataWithValues.reduce((sum, d) => sum + d.completion_rate, 0) / dataWithValues.length : 0,
    max: dataWithValues.length > 0 ? Math.max(...dataWithValues.map((d) => d.completion_rate)) : 0,
    min: dataWithValues.length > 0 ? Math.min(...dataWithValues.map((d) => d.completion_rate)) : 0,
    trend: dataWithValues.length > 1 ?
      (dataWithValues[dataWithValues.length - 1].completion_rate > dataWithValues[0].completion_rate ? 'up' :
       dataWithValues[dataWithValues.length - 1].completion_rate < dataWithValues[0].completion_rate ? 'down' : 'stable')
      : 'stable',
    trend_value: dataWithValues.length > 1 ?
      Math.abs(dataWithValues[dataWithValues.length - 1].completion_rate - dataWithValues[0].completion_rate) : 0,
    recorded_weeks: dataWithValues.length,
    missing_weeks: missingWeeks,
  };

  // YTD (Year-to-Date) 주 수 계산
  const calculateYTDWeeks = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1); // 1월 1일
    const diffTime = Math.abs(today - yearStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7); // 주 수로 변환
  };

  const ytdWeeks = calculateYTDWeeks();

  const periodOptions = [
    { value: 4, label: '4주' },
    { value: 8, label: '8주' },
    { value: 12, label: '12주' },
    { value: 26, label: '6개월' },
    { value: ytdWeeks, label: `YTD (올해, ${ytdWeeks}주)` },
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
              className={`px-3 py-2 rounded border text-sm font-medium ${
                weeks === ytdWeeks
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {periodOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className={option.value === ytdWeeks ? 'bg-green-50 text-green-700' : ''}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {weeks === ytdWeeks && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                📅 올해 전체
              </span>
            )}
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
          <TrendChart data={trendData} />
        </div>
      )}

      {/* Table View */}
      {viewType === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <TrendTable data={trendData} />
        </div>
      )}

      {/* Statistics */}
      <TrendStats stats={stats} />

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
