import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { User, Plus, Trash2, Calendar, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase.js'
import { loadAllChildrenNew as loadAllChildren, loadChildWeeksNew as loadChildWeeks } from '@/lib/database-new.js'
import { deleteWeekDualWrite } from '@/lib/dual-write.js'
import { toggleLearningMode } from '@/lib/learning-mode.js'

export function ChildSelector({ onChildSelect, onNewChild }) {
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [newChildName, setNewChildName] = useState('')

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    try {
      setLoading(true)
      // Load children with learning mode status
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data: childrenData } = await supabase
        .from('children')
        .select('id, name, theme, learning_mode_enabled, age_group')
        .eq('user_id', user.id)
        .order('name')

      // Load week ranges for each child
      const childrenWithWeeks = await Promise.all(
        (childrenData || []).map(async (child) => {
          const weeks = await loadChildWeeks(child.name)
          return {
            child_name: child.name,
            theme: child.theme,
            learning_mode_enabled: child.learning_mode_enabled || false,
            age_group: child.age_group,
            first_week: weeks && weeks.length > 0 ? weeks[0].week_period : null,
            last_week: weeks && weeks.length > 0 ? weeks[weeks.length - 1].week_period : null
          }
        })
      )

      setChildren(childrenWithWeeks)
    } catch (error) {
      console.error('아이 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChild = async (childName) => {
    if (!confirm(`${childName}의 모든 데이터를 삭제하시겠습니까?`)) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('인증되지 않은 사용자입니다.')
      }

      // Find child
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', childName)
        .maybeSingle()

      if (childError || !child) {
        alert('아이를 찾을 수 없습니다.')
        return
      }

      // Load all weeks for this child
      const weeks = await loadChildWeeks(childName)

      if (!weeks || weeks.length === 0) {
        // 아이는 있지만 weeks가 없으면 아이만 삭제
        console.log(`No weeks found for ${childName}, deleting child only...`)

        const { error: deleteError } = await supabase
          .from('children')
          .delete()
          .eq('id', child.id)

        if (deleteError) {
          throw deleteError
        }

        console.log(`Successfully deleted child: ${childName}`)
        await loadChildren()
        alert('아이가 삭제되었습니다.')
        return
      }

      // Delete all habit_records -> habits -> weeks -> child (in reverse order)
      // Filter out weeks without valid IDs (from mock/trend data)
      const validWeeks = weeks.filter(w => w.id && w.id !== null && w.id !== 'undefined');
      console.log(`Deleting ${validWeeks.length} weeks for ${childName}... (${weeks.length - validWeeks.length} invalid entries skipped)`)

      for (const week of validWeeks) {
        // Delete habit_records first
        const { data: habits } = await supabase
          .from('habits')
          .select('id')
          .eq('week_id', week.id)

        if (habits && habits.length > 0) {
          const habitIds = habits.map(h => h.id)
          await supabase
            .from('habit_records')
            .delete()
            .in('habit_id', habitIds)

          // Delete habits
          await supabase
            .from('habits')
            .delete()
            .in('id', habitIds)
        }

        // Delete week
        await supabase
          .from('weeks')
          .delete()
          .eq('id', week.id)
      }

      // Delete child
      const { error: finalError } = await supabase
        .from('children')
        .delete()
        .eq('id', child.id)

      if (finalError) {
        throw finalError
      }

      console.log(`Successfully deleted all data for ${childName}`)
      await loadChildren()
      alert('아이와 모든 데이터가 삭제되었습니다.')
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제 중 오류가 발생했습니다: ' + error.message)
    }
  }

  const handleNewChild = () => {
    if (!newChildName.trim()) {
      alert('아이 이름을 입력해주세요.')
      return
    }
    onNewChild(newChildName.trim())
    setNewChildName('')
  }

  const handleToggleLearningMode = async (childName, currentStatus) => {
    try {
      const newStatus = !currentStatus
      await toggleLearningMode(childName, newStatus)

      // Update local state
      setChildren(prevChildren =>
        prevChildren.map(child =>
          child.child_name === childName
            ? { ...child, learning_mode_enabled: newStatus }
            : child
        )
      )

      console.log(`✅ Learning mode ${newStatus ? 'enabled' : 'disabled'} for ${childName}`)
    } catch (error) {
      console.error('학습 모드 토글 실패:', error)
      alert('학습 모드 설정 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
          <User />
          아이 선택하기
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 새 아이 추가 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="newChildName" className="text-sm sm:text-base">새로운 아이 이름</Label>
            <Input
              id="newChildName"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="아이 이름을 입력하세요"
              onKeyPress={(e) => e.key === 'Enter' && handleNewChild()}
              className="text-sm sm:text-base"
            />
          </div>
          <Button 
            onClick={handleNewChild}
            className="bg-green-600 hover:bg-green-700 mt-6 sm:mt-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>

        {/* 기존 아이 목록 */}
        {children.length > 0 ? (
          <div className="space-y-2">
            <Label>기존 아이들</Label>
            {children.map((child, index) => (
              <div 
                key={`${child.child_name}-${index}`}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-gray-50 gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <User className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      {child.child_name}
                      {child.learning_mode_enabled && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          학습
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {child.first_week && child.last_week
                        ? child.first_week === child.last_week
                          ? child.first_week
                          : `${child.first_week.split(' ~ ')[0]} ~ ${child.last_week.split(' ~ ')[1]}`
                        : '기간 미설정'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                  {/* Learning Mode Toggle */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md w-full sm:w-auto">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm text-gray-700 flex-1 sm:flex-none">학습 모드</span>
                    <Switch
                      checked={child.learning_mode_enabled}
                      onCheckedChange={() => handleToggleLearningMode(child.child_name, child.learning_mode_enabled)}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    {child.theme && (
                      <Badge variant="outline" className="text-xs hidden sm:block">
                        {child.theme}
                      </Badge>
                    )}
                    <div className="flex gap-1 sm:gap-2">
                      <Button
                        onClick={() => onChildSelect(child.child_name)}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">선택</span>
                        <span className="sm:hidden">선택</span>
                      </Button>
                      <Button
                        onClick={() => handleDeleteChild(child.child_name)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            아직 등록된 아이가 없습니다.
            <br />
            위에서 새로운 아이를 추가해보세요!
          </div>
        )}
      </CardContent>
    </Card>
  )
} 