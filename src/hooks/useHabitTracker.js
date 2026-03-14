/**
 * useHabitTracker - Custom hook for habit tracker state management
 * Extracted from App.jsx to reduce monolithic component complexity
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { loadWeekDataNew as loadChildData } from '@/lib/database-new.js'
import { useWeekData, weekDataKeys } from '@/hooks/useWeekData.js'
import { createWeekDualWrite, updateHabitRecordDualWrite } from '@/lib/dual-write.js'
import { getCurrentUser, signOut, onAuthStateChange } from '@/lib/auth.js'
import { notifyWeekSave, notifyWeekComplete, notifyWeekSummary, calculateWeekStats, calculateDetailedWeekStats } from '@/lib/discord.js'
import { checkStreak21, checkHabitMastery } from '@/lib/learning-mode.js'
import { sanitizeInput } from '@/lib/security.js'
import { getHabitRecordsForStreak, calculateStreak, calculateGreenStreak } from '@/lib/streak-calculator.js'
import { createDefaultHabits, DEFAULT_REFLECTION, formatWeekPeriod, getCurrentMonday, DAYS } from '@/lib/app-constants.js'

export function useHabitTracker() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState('')
  const [showChildSelector, setShowChildSelector] = useState(true)
  const [childName, setChildName] = useState('')
  const [weekPeriod, setWeekPeriod] = useState('')
  const [theme, setTheme] = useState('')
  const [weekStartDate, setWeekStartDate] = useState('')
  const [habits, setHabits] = useState(createDefaultHabits())
  const [reflection, setReflection] = useState({ ...DEFAULT_REFLECTION })
  const [reward, setReward] = useState('')
  const [saving, setSaving] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingSaveData, setPendingSaveData] = useState(null)
  const [currentWeekId, setCurrentWeekId] = useState(null)
  const [currentChildId, setCurrentChildId] = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // null | 'pending' | 'saving' | 'saved'
  const [hasChanges, setHasChanges] = useState(false)
  const autoSaveTimerRef = useRef(null)
  const autoSaveClearRef = useRef(null)

  // View toggles
  const [showDashboard, setShowDashboard] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [showWeaknesses, setShowWeaknesses] = useState(false)
  const [showMandala, setShowMandala] = useState(false)
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false)

  const resetData = useCallback(() => {
    setWeekPeriod('')
    setWeekStartDate('')
    setTheme('')
    setHabits(createDefaultHabits())
    setReflection({ ...DEFAULT_REFLECTION })
    setReward('')
  }, [])

  const resetDataKeepDate = useCallback(() => {
    setTheme('')
    setHabits(createDefaultHabits())
    setReflection({ ...DEFAULT_REFLECTION })
    setReward('')
  }, [])

  const handleChildSelect = useCallback((name) => {
    setSelectedChild(name)
    setChildName(name)
    setShowChildSelector(false)
    resetData()
    // 이번 주 월요일로 자동 설정 → 데이터 자동 로드
    const monday = getCurrentMonday()
    setWeekStartDate(monday)
    setWeekPeriod(formatWeekPeriod(monday))
  }, [resetData])

  const handleNewChild = useCallback((name) => {
    setSelectedChild(name)
    setChildName(name)
    setShowChildSelector(false)
    resetData()
    const monday = getCurrentMonday()
    setWeekStartDate(monday)
    setWeekPeriod(formatWeekPeriod(monday))
  }, [resetData])

  const handleApplyTemplate = useCallback((templateHabits) => {
    if (!templateHabits || templateHabits.length === 0) {
      alert('템플릿에 습관이 없습니다')
      return
    }

    const newHabits = templateHabits.map((habit, index) => ({
      id: index + 1,
      name: habit.name,
      times: Array(7).fill('')
    }))

    setHabits(newHabits)
    setShowTemplateManager(false)
    alert(`템플릿이 적용되었습니다! ${templateHabits.length}개의 습관이 설정되었습니다.`)
  }, [])

  // React Query for week data fetching (read path only)
  const queryClient = useQueryClient()
  const { data: weekQueryData, error: weekQueryError, dataUpdatedAt } = useWeekData(selectedChild, weekStartDate)
  const lastProcessedAt = useRef(0)

  // Process fetched week data when React Query delivers new results
  useEffect(() => {
    if (!dataUpdatedAt || dataUpdatedAt === lastProcessedAt.current) return
    lastProcessedAt.current = dataUpdatedAt

    if (weekQueryError) {
      console.error('데이터 로드 실패:', weekQueryError)
      resetDataKeepDate()
      setCurrentWeekId(null)
      setCurrentChildId(null)
      if (!showDashboard) {
        alert('데이터 로드 중 오류가 발생했습니다. 새로운 데이터를 입력해주세요.')
      }
      return
    }

    const data = weekQueryData
    if (data) {
      if (data.week_not_found) {
        resetDataKeepDate()
        setCurrentWeekId(null)
        setCurrentChildId(data.child_id)
        if (!showDashboard) {
          alert('해당 주간에 저장된 데이터가 없습니다. 새로운 데이터를 입력해주세요.')
        }
      } else {
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

        setTheme(data.theme || '')
        setHabits(data.habits || habits)
        setReflection(data.reflection || reflection)
        setReward(data.reward || '')
        setCurrentWeekId(data.id || null)
        setCurrentChildId(data.child_id || null)
        setHasChanges(false)

        if (data.week_period && !data.week_start_date) {
          const m = data.week_period.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/)
          if (m) {
            setWeekStartDate(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`)
          }
        }
      }
    } else {
      resetDataKeepDate()
      setCurrentWeekId(null)
      setCurrentChildId(null)
      setHasChanges(false)
      if (!showDashboard) {
        alert('해당 주간에 저장된 데이터가 없습니다. 새로운 데이터를 입력해주세요.')
      }
    }
  }, [dataUpdatedAt])

  // Thin wrapper for callers that need to trigger a refetch (e.g., after save or error recovery)
  const loadWeekData = useCallback(async () => {
    if (selectedChild && weekStartDate) {
      await queryClient.invalidateQueries({ queryKey: weekDataKeys.detail(selectedChild, weekStartDate) })
    }
  }, [selectedChild, weekStartDate, queryClient])

  // Save data
  const saveData = useCallback(async (forceSave = false) => {
    if (!selectedChild) return

    try {
      setSaving(true)
      const data = forceSave && pendingSaveData ? pendingSaveData : {
        weekPeriod: weekPeriod || '',
        weekStartDate: weekStartDate || '',
        theme: theme || '',
        habits: habits || [],
        reflection: reflection || {},
        reward: reward || ''
      }

      if (!data.weekPeriod && !data.weekStartDate) return

      let weekStartDateForCheck = data.weekStartDate
      if (!weekStartDateForCheck && data.weekPeriod) {
        const match = data.weekPeriod.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/)
        if (match) {
          weekStartDateForCheck = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        }
      }

      const existingData = weekStartDateForCheck ? await loadChildData(selectedChild, weekStartDateForCheck) : null
      if (existingData && !forceSave) {
        setPendingSaveData(data)
        setShowOverwriteConfirm(true)
        return
      }

      await createWeekDualWrite(
        selectedChild,
        weekStartDateForCheck,
        data.habits,
        data.theme,
        data.reflection,
        data.reward
      )

      setShowOverwriteConfirm(false)
      setPendingSaveData(null)

      notifyWeekSave(selectedChild, data.weekPeriod, data.habits.length).catch(() => {})

      const stats = calculateWeekStats(data.habits)
      if (stats.successRate >= 80) {
        notifyWeekComplete(selectedChild, data.weekPeriod, stats).catch(() => {})
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
      setHasChanges(false)
      // Invalidate React Query cache so next navigation to this week shows fresh data
      queryClient.invalidateQueries({ queryKey: weekDataKeys.detail(selectedChild, weekStartDate) })
    }
  }, [selectedChild, weekPeriod, weekStartDate, theme, habits, reflection, reward, pendingSaveData, queryClient])

  // Streak achievements
  const checkStreakAchievements = useCallback(async (habitName, childName) => {
    try {
      const data = await loadChildData(childName, weekStartDate)
      if (!data || !data.habits) return

      const habitData = data.habits.find(h => h.name === habitName)
      if (!habitData || !habitData.db_id) return

      const records = await getHabitRecordsForStreak(habitData.db_id)
      if (!records || records.length === 0) return

      const totalStreak = calculateStreak(records)
      const greenStreak = calculateGreenStreak(records)

      if (totalStreak >= 21) {
        await checkStreak21(childName, habitData.db_id, totalStreak)
      }
      if (greenStreak >= 30) {
        await checkHabitMastery(childName, habitData.db_id, greenStreak)
      }
    } catch (error) {
      // Non-critical
    }
  }, [weekStartDate])

  // Schedule auto-save 3 seconds after habit change
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (autoSaveClearRef.current) clearTimeout(autoSaveClearRef.current)
    setAutoSaveStatus('pending')
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      try {
        await saveData(true)
        setAutoSaveStatus('saved')
        autoSaveClearRef.current = setTimeout(() => setAutoSaveStatus(null), 2000)
      } catch {
        setAutoSaveStatus(null)
      }
    }, 3000)
  }, [saveData])

  // Cleanup auto-save timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (autoSaveClearRef.current) clearTimeout(autoSaveClearRef.current)
    }
  }, [])

  // Update habit color
  const updateHabitColor = useCallback(async (habitId, dayIndex, color) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return

    const currentColor = habit.times[dayIndex]
    const newColor = currentColor === color ? '' : color

    setHabits(prev => prev.map(h =>
      h.id === habitId
        ? { ...h, times: h.times.map((time, index) => index === dayIndex ? newColor : time) }
        : h
    ))
    setHasChanges(true)

    if (!selectedChild || !weekStartDate) return

    try {
      if (newColor === '') return

      await updateHabitRecordDualWrite(selectedChild, weekStartDate, habit.name, dayIndex, newColor)

      checkStreakAchievements(habit.name, selectedChild).catch(() => {})

      // Check if all habits are fully filled → send weekly summary
      const updatedHabits = habits.map(h =>
        h.id === habitId
          ? { ...h, times: h.times.map((time, index) => index === dayIndex ? newColor : time) }
          : h
      )
      const detailedStats = calculateDetailedWeekStats(updatedHabits)
      if (detailedStats.allFilled) {
        notifyWeekSummary(selectedChild, weekPeriod, detailedStats).catch(() => {})
      }

      // Schedule auto-save 3 seconds after habit update
      scheduleAutoSave()
    } catch (error) {
      console.error('Failed to update habit record:', error)
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, times: h.times.map((time, index) => index === dayIndex ? currentColor : time) }
          : h
      ))
      alert('습관 기록 저장 중 오류가 발생했습니다.')
    }
  }, [habits, selectedChild, weekStartDate, weekPeriod, checkStreakAchievements, scheduleAutoSave])

  // Bulk update day
  const bulkUpdateDay = useCallback(async (dayIndex, color) => {
    if (!selectedChild || !weekStartDate) {
      alert('주간 기간을 먼저 설정해주세요')
      return
    }

    if (!confirm(`${DAYS[dayIndex]}의 모든 습관을 ${color === 'green' ? '초록색' : color === 'yellow' ? '노란색' : color === 'red' ? '빨간색' : '지우기'}으로 변경하시겠습니까?`)) {
      return
    }

    setHabits(prev => prev.map(habit => ({
      ...habit,
      times: habit.times.map((time, index) => index === dayIndex ? color : time)
    })))

    const updatePromises = habits.map(async (habit) => {
      if (color === '') return
      await updateHabitRecordDualWrite(selectedChild, weekStartDate, habit.name, dayIndex, color)
    })

    try {
      await Promise.all(updatePromises)
      scheduleAutoSave()
      alert(`${DAYS[dayIndex]}의 모든 습관이 업데이트되었습니다!`)
    } catch (error) {
      alert('일부 습관 업데이트에 실패했습니다. 다시 시도해주세요.')
      loadWeekData()
    }
  }, [selectedChild, weekStartDate, habits, weekPeriod, loadWeekData, scheduleAutoSave])

  const addHabit = useCallback(() => {
    setHabits(prev => [...prev, {
      id: Date.now(),
      name: '새로운 습관을 입력하세요',
      times: Array(7).fill('')
    }])
  }, [])

  const removeHabit = useCallback((habitId) => {
    setHabits(prev => prev.filter(habit => habit.id !== habitId))
  }, [])

  const updateHabitName = useCallback((habitId, newName) => {
    const { habit_name } = sanitizeInput({ habit_name: newName })
    setHabits(prev => prev.map(habit =>
      habit.id === habitId ? { ...habit, name: habit_name } : habit
    ))
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
      setUser(null)
      resetData()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }, [resetData])

  // Auth state
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        if (!error.message.includes('Auth session missing')) {
          console.error('사용자 확인 오류:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      setLoading(false)
      return
    }

    checkUser()

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Update weekPeriod display string when weekStartDate changes
  // (data loading is handled by useWeekData hook automatically)
  useEffect(() => {
    if (weekStartDate) {
      setWeekPeriod(formatWeekPeriod(weekStartDate))
    }
  }, [weekStartDate])

  return {
    // Auth
    user, loading, handleLogout,
    // Child selection
    selectedChild, showChildSelector, setShowChildSelector, childName, setChildName,
    handleChildSelect, handleNewChild,
    // Week data
    weekPeriod, weekStartDate, setWeekStartDate, theme, setTheme,
    habits, setHabits, reflection, setReflection, reward, setReward,
    currentWeekId, currentChildId,
    // Actions
    saveData, updateHabitColor, bulkUpdateDay, addHabit, removeHabit, updateHabitName,
    handleApplyTemplate, resetData,
    // Save state
    saving, showOverwriteConfirm, setShowOverwriteConfirm, pendingSaveData, setPendingSaveData, autoSaveStatus, hasChanges,
    // View toggles
    showDashboard, setShowDashboard,
    showTemplateManager, setShowTemplateManager,
    showGoals, setShowGoals,
    showWeaknesses, setShowWeaknesses,
    showMandala, setShowMandala,
    showWeeklyPlanner, setShowWeeklyPlanner,
  }
}
