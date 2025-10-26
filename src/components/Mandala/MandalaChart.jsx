import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { LayoutGrid, Plus, Trash2, Eye, ArrowLeft, Check, X, Palette } from 'lucide-react'
import {
  createMandalaChart,
  getAllMandalaCharts,
  getMandalaChart,
  updateMandalaNode,
  addNodeToMandala,
  deleteNodeFromMandala,
  deleteMandalaChart,
  calculateMandalaCompletion,
  createNodeWithGoal,
  linkGoalToNode
} from '@/lib/learning-mode.js'

const COLORS = [
  { name: '파란색', value: '#3B82F6' },
  { name: '초록색', value: '#10B981' },
  { name: '보라색', value: '#8B5CF6' },
  { name: '빨간색', value: '#EF4444' },
  { name: '노란색', value: '#F59E0B' },
  { name: '분홍색', value: '#EC4899' },
  { name: '하늘색', value: '#06B6D4' },
  { name: '주황색', value: '#F97316' }
]

const EMOJIS = ['📚', '💡', '🎯', '⭐', '🏆', '✨', '🔥', '💪', '🎨', '🎵', '⚡', '🌟']

export function MandalaChart({ childName }) {
  const [charts, setCharts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'chart'
  const [currentChart, setCurrentChart] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [centerGoal, setCenterGoal] = useState('')
  const [centerEmoji, setCenterEmoji] = useState(null)
  const [centerColor, setCenterColor] = useState('#3B82F6')
  const [initialNodes, setInitialNodes] = useState([])

  // Node editor state
  const [editingNode, setEditingNode] = useState(null) // { position, mode: 'edit' | 'create' }
  const [nodeFormData, setNodeFormData] = useState({
    title: '',
    color: '#3B82F6',
    emoji: null,
    createGoal: true // 목표 자동 생성 여부
  })

  useEffect(() => {
    loadCharts()
  }, [childName])

  const loadCharts = async () => {
    try {
      setLoading(true)
      const data = await getAllMandalaCharts(childName)
      setCharts(data)
    } catch (error) {
      console.error('만다라트 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChart = async () => {
    try {
      if (!centerGoal.trim() || centerGoal.length < 3) {
        alert('중심 목표를 3자 이상 입력해주세요.')
        return
      }

      await createMandalaChart(
        childName,
        centerGoal,
        initialNodes,
        {
          center_goal_color: centerColor,
          center_goal_emoji: centerEmoji
        }
      )

      await loadCharts()
      resetCreateForm()
      setShowCreateForm(false)
      alert('만다라트 차트가 생성되었습니다!')
    } catch (error) {
      console.error('만다라트 생성 실패:', error)
      alert('만다라트 생성 중 오류가 발생했습니다.')
    }
  }

  const resetCreateForm = () => {
    setCenterGoal('')
    setCenterEmoji(null)
    setCenterColor('#3B82F6')
    setInitialNodes([])
  }

  const handleAddInitialNode = () => {
    if (initialNodes.length >= 8) {
      alert('최대 8개의 노드만 추가할 수 있습니다.')
      return
    }

    setInitialNodes([
      ...initialNodes,
      {
        position: initialNodes.length + 1,
        title: '',
        color: '#3B82F6',
        emoji: null
      }
    ])
  }

  const handleUpdateInitialNode = (index, field, value) => {
    const updated = [...initialNodes]
    updated[index] = { ...updated[index], [field]: value }
    setInitialNodes(updated)
  }

  const handleRemoveInitialNode = (index) => {
    setInitialNodes(initialNodes.filter((_, i) => i !== index))
  }

  const handleViewChart = async (chart) => {
    try {
      const fullChart = await getMandalaChart(chart.id)
      setCurrentChart(fullChart)
      setViewMode('chart')
    } catch (error) {
      console.error('만다라트 조회 실패:', error)
      alert('만다라트 조회 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteChart = async (chartId) => {
    if (!confirm('정말 이 만다라트 차트를 삭제하시겠습니까?')) return

    try {
      await deleteMandalaChart(chartId)
      await loadCharts()
      alert('만다라트 차트가 삭제되었습니다.')
    } catch (error) {
      console.error('만다라트 삭제 실패:', error)
      alert('만다라트 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEditNode = (node) => {
    setEditingNode(node)
    setNodeFormData({
      title: node.title || '',
      color: node.color || '#3B82F6',
      emoji: node.emoji || null
    })
  }

  const handleSaveNode = async () => {
    try {
      if (!nodeFormData.title.trim()) {
        alert('노드 제목을 입력해주세요.')
        return
      }

      if (editingNode.mode === 'create') {
        // CREATE mode: Add new node with optional goal
        if (nodeFormData.createGoal) {
          // Create node with goal
          await createNodeWithGoal(
            currentChart.id,
            childName,
            {
              position: editingNode.position,
              title: nodeFormData.title,
              color: nodeFormData.color,
              emoji: nodeFormData.emoji
            },
            {
              metric_type: 'boolean' // Default to boolean goal
            }
          )
        } else {
          // Create node without goal
          await addNodeToMandala(currentChart.id, {
            position: editingNode.position,
            title: nodeFormData.title,
            color: nodeFormData.color || '#3B82F6',
            emoji: nodeFormData.emoji || null
          })
        }
        alert('노드가 추가되었습니다!')
      } else {
        // EDIT mode: Update existing node
        await updateMandalaNode(currentChart.id, editingNode.position, {
          title: nodeFormData.title,
          color: nodeFormData.color,
          emoji: nodeFormData.emoji
        })
        alert('노드가 수정되었습니다!')
      }

      // Reload chart
      const updated = await getMandalaChart(currentChart.id)
      setCurrentChart(updated)

      // Recalculate completion
      await calculateMandalaCompletion(currentChart.id)

      setEditingNode(null)
      setNodeFormData({ title: '', color: '#3B82F6', emoji: null, createGoal: true })
    } catch (error) {
      console.error('노드 저장 실패:', error)
      alert('노드 저장 중 오류가 발생했습니다.')
    }
  }

  const handleAddNode = async () => {
    try {
      const title = prompt('새 노드 제목을 입력하세요:')
      if (!title || title.trim().length === 0) return

      await addNodeToMandala(currentChart.id, {
        title,
        color: '#3B82F6',
        emoji: null
      })

      const updated = await getMandalaChart(currentChart.id)
      setCurrentChart(updated)

      alert('노드가 추가되었습니다!')
    } catch (error) {
      console.error('노드 추가 실패:', error)
      alert(error.message || '노드 추가 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteNode = async (position) => {
    if (!confirm('이 노드를 삭제하시겠습니까?')) return

    try {
      await deleteNodeFromMandala(currentChart.id, position)

      const updated = await getMandalaChart(currentChart.id)
      setCurrentChart(updated)

      alert('노드가 삭제되었습니다.')
    } catch (error) {
      console.error('노드 삭제 실패:', error)
      alert('노드 삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">만다라트 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                {childName}의 만다라트 차트
              </div>
              {!showCreateForm && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 만다라트
                </Button>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Create Form */}
        {showCreateForm && (
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>색상</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {COLORS.slice(0, 8).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCenterColor(c.value)}
                        className={`w-8 h-8 rounded-full border-2 ${
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
                    size="sm"
                    variant="outline"
                    onClick={handleAddInitialNode}
                    disabled={initialNodes.length >= 8}
                  >
                    <Plus className="w-3 h-3 mr-1" />
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
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveInitialNode(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateChart}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  만다라트 생성
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false)
                    resetCreateForm()
                  }}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts List */}
        {charts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map((chart) => (
              <Card key={chart.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {chart.center_goal_emoji && (
                          <span className="text-2xl">{chart.center_goal_emoji}</span>
                        )}
                        <h3 className="font-semibold text-lg">{chart.center_goal}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        노드: {chart.nodes?.length || 0}/8개
                      </p>
                      {chart.overall_completion_rate > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${chart.overall_completion_rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {chart.overall_completion_rate}%
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewChart(chart)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteChart(chart.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>아직 만다라트 차트가 없습니다.</p>
              <p className="text-sm">위의 &ldquo;새 만다라트&rdquo; 버튼을 클릭하여 첫 차트를 만들어보세요!</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // CHART VIEW (3x3 Grid)
  if (viewMode === 'chart' && currentChart) {
    // Create 3x3 grid with center + 8 positions
    const grid = Array(9).fill(null)
    grid[4] = { type: 'center' } // Center position

    // Map nodes to grid positions (1-8 → 0,1,2,3,5,6,7,8)
    const positionMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 7, 8: 8 }
    const reversePositionMap = { 0: 1, 1: 2, 2: 3, 3: 4, 5: 5, 6: 6, 7: 7, 8: 8 }

    currentChart.nodes?.forEach((node) => {
      const gridIndex = positionMap[node.position]
      if (gridIndex !== undefined) {
        grid[gridIndex] = { type: 'node', data: node }
      }
    })

    const handleEmptyCellClick = (gridIndex) => {
      const position = reversePositionMap[gridIndex]
      if (position) {
        setEditingNode({ position, mode: 'create' })
        setNodeFormData({ title: '', color: '#3B82F6', emoji: null, createGoal: true })
      }
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                {currentChart.center_goal_emoji && (
                  <span className="text-2xl">{currentChart.center_goal_emoji}</span>
                )}
                {currentChart.center_goal}
              </div>
              <div className="flex gap-2">
                {currentChart.nodes?.length < 8 && (
                  <Button onClick={handleAddNode} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    노드 추가
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setViewMode('list')
                    setCurrentChart(null)
                  }}
                  size="sm"
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  목록으로
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Progress */}
        {currentChart.overall_completion_rate > 0 && (
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
        <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
          {grid.map((cell, index) => {
            if (!cell) {
              // Empty cell - clickable to add node
              return (
                <div
                  key={index}
                  onClick={() => handleEmptyCellClick(index)}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="text-center">
                    <Plus className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <span className="text-gray-400 text-xs">노드 추가</span>
                  </div>
                </div>
              )
            }

            if (cell.type === 'center') {
              // Center goal
              return (
                <div
                  key={index}
                  className="aspect-square border-4 rounded-lg flex flex-col items-center justify-center p-3"
                  style={{
                    borderColor: currentChart.center_goal_color || '#3B82F6',
                    backgroundColor: `${currentChart.center_goal_color || '#3B82F6'}10`
                  }}
                >
                  <div className="text-center">
                    <div className="text-xs font-semibold mb-1" style={{ color: currentChart.center_goal_color }}>
                      중심 목표
                    </div>
                    {currentChart.center_goal_emoji && (
                      <div className="text-3xl mb-2">{currentChart.center_goal_emoji}</div>
                    )}
                    <div className="font-bold text-sm sm:text-base break-words">
                      {currentChart.center_goal}
                    </div>
                  </div>
                </div>
              )
            }

            if (cell.type === 'node') {
              const node = cell.data
              const isEditing = editingNode?.position === node.position

              return (
                <div
                  key={index}
                  className="aspect-square border-2 rounded-lg flex flex-col p-2"
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
                        className="text-xs mb-1"
                        placeholder="제목"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={handleSaveNode}
                          className="flex-1 h-6 text-xs"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNode(null)
                            setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
                          }}
                          className="flex-1 h-6 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center text-center relative">
                        {/* Goal status badges */}
                        {node.goal_id && (
                          <div className="absolute top-0 right-0 flex gap-1">
                            {node.completed && (
                              <Badge className="h-4 text-xs bg-green-500">✓</Badge>
                            )}
                            {node.completion_rate > 0 && (
                              <Badge variant="outline" className="h-4 text-xs">
                                {node.completion_rate}%
                              </Badge>
                            )}
                          </div>
                        )}

                        {node.emoji && <div className="text-2xl mb-1">{node.emoji}</div>}
                        <p className="text-xs sm:text-sm font-medium break-words">
                          {node.title || '(제목 없음)'}
                        </p>

                        {/* Goal indicator */}
                        {node.goal_id && (
                          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                            <span>🎯</span>
                            <span>목표 연동</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 justify-center mt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditNode(node)}
                          className="h-6 w-6 p-0"
                          title="수정"
                        >
                          <Palette className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNode(node.position)}
                          className="h-6 w-6 p-0 text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
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

        {/* Edit Node Panel */}
        {editingNode && (
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4" />
                노드 편집: Position {editingNode.position}
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
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNodeFormData({ ...nodeFormData, color: c.value })}
                      className={`w-8 h-8 rounded-full border-2 ${
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
                <div className="grid grid-cols-12 gap-1 mt-2">
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

              {/* Goal creation option (only in CREATE mode) */}
              {editingNode.mode === 'create' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="createGoal"
                    checked={nodeFormData.createGoal}
                    onChange={(e) => setNodeFormData({ ...nodeFormData, createGoal: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="createGoal" className="cursor-pointer text-sm">
                    목표 자동 생성 (습관 추적 연동)
                  </Label>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveNode} className="bg-purple-600 hover:bg-purple-700">
                  <Check className="w-4 h-4 mr-1" />
                  저장
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingNode(null)
                    setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-900">
              <strong>만다라트 차트 사용법:</strong> 중심 목표를 중심으로 8개의 세부 목표를 배치합니다.
              각 노드는 position (1-8)에 따라 배치되며, 색상과 이모지로 시각화할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
