import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  BookTemplate,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Star,
  Eye,
  Check,
  X,
  Calendar
} from 'lucide-react'
import {
  getWeeklyPlanTemplates,
  createWeeklyPlanTemplate,
  updateWeeklyPlanTemplate,
  deleteWeeklyPlanTemplate,
  applyTemplate,
  getDailyTasks
} from '@/lib/weekly-planner.js'

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']
const PRIORITY_LABELS = {
  1: '긴급',
  2: '높음',
  3: '보통',
  4: '낮음',
  5: '최저'
}

export function WeeklyPlanTemplateManager({ childId, childName, weeklyPlanId, weekStartDate }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // Editor State
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [dailyTasks, setDailyTasks] = useState([])

  useEffect(() => {
    loadTemplates()
  }, [childId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getWeeklyPlanTemplates(childId)
      setTemplates(data)
    } catch (error) {
      console.error('템플릿 로드 실패:', error)
      alert('템플릿을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateCategory('')
    setDailyTasks([])
    setShowEditor(true)
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    setTemplateCategory(template.category || '')
    setDailyTasks(template.template_data?.daily_tasks || [])
    setShowEditor(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }

    const templateData = {
      name: templateName,
      description: templateDescription || null,
      category: templateCategory || null,
      childId: childId,
      templateData: {
        daily_tasks: dailyTasks
      }
    }

    try {
      if (editingTemplate) {
        await updateWeeklyPlanTemplate(editingTemplate.id, templateData)
        alert('템플릿이 수정되었습니다!')
      } else {
        await createWeeklyPlanTemplate(templateData)
        alert('템플릿이 생성되었습니다!')
      }

      setShowEditor(false)
      await loadTemplates()
    } catch (error) {
      console.error('템플릿 저장 실패:', error)
      alert('템플릿 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return

    try {
      await deleteWeeklyPlanTemplate(templateId)
      alert('템플릿이 삭제되었습니다.')
      await loadTemplates()
    } catch (error) {
      console.error('템플릿 삭제 실패:', error)
      alert('템플릿 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleApplyTemplate = async (template) => {
    if (!weeklyPlanId) {
      alert('먼저 주간 계획을 생성해주세요.')
      return
    }

    // Check if current plan has tasks
    const existingTasks = await getDailyTasks(weeklyPlanId)
    if (existingTasks.length > 0) {
      if (!confirm('기존 작업을 모두 삭제하고 템플릿을 적용하시겠습니까?')) {
        return
      }
    }

    try {
      await applyTemplate(template.id, weeklyPlanId, weekStartDate)
      alert(`"${template.name}" 템플릿이 적용되었습니다! 캘린더에서 확인하세요.`)
      await loadTemplates() // Reload to update usage_count
    } catch (error) {
      console.error('템플릿 적용 실패:', error)
      alert('템플릿 적용 중 오류가 발생했습니다.')
    }
  }

  const handleAddTask = () => {
    setDailyTasks([
      ...dailyTasks,
      {
        day: 1, // 월요일
        task_title: '',
        task_description: '',
        estimated_minutes: 30,
        priority: 3
      }
    ])
  }

  const handleUpdateTask = (index, field, value) => {
    const updated = [...dailyTasks]
    updated[index][field] = value
    setDailyTasks(updated)
  }

  const handleDeleteTask = (index) => {
    setDailyTasks(dailyTasks.filter((_, i) => i !== index))
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
          <BookTemplate className="w-6 h-6" />
          주간 계획 템플릿
        </h2>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          새 템플릿
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-gray-500">
                <BookTemplate className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">저장된 템플릿이 없습니다</p>
                <p className="text-sm">자주 사용하는 주간 계획을 템플릿으로 저장하세요!</p>
              </div>
              <Button onClick={handleCreateNew} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                첫 템플릿 만들기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{template.usage_count || 0}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">
                    {template.template_data?.daily_tasks?.length || 0}개 작업
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1"
                    disabled={!weeklyPlanId}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    적용
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingTemplate ? '템플릿 수정' : '새 템플릿 만들기'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Template Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">템플릿 이름 *</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="예: 수학 집중 주간"
                  />
                </div>

                <div>
                  <Label htmlFor="template-description">설명</Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="이 템플릿에 대한 설명을 입력하세요"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="template-category">카테고리</Label>
                  <Input
                    id="template-category"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    placeholder="예: 시험 준비, 방학 특별, 일상"
                  />
                </div>
              </div>

              {/* Daily Tasks */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">주간 작업 목록</Label>
                  <Button onClick={handleAddTask} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    작업 추가
                  </Button>
                </div>

                {dailyTasks.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2" />
                    <p>작업을 추가해주세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyTasks.map((task, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Day of Week */}
                          <div>
                            <Label htmlFor={`task-day-${index}`}>요일</Label>
                            <select
                              id={`task-day-${index}`}
                              value={task.day}
                              onChange={(e) =>
                                handleUpdateTask(index, 'day', parseInt(e.target.value))
                              }
                              className="w-full border rounded-md p-2"
                            >
                              {DAYS_OF_WEEK.map((day, dayIndex) => (
                                <option key={dayIndex} value={dayIndex}>
                                  {day}요일
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Priority */}
                          <div>
                            <Label htmlFor={`task-priority-${index}`}>우선순위</Label>
                            <select
                              id={`task-priority-${index}`}
                              value={task.priority}
                              onChange={(e) =>
                                handleUpdateTask(index, 'priority', parseInt(e.target.value))
                              }
                              className="w-full border rounded-md p-2"
                            >
                              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Task Title */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`task-title-${index}`}>작업 제목</Label>
                            <Input
                              id={`task-title-${index}`}
                              value={task.task_title}
                              onChange={(e) =>
                                handleUpdateTask(index, 'task_title', e.target.value)
                              }
                              placeholder="예: 영어 단어 암기 50개"
                            />
                          </div>

                          {/* Task Description */}
                          <div className="md:col-span-2">
                            <Label htmlFor={`task-description-${index}`}>작업 설명</Label>
                            <Textarea
                              id={`task-description-${index}`}
                              value={task.task_description || ''}
                              onChange={(e) =>
                                handleUpdateTask(index, 'task_description', e.target.value)
                              }
                              placeholder="작업에 대한 자세한 설명"
                              rows={2}
                            />
                          </div>

                          {/* Estimated Minutes */}
                          <div>
                            <Label htmlFor={`task-minutes-${index}`}>예상 시간 (분)</Label>
                            <Input
                              id={`task-minutes-${index}`}
                              type="number"
                              value={task.estimated_minutes || ''}
                              onChange={(e) =>
                                handleUpdateTask(
                                  index,
                                  'estimated_minutes',
                                  parseInt(e.target.value) || null
                                )
                              }
                              placeholder="30"
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTask(index)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
                <Button onClick={handleSaveTemplate}>
                  <Check className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{previewTemplate.name}</CardTitle>
                  {previewTemplate.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {previewTemplate.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {previewTemplate.category && (
                    <Badge variant="outline">{previewTemplate.category}</Badge>
                  )}
                  <span>사용 횟수: {previewTemplate.usage_count || 0}회</span>
                  <span>
                    작업 수: {previewTemplate.template_data?.daily_tasks?.length || 0}개
                  </span>
                </div>

                {/* Daily Tasks Preview */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">주간 작업 목록</h3>
                  {previewTemplate.template_data?.daily_tasks?.length > 0 ? (
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map((day, dayIndex) => {
                        const dayTasks = previewTemplate.template_data.daily_tasks.filter(
                          (task) => task.day === dayIndex
                        )
                        if (dayTasks.length === 0) return null

                        return (
                          <div key={dayIndex} className="border rounded-lg p-3">
                            <div className="font-medium mb-2">{day}요일</div>
                            <div className="space-y-2 pl-3">
                              {dayTasks.map((task, taskIndex) => (
                                <div key={taskIndex} className="border-l-2 pl-3">
                                  <div className="flex items-start gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {PRIORITY_LABELS[task.priority]}
                                    </Badge>
                                    <div className="flex-1">
                                      <div className="font-medium">{task.task_title}</div>
                                      {task.task_description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {task.task_description}
                                        </p>
                                      )}
                                      {task.estimated_minutes && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          예상 시간: {task.estimated_minutes}분
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">작업이 없습니다.</p>
                  )}
                </div>

                {/* Apply Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      setPreviewTemplate(null)
                      handleApplyTemplate(previewTemplate)
                    }}
                    className="w-full"
                    disabled={!weeklyPlanId}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    이 템플릿 적용
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>
      )}
    </div>
  )
}
