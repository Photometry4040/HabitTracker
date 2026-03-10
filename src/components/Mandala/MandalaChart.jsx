import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { LayoutGrid, Plus, Trash2, Eye, ArrowLeft, Check, X, Palette, Maximize2, Minimize2 } from 'lucide-react'
import {
  createMandalaChart,
  getAllMandalaCharts,
  getMandalaChart,
  deleteMandalaChart,
  getGoal,
  updateGoalProgress,
  completeGoal
} from '@/lib/learning-mode.js'
import {
  expandMandalaNode,
  getMandalaNodesHierarchy,
  updateMandalaNodeData,
  deleteMandalaNodeData,
  canExpandNode,
  collapseMandalaNode
} from '@/lib/mandala-expansion.js'

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

  // Hierarchy state for 81칸 expansion
  const [currentLevel, setCurrentLevel] = useState(1) // 1, 2, or 3
  const [selectedParentNode, setSelectedParentNode] = useState(null) // For level 2/3 viewing
  const [hierarchyNodes, setHierarchyNodes] = useState({ level1Nodes: [], level2Nodes: [], level3Nodes: [] })

  // Create form state
  const [centerGoal, setCenterGoal] = useState('')
  const [centerEmoji, setCenterEmoji] = useState(null)
  const [centerColor, setCenterColor] = useState('#3B82F6')
  const [initialNodes, setInitialNodes] = useState([])

  // Node editor state
  const [editingNode, setEditingNode] = useState(null) // { id, mode: 'edit' | 'create' }
  const [nodeFormData, setNodeFormData] = useState({
    title: '',
    color: '#3B82F6',
    emoji: null
  })

  // Goal detail state
  const [selectedGoal, setSelectedGoal] = useState(null)

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

  const loadHierarchy = async (chartId) => {
    try {
      const hierarchy = await getMandalaNodesHierarchy(chartId, 3)
      setHierarchyNodes(hierarchy)
    } catch (error) {
      console.error('계층 노드 로드 실패:', error)
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
      await loadHierarchy(chart.id)
      setCurrentLevel(1) // Start at level 1
      setSelectedParentNode(null)
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
    setEditingNode({ ...node, mode: 'edit' })
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

      await updateMandalaNodeData(editingNode.id, {
        title: nodeFormData.title,
        color: nodeFormData.color,
        emoji: nodeFormData.emoji
      })

      alert('노드가 수정되었습니다!')

      // Reload hierarchy
      await loadHierarchy(currentChart.id)

      setEditingNode(null)
      setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
    } catch (error) {
      console.error('노드 저장 실패:', error)
      alert('노드 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteNode = async (nodeId) => {
    if (!confirm('이 노드를 삭제하시겠습니까?')) return

    try {
      await deleteMandalaNodeData(nodeId)
      await loadHierarchy(currentChart.id)
      alert('노드가 삭제되었습니다.')
    } catch (error) {
      console.error('노드 삭제 실패:', error)
      alert('노드 삭제 중 오류가 발생했습니다.')
    }
  }

  // 81칸 Expansion - NEW
  const handleExpandNode = async (node) => {
    try {
      const { canExpand, reason } = await canExpandNode(node.id)

      if (!canExpand) {
        alert(reason)
        return
      }

      const titles = []
      for (let i = 1; i <= 8; i++) {
        const title = prompt(`자식 노드 ${i} 제목 (취소하면 자동 생성):`)
        if (title === null) break // User cancelled
        titles.push(title || `${node.title} - ${i}`)
      }

      await expandMandalaNode(node.id, titles)
      await loadHierarchy(currentChart.id)

      alert(`노드가 확장되었습니다! ${titles.length || 8}개의 자식 노드가 생성되었습니다.`)
    } catch (error) {
      console.error('노드 확장 실패:', error)
      alert('노드 확장 중 오류가 발생했습니다.')
    }
  }

  const handleCollapseNode = async (node) => {
    try {
      await collapseMandalaNode(node.id)
      await loadHierarchy(currentChart.id)
      alert('노드가 축소되었습니다.')
    } catch (error) {
      console.error('노드 축소 실패:', error)
      alert('노드 축소 중 오류가 발생했습니다.')
    }
  }

  const handleViewChildNodes = async (parentNode) => {
    try {
      setSelectedParentNode(parentNode)
      setCurrentLevel(parentNode.level + 1)
    } catch (error) {
      console.error('자식 노드 조회 실패:', error)
      alert('자식 노드 조회 중 오류가 발생했습니다.')
    }
  }

  const handleBackToParent = () => {
    if (currentLevel === 1) return

    if (currentLevel === 2) {
      setSelectedParentNode(null)
      setCurrentLevel(1)
    } else if (currentLevel === 3) {
      // Find parent's parent (level 1 node)
      const parentOfParent = hierarchyNodes.level1Nodes.find(
        n => n.id === selectedParentNode.parent_node_id
      )
      if (parentOfParent) {
        setSelectedParentNode(parentOfParent)
        setCurrentLevel(2)
      } else {
        setSelectedParentNode(null)
        setCurrentLevel(1)
      }
    }
  }

  // Goal Detail functions
  const handleViewGoal = async (goalId) => {
    if (!goalId) return

    try {
      const goal = await getGoal(goalId)
      setSelectedGoal(goal)
    } catch (error) {
      console.error('목표 조회 실패:', error)
      alert('목표 정보를 불러올 수 없습니다.')
    }
  }

  const handleUpdateGoalProgress = async (goalId, currentValue) => {
    try {
      await updateGoalProgress(goalId, currentValue)

      const updatedGoal = await getGoal(goalId)
      setSelectedGoal(updatedGoal)

      await loadHierarchy(currentChart.id)

      alert('목표 진행률이 업데이트되었습니다!')
    } catch (error) {
      console.error('진행률 업데이트 실패:', error)
      alert('진행률 업데이트 중 오류가 발생했습니다.')
    }
  }

  const handleCompleteGoalFromDetail = async (goalId) => {
    if (!confirm('이 목표를 완료 처리하시겠습니까?')) return

    try {
      await completeGoal(goalId)

      const updatedGoal = await getGoal(goalId)
      setSelectedGoal(updatedGoal)

      await loadHierarchy(currentChart.id)

      alert('목표가 완료되었습니다! 🎉')
    } catch (error) {
      console.error('목표 완료 실패:', error)
      alert('목표 완료 중 오류가 발생했습니다.')
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
                {childName}의 만다라트 차트 (81칸 지원)
              </div>
              {!showCreateForm && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 h-10 md:h-9 text-sm md:text-sm px-4"
                >
                  <Plus className="w-5 h-5 md:w-4 md:h-4 mr-1" />
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
                  onClick={() => {
                    setShowCreateForm(false)
                    resetCreateForm()
                  }}
                  variant="outline"
                  className="h-10 md:h-9 text-sm px-4"
                >
                  <X className="w-5 h-5 md:w-4 md:h-4 mr-1" />
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
                          onClick={() => handleViewChart(chart)}
                          className="bg-indigo-600 hover:bg-indigo-700 h-10 md:h-8 text-sm px-3 md:px-2"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">보기</span>
                          <span className="sm:hidden">열기</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 h-10 md:h-8 text-sm px-3 md:px-2"
                          onClick={() => handleDeleteChart(chart.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">삭제</span>
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

  // CHART VIEW (3x3 Grid with 81칸 Support)
  if (viewMode === 'chart' && currentChart) {
    // Determine which nodes to display based on currentLevel
    let nodesToDisplay = []

    if (currentLevel === 1) {
      // Show level 1 nodes (8 nodes around center)
      nodesToDisplay = hierarchyNodes.level1Nodes
    } else if (currentLevel === 2 && selectedParentNode) {
      // Show children of selected level 1 node
      nodesToDisplay = hierarchyNodes.level2Nodes.filter(
        n => n.parent_node_id === selectedParentNode.id
      )
    } else if (currentLevel === 3 && selectedParentNode) {
      // Show children of selected level 2 node
      nodesToDisplay = hierarchyNodes.level3Nodes.filter(
        n => n.parent_node_id === selectedParentNode.id
      )
    }

    // Calculate which nodes have children (for button display)
    const nodeHasChildren = (nodeId) => {
      const level1Node = hierarchyNodes.level1Nodes.find(n => n.id === nodeId)
      if (level1Node) {
        return hierarchyNodes.level2Nodes.some(n => n.parent_node_id === nodeId)
      }
      const level2Node = hierarchyNodes.level2Nodes.find(n => n.id === nodeId)
      if (level2Node) {
        return hierarchyNodes.level3Nodes.some(n => n.parent_node_id === nodeId)
      }
      return false
    }

    // Create 3x3 grid with center + 8 positions
    const grid = Array(9).fill(null)
    grid[4] = { type: 'center' } // Center position

    // Map nodes to grid positions (node_position 1-8 → grid index 0,1,2,3,5,6,7,8)
    const positionMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 7, 8: 8 }

    nodesToDisplay.forEach((node) => {
      const gridIndex = positionMap[node.node_position]
      if (gridIndex !== undefined) {
        grid[gridIndex] = { type: 'node', data: node }
      }
    })

    return (
      <div className="space-y-4">
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
                  onClick={() => {
                    setViewMode('list')
                    setCurrentChart(null)
                    setCurrentLevel(1)
                    setSelectedParentNode(null)
                  }}
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
                    <span className="mx-1">→</span>
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
                          onClick={() => {
                            setEditingNode(null)
                            setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
                          }}
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

        {/* Edit Node Panel */}
        {editingNode && (
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
                  onClick={() => {
                    setEditingNode(null)
                    setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
                  }}
                  className="h-10 md:h-9 text-sm px-4"
                >
                  <X className="w-5 h-5 md:w-4 md:h-4 mr-1" />
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goal Detail Panel */}
        {selectedGoal && (
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
        )}

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
      </div>
    )
  }

  return null
}
