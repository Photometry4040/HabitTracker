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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">새 만다라트 차트 만들기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Center Goal */}
        <div>
          <Label htmlFor="center_goal">중심 목표 * (최소 3자)</Label>
          <Input
            id="center_goal"
            value={centerGoal}
            onChange={(e) => setCenterGoal(e.target.value)}
            placeholder="예: 수학 실력 향상"
            maxLength={100}
          />
        </div>

        {/* Center Color & Emoji */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>색상</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {COLORS.slice(0, 8).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCenterColor(c.value)}
                  className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full border-2 ${
                    centerColor === c.value ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>이모지 (선택)</Label>
            <div className="grid grid-cols-6 gap-1 mt-2">
              {EMOJIS.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setCenterEmoji(emoji)}
                  className={`text-xl p-1 rounded ${
                    centerEmoji === emoji ? 'bg-indigo-100' : 'hover:bg-gray-100'
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
          <div className="flex items-center justify-between mb-2">
            <Label>초기 노드 (선택, 최대 8개)</Label>
            <Button
              variant="outline"
              onClick={handleAddInitialNode}
              disabled={initialNodes.length >= 8}
              className="h-9 md:h-8 text-sm px-3"
            >
              <Plus className="w-4 h-4 mr-1" />
              노드 추가
            </Button>
          </div>
          {initialNodes.map((node, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={node.title}
                onChange={(e) => handleUpdateInitialNode(index, 'title', e.target.value)}
                placeholder={`노드 ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => handleRemoveInitialNode(index)}
                className="h-10 md:h-9 w-10 md:w-9 p-0"
              >
                <X className="w-5 h-5 md:w-4 md:h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCreateChart}
            className="bg-indigo-600 hover:bg-indigo-700 h-10 md:h-9 text-sm px-4"
          >
            <Check className="w-5 h-5 md:w-4 md:h-4 mr-1" />
            만다라트 생성
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="h-10 md:h-9 text-sm px-4"
          >
            <X className="w-5 h-5 md:w-4 md:h-4 mr-1" />
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
