/**
 * Template Manager Component
 * UI for managing habit templates
 * Agent 3: Template System Developer
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { BookTemplate, Plus, Trash2, Edit, Check, X, Star, StarOff } from 'lucide-react'
import { useTemplates, useTemplateMutations, useApplyTemplate } from '@/hooks/useTemplate.js'

/**
 * TemplateManager Component
 * @param {Object} props
 * @param {Function} props.onApplyTemplate - Callback when template is applied (receives habits array)
 * @param {Array} props.currentHabits - Current habits to save as template
 * @param {string} props.childName - Current child name
 * @param {Function} props.onClose - Optional callback to close template manager
 */
export const TemplateManager = ({ onApplyTemplate, currentHabits = [], childName = '', onClose }) => {
  const [view, setView] = useState('list') // 'list', 'create', 'edit'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false
  })
  const [notification, setNotification] = useState(null)

  // Get ALL templates for current user (don't filter by childId)
  // This allows showing both child-specific and shared templates
  const { templates, loading, error, refetch } = useTemplates(undefined)
  const { create, update, remove, saveAsTemplate, creating, updating, deleting } = useTemplateMutations()
  const applyTemplate = useApplyTemplate()

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }

  const handleSaveCurrentAsTemplate = async () => {
    if (!formData.name.trim()) {
      showNotification('템플릿 이름을 입력해주세요', 'error')
      return
    }

    if (!currentHabits || currentHabits.length === 0) {
      showNotification('저장할 습관이 없습니다', 'error')
      return
    }

    try {
      await saveAsTemplate(
        formData.name,
        currentHabits,
        childName || null,
        formData.description,
        formData.isDefault
      )
      showNotification('템플릿이 저장되었습니다!')
      setFormData({ name: '', description: '', isDefault: false })
      setView('list')
      refetch()
    } catch (err) {
      showNotification('템플릿 저장 실패: ' + err.message, 'error')
    }
  }

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return

    if (!formData.name.trim()) {
      showNotification('템플릿 이름을 입력해주세요', 'error')
      return
    }

    try {
      await update(selectedTemplate.id, {
        name: formData.name,
        description: formData.description,
        is_default: formData.isDefault
      })
      showNotification('템플릿이 수정되었습니다!')
      setFormData({ name: '', description: '', isDefault: false })
      setSelectedTemplate(null)
      setView('list')
      refetch()
    } catch (err) {
      showNotification('템플릿 수정 실패: ' + err.message, 'error')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('정말 이 템플릿을 삭제하시겠습니까?')) {
      return
    }

    try {
      await remove(templateId)
      showNotification('템플릿이 삭제되었습니다!')
      refetch()
    } catch (err) {
      showNotification('템플릿 삭제 실패: ' + err.message, 'error')
    }
  }

  const handleApplyTemplate = (template) => {
    if (!template) return

    const habits = applyTemplate(template)
    if (onApplyTemplate) {
      onApplyTemplate(habits)
    }
    showNotification(`"${template.name}" 템플릿을 적용했습니다!`)

    // Close template manager after applying
    if (onClose) {
      setTimeout(() => onClose(), 1000)
    }
  }

  const startEdit = (template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      isDefault: template.is_default || false
    })
    setView('edit')
  }

  const cancelEdit = () => {
    setSelectedTemplate(null)
    setFormData({ name: '', description: '', isDefault: false })
    setView('list')
  }

  // Debug logging
  console.log('🎨 [TemplateManager] Render state:', { loading, error, templatesCount: templates?.length || 0, templates })

  if (loading) {
    console.log('🎨 [TemplateManager] Showing loading state')
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center text-gray-600">템플릿 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    console.log('🎨 [TemplateManager] Showing error state:', error)
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">템플릿 로딩 실패: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  console.log('🎨 [TemplateManager] Showing template list, count:', templates?.length || 0)

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
          {/* Header */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookTemplate className="w-6 h-6 text-purple-600" />
                  <div>
                    <CardTitle className="text-xl font-bold text-purple-800">
                      템플릿 관리
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">
                      자주 사용하는 습관 패턴을 템플릿으로 저장하고 빠르게 적용하세요
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setView('create')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">현재 주간 저장</span>
                  <span className="sm:hidden">저장</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Templates List */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="pt-6">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <BookTemplate className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>저장된 템플릿이 없습니다</p>
                  <p className="text-sm mt-1">현재 주간을 템플릿으로 저장해보세요!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {template.name}
                            </h3>
                            {template.is_default && (
                              <Badge variant="default" className="bg-yellow-500">
                                <Star className="w-3 h-3 mr-1" />
                                기본
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Badge variant="outline">
                              {template.habits?.length || 0}개 습관
                            </Badge>
                            <span>
                              {new Date(template.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApplyTemplate(template)}
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            적용
                          </Button>
                          <Button
                            onClick={() => startEdit(template)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTemplate(template.id)}
                            size="sm"
                            variant="destructive"
                            disabled={deleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Habits Preview */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-1">포함된 습관:</div>
                        <div className="flex flex-wrap gap-1">
                          {template.habits?.slice(0, 5).map((habit, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {habit.name}
                            </Badge>
                          ))}
                          {template.habits?.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.habits.length - 5}개 더
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create View */}
      {view === 'create' && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800">
              현재 주간을 템플릿으로 저장
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              현재 설정된 {currentHabits.length}개 습관이 템플릿으로 저장됩니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template-name">템플릿 이름 *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 학기 중 루틴, 방학 루틴"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="template-description">설명 (선택)</Label>
              <Textarea
                id="template-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="이 템플릿에 대한 간단한 설명을 입력하세요"
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                기본 템플릿으로 설정
              </Label>
            </div>

            {/* Habits Preview */}
            <div className="border-t pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                저장될 습관 ({currentHabits.length}개):
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {currentHabits.map((habit, idx) => (
                  <div key={habit.id} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400">{idx + 1}.</span>
                    <span>{habit.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveCurrentAsTemplate}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={creating}
              >
                {creating ? '저장 중...' : '저장'}
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit View */}
      {view === 'edit' && selectedTemplate && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800">
              템플릿 수정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="edit-template-name">템플릿 이름 *</Label>
              <Input
                id="edit-template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="템플릿 이름"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-template-description">설명 (선택)</Label>
              <Textarea
                id="edit-template-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="템플릿 설명"
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is-default"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <Label htmlFor="edit-is-default" className="cursor-pointer">
                기본 템플릿으로 설정
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleEditTemplate}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={updating}
              >
                {updating ? '수정 중...' : '수정 완료'}
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
