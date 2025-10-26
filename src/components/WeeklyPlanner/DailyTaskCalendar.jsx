import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Plus,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2
} from 'lucide-react'
import {
  getDailyTasks,
  addDailyTask,
  updateDailyTask,
  completeTask,
  uncompleteTask,
  deleteDailyTask
} from '@/lib/weekly-planner.js'

export function DailyTaskCalendar({ weeklyPlanId, weekStartDate, onTaskUpdate, fullView = false }) {
  const [tasks, setTasks] = useState([])
  const [selectedDate, setSelectedDate] = useState(weekStartDate)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    taskTitle: '',
    taskDescription: '',
    estimatedMinutes: '',
    priority: 3
  })

  useEffect(() => {
    loadTasks()
  }, [weeklyPlanId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await getDailyTasks(weeklyPlanId)
      setTasks(data)
    } catch (error) {
      console.error('작업 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDates = () => {
    const start = new Date(weekStartDate)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => task.planned_date === dateStr)
  }

  const handleAddTask = async () => {
    try {
      if (!formData.taskTitle.trim()) {
        alert('작업 제목을 입력해주세요.')
        return
      }

      const taskData = {
        weeklyPlanId,
        plannedDate: selectedDate,
        taskTitle: formData.taskTitle,
        taskDescription: formData.taskDescription || null,
        estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : null,
        priority: formData.priority
      }

      await addDailyTask(taskData)
      await loadTasks()

      // Reset form
      setFormData({
        taskTitle: '',
        taskDescription: '',
        estimatedMinutes: '',
        priority: 3
      })
      setShowAddTask(false)

      if (onTaskUpdate) onTaskUpdate()
    } catch (error) {
      console.error('작업 추가 실패:', error)
      alert('작업 추가 중 오류가 발생했습니다.')
    }
  }

  const handleToggleComplete = async (task) => {
    try {
      if (task.completed) {
        await uncompleteTask(task.id)
      } else {
        await completeTask(task.id)
      }
      await loadTasks()
      if (onTaskUpdate) onTaskUpdate()
    } catch (error) {
      console.error('작업 상태 변경 실패:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('이 작업을 삭제하시겠습니까?')) return

    try {
      await deleteDailyTask(taskId)
      await loadTasks()
      if (onTaskUpdate) onTaskUpdate()
    } catch (error) {
      console.error('작업 삭제 실패:', error)
      alert('작업 삭제 중 오류가 발생했습니다.')
    }
  }

  const getPriorityBadge = (priority) => {
    const config = {
      1: { label: '긴급', color: 'bg-red-500' },
      2: { label: '높음', color: 'bg-orange-500' },
      3: { label: '보통', color: 'bg-yellow-500' },
      4: { label: '낮음', color: 'bg-green-500' },
      5: { label: '최저', color: 'bg-gray-500' }
    }

    const p = config[priority] || config[3]

    return (
      <Badge className={`${p.color} text-white text-xs`}>
        {p.label}
      </Badge>
    )
  }

  const getDayName = (date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[date.getDay()]
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const weekDates = getWeekDates()

  if (loading) {
    return <div className="text-center p-4 text-gray-500">로딩 중...</div>
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>일일 작업 계획</span>
          <Button
            size="sm"
            onClick={() => {
              setSelectedDate(weekStartDate)
              setShowAddTask(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            작업 추가
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Week Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDates.map((date, index) => {
            const dateTasks = getTasksForDate(date)
            const completedCount = dateTasks.filter(t => t.completed).length
            const totalCount = dateTasks.length

            return (
              <div
                key={index}
                className={`
                  border rounded-lg p-3 cursor-pointer transition-all
                  ${isToday(date) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
                  ${selectedDate === date.toISOString().split('T')[0] ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => setSelectedDate(date.toISOString().split('T')[0])}
              >
                {/* Day Name */}
                <div className={`text-xs font-medium text-center mb-1 ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {getDayName(date)}
                </div>

                {/* Date */}
                <div className="text-center text-sm font-bold mb-2">
                  {date.getDate()}
                </div>

                {/* Task Count */}
                {totalCount > 0 && (
                  <div className="text-xs text-center">
                    <span className="text-green-600 font-medium">{completedCount}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">{totalCount}</span>
                  </div>
                )}

                {/* Completion Indicator */}
                {totalCount > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-green-500 h-1 rounded-full transition-all"
                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Date Tasks */}
        <div className="mt-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span>{new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</span>
            <span className="text-sm text-gray-500">({getDayName(new Date(selectedDate))}요일)</span>
          </h3>

          {/* Task List */}
          <div className="space-y-2">
            {getTasksForDate(new Date(selectedDate)).length === 0 ? (
              <div className="text-center text-gray-500 py-8 border-2 border-dashed rounded-lg">
                <p className="mb-2">이 날짜에 계획된 작업이 없습니다</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddTask(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  작업 추가
                </Button>
              </div>
            ) : (
              getTasksForDate(new Date(selectedDate))
                .sort((a, b) => a.priority - b.priority)
                .map(task => (
                  <div
                    key={task.id}
                    className={`
                      border rounded-lg p-4 transition-all
                      ${task.completed ? 'bg-green-50 border-green-200' : 'bg-white hover:shadow-md'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`
                          mt-1 w-5 h-5 rounded border-2 flex items-center justify-center
                          ${task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                          }
                        `}
                      >
                        {task.completed && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.task_title}
                          </h4>
                          <div className="flex gap-1">
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>

                        {task.task_description && (
                          <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                        )}

                        {/* Time Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {task.estimated_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              예상 {task.estimated_minutes}분
                            </span>
                          )}
                          {task.actual_minutes && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-3 h-3" />
                              실제 {task.actual_minutes}분
                            </span>
                          )}
                        </div>

                        {/* Completion Notes */}
                        {task.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            {task.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3">새 작업 추가</h4>

            <div className="space-y-3">
              <div>
                <Label>작업 제목 *</Label>
                <Input
                  value={formData.taskTitle}
                  onChange={(e) => setFormData({ ...formData, taskTitle: e.target.value })}
                  placeholder="예: 수학 문제집 10페이지"
                />
              </div>

              <div>
                <Label>설명</Label>
                <Textarea
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                  placeholder="추가 설명..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>예상 시간 (분)</Label>
                  <Input
                    type="number"
                    value={formData.estimatedMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                    placeholder="30"
                  />
                </div>

                <div>
                  <Label>우선순위</Label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value={1}>1 - 긴급</option>
                    <option value={2}>2 - 높음</option>
                    <option value={3}>3 - 보통</option>
                    <option value={4}>4 - 낮음</option>
                    <option value={5}>5 - 최저</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddTask(false)
                    setFormData({ taskTitle: '', taskDescription: '', estimatedMinutes: '', priority: 3 })
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleAddTask}>
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
