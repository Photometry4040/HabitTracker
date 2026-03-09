import React from 'react';
import { BarChart3, TrendingUp, Brain, Calendar } from 'lucide-react';

/**
 * Tab Navigation for Enhanced Dashboard
 * Tabs: Comparison, Trends, Insights, Monthly
 */
export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    {
      id: 'comparison',
      label: '📊 비교',
      description: '모든 아이 비교',
      icon: BarChart3,
    },
    {
      id: 'trends',
      label: '📈 추세',
      description: '기간별 달성률',
      icon: TrendingUp,
    },
    {
      id: 'insights',
      label: '🧠 자기인식',
      description: '약점/강점 분석',
      icon: Brain,
    },
    {
      id: 'monthly',
      label: '📅 월간',
      description: '상세 조회',
      icon: Calendar,
    },
  ];

  return (
    <nav className="flex space-x-1 sm:space-x-2" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`
              group relative inline-flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-4 py-3 sm:py-4
              border-b-2 font-medium text-xs sm:text-sm min-h-[44px]
              transition-colors duration-200
              ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.label.replace(/[^\w가-힣]/g, '').slice(0, 3)}</span>

            {/* Tooltip on hover */}
            <div
              className={`
                absolute bottom-full left-0 mb-2 px-2 py-1 rounded
                bg-gray-900 text-white text-xs whitespace-nowrap
                opacity-0 pointer-events-none group-hover:opacity-100
                transition-opacity duration-200
                z-10
              `}
            >
              {tab.description}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
