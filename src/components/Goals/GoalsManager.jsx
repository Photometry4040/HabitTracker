import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Target, Plus, Edit2, Trash2, Check, X, Calendar } from 'lucide-react'
import { createGoal, getGoals, updateGoal, deleteGoal, completeGoal } from '@/lib/learning-mode.js'

export function GoalsManager({ childName }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metric_type: 'boolean',
    target_value: null,
    unit: '',
    start_date: '',
    due_date: '',
    status: 'draft'
  })

  useEffect(() => {
    loadGoals()
  }, [childName, showCompleted])

  const loadGoals = async () => {
    try {
      setLoading(true)
      // Show completed goals only when toggle is on
      const filters = showCompleted ? {} : { status: 'active' }
      const data = await getGoals(childName, filters)
      setGoals(data)
    } catch (error) {
      console.error('목표 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    try {
      if (!formData.title.trim()) {
        alert('목표 제목을 입력해주세요.')
        return
      }

      const goalData = {
        title: formData.title,
        description: formData.description || null,
        metric_type: formData.metric_type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        unit: formData.unit || null,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        status: 'active'  // Auto-activate on creation
      }

      await createGoal(childName, goalData)
      await loadGoals()

      // Reset form
      setFormData({
        title: '',
        description: '',
        metric_type: 'boolean',
        target_value: null,
        unit: '',
        start_date: '',
        due_date: '',
        status: 'draft'
      })
      setShowCreateForm(false)

      alert('목표가 생성되었습니다!')
    } catch (error) {
      console.error('목표 생성 실패:', error)
      alert('목표 생성 중 오류가 발생했습니다.')
    }
  }

  const handleUpdateGoal = async () => {
    try {
      if (!editingGoal) return

      const updates = {
        title: formData.title,
        description: formData.description || null,
        metric_type: formData.metric_type,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        unit: formData.unit || null,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null
      }

      await updateGoal(editingGoal.id, updates)
      await loadGoals()

      setEditingGoal(null)
      setFormData({
        title: '',
        description: '',
        metric_type: 'boolean',
        target_value: null,
        unit: '',
        start_date: '',
        due_date: '',
        status: 'draft'
      })

      alert('목표가 수정되었습니다!')
    } catch (error) {
      console.error('목표 수정 실패:', error)
      alert('목표 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('정말 이 목표를 삭제하시겠습니까?')) return

    try {
      await deleteGoal(goalId)
      await loadGoals()
      alert('목표가 삭제되었습니다.')
    } catch (error) {
      console.error('목표 삭제 실패:', error)
      alert('목표 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCompleteGoal = async (goalId) => {
    try {
      await completeGoal(goalId)
      await loadGoals()
      alert('🎉 목표 달성을 축하합니다!')
    } catch (error) {
      console.error('목표 완료 실패:', error)
      alert('목표 완료 처리 중 오류가 발생했습니다.')
    }
  }

  const startEdit = (goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description || '',
      metric_type: goal.metric_type,
      target_value: goal.target_value,
      unit: goal.unit || '',
      start_date: goal.start_date || '',
      due_date: goal.due_date || '',
      status: goal.status
    })
    setShowCreateForm(false)
  }

  const cancelEdit = () => {
    setEditingGoal(null)
    setFormData({
      title: '',
      description: '',
      metric_type: 'boolean',
      target_value: null,
      unit: '',
      start_date: '',
      due_date: '',
      status: 'draft'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      draft: { variant: 'outline', label: '초안', color: 'text-gray-600' },
      active: { variant: 'default', label: '진행중', color: 'text-blue-600' },
      completed: { variant: 'default', label: '완료', color: 'text-green-600' },
      failed: { variant: 'destructive', label: '실패', color: 'text-red-600' },
      paused: { variant: 'outline', label: '일시정지', color: 'text-yellow-600' }
    }
    const config = variants[status] || variants.draft
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
  }

  const getMetricTypeLabel = (type) => {
    const labels = {
      boolean: '달성/미달성',
      count: '횟수',
      time: '시간 (분)',
      percentage: '퍼센트 (%)'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">목표 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {childName}의 목표 관리
            </div>
            {!showCreateForm && !editingGoal && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setShowCompleted(!showCompleted)}
                  variant={showCompleted ? "default" : "outline"}
                  size="sm"
                  className={showCompleted ? "bg-gray-600 hover:bg-gray-700" : ""}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {showCompleted ? '활성 목표만' : '완료 목표 보기'}
                </Button>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 목표
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Create/Edit Form */}
      {(showCreateForm || editingGoal) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingGoal ? '목표 수정' : '새 목표 만들기'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">목표 제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 수학 문제 50개 풀기"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="목표에 대한 자세한 설명을 입력하세요"
                rows={3}
              />
            </div>

            {/* Metric Type */}
            <div>
              <Label htmlFor="metric_type">측정 방식</Label>
              <select
                id="metric_type"
                value={formData.metric_type}
                onChange={(e) => setFormData({ ...formData, metric_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="boolean">달성/미달성</option>
                <option value="count">횟수 측정</option>
                <option value="time">시간 측정 (분)</option>
                <option value="percentage">퍼센트 (%)</option>
              </select>
            </div>

            {/* Target Value & Unit */}
            {formData.metric_type !== 'boolean' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="target_value">목표 값</Label>
                  <Input
                    id="target_value"
                    type="number"
                    value={formData.target_value || ''}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="예: 50"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">단위</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder={formData.metric_type === 'count' ? '예: 문제' : formData.metric_type === 'time' ? '분' : '%'}
                  />
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_date">시작일 (선택)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="due_date">마감일 (선택)</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  min={formData.start_date}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Check className="w-4 h-4 mr-1" />
                {editingGoal ? '수정 완료' : '목표 생성'}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  cancelEdit()
                }}
                variant="outline"
              >
                <X className="w-4 h-4 mr-1" />
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className={`hover:shadow-md transition-shadow ${
                goal.status === 'completed' ? 'bg-green-50 border-green-200' : ''
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{goal.title}</h3>
                      {getStatusBadge(goal.status)}
                    </div>

                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {getMetricTypeLabel(goal.metric_type)}
                        {goal.target_value && (
                          <span className="font-medium"> · 목표: {goal.target_value}{goal.unit}</span>
                        )}
                      </div>

                      {goal.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          마감: {new Date(goal.due_date).toLocaleDateString('ko-KR')}
                        </div>
                      )}

                      {goal.completed_at && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-3 h-3" />
                          완료: {new Date(goal.completed_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {goal.status !== 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(goal)}
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleCompleteGoal(goal.id)}
                          title="달성 완료"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteGoal(goal.id)}
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>아직 목표가 없습니다.</p>
            <p className="text-sm">위의 &ldquo;새 목표&rdquo; 버튼을 클릭하여 첫 목표를 만들어보세요!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
