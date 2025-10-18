import React, { useState, useEffect } from 'react';
import { useComparisonData } from '@/hooks/useDashboardData';
import { supabase } from '@/lib/supabase';
import ComparisonDashboard from './ComparisonDashboard/ComparisonDashboard';
import TrendDashboard from './TrendDashboard/TrendDashboard';
import SelfAwarenessDashboard from './SelfAwarenessDashboard/SelfAwarenessDashboard';
import MonthlyDashboard from './MonthlyDashboard/MonthlyDashboard';
import TabNavigation from './TabNavigation';

/**
 * Enhanced Dashboard Hub
 * Main container for all dashboard features
 *
 * Features:
 * - Comparison Dashboard (모든 아이 비교)
 * - Trend Dashboard (기간별 추세)
 * - Self-Awareness Dashboard (자기인식)
 * - Monthly Dashboard (월간 상세)
 * - Real-time Sync (실시간 동기화)
 */
export default function DashboardHub() {
  const [activeTab, setActiveTab] = useState('comparison');
  const [user, setUser] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    }

    getUser();
  }, []);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle child selection (for trend, insights, monthly tabs)
  const handleChildSelect = (childId) => {
    setSelectedChildId(childId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">인증이 필요합니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 대시보드</h1>
              <p className="text-sm text-gray-600">아이들의 습관 성과를 분석하고 추적하세요</p>
            </div>
            <div className="text-sm text-gray-600">
              사용자: {user.email}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Dashboard */}
        {activeTab === 'comparison' && (
          <ComparisonDashboard
            userId={user.id}
            onChildSelect={handleChildSelect}
            onSwitchTab={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}

        {/* Trend Dashboard */}
        {activeTab === 'trends' && (
          <TrendDashboard
            childId={selectedChildId}
            onChildSelect={handleChildSelect}
          />
        )}

        {/* Self-Awareness Dashboard */}
        {activeTab === 'insights' && (
          <SelfAwarenessDashboard
            childId={selectedChildId}
            onChildSelect={handleChildSelect}
          />
        )}

        {/* Monthly Dashboard */}
        {activeTab === 'monthly' && (
          <MonthlyDashboard
            childId={selectedChildId}
            onChildSelect={handleChildSelect}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-600 text-center">
            마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </p>
        </div>
      </footer>
    </div>
  );
}
