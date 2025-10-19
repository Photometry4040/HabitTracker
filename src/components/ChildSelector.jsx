import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { User, Plus, Trash2, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase.js'
import { loadAllChildrenNew as loadAllChildren, loadChildWeeksNew as loadChildWeeks } from '@/lib/database-new.js'
import { deleteWeekDualWrite } from '@/lib/dual-write.js'

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
      const data = await loadAllChildren()
      setChildren(data || [])
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
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold text-sm sm:text-base">{child.child_name}</div>
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
                <div className="flex items-center gap-2">
                  {child.theme && (
                    <Badge variant="outline" className="text-xs hidden sm:block">
                      {child.theme}
                    </Badge>
                  )}
                  <div className="text-xs text-purple-600 font-medium sm:hidden">
                    주간 목표 달성
                  </div>
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