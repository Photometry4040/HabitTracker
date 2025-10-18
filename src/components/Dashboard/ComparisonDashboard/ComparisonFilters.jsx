import React from 'react';
import { Filter } from 'lucide-react';

/**
 * Comparison Filters Component
 * 비교 대시보드 필터 옵션
 */
export default function ComparisonFilters({
  showLastWeek,
  onToggleLastWeek,
  sortBy,
  onSortChange,
}) {
  const sortOptions = [
    { value: 'rate', label: '달성률 높은 순' },
    { value: 'name', label: '이름순' },
    { value: 'trend', label: '상승세' },
  ];

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">필터:</span>
      </div>

      {/* Last Week Toggle */}
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showLastWeek}
          onChange={(e) => onToggleLastWeek(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">지난주 비교</span>
      </label>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-sm px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:border-gray-400"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
