import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Grid3x3, Plus, Trash2, Eye, ArrowLeft, Check, X, Edit2 } from 'lucide-react'
import {
  createMandalaChart,
  getAllMandalaCharts,
  getMandalaChart,
  addSubGoalToMandala,
  deleteMandalaChart,
  updateGoal,
  deleteGoal,
  completeGoal
} from '@/lib/learning-mode.js'

export function MandalaChart({ childName }) {
  const [mandalaCharts, setMandalaCharts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'chart'
  const [currentChart, setCurrentChart] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [mainGoalTitle, setMainGoalTitle] = useState('')
  const [subGoalTitles, setSubGoalTitles] = useState(Array(8).fill(''))

  // Edit sub-goal state
  const [editingSubGoal, setEditingSubGoal] = useState(null)
  const [editSubGoalTitle, setEditSubGoalTitle] = useState('')

  useEffect(() => {
    loadMandalaCharts()
  }, [childName])

  const loadMandalaCharts = async () => {
    try {
      setLoading(true)
      const charts = await getAllMandalaCharts(childName)
      setMandalaCharts(charts)
    } catch (error) {
      console.error('만다라트 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMandalaChart = async () => {
    try {
      if (!mainGoalTitle.trim()) {
        alert('중심 목표를 입력해주세요.')
        return
      }

      const nonEmptySubGoals = subGoalTitles.filter(title => title.trim().length > 0)

      await createMandalaChart(childName, mainGoalTitle, nonEmptySubGoals)
      await loadMandalaCharts()

      // Reset form
      setMainGoalTitle('')
      setSubGoalTitles(Array(8).fill(''))
      setShowCreateForm(false)

      alert('만다라트 차트가 생성되었습니다!')
    } catch (error) {
      console.error('만다라트 생성 실패:', error)
      alert('만다라트 생성 중 오류가 발생했습니다.')
    }
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

  const handleAddSubGoal = async () => {
    try {
      const newTitle = prompt('새로운 세부 목표를 입력하세요:')
      if (!newTitle || newTitle.trim().length === 0) return

      await addSubGoalToMandala(currentChart.mainGoal.id, newTitle)

      // Reload current chart
      const updatedChart = await getMandalaChart(currentChart.mainGoal.id)
      setCurrentChart(updatedChart)

      alert('세부 목표가 추가되었습니다!')
    } catch (error) {
      console.error('세부 목표 추가 실패:', error)
      alert(error.message || '세부 목표 추가 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteChart = async (chartId) => {
    if (!confirm('정말 이 만다라트 차트를 삭제하시겠습니까?\n중심 목표와 모든 세부 목표가 삭제됩니다.')) return

    try {
      await deleteMandalaChart(chartId)
      await loadMandalaCharts()
      alert('만다라트 차트가 삭제되었습니다.')
    } catch (error) {
      console.error('만다라트 삭제 실패:', error)
      alert('만다라트 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEditSubGoal = (subGoal) => {
    setEditingSubGoal(subGoal)
    setEditSubGoalTitle(subGoal.title)
  }

  const handleSaveSubGoalEdit = async () => {
    try {
      if (!editSubGoalTitle.trim()) {
        alert('세부 목표 제목을 입력해주세요.')
        return
      }

      await updateGoal(editingSubGoal.id, { title: editSubGoalTitle })

      // Reload current chart
      const updatedChart = await getMandalaChart(currentChart.mainGoal.id)
      setCurrentChart(updatedChart)

      setEditingSubGoal(null)
      setEditSubGoalTitle('')
      alert('세부 목표가 수정되었습니다!')
    } catch (error) {
      console.error('세부 목표 수정 실패:', error)
      alert('세부 목표 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteSubGoal = async (subGoalId) => {
    if (!confirm('이 세부 목표를 삭제하시겠습니까?')) return

    try {
      await deleteGoal(subGoalId)

      // Reload current chart
      const updatedChart = await getMandalaChart(currentChart.mainGoal.id)
      setCurrentChart(updatedChart)

      alert('세부 목표가 삭제되었습니다.')
    } catch (error) {
      console.error('세부 목표 삭제 실패:', error)
      alert('세부 목표 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCompleteSubGoal = async (subGoalId) => {
    try {
      await completeGoal(subGoalId)

      // Reload current chart
      const updatedChart = await getMandalaChart(currentChart.mainGoal.id)
      setCurrentChart(updatedChart)

      alert('세부 목표 달성! 🎉')
    } catch (error) {
      console.error('세부 목표 완료 실패:', error)
      alert('세부 목표 완료 처리 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', label: '진행중', color: 'bg-blue-600' },
      completed: { variant: 'default', label: '완료', color: 'bg-green-600' }
    }
    const config = variants[status] || variants.active
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
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

  // List View
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5" />
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
              {/* Main Goal */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  중심 목표 (가운데 칸) *
                </label>
                <Input
                  value={mainGoalTitle}
                  onChange={(e) => setMainGoalTitle(e.target.value)}
                  placeholder="예: 수학 실력 향상하기"
                  maxLength={100}
                />
              </div>

              {/* Sub Goals */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  세부 목표 (주변 8칸, 선택사항)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subGoalTitles.map((title, index) => (
                    <Input
                      key={index}
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...subGoalTitles]
                        newTitles[index] = e.target.value
                        setSubGoalTitles(newTitles)
                      }}
                      placeholder={`세부 목표 ${index + 1}`}
                      maxLength={100}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateMandalaChart}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  만다라트 생성
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false)
                    setMainGoalTitle('')
                    setSubGoalTitles(Array(8).fill(''))
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

        {/* Mandala Charts List */}
        {mandalaCharts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mandalaCharts.map((chart) => (
              <Card
                key={chart.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{chart.title}</h3>
                        {getStatusBadge(chart.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        세부 목표: {chart.subGoalCount}/8개
                      </p>
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
              <Grid3x3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>아직 만다라트 차트가 없습니다.</p>
              <p className="text-sm">위의 "새 만다라트" 버튼을 클릭하여 첫 차트를 만들어보세요!</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Chart View (9-grid)
  if (viewMode === 'chart' && currentChart) {
    const { mainGoal, subGoals } = currentChart

    // Arrange sub-goals in 3x3 grid (center is main goal)
    const grid = Array(9).fill(null)
    grid[4] = { type: 'main', goal: mainGoal } // Center

    // Fill sub-goals around center (positions: 0,1,2,3,5,6,7,8)
    const positions = [0, 1, 2, 3, 5, 6, 7, 8]
    subGoals.forEach((subGoal, index) => {
      if (index < positions.length) {
        grid[positions[index]] = { type: 'sub', goal: subGoal }
      }
    })

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5" />
                {mainGoal.title}
              </div>
              <div className="flex gap-2">
                {subGoals.length < 8 && (
                  <Button
                    onClick={handleAddSubGoal}
                    size="sm"
                    variant="outline"
                    className="text-indigo-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    세부 목표 추가
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

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
          {grid.map((cell, index) => {
            if (!cell) {
              // Empty cell
              return (
                <div
                  key={index}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                >
                  <span className="text-gray-400 text-sm">빈 칸</span>
                </div>
              )
            }

            if (cell.type === 'main') {
              // Main goal (center)
              return (
                <div
                  key={index}
                  className="aspect-square border-4 border-indigo-600 rounded-lg flex flex-col items-center justify-center bg-indigo-50 p-3"
                >
                  <div className="text-center">
                    <div className="text-xs text-indigo-600 font-semibold mb-1">중심 목표</div>
                    <div className="font-bold text-sm sm:text-base text-indigo-900 break-words">
                      {cell.goal.title}
                    </div>
                    {getStatusBadge(cell.goal.status)}
                  </div>
                </div>
              )
            }

            if (cell.type === 'sub') {
              // Sub goal
              const isEditing = editingSubGoal?.id === cell.goal.id
              const isCompleted = cell.goal.status === 'completed'

              return (
                <div
                  key={index}
                  className={`aspect-square border-2 rounded-lg flex flex-col p-2 ${
                    isCompleted
                      ? 'border-green-400 bg-green-50'
                      : 'border-purple-400 bg-purple-50'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex flex-col h-full justify-between">
                      <Input
                        value={editSubGoalTitle}
                        onChange={(e) => setEditSubGoalTitle(e.target.value)}
                        className="text-xs mb-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={handleSaveSubGoalEdit}
                          className="flex-1 h-6 text-xs"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSubGoal(null)
                            setEditSubGoalTitle('')
                          }}
                          className="flex-1 h-6 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center justify-center text-center">
                        <p className="text-xs sm:text-sm font-medium break-words">
                          {cell.goal.title}
                        </p>
                      </div>
                      <div className="flex gap-1 justify-center mt-1">
                        {!isCompleted && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSubGoal(cell.goal)}
                              className="h-6 w-6 p-0"
                              title="수정"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCompleteSubGoal(cell.goal.id)}
                              className="h-6 w-6 p-0 text-green-600"
                              title="완료"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSubGoal(cell.goal.id)}
                          className="h-6 w-6 p-0 text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {isCompleted && (
                        <div className="text-center mt-1">
                          {getStatusBadge(cell.goal.status)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            }

            return null
          })}
        </div>

        {/* Instructions */}
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-4">
            <p className="text-sm text-indigo-900">
              <strong>만다라트 차트 사용법:</strong> 중심 목표를 중심으로 8개의 세부 목표를 배치합니다.
              각 세부 목표를 하나씩 달성하면서 중심 목표에 가까워지세요!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
