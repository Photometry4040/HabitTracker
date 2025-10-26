import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { X, Save } from 'lucide-react'
import { updateWeeklyPlan, completeWeeklyPlan } from '@/lib/weekly-planner.js'

export function WeeklyPlanEditor({ plan, weekStartDate, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: plan.title || '',
    description: plan.description || '',
    reflection: plan.reflection || '',
    achievements: plan.achievements || '',
    challenges: plan.challenges || '',
    next_week_focus: plan.next_week_focus || '',
    status: plan.status || 'active'
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)

      const updates = {
        title: formData.title,
        description: formData.description,
        status: formData.status
      }

      await updateWeeklyPlan(plan.id, updates)

      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('계획 저장 실패:', error)
      alert('계획 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    try {
      setSaving(true)

      const completionData = {
        reflection: formData.reflection,
        achievements: formData.achievements,
        challenges: formData.challenges,
        nextWeekFocus: formData.next_week_focus
      }

      await completeWeeklyPlan(plan.id, completionData)

      if (onUpdate) onUpdate()
      onClose()
      alert('주간 계획이 완료되었습니다!')
    } catch (error) {
      console.error('계획 완료 실패:', error)
      alert('계획 완료 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>주간 계획 수정</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>계획 제목 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 수학 집중 주간"
              />
            </div>

            <div>
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="이번 주 학습 목표나 중점 사항을 작성하세요..."
                rows={3}
              />
            </div>

            <div>
              <Label>상태</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="draft">작성 중</option>
                <option value="active">진행 중</option>
                <option value="completed">완료</option>
                <option value="archived">보관</option>
              </select>
            </div>
          </div>

          {/* Reflection Section (for completion) */}
          {plan.status === 'active' && (
            <>
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">주간 회고 (완료 시 작성)</h3>

                <div className="space-y-4">
                  <div>
                    <Label>📝 이번 주 돌아보기</Label>
                    <Textarea
                      value={formData.reflection}
                      onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                      placeholder="이번 주는 어땠나요? 느낀 점을 자유롭게 작성하세요..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>✨ 잘한 점 (성취한 것)</Label>
                    <Textarea
                      value={formData.achievements}
                      onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                      placeholder="이번 주에 잘한 것, 성취한 것을 적어보세요..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>💪 어려웠던 점 (도전 과제)</Label>
                    <Textarea
                      value={formData.challenges}
                      onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                      placeholder="어려웠던 점이나 개선이 필요한 부분을 적어보세요..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>🎯 다음 주 집중할 것</Label>
                    <Textarea
                      value={formData.next_week_focus}
                      onChange={(e) => setFormData({ ...formData, next_week_focus: e.target.value })}
                      placeholder="다음 주에 집중하고 싶은 것을 적어보세요..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '저장 중...' : '저장'}
            </Button>

            {plan.status === 'active' && (
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                ✅ 주간 계획 완료
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
