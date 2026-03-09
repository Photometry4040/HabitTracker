import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { AlertCircle, Plus, Edit2, Trash2, Check, X, Clock, Lightbulb } from 'lucide-react'
import { createWeakness, getWeaknesses, updateWeakness, deleteWeakness, resolveWeakness, checkFirstWeaknessResolved } from '@/lib/learning-mode.js'

export function WeaknessLogger({ childName }) {
  const [weaknesses, setWeaknesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWeakness, setEditingWeakness] = useState(null)
  const [showResolved, setShowResolved] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    cause_type: 'concept',
    weakness_note: '',
    self_question: '',
    emotion: 'neutral',
    emotion_note: '',
    improvement_plan: '',
    retry_scheduled_at: '',
    retry_schedule_source: 'manual'
  })

  useEffect(() => {
    loadWeaknesses()
  }, [childName, showResolved])

  const loadWeaknesses = async () => {
    try {
      setLoading(true)
      const filters = showResolved ? {} : { resolved: false }
      const data = await getWeaknesses(childName, filters)
      setWeaknesses(data)
    } catch (error) {
      console.error('약점 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWeakness = async () => {
    try {
      if (!formData.weakness_note.trim() || formData.weakness_note.length < 5) {
        alert('약점 내용을 5자 이상 입력해주세요.')
        return
      }

      const weaknessData = {
        record_date: formData.record_date,
        cause_type: formData.cause_type,
        weakness_note: formData.weakness_note,
        self_question: formData.self_question || null,
        emotion: formData.emotion,
        emotion_note: formData.emotion_note || null,
        improvement_plan: formData.improvement_plan || null,
        retry_scheduled_at: formData.retry_scheduled_at || null,
        retry_schedule_source: formData.retry_scheduled_at ? formData.retry_schedule_source : null
      }

      await createWeakness(childName, weaknessData)
      await loadWeaknesses()

      // Reset form
      resetForm()
      setShowCreateForm(false)

      alert('약점이 기록되었습니다!')
    } catch (error) {
      console.error('약점 생성 실패:', error)
      alert('약점 기록 중 오류가 발생했습니다.')
    }
  }

  const handleUpdateWeakness = async () => {
    try {
      if (!editingWeakness) return

      const updates = {
        cause_type: formData.cause_type,
        weakness_note: formData.weakness_note,
        self_question: formData.self_question || null,
        emotion: formData.emotion,
        emotion_note: formData.emotion_note || null,
        improvement_plan: formData.improvement_plan || null,
        retry_scheduled_at: formData.retry_scheduled_at || null,
        retry_schedule_source: formData.retry_scheduled_at ? formData.retry_schedule_source : null
      }

      await updateWeakness(editingWeakness.id, updates)
      await loadWeaknesses()

      setEditingWeakness(null)
      resetForm()

      alert('약점이 수정되었습니다!')
    } catch (error) {
      console.error('약점 수정 실패:', error)
      alert('약점 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteWeakness = async (weaknessId) => {
    if (!confirm('정말 이 약점 기록을 삭제하시겠습니까?')) return

    try {
      await deleteWeakness(weaknessId)
      await loadWeaknesses()
      alert('약점 기록이 삭제되었습니다.')
    } catch (error) {
      console.error('약점 삭제 실패:', error)
      alert('약점 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleResolveWeakness = async (weaknessId) => {
    const resolutionNote = prompt('해결 방법을 간단히 입력해주세요 (선택):')
    if (resolutionNote === null) return // Cancel clicked

    try {
      await resolveWeakness(weaknessId, resolutionNote)

      // Phase 5.3: Check for first weakness resolved achievement
      try {
        await checkFirstWeaknessResolved(childName)
      } catch (rewardError) {
        console.error('보상 체크 실패 (계속 진행):', rewardError)
        // Don't block the main flow if reward check fails
      }

      await loadWeaknesses()
      alert('약점이 해결되었습니다! 🎉')
    } catch (error) {
      console.error('약점 해결 실패:', error)
      alert('약점 해결 처리 중 오류가 발생했습니다.')
    }
  }

  const startEdit = (weakness) => {
    setEditingWeakness(weakness)
    setFormData({
      record_date: weakness.record_date,
      cause_type: weakness.cause_type,
      weakness_note: weakness.weakness_note,
      self_question: weakness.self_question || '',
      emotion: weakness.emotion,
      emotion_note: weakness.emotion_note || '',
      improvement_plan: weakness.improvement_plan || '',
      retry_scheduled_at: weakness.retry_scheduled_at ? weakness.retry_scheduled_at.split('T')[0] : '',
      retry_schedule_source: weakness.retry_schedule_source || 'manual'
    })
    setShowCreateForm(false)
  }

  const resetForm = () => {
    setFormData({
      record_date: new Date().toISOString().split('T')[0],
      cause_type: 'concept',
      weakness_note: '',
      self_question: '',
      emotion: 'neutral',
      emotion_note: '',
      improvement_plan: '',
      retry_scheduled_at: '',
      retry_schedule_source: 'manual'
    })
  }

  const cancelEdit = () => {
    setEditingWeakness(null)
    resetForm()
  }

  const getCauseTypeLabel = (type) => {
    const labels = {
      concept: '개념 이해 부족',
      procedure: '절차/방법 모름',
      attention: '집중력/주의분산',
      fatigue: '피로/컨디션',
      tool: '도구/환경 문제',
      time: '시간 부족',
      other: '기타'
    }
    return labels[type] || type
  }

  const getEmotionLabel = (emotion) => {
    const labels = {
      joy: '기쁨',
      neutral: '평온',
      frustration: '좌절',
      anxiety: '불안',
      boredom: '지루함',
      anger: '화남',
      confidence: '자신감'
    }
    return labels[emotion] || emotion
  }

  const getEmotionColor = (emotion) => {
    const colors = {
      joy: 'text-yellow-600',
      neutral: 'text-gray-600',
      frustration: 'text-orange-600',
      anxiety: 'text-purple-600',
      boredom: 'text-blue-400',
      anger: 'text-red-600',
      confidence: 'text-green-600'
    }
    return colors[emotion] || 'text-gray-600'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">약점 기록 로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-orange-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {childName}의 약점 관리
            </div>
            {!showCreateForm && !editingWeakness && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setShowResolved(!showResolved)}
                  variant={showResolved ? "default" : "outline"}
                  size="sm"
                  className={showResolved ? "bg-gray-600 hover:bg-gray-700" : ""}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {showResolved ? '미해결만' : '해결된 것 보기'}
                </Button>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새 약점 기록
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Create/Edit Form */}
      {(showCreateForm || editingWeakness) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingWeakness ? '약점 기록 수정' : '새 약점 기록하기'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div>
              <Label htmlFor="record_date">날짜</Label>
              <Input
                id="record_date"
                type="date"
                value={formData.record_date}
                onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
              />
            </div>

            {/* Cause Type */}
            <div>
              <Label htmlFor="cause_type">원인 분류 *</Label>
              <select
                id="cause_type"
                value={formData.cause_type}
                onChange={(e) => setFormData({ ...formData, cause_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="concept">개념 이해 부족</option>
                <option value="procedure">절차/방법 모름</option>
                <option value="attention">집중력/주의분산</option>
                <option value="fatigue">피로/컨디션</option>
                <option value="tool">도구/환경 문제</option>
                <option value="time">시간 부족</option>
                <option value="other">기타</option>
              </select>
            </div>

            {/* Weakness Note */}
            <div>
              <Label htmlFor="weakness_note">약점 내용 * (최소 5자)</Label>
              <Textarea
                id="weakness_note"
                value={formData.weakness_note}
                onChange={(e) => setFormData({ ...formData, weakness_note: e.target.value })}
                placeholder="어떤 점이 어려웠나요? 구체적으로 적어보세요."
                rows={3}
              />
            </div>

            {/* Self Question */}
            <div>
              <Label htmlFor="self_question">스스로 질문 (선택)</Label>
              <Input
                id="self_question"
                value={formData.self_question}
                onChange={(e) => setFormData({ ...formData, self_question: e.target.value })}
                placeholder="예: 이 조건은 어떻게 쓰는가?"
              />
            </div>

            {/* Emotion */}
            <div>
              <Label htmlFor="emotion">감정 상태</Label>
              <select
                id="emotion"
                value={formData.emotion}
                onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="neutral">평온</option>
                <option value="joy">기쁨</option>
                <option value="confidence">자신감</option>
                <option value="frustration">좌절</option>
                <option value="anxiety">불안</option>
                <option value="boredom">지루함</option>
                <option value="anger">화남</option>
              </select>
            </div>

            {/* Emotion Note */}
            <div>
              <Label htmlFor="emotion_note">감정 메모 (선택)</Label>
              <Textarea
                id="emotion_note"
                value={formData.emotion_note}
                onChange={(e) => setFormData({ ...formData, emotion_note: e.target.value })}
                placeholder="그때 어떤 느낌이 들었나요?"
                rows={2}
              />
            </div>

            {/* Improvement Plan */}
            <div>
              <Label htmlFor="improvement_plan">보완 계획 (선택)</Label>
              <Textarea
                id="improvement_plan"
                value={formData.improvement_plan}
                onChange={(e) => setFormData({ ...formData, improvement_plan: e.target.value })}
                placeholder="어떻게 개선할 수 있을까요? If-Then 형식으로 적어보세요."
                rows={2}
              />
            </div>

            {/* Retry Schedule */}
            <div>
              <Label htmlFor="retry_scheduled_at">재시도 날짜 (선택)</Label>
              <Input
                id="retry_scheduled_at"
                type="date"
                value={formData.retry_scheduled_at}
                onChange={(e) => setFormData({ ...formData, retry_scheduled_at: e.target.value })}
                min={formData.record_date}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={editingWeakness ? handleUpdateWeakness : handleCreateWeakness}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Check className="w-4 h-4 mr-1" />
                {editingWeakness ? '수정 완료' : '기록 저장'}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  cancelEdit()
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

      {/* Weaknesses List */}
      {weaknesses.length > 0 ? (
        <div className="space-y-3">
          {weaknesses.map((weakness) => (
            <Card
              key={weakness.id}
              className={`hover:shadow-md transition-shadow ${
                weakness.resolved ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getCauseTypeLabel(weakness.cause_type)}
                      </Badge>
                      <span className={`text-xs ${getEmotionColor(weakness.emotion)}`}>
                        {getEmotionLabel(weakness.emotion)}
                      </span>
                      {weakness.resolved && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          해결됨
                        </Badge>
                      )}
                    </div>

                    {/* Weakness Note */}
                    <p className="text-sm text-gray-800 mb-2 font-medium">{weakness.weakness_note}</p>

                    {/* Self Question */}
                    {weakness.self_question && (
                      <div className="flex items-start gap-1 mb-2">
                        <Lightbulb className="w-3 h-3 text-yellow-600 mt-0.5" />
                        <p className="text-xs text-gray-600 italic">{weakness.self_question}</p>
                      </div>
                    )}

                    {/* Improvement Plan */}
                    {weakness.improvement_plan && (
                      <p className="text-xs text-blue-700 mb-2">
                        <strong>계획:</strong> {weakness.improvement_plan}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <div>
                        날짜: {new Date(weakness.record_date).toLocaleDateString('ko-KR')}
                      </div>

                      {weakness.retry_scheduled_at && !weakness.resolved && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <Clock className="w-3 h-3" />
                          재시도: {new Date(weakness.retry_scheduled_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}

                      {weakness.resolved_at && (
                        <div className="text-green-600">
                          해결일: {new Date(weakness.resolved_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </div>

                    {/* Resolution Note */}
                    {weakness.resolved && weakness.resolution_note && (
                      <p className="text-xs text-green-700 mt-2">
                        <strong>해결 방법:</strong> {weakness.resolution_note}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    {!weakness.resolved && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(weakness)}
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleResolveWeakness(weakness.id)}
                          title="해결 완료"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteWeakness(weakness.id)}
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>아직 기록된 약점이 없습니다.</p>
            <p className="text-sm">위의 &ldquo;새 약점 기록&rdquo; 버튼을 클릭하여 첫 기록을 남겨보세요!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
