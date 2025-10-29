import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, Clock, Target, List, BookTemplate } from 'lucide-react'
import {
  createWeeklyPlan,
  getWeeklyPlan,
  getChildWeeklyPlans,
  updateWeeklyPlan,
  deleteWeeklyPlan,
  getWeeklyPlanProgress
} from '@/lib/weekly-planner.js'
import { WeeklyPlanEditor } from './WeeklyPlanEditor.jsx'
import { DailyTaskCalendar } from './DailyTaskCalendar.jsx'
import { WeeklyPlanTemplateManager } from './WeeklyPlanTemplateManager.jsx'

export function WeeklyPlannerManager({ childId, childName, weekId, weekStartDate }) {
  const [currentPlan, setCurrentPlan] = useState(null)
  const [recentPlans, setRecentPlans] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [activeView, setActiveView] = useState('current') // 'current', 'history', 'calendar', 'templates'

  useEffect(() => {
    loadWeeklyPlan()
    loadRecentPlans()
  }, [childId, weekId])

  useEffect(() => {
    if (currentPlan) {
      loadProgress()
    }
  }, [currentPlan])

  const loadWeeklyPlan = async () => {
    try {
      setLoading(true)
      // Only load if both childId and weekId are available
      if (!childId || !weekId) {
        console.log('[Weekly Planner] childId or weekId not available yet')
        setCurrentPlan(null)
        return
      }
      const plan = await getWeeklyPlan(childId, weekId)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('주간 계획 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentPlans = async () => {
    try {
      // Only load if childId is available
      if (!childId) {
        console.log('[Weekly Planner] childId not available yet')
        setRecentPlans([])
        return
      }
      const plans = await getChildWeeklyPlans(childId, 10)
      setRecentPlans(plans)
    } catch (error) {
      console.error('최근 계획 로드 실패:', error)
    }
  }

  const loadProgress = async () => {
    try {
      if (!currentPlan) return
      const progressData = await getWeeklyPlanProgress(currentPlan.id)
      setProgress(progressData)
    } catch (error) {
      console.error('진행률 로드 실패:', error)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const planData = {
        childId,
        weekId,
        title: `${childName}의 주간 계획 - ${weekStartDate}`,
        description: '',
        goalTargets: []
      }

      const newPlan = await createWeeklyPlan(planData)
      setCurrentPlan(newPlan)
      setShowEditor(true)
      alert('주간 계획이 생성되었습니다!')
    } catch (error) {
      console.error('계획 생성 실패:', error)
      alert('계획 생성 중 오류가 발생했습니다.')
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('이 주간 계획을 삭제하시겠습니까?')) return

    try {
      await deleteWeeklyPlan(planId)
      setCurrentPlan(null)
      setProgress(null)
      await loadRecentPlans()
      alert('주간 계획이 삭제되었습니다.')
    } catch (error) {
      console.error('계획 삭제 실패:', error)
      alert('계획 삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: '작성 중', color: 'bg-gray-500' },
      active: { label: '진행 중', color: 'bg-blue-500' },
      completed: { label: '완료', color: 'bg-green-500' },
      archived: { label: '보관', color: 'bg-gray-400' }
    }

    const config = statusConfig[status] || statusConfig.draft

    return (
      <Badge className={`${config.color} text-white text-xs`}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          주간 학습 계획
        </h2>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={activeView === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('current')}
          >
            <List className="w-4 h-4 mr-1" />
            현재 계획
          </Button>
          <Button
            variant={activeView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('calendar')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            캘린더
          </Button>
          <Button
            variant={activeView === 'templates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('templates')}
          >
            <BookTemplate className="w-4 h-4 mr-1" />
            템플릿
          </Button>
          <Button
            variant={activeView === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('history')}
          >
            <Clock className="w-4 h-4 mr-1" />
            이전 계획
          </Button>
        </div>
      </div>

      {/* Current Plan View */}
      {activeView === 'current' && (
        <>
          {!currentPlan ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">이번 주 계획이 없습니다</p>
                    <p className="text-sm">새로운 주간 계획을 만들어보세요!</p>
                  </div>
                  <Button onClick={handleCreatePlan} size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    주간 계획 만들기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Plan Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{currentPlan.title}</CardTitle>
                      {currentPlan.description && (
                        <p className="text-sm text-gray-600">{currentPlan.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(currentPlan.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditor(true)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlan(currentPlan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Progress Display */}
                {progress && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Total Tasks */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600 mb-1">전체 작업</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {progress.total_tasks}개
                        </div>
                      </div>

                      {/* Completed Tasks */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600 mb-1">완료</div>
                        <div className="text-2xl font-bold text-green-900">
                          {progress.completed_tasks}개
                        </div>
                      </div>

                      {/* Completion Rate */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600 mb-1">완료율</div>
                        <div className="text-2xl font-bold text-purple-900">
                          {progress.completion_rate}%
                        </div>
                      </div>

                      {/* Time Spent */}
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="text-sm text-orange-600 mb-1">소요 시간</div>
                        <div className="text-2xl font-bold text-orange-900">
                          {progress.total_actual_minutes || 0}분
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">진행률</span>
                        <span className="font-medium">{progress.completion_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progress.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Daily Task Calendar */}
              <DailyTaskCalendar
                weeklyPlanId={currentPlan.id}
                weekStartDate={weekStartDate}
                onTaskUpdate={loadProgress}
              />
            </>
          )}
        </>
      )}

      {/* Calendar View */}
      {activeView === 'calendar' && currentPlan && (
        <DailyTaskCalendar
          weeklyPlanId={currentPlan.id}
          weekStartDate={weekStartDate}
          onTaskUpdate={loadProgress}
          fullView={true}
        />
      )}

      {/* History View */}
      {activeView === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>이전 주간 계획</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPlans.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                이전 계획이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {recentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{plan.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          생성: {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(plan.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Templates View */}
      {activeView === 'templates' && (
        <WeeklyPlanTemplateManager
          childId={childId}
          childName={childName}
          weeklyPlanId={currentPlan?.id}
          weekStartDate={weekStartDate}
        />
      )}

      {/* Plan Editor Modal */}
      {showEditor && currentPlan && (
        <WeeklyPlanEditor
          plan={currentPlan}
          weekStartDate={weekStartDate}
          childName={childName}
          onClose={() => setShowEditor(false)}
          onUpdate={() => {
            loadWeeklyPlan()
            loadProgress()
          }}
        />
      )}
    </div>
  )
}
