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
  const nodeColor = nodeFormData.color || editingNode.color || '#6366F1'

  return (
    <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: nodeColor }} />
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4" style={{ color: nodeColor }} />
          <span>노드 편집: {editingNode.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">제목</Label>
          <Input
            value={nodeFormData.title}
            onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
            placeholder="노드 제목"
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">색상</Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 mt-2.5">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNodeFormData({ ...nodeFormData, color: c.value })}
                className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl border-2 transition-all ${
                  nodeFormData.color === c.value
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              >
                {nodeFormData.color === c.value && (
                  <Check className="w-4 h-4 mx-auto text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">이모지</Label>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-1.5 mt-2.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNodeFormData({ ...nodeFormData, emoji })}
                className={`text-2xl p-1.5 rounded-xl transition-all ${
                  nodeFormData.emoji === emoji
                    ? 'scale-110 shadow-sm'
                    : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: nodeFormData.emoji === emoji ? `${nodeColor}20` : undefined
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSaveNode}
            className="h-10 text-sm px-5 rounded-xl"
            style={{ backgroundColor: nodeColor }}
          >
            <Check className="w-4 h-4 mr-1" />
            저장
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
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
