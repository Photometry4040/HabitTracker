import { lazy, Suspense, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ErrorBoundary } from '@/components/common/ErrorBoundary.jsx'
import { useThemeMode } from '@/hooks/useThemeMode.js'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, Star, Trophy, Target, Plus, Trash2, Users, Save, Cloud, BarChart3, LogOut, BookTemplate, AlertCircle, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, Moon, Sun } from 'lucide-react'
import { ChildSelector } from '@/components/ChildSelector.jsx'
import { BottomNav } from '@/components/BottomNav.jsx'
import { Auth } from '@/components/Auth.jsx'
import { RewardNotificationProvider } from '@/components/Rewards/RewardNotificationProvider.jsx'
import { useHabitTracker } from '@/hooks/useHabitTracker.js'
import { DAYS, COLORS, THEME_OPTIONS, getColorClass, getWeeklyScore, getTotalScore, getMaxScore } from '@/lib/app-constants.js'
import './App.css'

// Lazy load heavy components for code splitting
const DashboardHub = lazy(() => import('@/components/Dashboard/DashboardHub'))
const TemplateManager = lazy(() => import('@/components/TemplateManager.jsx').then(m => ({ default: m.TemplateManager })))
const GoalsManager = lazy(() => import('@/components/Goals/GoalsManager.jsx').then(m => ({ default: m.GoalsManager })))
const WeaknessLogger = lazy(() => import('@/components/Weaknesses/WeaknessLogger.jsx').then(m => ({ default: m.WeaknessLogger })))
const MandalaChart = lazy(() => import('@/components/Mandala/MandalaChart.jsx').then(m => ({ default: m.MandalaChart })))
const WeeklyPlannerManager = lazy(() => import('@/components/WeeklyPlanner/WeeklyPlannerManager.jsx').then(m => ({ default: m.WeeklyPlannerManager })))

import { HabitTableSkeleton, DashboardSkeleton, MandalaSkeleton } from '@/components/common/Skeleton.jsx'
import { OfflineBanner } from '@/components/common/OfflineBanner.jsx'
import { HabitCompletionEffect } from '@/components/common/HabitCompletionEffect.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'

const SuspenseFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-purple-600 dark:text-purple-400">로딩 중...</div>
  </div>
)

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.2, ease: 'easeOut' }
}

function App() {
  const {
    user, loading, handleLogout,
    selectedChild, showChildSelector, setShowChildSelector, childName, setChildName,
    handleChildSelect, handleNewChild,
    weekPeriod, weekStartDate, setWeekStartDate, theme, setTheme,
    habits, reflection, setReflection, reward, setReward,
    currentWeekId, currentChildId,
    saveData, updateHabitColor, bulkUpdateDay, addHabit, removeHabit, updateHabitName,
    handleApplyTemplate, resetData,
    saving, showOverwriteConfirm, setShowOverwriteConfirm, pendingSaveData, autoSaveStatus, hasChanges,
    showDashboard, setShowDashboard,
    showTemplateManager, setShowTemplateManager,
    showGoals, setShowGoals,
    showWeaknesses, setShowWeaknesses,
    showMandala, setShowMandala,
    showWeeklyPlanner, setShowWeeklyPlanner,
  } = useHabitTracker()

  const { mode: themeMode, toggle: toggleTheme } = useThemeMode()

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // Environment variable check
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  let isValidUrl = false
  try {
    if (supabaseUrl) { new URL(supabaseUrl); isValidUrl = true }
  } catch (error) { /* invalid URL */ }

  if (!supabaseUrl || !supabaseKey || !isValidUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">환경변수 설정 오류</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-4">Supabase 환경변수가 올바르게 설정되지 않았습니다.</p>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-left text-sm">
            <p><strong>현재 상태:</strong></p>
            <p>• URL: {supabaseUrl || '설정되지 않음'}</p>
            <p>• URL 유효성: {isValidUrl ? '✅' : '❌'}</p>
            <p>• Key: {supabaseKey ? '설정됨' : '설정되지 않음'}</p>
            <p><strong>필요한 환경변수:</strong></p>
            <p>• VITE_SUPABASE_URL (올바른 URL 형식)</p>
            <p>• VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs mt-4">Netlify 대시보드에서 환경변수를 다시 확인해주세요.</p>
        </div>
      </div>
    )
  }

  // Auth screen
  if (!user) {
    return <Auth onAuthSuccess={() => {}} />
  }

  // Determine active view name for BottomNav
  const getActiveView = () => {
    if (showDashboard) return 'dashboard'
    if (showGoals) return 'goals'
    if (showMandala) return 'mandala'
    if (showWeaknesses) return 'weaknesses'
    if (showWeeklyPlanner) return 'planner'
    if (showTemplateManager) return 'templates'
    return 'tracker'
  }

  const handleBottomNavNavigate = (view) => {
    // Reset all views first
    setShowDashboard(false)
    setShowTemplateManager(false)
    setShowGoals(false)
    setShowWeaknesses(false)
    setShowMandala(false)
    setShowWeeklyPlanner(false)

    // Set the requested view
    if (view === 'dashboard') setShowDashboard(true)
    else if (view === 'goals') setShowGoals(true)
    else if (view === 'mandala') setShowMandala(true)
    else if (view === 'weaknesses') setShowWeaknesses(true)
    else if (view === 'planner') setShowWeeklyPlanner(true)
    else if (view === 'templates') setShowTemplateManager(true)
    // 'tracker' = all false (default)
  }

  // Helper: navigate week date by offset days
  const navigateWeek = (offsetDays) => {
    if (!weekStartDate) return
    const d = new Date(weekStartDate)
    d.setDate(d.getDate() + offsetDays)
    setWeekStartDate(d.toISOString().split('T')[0])
  }

  // Format date for mobile header display
  const formatMobileDate = (dateStr) => {
    if (!dateStr) return '날짜 선택'
    const d = new Date(dateStr)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`
  }

  return (
    <RewardNotificationProvider childName={selectedChild}>
      <OfflineBanner />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 dark:from-gray-950 dark:via-indigo-950/30 dark:to-gray-900 p-2 sm:p-4 pb-20 md:pb-4">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Desktop top bar */}
          <div className="hidden md:flex justify-end gap-2 no-print">
            <Button onClick={toggleTheme} variant="outline" size="sm" className="flex items-center gap-2">
              {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {themeMode === 'dark' ? '라이트' : '다크'}
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>

          {showChildSelector ? (
            <ChildSelector onChildSelect={handleChildSelect} onNewChild={handleNewChild} />
          ) : (
            <>
              {/* Mobile Compact Sticky Header */}
              <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 -mx-2 -mt-2 px-3 py-2 md:hidden no-print">
                <div className="flex items-center justify-between">
                  {/* Child avatar */}
                  <button
                    onClick={() => { setShowChildSelector(true); resetData() }}
                    className="flex items-center gap-2"
                    aria-label="아이 선택"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">
                      {childName ? childName[0] : '?'}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[60px] truncate">{childName || '선택'}</span>
                  </button>

                  {/* Date navigation */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigateWeek(-7)} className="p-1.5 rounded-full hover:bg-gray-100 dark:bg-gray-700 active:bg-gray-200" aria-label="이전 주">
                      <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
                    </button>
                    <label htmlFor="mobileDate" className="font-semibold text-sm text-gray-800 dark:text-gray-100 cursor-pointer">
                      {formatMobileDate(weekStartDate)}
                    </label>
                    <input
                      id="mobileDate"
                      type="date"
                      value={weekStartDate}
                      onChange={(e) => setWeekStartDate(e.target.value)}
                      className="sr-only"
                    />
                    <button onClick={() => navigateWeek(7)} className="p-1.5 rounded-full hover:bg-gray-100 dark:bg-gray-700 active:bg-gray-200" aria-label="다음 주">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
                    </button>
                  </div>

                  {/* Auto-save indicator + Save button */}
                  <div className="flex items-center gap-1.5">
                    {autoSaveStatus === 'pending' && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 animate-pulse">3초...</span>
                    )}
                    {autoSaveStatus === 'saving' && (
                      <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    )}
                    {autoSaveStatus === 'saved' && (
                      <span className="text-[10px] text-green-500 font-medium">저장됨</span>
                    )}
                    {(hasChanges || saving || autoSaveStatus === 'saving') && (
                      <button
                        onClick={() => saveData(false)}
                        disabled={saving || autoSaveStatus === 'saving'}
                        className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                        aria-label="저장"
                      >
                        {saving || autoSaveStatus === 'saving' ? <Cloud className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                {/* Row 2: Week period + theme */}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate flex-1">{weekPeriod || '시작일을 선택하세요'}</span>
                  {theme && (
                    <span className="text-[11px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">{theme}</span>
                  )}
                </div>
              </div>

              {/* Desktop Header Card (hidden on mobile) */}
              <Card className="hidden md:block bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg border border-white/20 dark:border-gray-700/30">
                <CardHeader className="text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      onClick={() => { setShowChildSelector(true); resetData() }}
                      variant="outline" size="sm" className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      아이 변경
                    </Button>
                    <CardTitle className="text-2xl md:text-3xl font-bold font-display text-purple-800 dark:text-purple-300 flex items-center justify-center gap-2 text-center">
                      <Star className="text-yellow-500" />
                      <span>주간 습관 성장 챌린지</span>
                      <Star className="text-yellow-500" />
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-2 no-print">
                      {saving && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                          <Cloud className="w-4 h-4 animate-pulse" />
                          저장 중...
                        </div>
                      )}
                      <NavigationButtons
                        showTemplateManager={showTemplateManager} setShowTemplateManager={setShowTemplateManager}
                        showGoals={showGoals} setShowGoals={setShowGoals}
                        showWeaknesses={showWeaknesses} setShowWeaknesses={setShowWeaknesses}
                        showMandala={showMandala} setShowMandala={setShowMandala}
                        showWeeklyPlanner={showWeeklyPlanner} setShowWeeklyPlanner={setShowWeeklyPlanner}
                        showDashboard={showDashboard} setShowDashboard={setShowDashboard}
                        saving={saving} onSave={() => saveData(false)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <div>
                      <Label htmlFor="childName" className="text-sm sm:text-base">아이 이름</Label>
                      <Input id="childName" value={childName} onChange={(e) => setChildName(e.target.value)}
                        placeholder="이름을 입력하세요" className="text-sm sm:text-base" />
                    </div>
                    <div>
                      <Label htmlFor="weekStartDate" className="text-sm sm:text-base">주간 시작일</Label>
                      <Input id="weekStartDate" type="date" value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                        className="cursor-pointer text-sm sm:text-base" />
                    </div>
                    <div className="hidden sm:block">
                      <Label htmlFor="weekPeriod" className="text-sm sm:text-base">주간 기간</Label>
                      <Input id="weekPeriod" value={weekPeriod} readOnly
                        className="bg-gray-50 dark:bg-gray-800 cursor-default text-sm sm:text-base"
                        placeholder="시작일을 선택하면 자동으로 계산됩니다" />
                    </div>
                    <div>
                      <Label htmlFor="theme" className="text-sm sm:text-base">이번 주 테마</Label>
                      <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background text-foreground px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">테마를 선택하세요</option>
                        {THEME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Views */}
              {showTemplateManager ? (
                <ViewWrapper>
                  <ErrorBoundary title="템플릿 오류" message="템플릿 관리를 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}>
                      <TemplateManager onApplyTemplate={handleApplyTemplate} currentHabits={habits}
                        childName={childName} onClose={() => setShowTemplateManager(false)} />
                    </Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : showGoals ? (
                <ViewWrapper>
                  <ErrorBoundary title="목표 관리 오류" message="목표 관리를 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}><GoalsManager childName={selectedChild} /></Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : showWeaknesses ? (
                <ViewWrapper>
                  <ErrorBoundary title="약점 관리 오류" message="약점 관리를 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}><WeaknessLogger childName={selectedChild} /></Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : showMandala ? (
                <ViewWrapper>
                  <ErrorBoundary title="만다라트 오류" message="만다라트를 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}><MandalaChart childName={selectedChild} /></Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : showWeeklyPlanner ? (
                <ViewWrapper>
                  <ErrorBoundary title="주간 계획 오류" message="주간 계획을 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}>
                      <WeeklyPlannerManager childId={currentChildId} childName={childName}
                        weekId={currentWeekId} weekStartDate={weekStartDate} />
                    </Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : showDashboard ? (
                <ViewWrapper>
                  <ErrorBoundary title="대시보드 오류" message="대시보드를 불러오는 중 문제가 발생했습니다.">
                    <Suspense fallback={<SuspenseFallback />}><DashboardHub /></Suspense>
                  </ErrorBoundary>
                </ViewWrapper>
              ) : (
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x
                    if (swipe < -3000 || offset.x < -100) navigateWeek(7)
                    else if (swipe > 3000 || offset.x > 100) navigateWeek(-7)
                  }}
                  className="md:cursor-default touch-pan-y"
                >
                  <HabitTrackerView
                    habits={habits} reflection={reflection} reward={reward} childName={childName}
                    updateHabitColor={updateHabitColor} bulkUpdateDay={bulkUpdateDay}
                    addHabit={addHabit} removeHabit={removeHabit} updateHabitName={updateHabitName}
                    setReflection={setReflection} setReward={setReward}
                  />
                </motion.div>
              )}

              {/* Overwrite confirmation modal */}
              {showOverwriteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">기존 데이터 덮어쓰기</h3>
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-6">이 주간에 이미 저장된 데이터가 있습니다. 새로운 데이터로 덮어쓰시겠습니까?</p>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setShowOverwriteConfirm(false)}>취소</Button>
                      <Button onClick={() => saveData(!!pendingSaveData)} disabled={saving}>
                        {saving ? '저장 중...' : '덮어쓰기'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        {user && !showChildSelector && (
          <BottomNav
            activeView={getActiveView()}
            onNavigate={handleBottomNavNavigate}
            onLogout={handleLogout}
            onSwitchChild={() => { setShowChildSelector(true); resetData() }}
          />
        )}
      </div>
    </RewardNotificationProvider>
  )
}

function ViewWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg rounded-2xl border border-white/20 dark:border-gray-700/30 p-3 sm:p-6"
    >
      {children}
    </motion.div>
  )
}

function NavigationButtons({
  showTemplateManager, setShowTemplateManager,
  showGoals, setShowGoals,
  showWeaknesses, setShowWeaknesses,
  showMandala, setShowMandala,
  showWeeklyPlanner, setShowWeeklyPlanner,
  showDashboard, setShowDashboard,
  saving, onSave,
}) {
  const toggle = (targetSetter, currentValue) => {
    setShowTemplateManager(false)
    setShowGoals(false)
    setShowWeaknesses(false)
    setShowMandala(false)
    setShowWeeklyPlanner(false)
    setShowDashboard(false)
    targetSetter(!currentValue)
  }

  const btnClass = "h-14 lg:h-9 text-sm px-2 lg:px-3 flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-1"

  const buttons = [
    { setter: setShowTemplateManager, current: showTemplateManager, color: 'bg-indigo-600 hover:bg-indigo-700', Icon: BookTemplate, label: '템플릿', mobileLabel: '템플릿' },
    { setter: setShowGoals, current: showGoals, color: 'bg-blue-600 hover:bg-blue-700', Icon: Target, label: showGoals ? '습관 추적' : '목표 관리', mobileLabel: showGoals ? '추적' : '목표' },
    { setter: setShowWeaknesses, current: showWeaknesses, color: 'bg-orange-600 hover:bg-orange-700', Icon: AlertCircle, label: showWeaknesses ? '습관 추적' : '약점 관리', mobileLabel: showWeaknesses ? '추적' : '약점' },
    { setter: setShowMandala, current: showMandala, color: 'bg-indigo-600 hover:bg-indigo-700', Icon: LayoutGrid, label: showMandala ? '습관 추적' : '만다라트', mobileLabel: '만다라' },
    { setter: setShowWeeklyPlanner, current: showWeeklyPlanner, color: 'bg-teal-600 hover:bg-teal-700', Icon: Calendar, label: showWeeklyPlanner ? '습관 추적' : '주간 계획', mobileLabel: '계획' },
    { setter: setShowDashboard, current: showDashboard, color: 'bg-purple-600 hover:bg-purple-700', Icon: BarChart3, label: showDashboard ? '습관 추적' : '대시보드', mobileLabel: '보드' },
  ]

  return (
    <div className="grid grid-cols-3 lg:flex gap-2">
      {buttons.map(({ setter, current, color, Icon, label, mobileLabel }, i) => (
        <Button key={i} onClick={() => toggle(setter, current)} className={`${color} ${btnClass}`}>
          <Icon className="w-6 h-6 lg:w-4 lg:h-4 lg:mr-1" />
          <span className="hidden lg:inline">{label}</span>
          <span className="text-xs lg:hidden">{mobileLabel}</span>
        </Button>
      ))}
      <Button onClick={onSave} className={`bg-green-600 hover:bg-green-700 ${btnClass}`} disabled={saving}>
        <Save className="w-6 h-6 lg:w-4 lg:h-4 lg:mr-1" />
        <span className="text-xs lg:text-sm">저장</span>
      </Button>
    </div>
  )
}

function HabitTrackerView({
  habits, reflection, reward, childName,
  updateHabitColor, bulkUpdateDay, addHabit, removeHabit, updateHabitName,
  setReflection, setReward,
}) {
  const [showReflection, setShowReflection] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [sparkleEffect, setSparkleEffect] = useState(null)
  const [bulkDay, setBulkDay] = useState(null) // 모바일 일괄 체크: 선택된 요일 인덱스
  const shouldReduceMotion = useReducedMotion()

  const listContainer = { animate: { transition: { staggerChildren: 0.04 } } }
  const listItem = shouldReduceMotion
    ? { initial: {}, animate: {} }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: 0.2 } } }

  // Cycle color on mobile tap: '' -> 'green' -> 'yellow' -> 'red' -> ''
  const cycleColor = (habitId, dayIndex, currentValue, event) => {
    const cycle = ['', 'green', 'yellow', 'red']
    const nextIdx = (cycle.indexOf(currentValue) + 1) % cycle.length
    const nextColor = cycle[nextIdx]
    updateHabitColor(habitId, dayIndex, nextColor)

    // Trigger sparkle effect on green
    if (nextColor === 'green' && event) {
      const rect = event.currentTarget.getBoundingClientRect()
      setSparkleEffect({
        key: `${habitId}-${dayIndex}-${Date.now()}`,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }
  }

  // Mobile color circle classes
  const getMobileColorClass = (value) => {
    if (value === 'green') return 'bg-green-400 border-green-500'
    if (value === 'yellow') return 'bg-yellow-400 border-yellow-500'
    if (value === 'red') return 'bg-red-400 border-red-500'
    return 'bg-gray-100 dark:bg-gray-700 border-gray-200'
  }

  return (
    <>
      {/* Sparkle effect on green completion */}
      {sparkleEffect && (
        <HabitCompletionEffect
          key={sparkleEffect.key}
          show={true}
          x={sparkleEffect.x}
          y={sparkleEffect.y}
          onComplete={() => setSparkleEffect(null)}
        />
      )}

      {/* Mobile: Summary Stats Bar */}
      <div className={`flex items-center justify-around p-3 rounded-xl shadow-sm md:hidden ${
        (() => {
          const rate = getMaxScore(habits) > 0 ? (getTotalScore(habits) / getMaxScore(habits)) * 100 : 0
          if (rate >= 80) return 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
          if (rate >= 50) return 'bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20'
          return 'bg-white dark:bg-gray-800/70'
        })()
      }`}>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-green-600">{getTotalScore(habits)}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">달성</span>
        </div>
        <span className="text-xl text-gray-300">/</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">{getMaxScore(habits)}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">전체</span>
        </div>
        <span className="text-xl text-gray-300">=</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-600">
            {getMaxScore(habits) > 0 ? Math.round((getTotalScore(habits) / getMaxScore(habits)) * 100) : 0}%
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">달성률</span>
        </div>
      </div>

      {/* Mobile: Compact color legend */}
      <div className="flex items-center justify-center gap-4 py-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 md:hidden">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span> 달성</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> 보통</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span> 아쉬움</span>
        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">탭하여 변경</span>
      </div>

      {/* Desktop: Full color code card */}
      <Card className="hidden md:block bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-display text-purple-800 dark:text-purple-300 flex items-center gap-2">
            🎨 색상 코드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {COLORS.map((color) => (
              <div key={color.value} className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${getColorClass(color.value)}`}></div>
                <span className="text-xl sm:text-2xl">{color.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base">{color.name}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{color.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Habit tracking table */}
      <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 pb-2 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold font-display text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <Target className="w-5 h-5" /> 습관 추적표
          </CardTitle>
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1">
              {getTotalScore(habits)} / {getMaxScore(habits)}
            </Badge>
            <Button onClick={addHabit} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">습관 추가</span>
              <span className="sm:hidden">추가</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: Guide message when no records yet */}
          {getTotalScore(habits) === 0 && getMaxScore(habits) === 0 && (
            <div className="md:hidden mb-3">
              <EmptyState
                emoji="🌱"
                title="오늘도 습관을 기록해볼까?"
                description="색상 원을 탭해서 시작하세요! 초록은 달성, 노랑은 보통, 빨강은 아쉬움이에요."
              />
            </div>
          )}

          {/* Mobile: Bulk check bar */}
          <div className="block md:hidden">
            <div className="flex items-center gap-1 mb-2">
              {DAYS.map((day, dayIndex) => (
                <button
                  key={dayIndex}
                  onClick={() => setBulkDay(bulkDay === dayIndex ? null : dayIndex)}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                    bulkDay === dayIndex
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {day.replace('요일', '')}
                </button>
              ))}
            </div>
            {bulkDay !== null && (
              <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium mr-1">
                  {DAYS[bulkDay]} 일괄:
                </span>
                <button onClick={() => { bulkUpdateDay(bulkDay, 'green'); setBulkDay(null) }}
                  className="w-8 h-8 rounded-full bg-green-400 border-2 border-green-500 active:scale-90 transition-transform" title="전체 초록" />
                <button onClick={() => { bulkUpdateDay(bulkDay, 'yellow'); setBulkDay(null) }}
                  className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500 active:scale-90 transition-transform" title="전체 노랑" />
                <button onClick={() => { bulkUpdateDay(bulkDay, 'red'); setBulkDay(null) }}
                  className="w-8 h-8 rounded-full bg-red-400 border-2 border-red-500 active:scale-90 transition-transform" title="전체 빨강" />
                <button onClick={() => { bulkUpdateDay(bulkDay, ''); setBulkDay(null) }}
                  className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 active:scale-90 transition-transform flex items-center justify-center" title="전체 지우기">
                  <span className="text-gray-400 text-xs">✕</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile: Compact 7-day horizontal habit cards */}
          <motion.div className="block md:hidden space-y-2" variants={listContainer} initial="initial" animate="animate">
            {habits.map((habit) => (
              <motion.div key={habit.id} variants={listItem} className={`border dark:border-gray-700 rounded-xl p-3 shadow-sm ${
                getWeeklyScore(habit) >= 5
                  ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/30'
                  : 'bg-white dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Input value={habit.name} onChange={(e) => updateHabitName(habit.id, e.target.value)}
                    className="border-none bg-transparent font-medium text-sm p-0 h-auto flex-1" placeholder="습관 이름" />
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                      {getWeeklyScore(habit)}/7
                    </Badge>
                    <Button onClick={() => removeHabit(habit.id)} size="sm" variant="ghost" disabled={habits.length <= 1}
                      className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {DAYS.map((day, dayIndex) => (
                    <div key={dayIndex} className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 mb-0.5">{day.replace('요일', '')}</span>
                      <button
                        onClick={(e) => cycleColor(habit.id, dayIndex, habit.times[dayIndex], e)}
                        className={`w-9 h-9 rounded-full border-2 transition-all active:scale-90
                          ${getMobileColorClass(habit.times[dayIndex])}`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Desktop table layout */}
          <div className="hidden md:block responsive-table">
            <table className="desktop-table-responsive border-collapse">
              <thead>
                <tr>
                  <th className="border p-3 bg-purple-100 dark:bg-purple-900/30 text-left habit-name-cell">시간대 / 습관</th>
                  {DAYS.map((day, dayIndex) => (
                    <th key={day} className="border p-2 bg-purple-100 dark:bg-purple-900/30 text-center day-column">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{day}</span>
                        <select onChange={(e) => { if (e.target.value) { bulkUpdateDay(dayIndex, e.target.value); e.target.value = '' } }}
                          className="text-xs px-1 py-0.5 rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer" defaultValue="">
                          <option value="" disabled>일괄 체크</option>
                          <option value="green">✅ 전체 초록</option>
                          <option value="yellow">⚠️ 전체 노랑</option>
                          <option value="red">❌ 전체 빨강</option>
                          <option value="">🗑️ 전체 지우기</option>
                        </select>
                      </div>
                    </th>
                  ))}
                  <th className="border p-3 bg-purple-100 dark:bg-purple-900/30 text-center weekly-total-column">주간 합계</th>
                  <th className="border p-3 bg-purple-100 dark:bg-purple-900/30 text-center delete-column">삭제</th>
                </tr>
              </thead>
              <motion.tbody variants={listContainer} initial="initial" animate="animate">
                {habits.map((habit) => (
                  <motion.tr key={habit.id} variants={listItem}>
                    <td className="border p-2 habit-name-cell">
                      <Textarea value={habit.name} onChange={(e) => updateHabitName(habit.id, e.target.value)}
                        className="border-none bg-transparent font-medium text-base resize-none min-h-[60px] max-h-[80px]"
                        placeholder="습관 이름을 입력하세요" rows={2} />
                    </td>
                    {habit.times.map((time, dayIndex) => (
                      <td key={dayIndex} className="border p-2 text-center day-column">
                        <div className="traffic-light-container">
                          {COLORS.map((color) => (
                            <button key={color.value} onClick={() => updateHabitColor(habit.id, dayIndex, color.value)}
                              className={`rounded-full transition-all mobile-touch-target desktop-traffic-light ${
                                time === color.value
                                  ? `${getColorClass(color.value)} traffic-light-border border-gray-800 scale-110`
                                  : `${getColorClass(color.value)} border-2 border-gray-300 dark:border-gray-600 opacity-50 hover:opacity-100`
                              }`} title={color.description} />
                          ))}
                        </div>
                      </td>
                    ))}
                    <td className="border p-2 text-center font-bold text-lg weekly-total-column">
                      <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"}>
                        {getWeeklyScore(habit)} / 7
                      </Badge>
                    </td>
                    <td className="border p-2 text-center delete-column">
                      <Button onClick={() => removeHabit(habit.id)} size="sm" variant="destructive" disabled={habits.length <= 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reflection section - collapsible on mobile */}
      <div className="md:hidden space-y-2">
        <button
          onClick={() => setShowReflection(!showReflection)}
          className="flex items-center justify-between w-full p-4 bg-white dark:bg-gray-800/70 rounded-xl shadow-sm"
        >
          <span className="font-semibold font-display text-gray-800 dark:text-gray-100">📈 이번 주 돌아보기</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${showReflection ? 'rotate-180' : ''}`} />
        </button>
        {showReflection && (
          <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-sm p-4 space-y-3">
            <div>
              <Label htmlFor="bestDayM" className="text-sm">가장 초록색이 많았던 요일과 시간은?</Label>
              <Textarea id="bestDayM" value={reflection.bestDay}
                onChange={(e) => setReflection(prev => ({ ...prev, bestDay: e.target.value }))}
                placeholder="예: 화요일 아침이 좋았어요!" className="text-sm min-h-[50px]" />
            </div>
            <div>
              <Label htmlFor="easiestM" className="text-sm">가장 쉬운/어려운 습관은?</Label>
              <Textarea id="easiestM" value={reflection.easiestHabit}
                onChange={(e) => setReflection(prev => ({ ...prev, easiestHabit: e.target.value }))}
                placeholder="예: 정리정돈이 어려웠어요." className="text-sm min-h-[50px]" />
            </div>
            <div>
              <Label htmlFor="nextWeekM" className="text-sm">다음 주에 더 잘하고 싶은 것은?</Label>
              <Textarea id="nextWeekM" value={reflection.nextWeekGoal}
                onChange={(e) => setReflection(prev => ({ ...prev, nextWeekGoal: e.target.value }))}
                placeholder="예: 저녁 정리를 잘 지키고 싶어요!" className="text-sm min-h-[50px]" />
            </div>
          </div>
        )}

        <button
          onClick={() => setShowReward(!showReward)}
          className="flex items-center justify-between w-full p-4 bg-white dark:bg-gray-800/70 rounded-xl shadow-sm"
        >
          <span className="font-semibold font-display text-gray-800 dark:text-gray-100">🏆 이번 주 보상 아이디어</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${showReward ? 'rotate-180' : ''}`} />
        </button>
        {showReward && (
          <div className="bg-white dark:bg-gray-800/70 rounded-xl shadow-sm p-4">
            <Label htmlFor="rewardM" className="text-sm">목표 달성 시 받을 보상은?</Label>
            <Textarea id="rewardM" value={reward} onChange={(e) => setReward(e.target.value)}
              placeholder="예: 영화, 간식, 보드게임" className="text-sm min-h-[50px]" />
          </div>
        )}
      </div>

      {/* Desktop: Full reflection section */}
      <Card className="hidden md:block bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-display text-purple-800 dark:text-purple-300 flex items-center gap-2">
            📈 이번 주 돌아보기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bestDay" className="text-sm sm:text-base">가장 초록색이 많았던 요일과 시간은 언제였나요?</Label>
            <Textarea id="bestDay" value={reflection.bestDay}
              onChange={(e) => setReflection(prev => ({ ...prev, bestDay: e.target.value }))}
              placeholder="예: 화요일 아침 시간대가 가장 좋았어요!" className="min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="easiestHabit">어떤 습관이 가장 쉬웠고, 어떤 습관이 가장 어려웠나요?</Label>
            <Textarea id="easiestHabit" value={reflection.easiestHabit}
              onChange={(e) => setReflection(prev => ({ ...prev, easiestHabit: e.target.value }))}
              placeholder="예: 아침에 일어나기는 쉬웠지만, 정리정돈은 어려웠어요." className="min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="nextWeekGoal">다음 주에 더 잘하고 싶은 것은 무엇인가요?</Label>
            <Textarea id="nextWeekGoal" value={reflection.nextWeekGoal}
              onChange={(e) => setReflection(prev => ({ ...prev, nextWeekGoal: e.target.value }))}
              placeholder="예: 다음 주에는 저녁 정리 시간을 더 잘 지키고 싶어요!" className="min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      {/* Desktop: Full reward section */}
      <Card className="hidden md:block bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-display text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> 이번 주 보상 아이디어
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="reward">목표 달성 시 받을 보상을 정해보세요!</Label>
            <Textarea id="reward" value={reward} onChange={(e) => setReward(e.target.value)}
              placeholder="예: 영화 보기, 특별한 간식 먹기, 보드게임 시간, 공원 가기 등" className="min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      {/* Footer - desktop only */}
      <Card className="hidden md:block bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold">
              <div className="flex flex-row items-center justify-center gap-4">
                <div>서명: _________________ (부모님)</div>
                <div>_________________ ({childName || '나'}!)</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              저장 버튼을 눌러 데이터를 저장하세요
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default App
