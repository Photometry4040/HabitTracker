import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Check, X } from 'lucide-react'

export function MandalaGoalDetail({
  selectedGoal,
  setSelectedGoal,
  handleUpdateGoalProgress,
  handleCompleteGoalFromDetail
}) {
  const statusColor = selectedGoal.status === 'completed'
    ? '#10B981'
    : selectedGoal.status === 'active'
    ? '#3B82F6'
    : '#6B7280'

  return (
    <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: statusColor }} />
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎯</span>
            <span className="break-words text-gray-800">{selectedGoal.title}</span>
            <Badge
              className="rounded-full px-2.5"
              style={{ backgroundColor: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
            >
              {selectedGoal.status === 'completed' ? '완료' : selectedGoal.status === 'active' ? '진행 중' : selectedGoal.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            onClick={() => setSelectedGoal(null)}
            className="h-9 w-9 p-0 rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {selectedGoal.description && (
          <div>
            <Label className="text-sm font-medium">설명</Label>
            <p className="text-sm text-gray-600 mt-1">{selectedGoal.description}</p>
          </div>
        )}

        {/* Progress */}
        {selectedGoal.metric_type !== 'boolean' && selectedGoal.target_value && (
          <div>
            <Label className="text-sm font-medium">진행률</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                type="number"
                value={selectedGoal.current_value || 0}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value) || 0
                  setSelectedGoal({ ...selectedGoal, current_value: newValue })
                }}
                className="w-20 sm:w-24 rounded-xl"
              />
              <span className="text-sm text-gray-500">/ {selectedGoal.target_value}</span>
              <Button
                onClick={() => handleUpdateGoalProgress(selectedGoal.id, selectedGoal.current_value)}
                className="h-10 text-sm px-4 rounded-xl"
                style={{ backgroundColor: statusColor }}
              >
                업데이트
              </Button>
            </div>
            <div className="mt-2.5 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (selectedGoal.current_value / selectedGoal.target_value) * 100)}%`,
                  backgroundColor: statusColor
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((selectedGoal.current_value / selectedGoal.target_value) * 100)}% 완료
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedGoal.start_date && (
            <div className="bg-gray-50 rounded-xl p-3">
              <Label className="text-xs font-medium text-gray-500">시작일</Label>
              <p className="text-sm font-medium mt-0.5">{selectedGoal.start_date}</p>
            </div>
          )}
          {selectedGoal.due_date && (
            <div className="bg-gray-50 rounded-xl p-3">
              <Label className="text-xs font-medium text-gray-500">목표일</Label>
              <p className="text-sm font-medium mt-0.5">{selectedGoal.due_date}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {selectedGoal.status !== 'completed' && (
            <Button
              onClick={() => handleCompleteGoalFromDetail(selectedGoal.id)}
              className="bg-green-600 hover:bg-green-700 h-10 text-sm px-4 rounded-xl"
            >
              <Check className="w-4 h-4 mr-1" />
              목표 완료
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSelectedGoal(null)}
            className="h-10 text-sm px-4 rounded-xl"
          >
            닫기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
