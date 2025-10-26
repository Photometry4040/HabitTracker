import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, Star, Trophy, Target, Plus, Trash2, Users, Save, Cloud, BarChart3, LogOut, Shield, BookTemplate, AlertCircle, Grid3x3 } from 'lucide-react'
import { ChildSelector } from '@/components/ChildSelector.jsx'
import { Dashboard } from '@/components/Dashboard.jsx'
import DashboardHub from '@/components/Dashboard/DashboardHub'
import { Auth } from '@/components/Auth.jsx'
import { TemplateManager } from '@/components/TemplateManager.jsx'
import { GoalsManager } from '@/components/Goals/GoalsManager.jsx'
import { RewardNotificationProvider } from '@/components/Rewards/RewardNotificationProvider.jsx'
import { WeaknessLogger } from '@/components/Weaknesses/WeaknessLogger.jsx'
import { MandalaChart } from '@/components/Mandala/MandalaChart.jsx'
import { loadWeekDataNew as loadChildData, loadAllChildrenNew as loadAllChildren, loadChildWeeksNew as loadChildWeeks } from '@/lib/database-new.js'
import { createWeekDualWrite, updateHabitRecordDualWrite } from '@/lib/dual-write.js'
import { getCurrentUser, signOut, onAuthStateChange } from '@/lib/auth.js'
import { notifyHabitCheck, notifyWeekSave, notifyWeekComplete, calculateWeekStats } from '@/lib/discord.js'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState('')
  const [showChildSelector, setShowChildSelector] = useState(true)
  const [childName, setChildName] = useState('')
  const [weekPeriod, setWeekPeriod] = useState('')
  const [theme, setTheme] = useState('')
  const [weekStartDate, setWeekStartDate] = useState('')
  const [habits, setHabits] = useState([
    { id: 1, name: '아침 (6-9시) 스스로 일어나기', times: Array(7).fill('') },
    { id: 2, name: '오전 (9-12시) 집중해서 공부/놀이', times: Array(7).fill('') },
    { id: 3, name: '점심 (12-1시) 편식 없이 골고루 먹기', times: Array(7).fill('') },
    { id: 4, name: '오후 (1-5시) 스스로 계획한 일 하기', times: Array(7).fill('') },
    { id: 5, name: '저녁 (6-9시) 정리 정돈 및 내일 준비', times: Array(7).fill('') }
  ])
  const [reflection, setReflection] = useState({
    bestDay: '',
    easiestHabit: '',
    nextWeekGoal: ''
  })
  const [reward, setReward] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingSaveData, setPendingSaveData] = useState(null)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [showWeaknesses, setShowWeaknesses] = useState(false)
  const [showMandala, setShowMandala] = useState(false)

  // 데이터 초기화 함수
  const resetData = () => {
    setWeekPeriod('')
    setWeekStartDate('')
    setTheme('')
    setHabits([
      { id: 1, name: '아침 (6-9시) 스스로 일어나기', times: Array(7).fill('') },
      { id: 2, name: '오전 (9-12시) 집중해서 공부/놀이', times: Array(7).fill('') },
      { id: 3, name: '점심 (12-1시) 편식 없이 골고루 먹기', times: Array(7).fill('') },
      { id: 4, name: '오후 (1-5시) 스스로 계획한 일 하기', times: Array(7).fill('') },
      { id: 5, name: '저녁 (6-9시) 정리 정돈 및 내일 준비', times: Array(7).fill('') }
    ])
    setReflection({
      bestDay: '',
      easiestHabit: '',
      nextWeekGoal: ''
    })
    setReward('')
  }

  // weekStartDate를 유지하면서 다른 데이터만 초기화
  const resetDataKeepDate = () => {
    setTheme('')
    setHabits([
      { id: 1, name: '아침 (6-9시) 스스로 일어나기', times: Array(7).fill('') },
      { id: 2, name: '오전 (9-12시) 집중해서 공부/놀이', times: Array(7).fill('') },
      { id: 3, name: '점심 (12-1시) 편식 없이 골고루 먹기', times: Array(7).fill('') },
      { id: 4, name: '오후 (1-5시) 스스로 계획한 일 하기', times: Array(7).fill('') },
      { id: 5, name: '저녁 (6-9시) 정리 정돈 및 내일 준비', times: Array(7).fill('') }
    ])
    setReflection({
      bestDay: '',
      easiestHabit: '',
      nextWeekGoal: ''
    })
    setReward('')
  }

  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
  const colors = [
    { name: '녹색', value: 'green', emoji: '😊', description: '목표 달성!' },
    { name: '노랑', value: 'yellow', emoji: '🤔', description: '조금 아쉽지만 잘했어!' },
    { name: '빨강', value: 'red', emoji: '😔', description: '괜찮아, 내일 다시 해보자!' }
  ]

  // 아이 선택 처리
  const handleChildSelect = async (childName) => {
    setSelectedChild(childName)
    setChildName(childName)
    setShowChildSelector(false)
    resetData() // 아이 변경 시 데이터 초기화
    
    // 아이 선택 시 해당 아이의 최신 데이터 로드 (선택사항)
    // try {
    //   const data = await loadChildData(childName, '')
    //   if (data) {
    //     setWeekPeriod(data.week_period || '')
    //     setTheme(data.theme || '')
    //     setHabits(data.habits || habits)
    //     setReflection(data.reflection || reflection)
    //     setReward(data.reward || '')
    //     
    //     if (data.week_start_date) {
    //       setWeekStartDate(data.week_start_date)
    //     }
    //   }
    // } catch (error) {
    //   console.error('데이터 로드 실패:', error)
    // }
  }

  // 주간별 데이터 로드
  const loadWeekData = async (childName, weekPeriod) => {
    if (!childName || !weekPeriod) return

    try {
      // Convert weekPeriod to weekStartDate for new schema
      const match = weekPeriod.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/)
      if (!match) {
        console.error('Invalid weekPeriod format:', weekPeriod)
        return
      }
      const year = match[1]
      const month = match[2].padStart(2, '0')
      const day = match[3].padStart(2, '0')
      const weekStartDateISO = `${year}-${month}-${day}`

      const data = await loadChildData(childName, weekStartDateISO)
      if (data) {
        // 대시보드 모드가 아닐 때만 현재 입력 중인 데이터 확인
        if (!showDashboard) {
          const hasCurrentData = habits.some(habit => habit.times.some(time => time !== '')) ||
                                theme || reflection.bestDay || reflection.easiestHabit || 
                                reflection.nextWeekGoal || reward
          
          if (hasCurrentData) {
            const confirmLoad = window.confirm(
              '현재 입력 중인 데이터가 있습니다. 기존 데이터로 덮어쓰시겠습니까?'
            )
            if (!confirmLoad) return
          }
        }
        
        // 데이터 로드 (새로고침 없이)
        setTheme(data.theme || '')
        setHabits(data.habits || habits)
        setReflection(data.reflection || reflection)
        setReward(data.reward || '')
        
        // 주간 시작일 설정 (새 필드 우선, 기존 데이터에서 추출은 백업)
        if (data.week_start_date) {
          setWeekStartDate(data.week_start_date)
        } else if (data.week_period) {
          const match = data.week_period.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/)
          if (match) {
            const year = match[1]
            const month = match[2].padStart(2, '0')
            const day = match[3].padStart(2, '0')
            setWeekStartDate(`${year}-${month}-${day}`)
          }
        }
        
        // 성공 메시지
        console.log('주간 데이터를 성공적으로 불러왔습니다!')
      } else {
        // 데이터가 없을 경우 초기화 (날짜는 유지)
        console.log('해당 주간에 저장된 데이터가 없습니다. 초기화합니다.')
        resetDataKeepDate()
        
        // 대시보드 모드가 아닐 때만 알림 표시
        if (!showDashboard) {
          alert('해당 주간에 저장된 데이터가 없습니다. 새로운 데이터를 입력해주세요.')
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      // 오류 발생 시에도 초기화 (날짜는 유지)
      resetDataKeepDate()
      
      // 대시보드 모드가 아닐 때만 알림 표시
      if (!showDashboard) {
        alert('데이터 로드 중 오류가 발생했습니다. 새로운 데이터를 입력해주세요.')
      }
    }
  }

  // 새 아이 추가 처리
  const handleNewChild = (childName) => {
    setSelectedChild(childName)
    setChildName(childName)
    setShowChildSelector(false)
    resetData() // 데이터 초기화
  }

  // 템플릿 적용 핸들러
  const handleApplyTemplate = (templateHabits) => {
    if (!templateHabits || templateHabits.length === 0) {
      alert('템플릿에 습관이 없습니다')
      return
    }

    // 템플릿의 습관을 현재 습관 리스트에 적용
    const newHabits = templateHabits.map((habit, index) => ({
      id: index + 1,
      name: habit.name,
      times: Array(7).fill('') // 빈 상태로 시작
    }))

    setHabits(newHabits)
    setShowTemplateManager(false)

    alert(`템플릿이 적용되었습니다! ${templateHabits.length}개의 습관이 설정되었습니다.`)
  }

  // 데이터 저장 (Supabase)
  const saveData = async (forceSave = false) => {
    if (!selectedChild) return
    
    try {
      setSaving(true)
      
      // forceSave가 true이고 pendingSaveData가 null이면 현재 상태 사용
      const data = forceSave && pendingSaveData ? pendingSaveData : {
        weekPeriod: weekPeriod || '',
        weekStartDate: weekStartDate || '',
        theme: theme || '',
        habits: habits || [],
        reflection: reflection || {},
        reward: reward || ''
      }
      
      // 데이터 유효성 검사
      if (!data.weekPeriod && !data.weekStartDate) {
        console.log('주간 기간이 설정되지 않아 저장을 건너뜁니다.')
        return
      }
      
      // 기존 데이터 확인
      // Convert weekPeriod to weekStartDate for new schema
      let weekStartDateForCheck = data.weekStartDate
      if (!weekStartDateForCheck && data.weekPeriod) {
        const match = data.weekPeriod.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/)
        if (match) {
          const year = match[1]
          const month = match[2].padStart(2, '0')
          const day = match[3].padStart(2, '0')
          weekStartDateForCheck = `${year}-${month}-${day}`
        }
      }
      const existingData = weekStartDateForCheck ? await loadChildData(selectedChild, weekStartDateForCheck) : null
      if (existingData && !forceSave) {
        // 기존 데이터가 있으면 덮어쓰기 확인
        setPendingSaveData(data)
        setShowOverwriteConfirm(true)
        return
      }
      
      // Use Edge Function for dual-write (Phase 2)
      const result = await createWeekDualWrite(
        selectedChild,
        weekStartDateForCheck,
        data.habits,
        data.theme,
        data.reflection,
        data.reward
      )

      setShowOverwriteConfirm(false)
      setPendingSaveData(null)

      // 저장 성공 피드백 (부드러운 방식)
      console.log('데이터가 성공적으로 저장되었습니다! (Dual-write)', result)

      // Discord 알림 전송 (비동기, 실패해도 무시)
      // 1. 주간 저장 알림
      notifyWeekSave(selectedChild, data.weekPeriod, data.habits.length).catch(err => {
        console.log('Discord week save notification skipped:', err)
      })

      // 2. 주간 목표 달성 확인 (성공률 80% 이상)
      const stats = calculateWeekStats(data.habits)
      if (stats.successRate >= 80) {
        notifyWeekComplete(selectedChild, data.weekPeriod, stats).catch(err => {
          console.log('Discord week complete notification skipped:', err)
        })
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 인증 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        // 세션이 없는 경우는 정상적인 상황
        if (!error.message.includes('Auth session missing')) {
          console.error('사용자 확인 오류:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    // 환경변수 확인
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ 환경변수가 설정되지 않았습니다!')
      setLoading(false)
      return
    }

    checkUser()

    // 인증 상태 변경 감지
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
      resetData()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  // 인증 성공 처리
  const handleAuthSuccess = () => {
    // 인증 성공 시 추가 처리
  }

  // 주간 기간 자동 계산 및 데이터 자동 로드
  useEffect(() => {
    if (weekStartDate && selectedChild) {
      const startDate = new Date(weekStartDate)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      
      const formatDate = (date) => {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
      }
      
      const newWeekPeriod = `${formatDate(startDate)} ~ ${formatDate(endDate)}`
      setWeekPeriod(newWeekPeriod)
      
      // 주간 시작일이 변경되면 자동으로 해당 주간 데이터 로드
      loadWeekData(selectedChild, newWeekPeriod)
    }
  }, [weekStartDate, selectedChild])

  // 자동 저장 제거 - 수동 저장 방식으로 변경

  const updateHabitColor = async (habitId, dayIndex, color) => {
    // Find current habit to check current color
    const habit = habits.find(h => h.id === habitId)
    if (!habit) {
      console.error('Habit not found:', habitId)
      return
    }

    const currentColor = habit.times[dayIndex]

    // Toggle: If clicking the same color, clear it (set to empty string)
    const newColor = currentColor === color ? '' : color

    // Optimistic UI update
    setHabits(prev => prev.map(h =>
      h.id === habitId
        ? { ...h, times: h.times.map((time, index) =>
            index === dayIndex ? newColor : time
          )}
        : h
    ))

    // Persist to database via Edge Function (Phase 2)
    if (!selectedChild || !weekStartDate) {
      console.warn('Cannot save: missing selectedChild or weekStartDate')
      return
    }

    try {
      // Only call Edge Function if newColor is not empty
      // Empty string means "delete the record" - skip for now
      if (newColor === '') {
        console.log(`Habit record cleared (UI only): ${habit.name} day ${dayIndex}`)
        // TODO: Implement delete operation in Edge Function
        return
      }

      // Call Edge Function for dual-write
      await updateHabitRecordDualWrite(
        selectedChild,
        weekStartDate,
        habit.name,
        dayIndex,
        newColor
      )

      console.log(`Habit record updated via Edge Function: ${habit.name} day ${dayIndex} = ${newColor}`)

      // Discord 알림 전송 (비동기, 실패해도 무시)
      const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
      const dayOfWeek = dayNames[dayIndex] || `${dayIndex + 1}일차`
      notifyHabitCheck(selectedChild, habit.name, newColor, dayOfWeek).catch(err => {
        console.log('Discord notification skipped:', err)
      })
    } catch (error) {
      console.error('Failed to update habit record:', error)
      // Revert UI change on error
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, times: h.times.map((time, index) =>
              index === dayIndex ? currentColor : time
            )}
          : h
      ))
      alert('습관 기록 저장 중 오류가 발생했습니다.')
    }
  }

  const addHabit = () => {
    const newHabit = {
      id: Date.now(),
      name: '새로운 습관을 입력하세요',
      times: Array(7).fill('')
    }
    setHabits(prev => [...prev, newHabit])
  }

  const removeHabit = (habitId) => {
    setHabits(prev => prev.filter(habit => habit.id !== habitId))
  }

  const updateHabitName = (habitId, newName) => {
    setHabits(prev => prev.map(habit => 
      habit.id === habitId ? { ...habit, name: newName } : habit
    ))
  }

  const getColorClass = (color) => {
    switch(color) {
      case 'green': return 'bg-green-500 hover:bg-green-600'
      case 'yellow': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'red': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-gray-200 hover:bg-gray-300'
    }
  }

  const getWeeklyScore = (habit) => {
    return habit.times.filter(time => time === 'green').length
  }

  const getTotalScore = () => {
    return habits.reduce((total, habit) => total + getWeeklyScore(habit), 0)
  }

  const getMaxScore = () => {
    return habits.length * 7
  }

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 환경변수 확인
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  // URL 유효성 검증
  let isValidUrl = false
  try {
    if (supabaseUrl) {
      new URL(supabaseUrl)
      isValidUrl = true
    }
  } catch (error) {
    console.error('❌ 잘못된 Supabase URL:', supabaseUrl)
  }
  
  if (!supabaseUrl || !supabaseKey || !isValidUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">환경변수 설정 오류</h1>
          <p className="text-gray-600 mb-4">
            Supabase 환경변수가 올바르게 설정되지 않았습니다.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <p><strong>현재 상태:</strong></p>
            <p>• URL: {supabaseUrl || '설정되지 않음'}</p>
            <p>• URL 유효성: {isValidUrl ? '✅' : '❌'}</p>
            <p>• Key: {supabaseKey ? '설정됨' : '설정되지 않음'}</p>
            <p><strong>필요한 환경변수:</strong></p>
            <p>• VITE_SUPABASE_URL (올바른 URL 형식)</p>
            <p>• VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            Netlify 대시보드에서 환경변수를 다시 확인해주세요.
          </p>
        </div>
      </div>
    )
  }

  // 인증되지 않은 사용자
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <RewardNotificationProvider childName={selectedChild}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* 로그아웃 버튼 */}
          <div className="flex justify-end no-print">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>

          {/* 아이 선택 화면 */}
          {showChildSelector ? (
            <ChildSelector
              onChildSelect={handleChildSelect}
            onNewChild={handleNewChild}
          />
        ) : (
          <>
            {/* 헤더 */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Button
                    onClick={() => {
                      setShowChildSelector(true)
                      resetData() // 아이 변경 시 데이터 초기화
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">아이 변경</span>
                    <span className="sm:hidden">변경</span>
                  </Button>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-purple-800 flex items-center justify-center gap-2 text-center">
                    <Star className="text-yellow-500 hidden sm:block" />
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                      <span>주간 습관 성장 챌린지</span>
                      <span className="text-sm md:text-base text-purple-600 font-medium">(주간 목표 달성)</span>
                    </div>
                    <Star className="text-yellow-500 hidden sm:block" />
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-center gap-2 no-print">
                    {saving && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Cloud className="w-4 h-4 animate-pulse" />
                        <span className="hidden sm:inline">저장 중...</span>
                        <span className="sm:hidden">저장중</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowTemplateManager(!showTemplateManager)}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <BookTemplate className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">템플릿</span>
                        <span className="sm:hidden">템플릿</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowGoals(!showGoals)
                          setShowDashboard(false)
                          setShowWeaknesses(false)
                          setShowMandala(false)
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Target className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{showGoals ? '습관 추적' : '목표 관리'}</span>
                        <span className="sm:hidden">{showGoals ? '추적' : '목표'}</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowWeaknesses(!showWeaknesses)
                          setShowDashboard(false)
                          setShowGoals(false)
                          setShowMandala(false)
                        }}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <AlertCircle className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{showWeaknesses ? '습관 추적' : '약점 관리'}</span>
                        <span className="sm:hidden">{showWeaknesses ? '추적' : '약점'}</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowMandala(!showMandala)
                          setShowDashboard(false)
                          setShowGoals(false)
                          setShowWeaknesses(false)
                        }}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Grid3x3 className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{showMandala ? '습관 추적' : '만다라트'}</span>
                        <span className="sm:hidden">{showMandala ? '추적' : '만다'}</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDashboard(!showDashboard)
                          setShowGoals(false)
                          setShowWeaknesses(false)
                          setShowMandala(false)
                        }}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <BarChart3 className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{showDashboard ? '습관 추적' : '대시보드'}</span>
                        <span className="sm:hidden">{showDashboard ? '추적' : '보드'}</span>
                      </Button>
                      <Button
                        onClick={() => saveData(false)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">저장</span>
                        <span className="sm:hidden">저장</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="childName" className="text-sm sm:text-base">아이 이름</Label>
                    <Input
                      id="childName"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weekStartDate" className="text-sm sm:text-base">주간 시작일</Label>
                    <Input
                      id="weekStartDate"
                      type="date"
                      value={weekStartDate}
                      onChange={(e) => setWeekStartDate(e.target.value)}
                      className="cursor-pointer text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weekPeriod" className="text-sm sm:text-base">주간 기간</Label>
                    <Input
                      id="weekPeriod"
                      value={weekPeriod}
                      readOnly
                      className="bg-gray-50 cursor-default text-sm sm:text-base"
                      placeholder="시작일을 선택하면 자동으로 계산됩니다"
                    />
                  </div>
                  <div>
                    <Label htmlFor="theme" className="text-sm sm:text-base">이번 주 테마</Label>
                    <select
                      id="theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">테마를 선택하세요</option>
                      <option value="시간대별 색상 챌린지">시간대별 색상 챌린지</option>
                      <option value="매일매일 습관 형성">매일매일 습관 형성</option>
                      <option value="주간 목표 달성">주간 목표 달성</option>
                      <option value="성장하는 나">성장하는 나</option>
                      <option value="즐거운 습관 만들기">즐거운 습관 만들기</option>
                      <option value="꾸준함의 힘">꾸준함의 힘</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 템플릿 관리자, 대시보드 또는 습관 추적 */}
            {showTemplateManager ? (
              <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
                <TemplateManager
                  onApplyTemplate={handleApplyTemplate}
                  currentHabits={habits}
                  childName={childName}
                  onClose={() => setShowTemplateManager(false)}
                />
              </div>
            ) : showGoals ? (
              <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
                <GoalsManager childName={selectedChild} />
              </div>
            ) : showWeaknesses ? (
              <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
                <WeaknessLogger childName={selectedChild} />
              </div>
            ) : showMandala ? (
              <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
                <MandalaChart childName={selectedChild} />
              </div>
            ) : showDashboard ? (
              <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6">
                <DashboardHub />
              </div>
            ) : (
              <>
                {/* 색상 코드 */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
                      🎨 색상 코드
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {colors.map((color) => (
                        <div key={color.value} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50">
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${getColorClass(color.value)}`}></div>
                          <span className="text-xl sm:text-2xl">{color.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm sm:text-base">{color.name}</div>
                            <div className="text-xs sm:text-sm text-gray-600">{color.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 습관 추적 테이블 */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
                      <Target />
                      습관 추적표
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                      <Badge variant="outline" className="text-base sm:text-lg px-3 py-1">
                        총점: {getTotalScore()} / {getMaxScore()}
                      </Badge>
                      <Button onClick={addHabit} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">습관 추가</span>
                        <span className="sm:hidden">추가</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 모바일용 카드 레이아웃 */}
                    <div className="block md:hidden space-y-4">
                      {habits.map((habit) => (
                        <div key={habit.id} className="border rounded-lg p-4 bg-white mobile-card-spacing">
                          <div className="mb-3">
                            <Input
                              value={habit.name}
                              onChange={(e) => updateHabitName(habit.id, e.target.value)}
                              className="border-none bg-transparent font-medium text-sm"
                              placeholder="습관 이름을 입력하세요"
                            />
                          </div>
                          <div className="space-y-2">
                            {days.map((day, dayIndex) => (
                              <div key={dayIndex} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 min-w-[60px]">{day}</span>
                                <div className="flex gap-1">
                                  {colors.map((color) => (
                                    <button
                                      key={color.value}
                                      onClick={() => updateHabitColor(habit.id, dayIndex, color.value)}
                                      className={`w-6 h-6 rounded-full transition-all mobile-touch-target ${
                                        habit.times[dayIndex] === color.value 
                                          ? `${getColorClass(color.value)} traffic-light-border border-gray-800 scale-110` 
                                          : `${getColorClass(color.value)} border-2 border-gray-300 opacity-50 hover:opacity-100`
                                      }`}
                                      title={color.description}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"}>
                              {getWeeklyScore(habit)} / 7
                            </Badge>
                            <Button
                              onClick={() => removeHabit(habit.id)}
                              size="sm"
                              variant="destructive"
                              disabled={habits.length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 데스크톱용 테이블 레이아웃 */}
                    <div className="hidden md:block responsive-table">
                      <table className="desktop-table-responsive border-collapse">
                        <thead>
                          <tr>
                            <th className="border p-3 bg-purple-100 text-left habit-name-cell">시간대 / 습관</th>
                            {days.map((day) => (
                              <th key={day} className="border p-3 bg-purple-100 text-center day-column">{day}</th>
                            ))}
                            <th className="border p-3 bg-purple-100 text-center weekly-total-column">주간 합계</th>
                            <th className="border p-3 bg-purple-100 text-center delete-column">삭제</th>
                          </tr>
                        </thead>
                        <tbody>
                          {habits.map((habit) => (
                            <tr key={habit.id}>
                              <td className="border p-2 habit-name-cell">
                                <Textarea
                                  value={habit.name}
                                  onChange={(e) => updateHabitName(habit.id, e.target.value)}
                                  className="border-none bg-transparent font-medium text-base resize-none min-h-[60px] max-h-[80px]"
                                  placeholder="습관 이름을 입력하세요"
                                  rows={2}
                                />
                              </td>
                              {habit.times.map((time, dayIndex) => (
                                <td key={dayIndex} className="border p-2 text-center day-column">
                                  <div className="traffic-light-container">
                                    {colors.map((color) => (
                                      <button
                                        key={color.value}
                                        onClick={() => updateHabitColor(habit.id, dayIndex, color.value)}
                                        className={`rounded-full transition-all mobile-touch-target desktop-traffic-light ${
                                          time === color.value 
                                            ? `${getColorClass(color.value)} traffic-light-border border-gray-800 scale-110` 
                                            : `${getColorClass(color.value)} border-2 border-gray-300 opacity-50 hover:opacity-100`
                                        }`}
                                        title={color.description}
                                      />
                                    ))}
                                  </div>
                                </td>
                              ))}
                              <td className="border p-2 text-center font-bold text-lg weekly-total-column">
                                <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"}>
                                  {getWeeklyScore(habit)} / 7
                                </Badge>
                              </td>
                              <td className="border p-2 text-center delete-column">
                                <Button
                                  onClick={() => removeHabit(habit.id)}
                                  size="sm"
                                  variant="destructive"
                                  disabled={habits.length <= 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 돌아보기 섹션 */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
                      📈 이번 주 돌아보기
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bestDay" className="text-sm sm:text-base">가장 초록색이 많았던 요일과 시간은 언제였나요?</Label>
                      <Textarea
                        id="bestDay"
                        value={reflection.bestDay}
                        onChange={(e) => setReflection(prev => ({ ...prev, bestDay: e.target.value }))}
                        placeholder="예: 화요일 아침 시간대가 가장 좋았어요!"
                        className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="easiestHabit" className="text-sm sm:text-base">어떤 습관이 가장 쉬웠고, 어떤 습관이 가장 어려웠나요?</Label>
                      <Textarea
                        id="easiestHabit"
                        value={reflection.easiestHabit}
                        onChange={(e) => setReflection(prev => ({ ...prev, easiestHabit: e.target.value }))}
                        placeholder="예: 아침에 일어나기는 쉬웠지만, 정리정돈은 어려웠어요."
                        className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextWeekGoal" className="text-sm sm:text-base">다음 주에 더 잘하고 싶은 것은 무엇인가요?</Label>
                      <Textarea
                        id="nextWeekGoal"
                        value={reflection.nextWeekGoal}
                        onChange={(e) => setReflection(prev => ({ ...prev, nextWeekGoal: e.target.value }))}
                        placeholder="예: 다음 주에는 저녁 정리 시간을 더 잘 지키고 싶어요!"
                        className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 보상 아이디어 */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
                      <Trophy className="text-yellow-500" />
                      이번 주 보상 아이디어
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="reward" className="text-sm sm:text-base">목표 달성 시 받을 보상을 정해보세요!</Label>
                      <Textarea
                        id="reward"
                        value={reward}
                        onChange={(e) => setReward(e.target.value)}
                        placeholder="예: 영화 보기, 특별한 간식 먹기, 보드게임 시간, 공원 가기 등"
                        className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 푸터 */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="text-base sm:text-lg font-semibold">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <div>서명: _________________ (부모님)</div>
                          <div>_________________ ({childName || '나'}!)</div>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">저장 버튼을 눌러 데이터를 저장하세요</span>
                        <span className="sm:hidden">저장 버튼을 눌러 저장하세요</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 덮어쓰기 확인 모달 */}
            {showOverwriteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    기존 데이터 덮어쓰기
                  </h3>
                  <p className="text-gray-600 mb-6">
                    이 주간에 이미 저장된 데이터가 있습니다. 
                    새로운 데이터로 덮어쓰시겠습니까?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowOverwriteConfirm(false)
                        setPendingSaveData(null)
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={() => {
                        if (pendingSaveData) {
                          saveData(true)
                        } else {
                          saveData(false)
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? '저장 중...' : '덮어쓰기'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </RewardNotificationProvider>
  )
}

export default App