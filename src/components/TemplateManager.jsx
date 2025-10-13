/**
 * Template Manager Component
 * UI for managing habit templates (create, view, edit, delete, apply)
 * Agent 3: Template System Developer
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { BookTemplate, Plus, Trash2, Edit2, Calendar, Check } from 'lucide-react'
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCreateWeekFromTemplate
} from '@/hooks/useTemplate'
import { convertHabitsToTemplate } from '@/lib/templates'

export function TemplateManager({
  currentChildName,
  currentHabits,
  onWeekCreated,
  onClose
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)

  // React Query hooks
  const { data: templates, isLoading } = useTemplates()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deleteMutation = useDeleteTemplate()
  const applyMutation = useCreateWeekFromTemplate()

  const handleSaveAsTemplate = () => {
    if (!currentHabits || currentHabits.length === 0) {
      alert('저장할 습관이 없습니다.')
      return
    }
    setShowCreateModal(true)
  }

  const handleCreateTemplate = async (templateData) => {
    try {
      const templateHabits = convertHabitsToTemplate(currentHabits)
      await createMutation.mutateAsync({
        ...templateData,
        habits: templateHabits
      })
      setShowCreateModal(false)
      alert('템플릿이 생성되었습니다!')
    } catch (error) {
      alert('템플릿 생성 실패: ' + error.message)
    }
  }

  const handleUpdateTemplate = async (templateId, updates) => {
    try {
      await updateMutation.mutateAsync({ id: templateId, updates })
      setEditingTemplate(null)
      alert('템플릿이 수정되었습니다!')
    } catch (error) {
      alert('템플릿 수정 실패: ' + error.message)
    }
  }

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`"${templateName}" 템플릿을 삭제하시겠습니까?`)) return

    try {
      await deleteMutation.mutateAsync(templateId)
      alert('템플릿이 삭제되었습니다.')
    } catch (error) {
      alert('템플릿 삭제 실패: ' + error.message)
    }
  }

  const handleApplyTemplate = async (weekStartDate) => {
    if (!selectedTemplate || !currentChildName) {
      alert('템플릿 또는 아이 정보가 없습니다.')
      return
    }

    try {
      const result = await applyMutation.mutateAsync({
        templateId: selectedTemplate.id,
        childName: currentChildName,
        weekStartDate: weekStartDate
      })

      setShowApplyModal(false)
      setSelectedTemplate(null)
      alert('주차가 생성되었습니다!')

      if (onWeekCreated) {
        onWeekCreated(weekStartDate)
      }
    } catch (error) {
      alert('주차 생성 실패: ' + error.message)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center">템플릿 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
                <BookTemplate className="w-6 h-6" />
                습관 템플릿
              </CardTitle>
              <CardDescription className="mt-2">
                자주 사용하는 습관 세트를 템플릿으로 저장하고 빠르게 재사용하세요
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveAsTemplate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                현재 습관 저장
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline">
                  닫기
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Template List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id} className="bg-white/80 backdrop-blur-sm shadow hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge className="bg-yellow-500">기본</Badge>
                      )}
                    </CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1 text-sm">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">습관 개수: {template.habits?.length || 0}개</p>
                  {template.children && (
                    <p className="text-xs text-gray-500 mt-1">
                      아이: {template.children.name}
                    </p>
                  )}
                </div>

                {/* Habit List Preview */}
                <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                  {template.habits?.slice(0, 3).map((habit, idx) => (
                    <div key={idx} className="truncate">• {habit.name}</div>
                  ))}
                  {template.habits?.length > 3 && (
                    <div className="text-gray-400">...외 {template.habits.length - 3}개</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowApplyModal(true)
                    }}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    사용
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full bg-white/80 backdrop-blur-sm">
            <CardContent className="py-8 text-center text-gray-500">
              <BookTemplate className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>저장된 템플릿이 없습니다.</p>
              <p className="text-sm mt-1">현재 습관을 저장하여 첫 번째 템플릿을 만들어보세요!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onSave={handleCreateTemplate}
          onClose={() => setShowCreateModal(false)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Apply Template Modal */}
      {showApplyModal && selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          childName={currentChildName}
          onApply={handleApplyTemplate}
          onClose={() => {
            setShowApplyModal(false)
            setSelectedTemplate(null)
          }}
          isApplying={applyMutation.isPending}
        />
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onSave={handleUpdateTemplate}
          onClose={() => setEditingTemplate(null)}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  )
}

/**
 * Modal for creating a new template
 */
function CreateTemplateModal({ onSave, onClose, isSaving }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }
    onSave({ name: name.trim(), description: description.trim(), is_default: isDefault })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <CardTitle>새 템플릿 저장</CardTitle>
          <CardDescription>현재 습관을 템플릿으로 저장합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="templateName">템플릿 이름 *</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 학기 중 루틴, 방학 루틴"
                required
              />
            </div>

            <div>
              <Label htmlFor="templateDescription">설명 (선택)</Label>
              <Textarea
                id="templateDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="템플릿에 대한 간단한 설명"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                기본 템플릿으로 설정
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? '저장 중...' : '저장'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Modal for applying a template to create a new week
 */
function ApplyTemplateModal({ template, childName, onApply, onClose, isApplying }) {
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Default to next Monday
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    return nextMonday.toISOString().split('T')[0]
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onApply(weekStartDate)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <CardTitle>템플릿 적용</CardTitle>
          <CardDescription>"{template.name}" 템플릿으로 새 주차를 생성합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>아이 이름</Label>
              <Input value={childName} disabled className="bg-gray-100" />
            </div>

            <div>
              <Label htmlFor="weekStartDate">주차 시작일 (월요일) *</Label>
              <Input
                id="weekStartDate"
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                자동으로 월요일로 조정됩니다
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">생성될 습관</p>
              <ul className="text-xs text-blue-800 mt-2 space-y-1">
                {template.habits?.slice(0, 5).map((habit, idx) => (
                  <li key={idx}>• {habit.name}</li>
                ))}
                {template.habits?.length > 5 && (
                  <li className="text-blue-600">...외 {template.habits.length - 5}개</li>
                )}
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isApplying} className="flex-1 bg-green-600 hover:bg-green-700">
                {isApplying ? '생성 중...' : '주차 생성'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Modal for editing an existing template
 */
function EditTemplateModal({ template, onSave, onClose, isSaving }) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || '')
  const [isDefault, setIsDefault] = useState(template.is_default)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }
    onSave(template.id, { name: name.trim(), description: description.trim(), is_default: isDefault })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
        <CardHeader>
          <CardTitle>템플릿 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="editName">템플릿 이름 *</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="editDescription">설명 (선택)</Label>
              <Textarea
                id="editDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="editIsDefault" className="cursor-pointer">
                기본 템플릿으로 설정
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? '저장 중...' : '저장'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
