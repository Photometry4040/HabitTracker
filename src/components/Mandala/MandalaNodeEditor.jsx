import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Palette, Check, X } from 'lucide-react'

export function MandalaNodeEditor({
  editingNode,
  nodeFormData,
  setNodeFormData,
  handleSaveNode,
  onCancel,
  COLORS,
  EMOJIS
}) {
  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4" />
          노드 편집: {editingNode.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>제목</Label>
          <Input
            value={nodeFormData.title}
            onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
            placeholder="노드 제목"
          />
        </div>
        <div>
          <Label>색상</Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNodeFormData({ ...nodeFormData, color: c.value })}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full border-2 ${
                  nodeFormData.color === c.value ? 'border-gray-900' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>이모지</Label>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-1 mt-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNodeFormData({ ...nodeFormData, emoji })}
                className={`text-xl p-1 rounded ${
                  nodeFormData.emoji === emoji ? 'bg-purple-200' : 'hover:bg-purple-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveNode}
            className="bg-purple-600 hover:bg-purple-700 h-10 md:h-9 text-sm px-4"
          >
            <Check className="w-5 h-5 md:w-4 md:h-4 mr-1" />
            저장
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
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
