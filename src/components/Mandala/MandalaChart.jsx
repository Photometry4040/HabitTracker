import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { LayoutGrid, Plus } from 'lucide-react'
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
import { MandalaCreateForm } from './MandalaCreateForm.jsx'
import { MandalaChartsList } from './MandalaChartsList.jsx'
import { MandalaGridDisplay } from './MandalaGridDisplay.jsx'
import { MandalaNodeEditor } from './MandalaNodeEditor.jsx'
import { MandalaGoalDetail } from './MandalaGoalDetail.jsx'

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
      if (!childName) {
        console.warn('MandalaChart: childName이 없습니다')
        setCharts([])
        return
      }
      const data = await getAllMandalaCharts(childName)
      setCharts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('만다라트 목록 로드 실패:', error)
      setCharts([])
    } finally {
      setLoading(false)
    }
  }

  const loadHierarchy = async (chartId) => {
    try {
      const hierarchy = await getMandalaNodesHierarchy(chartId, 3)
      setHierarchyNodes(hierarchy || { level1Nodes: [], level2Nodes: [], level3Nodes: [] })
    } catch (error) {
      console.error('계층 노드 로드 실패:', error)
      setHierarchyNodes({ level1Nodes: [], level2Nodes: [], level3Nodes: [] })
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

  const handleCancelNodeEdit = () => {
    setEditingNode(null)
    setNodeFormData({ title: '', color: '#3B82F6', emoji: null })
  }

  const handleCancelCreateForm = () => {
    setShowCreateForm(false)
    resetCreateForm()
  }

  const handleBackToList = () => {
    setViewMode('list')
    setCurrentChart(null)
    setCurrentLevel(1)
    setSelectedParentNode(null)
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
          <MandalaCreateForm
            centerGoal={centerGoal}
            setCenterGoal={setCenterGoal}
            centerEmoji={centerEmoji}
            setCenterEmoji={setCenterEmoji}
            centerColor={centerColor}
            setCenterColor={setCenterColor}
            initialNodes={initialNodes}
            handleAddInitialNode={handleAddInitialNode}
            handleUpdateInitialNode={handleUpdateInitialNode}
            handleRemoveInitialNode={handleRemoveInitialNode}
            handleCreateChart={handleCreateChart}
            onCancel={handleCancelCreateForm}
            COLORS={COLORS}
            EMOJIS={EMOJIS}
          />
        )}

        {/* Charts List */}
        <MandalaChartsList
          charts={charts}
          handleViewChart={handleViewChart}
          handleDeleteChart={handleDeleteChart}
        />
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
        <MandalaGridDisplay
          grid={grid}
          currentChart={currentChart}
          currentLevel={currentLevel}
          selectedParentNode={selectedParentNode}
          editingNode={editingNode}
          nodeFormData={nodeFormData}
          setNodeFormData={setNodeFormData}
          nodeHasChildren={nodeHasChildren}
          handleEditNode={handleEditNode}
          handleSaveNode={handleSaveNode}
          handleExpandNode={handleExpandNode}
          handleViewChildNodes={handleViewChildNodes}
          handleCollapseNode={handleCollapseNode}
          handleDeleteNode={handleDeleteNode}
          handleViewGoal={handleViewGoal}
          handleBackToParent={handleBackToParent}
          onBackToList={handleBackToList}
          onCancelInlineEdit={handleCancelNodeEdit}
        />

        {/* Edit Node Panel */}
        {editingNode && (
          <MandalaNodeEditor
            editingNode={editingNode}
            nodeFormData={nodeFormData}
            setNodeFormData={setNodeFormData}
            handleSaveNode={handleSaveNode}
            onCancel={handleCancelNodeEdit}
            COLORS={COLORS}
            EMOJIS={EMOJIS}
          />
        )}

        {/* Goal Detail Panel */}
        {selectedGoal && (
          <MandalaGoalDetail
            selectedGoal={selectedGoal}
            setSelectedGoal={setSelectedGoal}
            handleUpdateGoalProgress={handleUpdateGoalProgress}
            handleCompleteGoalFromDetail={handleCompleteGoalFromDetail}
          />
        )}
      </div>
    )
  }

  return null
}
