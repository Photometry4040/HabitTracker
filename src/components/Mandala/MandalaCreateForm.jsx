import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Plus, Check, X } from 'lucide-react'

export function MandalaCreateForm({
  centerGoal,
  setCenterGoal,
  centerEmoji,
  setCenterEmoji,
  centerColor,
  setCenterColor,
  initialNodes,
  handleAddInitialNode,
  handleUpdateInitialNode,
  handleRemoveInitialNode,
  handleCreateChart,
  onCancel,
  COLORS,
  EMOJIS
}) {
  return (
    <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: centerColor || '#6366F1' }} />
      <CardHeader>
        <CardTitle className="text-lg">새 만다라트 차트 만들기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Center Goal */}
        <div>
          <Label htmlFor="center_goal" className="text-sm font-medium">중심 목표 * (최소 3자)</Label>
          <Input
            id="center_goal"
            value={centerGoal}
            onChange={(e) => setCenterGoal(e.target.value)}
            placeholder="예: 수학 실력 향상"
            maxLength={100}
            className="mt-1.5 rounded-xl"
          />
        </div>

        {/* Center Color & Emoji */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">색상</Label>
            <div className="grid grid-cols-4 gap-2.5 mt-2.5">
              {COLORS.slice(0, 8).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCenterColor(c.value)}
                  className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl border-2 transition-all ${
                    centerColor === c.value
                      ? 'border-gray-800 scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {centerColor === c.value && (
                    <Check className="w-4 h-4 mx-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">이모지 (선택)</Label>
            <div className="grid grid-cols-6 gap-1.5 mt-2.5">
              {EMOJIS.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setCenterEmoji(emoji)}
                  className={`text-2xl p-1.5 rounded-xl transition-all ${
                    centerEmoji === emoji
                      ? 'bg-indigo-100 scale-110 shadow-sm'
                      : 'hover:bg-gray-100 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Initial Nodes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">초기 노드 (선택, 최대 8개)</Label>
            <Button
              variant="outline"
              onClick={handleAddInitialNode}
              disabled={initialNodes.length >= 8}
              className="h-9 text-sm px-3 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" />
              노드 추가
            </Button>
          </div>
          {initialNodes.map((node, index) => (
            <div key={index} className="flex gap-2 mb-2.5">
              <Input
                value={node.title}
                onChange={(e) => handleUpdateInitialNode(index, 'title', e.target.value)}
                placeholder={`노드 ${index + 1}`}
                className="flex-1 rounded-xl"
              />
              <Button
                variant="outline"
                onClick={() => handleRemoveInitialNode(index)}
                className="h-10 w-10 p-0 rounded-xl"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleCreateChart}
            className="h-10 text-sm px-5 rounded-xl"
            style={{ backgroundColor: centerColor || '#6366F1' }}
          >
            <Check className="w-4 h-4 mr-1" />
            만다라트 생성
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="h-10 text-sm px-5 rounded-xl"
          >
            <X className="w-4 h-4 mr-1" />
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
