import { lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, Star, Trophy, Target, Plus, Trash2, Users, Save, Cloud, BarChart3, LogOut, BookTemplate, AlertCircle, LayoutGrid } from 'lucide-react'
import { ChildSelector } from '@/components/ChildSelector.jsx'
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

const SuspenseFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-purple-600">로딩 중...</div>
  </div>
)

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
    saving, showOverwriteConfirm, setShowOverwriteConfirm, pendingSaveData,
    showDashboard, setShowDashboard,
    showTemplateManager, setShowTemplateManager,
    showGoals, setShowGoals,
    showWeaknesses, setShowWeaknesses,
    showMandala, setShowMandala,
    showWeeklyPlanner, setShowWeeklyPlanner,
  } = useHabitTracker()

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">환경변수 설정 오류</h1>
          <p className="text-gray-600 mb-4">Supabase 환경변수가 올바르게 설정되지 않았습니다.</p>
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <p><strong>현재 상태:</strong></p>
            <p>• URL: {supabaseUrl || '설정되지 않음'}</p>
            <p>• URL 유효성: {isValidUrl ? '✅' : '❌'}</p>
            <p>• Key: {supabaseKey ? '설정됨' : '설정되지 않음'}</p>
            <p><strong>필요한 환경변수:</strong></p>
            <p>• VITE_SUPABASE_URL (올바른 URL 형식)</p>
            <p>• VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="text-gray-500 text-xs mt-4">Netlify 대시보드에서 환경변수를 다시 확인해주세요.</p>
        </div>
      </div>
    )
  }

  // Auth screen
  if (!user) {
    return <Auth onAuthSuccess={() => {}} />
  }

  return (
    <RewardNotificationProvider childName={selectedChild}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Logout button */}
          <div className="flex justify-end no-print">
            <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>

          {showChildSelector ? (
            <ChildSelector onChildSelect={handleChildSelect} onNewChild={handleNewChild} />
          ) : (
            <>
              {/* Header Card */}
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      onClick={() => { setShowChildSelector(true); resetData() }}
                      variant="outline" size="sm" className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">아이 변경</span>
                      <span className="sm:hidden">변경</span>
                    </Button>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-purple-800 flex items-center justify-center gap-2 text-center">
                      <Star className="text-yellow-500 hidden sm:block" />
                      <span>주간 습관 성장 챌린지</span>
                      <Star className="text-yellow-500 hidden sm:block" />
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-2 no-print">
                      {saving && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Cloud className="w-4 h-4 animate-pulse" />
                          <span className="hidden sm:inline">저장 중...</span>
                          <span className="sm:hidden">저장중</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                    <div>
                      <Label htmlFor="weekPeriod" className="text-sm sm:text-base">주간 기간</Label>
                      <Input id="weekPeriod" value={weekPeriod} readOnly
                        className="bg-gray-50 cursor-default text-sm sm:text-base"
                        placeholder="시작일을 선택하면 자동으로 계산됩니다" />
                    </div>
                    <div>
                      <Label htmlFor="theme" className="text-sm sm:text-base">이번 주 테마</Label>
                      <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <Suspense fallback={<SuspenseFallback />}>
                    <TemplateManager onApplyTemplate={handleApplyTemplate} currentHabits={habits}
                      childName={childName} onClose={() => setShowTemplateManager(false)} />
                  </Suspense>
                </ViewWrapper>
              ) : showGoals ? (
                <ViewWrapper>
                  <Suspense fallback={<SuspenseFallback />}><GoalsManager childName={selectedChild} /></Suspense>
                </ViewWrapper>
              ) : showWeaknesses ? (
                <ViewWrapper>
                  <Suspense fallback={<SuspenseFallback />}><WeaknessLogger childName={selectedChild} /></Suspense>
                </ViewWrapper>
              ) : showMandala ? (
                <ViewWrapper>
                  <Suspense fallback={<SuspenseFallback />}><MandalaChart childName={selectedChild} /></Suspense>
                </ViewWrapper>
              ) : showWeeklyPlanner ? (
                <ViewWrapper>
                  <Suspense fallback={<SuspenseFallback />}>
                    <WeeklyPlannerManager childId={currentChildId} childName={childName}
                      weekId={currentWeekId} weekStartDate={weekStartDate} />
                  </Suspense>
                </ViewWrapper>
              ) : showDashboard ? (
                <ViewWrapper>
                  <Suspense fallback={<SuspenseFallback />}><DashboardHub /></Suspense>
                </ViewWrapper>
              ) : (
                <HabitTrackerView
                  habits={habits} reflection={reflection} reward={reward} childName={childName}
                  updateHabitColor={updateHabitColor} bulkUpdateDay={bulkUpdateDay}
                  addHabit={addHabit} removeHabit={removeHabit} updateHabitName={updateHabitName}
                  setReflection={setReflection} setReward={setReward}
                />
              )}

              {/* Overwrite confirmation modal */}
              {showOverwriteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">기존 데이터 덮어쓰기</h3>
                    <p className="text-gray-600 mb-6">이 주간에 이미 저장된 데이터가 있습니다. 새로운 데이터로 덮어쓰시겠습니까?</p>
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
      </div>
    </RewardNotificationProvider>
  )
}

function ViewWrapper({ children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
      {children}
    </div>
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
  return (
    <>
      {/* Color code */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            🎨 색상 코드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {COLORS.map((color) => (
              <div key={color.value} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${getColorClass(color.value)}`}></div>
                <span className="text-xl sm:text-2xl">{color.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base">{color.name}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{color.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Habit tracking table */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <Target /> 습관 추적표
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="text-base sm:text-lg px-3 py-1">
              총점: {getTotalScore(habits)} / {getMaxScore(habits)}
            </Badge>
            <Button onClick={addHabit} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">습관 추가</span>
              <span className="sm:hidden">추가</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile bulk check */}
          <div className="block md:hidden mb-4 p-3 bg-purple-50 rounded-lg">
            <div className="text-sm font-semibold text-purple-800 mb-2">📅 요일별 일괄 체크</div>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day, dayIndex) => (
                <select key={day} onChange={(e) => { if (e.target.value) { bulkUpdateDay(dayIndex, e.target.value); e.target.value = '' } }}
                  className="text-xs px-2 py-1.5 rounded border border-purple-300 bg-white" defaultValue="">
                  <option value="" disabled>{day}</option>
                  <option value="green">✅ 전체 초록</option>
                  <option value="yellow">⚠️ 전체 노랑</option>
                  <option value="red">❌ 전체 빨강</option>
                  <option value="">🗑️ 전체 지우기</option>
                </select>
              ))}
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="block md:hidden space-y-4">
            {habits.map((habit) => (
              <div key={habit.id} className="border rounded-lg p-4 bg-white mobile-card-spacing">
                <div className="mb-3">
                  <Input value={habit.name} onChange={(e) => updateHabitName(habit.id, e.target.value)}
                    className="border-none bg-transparent font-medium text-sm" placeholder="습관 이름을 입력하세요" />
                </div>
                <div className="space-y-2">
                  {DAYS.map((day, dayIndex) => (
                    <div key={dayIndex} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 min-w-[60px]">{day}</span>
                      <div className="flex gap-2">
                        {COLORS.map((color) => (
                          <button key={color.value} onClick={() => updateHabitColor(habit.id, dayIndex, color.value)}
                            className={`w-8 h-8 rounded-full transition-all mobile-touch-target ${
                              habit.times[dayIndex] === color.value
                                ? `${getColorClass(color.value)} traffic-light-border border-gray-800 scale-110`
                                : `${getColorClass(color.value)} border-2 border-gray-300 opacity-50 hover:opacity-100`
                            }`} title={color.description} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"}>
                    {getWeeklyScore(habit)} / 7
                  </Badge>
                  <Button onClick={() => removeHabit(habit.id)} size="sm" variant="destructive" disabled={habits.length <= 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block responsive-table">
            <table className="desktop-table-responsive border-collapse">
              <thead>
                <tr>
                  <th className="border p-3 bg-purple-100 text-left habit-name-cell">시간대 / 습관</th>
                  {DAYS.map((day, dayIndex) => (
                    <th key={day} className="border p-2 bg-purple-100 text-center day-column">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{day}</span>
                        <select onChange={(e) => { if (e.target.value) { bulkUpdateDay(dayIndex, e.target.value); e.target.value = '' } }}
                          className="text-xs px-1 py-0.5 rounded border border-purple-300 bg-white hover:bg-purple-50 cursor-pointer" defaultValue="">
                          <option value="" disabled>일괄 체크</option>
                          <option value="green">✅ 전체 초록</option>
                          <option value="yellow">⚠️ 전체 노랑</option>
                          <option value="red">❌ 전체 빨강</option>
                          <option value="">🗑️ 전체 지우기</option>
                        </select>
                      </div>
                    </th>
                  ))}
                  <th className="border p-3 bg-purple-100 text-center weekly-total-column">주간 합계</th>
                  <th className="border p-3 bg-purple-100 text-center delete-column">삭제</th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr key={habit.id}>
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
                                  : `${getColorClass(color.value)} border-2 border-gray-300 opacity-50 hover:opacity-100`
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reflection section */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            📈 이번 주 돌아보기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bestDay" className="text-sm sm:text-base">가장 초록색이 많았던 요일과 시간은 언제였나요?</Label>
            <Textarea id="bestDay" value={reflection.bestDay}
              onChange={(e) => setReflection(prev => ({ ...prev, bestDay: e.target.value }))}
              placeholder="예: 화요일 아침 시간대가 가장 좋았어요!"
              className="text-sm sm:text-base min-h-[60px] sm:min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="easiestHabit" className="text-sm sm:text-base">어떤 습관이 가장 쉬웠고, 어떤 습관이 가장 어려웠나요?</Label>
            <Textarea id="easiestHabit" value={reflection.easiestHabit}
              onChange={(e) => setReflection(prev => ({ ...prev, easiestHabit: e.target.value }))}
              placeholder="예: 아침에 일어나기는 쉬웠지만, 정리정돈은 어려웠어요."
              className="text-sm sm:text-base min-h-[60px] sm:min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="nextWeekGoal" className="text-sm sm:text-base">다음 주에 더 잘하고 싶은 것은 무엇인가요?</Label>
            <Textarea id="nextWeekGoal" value={reflection.nextWeekGoal}
              onChange={(e) => setReflection(prev => ({ ...prev, nextWeekGoal: e.target.value }))}
              placeholder="예: 다음 주에는 저녁 정리 시간을 더 잘 지키고 싶어요!"
              className="text-sm sm:text-base min-h-[60px] sm:min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      {/* Reward section */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> 이번 주 보상 아이디어
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="reward" className="text-sm sm:text-base">목표 달성 시 받을 보상을 정해보세요!</Label>
            <Textarea id="reward" value={reward} onChange={(e) => setReward(e.target.value)}
              placeholder="예: 영화 보기, 특별한 간식 먹기, 보드게임 시간, 공원 가기 등"
              className="text-sm sm:text-base min-h-[60px] sm:min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-base sm:text-lg font-semibold">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div>서명: _________________ (부모님)</div>
                <div>_________________ ({childName || '나'}!)</div>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">저장 버튼을 눌러 데이터를 저장하세요</span>
              <span className="sm:hidden">저장 버튼을 눌러 저장하세요</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default App
