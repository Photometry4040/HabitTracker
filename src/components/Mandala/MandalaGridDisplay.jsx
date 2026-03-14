import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { LayoutGrid, ArrowLeft, Check, X, Palette, Eye, Maximize2, Minimize2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export function MandalaGridDisplay({
  grid,
  currentChart,
  currentLevel,
  selectedParentNode,
  editingNode,
  nodeFormData,
  setNodeFormData,
  nodeHasChildren,
  handleEditNode,
  handleSaveNode,
  handleExpandNode,
  handleViewChildNodes,
  handleCollapseNode,
  handleDeleteNode,
  handleViewGoal,
  handleBackToParent,
  onBackToList,
  onCancelInlineEdit
}) {
  const [showInstructions, setShowInstructions] = useState(false)
  const chartColor = currentChart.center_goal_color || '#6366F1'

  return (
    <>
      {/* Header */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: chartColor }} />
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {currentChart.center_goal_emoji && (
                <span className="text-2xl sm:text-3xl">{currentChart.center_goal_emoji}</span>
              )}
              <span className="truncate max-w-[180px] sm:max-w-none text-gray-800">{currentChart.center_goal}</span>
              <Badge
                className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${chartColor}20`, color: chartColor, border: `1px solid ${chartColor}40` }}
              >
                Level {currentLevel}
                {currentLevel === 1 && ' (9칸)'}
                {currentLevel === 2 && ' (27칸)'}
                {currentLevel === 3 && ' (81칸)'}
              </Badge>
            </div>
            <div className="flex gap-2">
              {currentLevel > 1 && (
                <Button
                  onClick={handleBackToParent}
                  variant="outline"
                  className="h-10 md:h-9 text-sm px-3 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  상위 레벨
                </Button>
              )}
              <Button
                onClick={onBackToList}
                variant="outline"
                className="h-10 md:h-9 text-sm px-3 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                목록으로
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Breadcrumb - 칩 스타일 */}
      {selectedParentNode && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <button
            onClick={handleBackToParent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: `${chartColor}15`, color: chartColor }}
          >
            {currentChart.center_goal_emoji && <span>{currentChart.center_goal_emoji}</span>}
            {currentChart.center_goal}
          </button>
          <span className="text-gray-400">&rarr;</span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${selectedParentNode.color || chartColor}20`, color: selectedParentNode.color || chartColor }}
          >
            {selectedParentNode.emoji && <span>{selectedParentNode.emoji}</span>}
            {selectedParentNode.title}
          </span>
        </div>
      )}

      {/* Progress */}
      {currentChart.overall_completion_rate > 0 && currentLevel === 1 && (
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: `${chartColor}08` }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium mb-1.5" style={{ color: chartColor }}>전체 진행률</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3.5 overflow-hidden">
                    <div
                      className="h-3.5 rounded-full transition-all duration-500"
                      style={{ width: `${currentChart.overall_completion_rate}%`, backgroundColor: chartColor }}
                    />
                  </div>
                  <span className="text-lg font-bold" style={{ color: chartColor }}>
                    {currentChart.overall_completion_rate}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-2xl md:max-w-6xl mx-auto">
        {grid.map((cell, index) => {
          if (!cell) {
            // Empty cell — 부드러운 빈 상태
            return (
              <div
                key={index}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center bg-gray-50/80 border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-100/60 transition-all cursor-default"
              >
                <span className="text-gray-300 text-lg sm:text-2xl mb-1">+</span>
                <span className="text-gray-400 text-xs sm:text-sm">목표를 추가해보세요</span>
              </div>
            )
          }

          if (cell.type === 'center') {
            // Center goal
            const centerContent = selectedParentNode || {
              title: currentChart.center_goal,
              color: currentChart.center_goal_color,
              emoji: currentChart.center_goal_emoji
            }
            const color = centerContent.color || '#6366F1'

            return (
              <div
                key={index}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center p-2 sm:p-3 md:p-5 relative overflow-hidden shadow-lg"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${color}15, ${color}08)`,
                  boxShadow: `0 0 0 3px ${color}25, 0 4px 20px ${color}15`
                }}
              >
                <div className="text-center relative z-10">
                  <div className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 opacity-70" style={{ color }}>
                    {selectedParentNode ? `Level ${currentLevel - 1}` : '중심 목표'}
                  </div>
                  {centerContent.emoji && (
                    <div className="text-3xl sm:text-4xl md:text-6xl mb-1 sm:mb-3 drop-shadow-sm">{centerContent.emoji}</div>
                  )}
                  <div className="font-bold text-sm sm:text-base md:text-xl break-words line-clamp-2 text-gray-800">
                    {centerContent.title}
                  </div>
                </div>
              </div>
            )
          }

          if (cell.type === 'node') {
            const node = cell.data
            const isEditing = editingNode?.id === node.id
            const nodeColor = node.color || '#6366F1'

            return (
              <div
                key={index}
                className="aspect-square rounded-2xl flex flex-col shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, white 0%, ${nodeColor}06 100%)`,
                  borderLeft: `4px solid ${nodeColor}`
                }}
              >
                {isEditing ? (
                  <div className="flex flex-col h-full justify-between p-2 sm:p-3">
                    <Input
                      value={nodeFormData.title}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
                      className="text-sm mb-2 rounded-xl"
                      placeholder="제목"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        onClick={handleSaveNode}
                        className="flex-1 h-8 sm:h-9 text-xs sm:text-sm rounded-xl"
                      >
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onCancelInlineEdit}
                        className="flex-1 h-8 sm:h-9 text-xs sm:text-sm rounded-xl"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center text-center relative p-2 sm:p-3">
                      {/* Badges */}
                      <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex gap-0.5 sm:gap-1 flex-col items-end">
                        {node.completed && (
                          <Badge className="h-5 text-xs bg-green-500 rounded-full px-1.5">✓</Badge>
                        )}
                        {node.completion_rate > 0 && (
                          <Badge variant="outline" className="h-5 text-xs rounded-full px-1.5">
                            {node.completion_rate}%
                          </Badge>
                        )}
                        {nodeHasChildren(node.id) && (
                          <Badge className="h-5 text-xs bg-blue-500 rounded-full px-1.5">확장됨</Badge>
                        )}
                      </div>

                      {node.emoji && <div className="text-2xl sm:text-3xl md:text-5xl mb-1 sm:mb-2 drop-shadow-sm">{node.emoji}</div>}
                      <p className="text-xs sm:text-sm md:text-lg font-medium break-words line-clamp-2 text-gray-700">
                        {node.title || '(제목 없음)'}
                      </p>

                      {/* Goal indicator */}
                      {node.goal_id && (
                        <button
                          onClick={() => handleViewGoal(node.goal_id)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <span>🎯</span>
                          <span>목표</span>
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 justify-center px-1.5 pb-1.5 sm:px-2 sm:pb-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleEditNode(node)}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-gray-100"
                        title="수정"
                      >
                        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      </Button>

                      {node.level < 3 && !nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleExpandNode(node)}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-blue-50"
                          title="확장"
                        >
                          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                        </Button>
                      )}

                      {nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleViewChildNodes(node)}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-green-50"
                          title="자식 보기"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        </Button>
                      )}

                      {nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleCollapseNode(node)}
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-orange-50"
                          title="축소"
                        >
                          <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteNode(node.id)}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-red-50"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )
          }

          return null
        })}
      </div>

      {/* Instructions — 접이식 */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>사용법 안내</span>
          {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showInstructions && (
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2 text-sm text-gray-600">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Level 1 (9칸):</strong> 중심 목표 주변 8개 세부 목표</li>
                <li><strong>확장 버튼 (⤢):</strong> 노드를 클릭하여 8개 하위 노드 생성 (Level 2 → 27칸)</li>
                <li><strong>Level 2:</strong> 각 Level 1 노드를 8개로 세분화</li>
                <li><strong>Level 3 (81칸):</strong> Level 2 노드를 더 확장하여 최대 81칸 달성</li>
                <li><strong>자식 보기 (👁):</strong> 확장된 노드의 하위 레벨로 이동</li>
                <li><strong>축소 (⤓):</strong> 노드를 축소하여 하위 노드 숨기기 (삭제 아님)</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </>
  )
}
