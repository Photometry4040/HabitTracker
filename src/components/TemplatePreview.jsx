/**
 * Template Preview Modal
 * Shows what habits will be applied from a template
 * Agent 3: Template System Developer
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { X, CheckCircle2 } from 'lucide-react'

/**
 * TemplatePreview Component
 * @param {Object} props
 * @param {Object} props.template - Template to preview
 * @param {Function} props.onApply - Apply callback
 * @param {Function} props.onClose - Close callback
 */
export const TemplatePreview = ({ template, onApply, onClose }) => {
  if (!template) return null

  const habits = template.habits || []

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-white max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-gray-900">
                템플릿 미리보기
              </CardTitle>
              <h3 className="text-lg font-semibold text-purple-600 mt-2">
                {template.name}
              </h3>
              {template.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Info Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                이 템플릿을 적용하면 아래 {habits.length}개의 습관이 추가됩니다.
              </p>
            </div>

            {/* Habits List */}
            {habits.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">
                  포함된 습관 목록:
                </h4>
                {habits.map((habit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        {habit.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>이 템플릿에는 습관이 없습니다.</p>
              </div>
            )}

            {/* Template Metadata */}
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">생성일:</span>
                  <span className="ml-2 text-gray-700">
                    {new Date(template.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {template.child_id && (
                  <div>
                    <span className="text-gray-500">자녀 전용 템플릿</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 flex gap-3 justify-end bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-6"
          >
            취소
          </Button>
          <Button
            onClick={() => {
              onApply(template)
              onClose()
            }}
            className="px-6 bg-purple-600 hover:bg-purple-700 text-white"
            disabled={habits.length === 0}
          >
            적용하기
          </Button>
        </div>
      </Card>
    </div>
  )
}
