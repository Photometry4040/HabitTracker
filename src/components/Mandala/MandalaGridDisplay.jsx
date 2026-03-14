import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { LayoutGrid, ArrowLeft, Check, X, Palette, Eye, Maximize2, Minimize2, Trash2 } from 'lucide-react'

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
  return (
    <>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              {currentChart.center_goal_emoji && (
                <span className="text-lg sm:text-2xl">{currentChart.center_goal_emoji}</span>
              )}
              <span className="truncate max-w-[150px] sm:max-w-none">{currentChart.center_goal}</span>
              <Badge className="text-[10px] sm:text-xs">
                Level {currentLevel}
                {currentLevel === 1 && ' (9칸)'}
                {currentLevel === 2 && ' (27칸)'}
                {currentLevel === 3 && ' (81칸)'}
              </Badge>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              {currentLevel > 1 && (
                <Button
                  onClick={handleBackToParent}
                  variant="outline"
                  className="h-10 md:h-9 text-sm px-3"
                >
                  <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 mr-1" />
                  상위 레벨
                </Button>
              )}
              <Button
                onClick={onBackToList}
                variant="outline"
                className="h-10 md:h-9 text-sm px-3"
              >
                <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 mr-1" />
                목록으로
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Breadcrumb */}
      {selectedParentNode && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="text-xs sm:text-sm text-gray-700 break-words">
              <span className="font-semibold">현재 위치:</span>{' '}
              <span className="inline-block">{currentChart.center_goal}</span>
              {selectedParentNode && (
                <>
                  <span className="mx-1">&rarr;</span>
                  <span className="inline-block">{selectedParentNode.title}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {currentChart.overall_completion_rate > 0 && currentLevel === 1 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-indigo-900 mb-1">전체 진행률</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-indigo-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all"
                      style={{ width: `${currentChart.overall_completion_rate}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-indigo-900">
                    {currentChart.overall_completion_rate}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 max-w-2xl md:max-w-6xl mx-auto">
        {grid.map((cell, index) => {
          if (!cell) {
            // Empty cell
            return (
              <div
                key={index}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
              >
                <span className="text-gray-400 text-[10px] sm:text-sm">빈 칸</span>
              </div>
            )
          }

          if (cell.type === 'center') {
            // Center goal OR selected parent node
            const centerContent = selectedParentNode || {
              title: currentChart.center_goal,
              color: currentChart.center_goal_color,
              emoji: currentChart.center_goal_emoji
            }

            return (
              <div
                key={index}
                className="aspect-square border-4 rounded-lg flex flex-col items-center justify-center p-2 sm:p-3 md:p-4"
                style={{
                  borderColor: centerContent.color || '#3B82F6',
                  backgroundColor: `${centerContent.color || '#3B82F6'}10`
                }}
              >
                <div className="text-center">
                  <div className="text-[10px] sm:text-sm font-semibold mb-1 sm:mb-2" style={{ color: centerContent.color }}>
                    {selectedParentNode ? `Level ${currentLevel - 1}` : '중심 목표'}
                  </div>
                  {centerContent.emoji && (
                    <div className="text-2xl sm:text-3xl md:text-5xl mb-1 sm:mb-3">{centerContent.emoji}</div>
                  )}
                  <div className="font-bold text-xs sm:text-sm md:text-lg break-words line-clamp-2">
                    {centerContent.title}
                  </div>
                </div>
              </div>
            )
          }

          if (cell.type === 'node') {
            const node = cell.data
            const isEditing = editingNode?.id === node.id

            return (
              <div
                key={index}
                className="aspect-square border-2 rounded-lg flex flex-col p-1.5 sm:p-2 md:p-3"
                style={{
                  borderColor: node.color || '#3B82F6',
                  backgroundColor: `${node.color || '#3B82F6'}10`
                }}
              >
                {isEditing ? (
                  <div className="flex flex-col h-full justify-between">
                    <Input
                      value={nodeFormData.title}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
                      className="text-sm mb-2"
                      placeholder="제목"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        onClick={handleSaveNode}
                        className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onCancelInlineEdit}
                        className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center text-center relative">
                      {/* Badges */}
                      <div className="absolute top-0 right-0 flex gap-0.5 sm:gap-1 flex-col items-end">
                        {node.completed && (
                          <Badge className="h-4 sm:h-5 text-[9px] sm:text-xs bg-green-500">✓</Badge>
                        )}
                        {node.completion_rate > 0 && (
                          <Badge variant="outline" className="h-4 sm:h-5 text-[9px] sm:text-xs">
                            {node.completion_rate}%
                          </Badge>
                        )}
                        {nodeHasChildren(node.id) && (
                          <Badge className="h-4 sm:h-5 text-[9px] sm:text-xs bg-blue-500">확장됨</Badge>
                        )}
                      </div>

                      {node.emoji && <div className="text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2">{node.emoji}</div>}
                      <p className="text-[10px] sm:text-xs md:text-base font-medium break-words line-clamp-2">
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
                    <div className="flex gap-0.5 sm:gap-1 justify-center mt-1 sm:mt-2 flex-wrap">
                      <Button
                        variant="ghost"
                        onClick={() => handleEditNode(node)}
                        className="h-7 w-7 sm:h-9 sm:w-9 p-0"
                        title="수정"
                      >
                        <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>

                      {/* Expand button - only for level 1 and 2 */}
                      {node.level < 3 && !nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleExpandNode(node)}
                          className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-blue-600"
                          title="확장"
                        >
                          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      )}

                      {/* View children button - if has children */}
                      {nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleViewChildNodes(node)}
                          className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-green-600"
                          title="자식 보기"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      )}

                      {/* Collapse button */}
                      {nodeHasChildren(node.id) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleCollapseNode(node)}
                          className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-orange-600"
                          title="축소"
                        >
                          <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteNode(node.id)}
                        className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm text-blue-900">
            <p>
              <strong>81칸 만다라트 사용법:</strong>
            </p>
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
      </Card>
    </>
  )
}
