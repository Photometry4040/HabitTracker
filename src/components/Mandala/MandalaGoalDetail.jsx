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
  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>🎯</span>
            <span className="break-words">{selectedGoal.title}</span>
            <Badge
              className={
                selectedGoal.status === 'completed'
                  ? 'bg-green-600'
                  : selectedGoal.status === 'active'
                  ? 'bg-blue-600'
                  : 'bg-gray-600'
              }
            >
              {selectedGoal.status === 'completed' ? '완료' : selectedGoal.status === 'active' ? '진행 중' : selectedGoal.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            onClick={() => setSelectedGoal(null)}
            className="h-9 w-9 md:h-8 md:w-8 p-0"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {selectedGoal.description && (
          <div>
            <Label className="text-sm font-semibold">설명</Label>
            <p className="text-sm text-gray-700">{selectedGoal.description}</p>
          </div>
        )}

        {/* Progress */}
        {selectedGoal.metric_type !== 'boolean' && selectedGoal.target_value && (
          <div>
            <Label className="text-sm font-semibold">진행률</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                type="number"
                value={selectedGoal.current_value || 0}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value) || 0
                  setSelectedGoal({ ...selectedGoal, current_value: newValue })
                }}
                className="w-20 sm:w-24"
              />
              <span className="text-sm text-gray-600">/ {selectedGoal.target_value}</span>
              <Button
                onClick={() => handleUpdateGoalProgress(selectedGoal.id, selectedGoal.current_value)}
                className="bg-blue-600 hover:bg-blue-700 h-10 md:h-9 text-sm px-4"
              >
                업데이트
              </Button>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (selectedGoal.current_value / selectedGoal.target_value) * 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Math.round((selectedGoal.current_value / selectedGoal.target_value) * 100)}% 완료
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {selectedGoal.start_date && (
            <div>
              <Label className="text-sm font-semibold">시작일</Label>
              <p className="text-sm">{selectedGoal.start_date}</p>
            </div>
          )}
          {selectedGoal.due_date && (
            <div>
              <Label className="text-sm font-semibold">목표일</Label>
              <p className="text-sm">{selectedGoal.due_date}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {selectedGoal.status !== 'completed' && (
            <Button
              onClick={() => handleCompleteGoalFromDetail(selectedGoal.id)}
              className="bg-green-600 hover:bg-green-700 h-10 md:h-9 text-sm px-4"
            >
              <Check className="w-5 h-5 md:w-4 md:h-4 mr-1" />
              목표 완료
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSelectedGoal(null)}
            className="h-10 md:h-9 text-sm px-4"
          >
            닫기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
