import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { 
  Trophy, Star, Target, TrendingUp, Calendar, 
  Award, Zap, Heart, Smile, Flame, Crown, Gift,
  CalendarDays, BarChart3
} from 'lucide-react'
import { loadChildMultipleWeeks } from '@/lib/database.js'

export function Dashboard({ habits, childName, weekPeriod, theme }) {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [streak, setStreak] = useState(0)
  const [badges, setBadges] = useState([])
  const [viewMode, setViewMode] = useState('weekly') // 'weekly' or 'monthly'
  const [historicalData, setHistoricalData] = useState([])
  const [loading, setLoading] = useState(false)

  const days = ['월', '화', '수', '목', '금', '토', '일']

  // 주간/월간 데이터 로드
  const loadHistoricalData = async () => {
    if (!childName) return
    
    setLoading(true)
    try {
      const weeks = viewMode === 'monthly' ? 4 : 1
      const data = await loadChildMultipleWeeks(childName, weeks)
      setHistoricalData(data)
    } catch (error) {
      console.error('히스토리 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 주간 점수 계산
  const getWeeklyScores = () => {
    return days.map((day, index) => {
      const dayScore = habits.reduce((total, habit) => {
        if (habit.times[index] === 'green') return total + 1
        if (habit.times[index] === 'yellow') return total + 0.5
        return total
      }, 0)
      return { day, score: dayScore, maxScore: habits.length }
    })
  }

  // 주간별 성과 데이터 (히스토리용)
  const getWeeklyPerformanceData = () => {
    if (historicalData.length === 0) return []
    
    return historicalData.map((weekData, index) => {
      const totalScore = weekData.habits?.reduce((total, habit) => {
        return total + habit.times.filter(time => time === 'green').length
      }, 0) || 0
      
      const maxScore = weekData.habits?.length * 7 || 0
      const successRate = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
      
      // 주간 기간에서 주차 추출
      const weekNumber = historicalData.length - index
      const weekLabel = viewMode === 'monthly' ? `${weekNumber}주 전` : weekData.week_period || `주간 ${weekNumber}`
      
      return {
        week: weekLabel,
        score: totalScore,
        maxScore: maxScore,
        successRate: successRate,
        theme: weekData.theme || '테마 없음'
      }
    }).reverse() // 시간순으로 정렬
  }

  // 색상별 통계
  const getColorStats = () => {
    const stats = { green: 0, yellow: 0, red: 0, empty: 0 }
    habits.forEach(habit => {
      habit.times.forEach(time => {
        if (time === 'green') stats.green++
        else if (time === 'yellow') stats.yellow++
        else if (time === 'red') stats.red++
        else stats.empty++
      })
    })
    return stats
  }

  // 습관별 성과
  const getHabitPerformance = () => {
    return habits.map(habit => {
      const greenCount = habit.times.filter(time => time === 'green').length
      const yellowCount = habit.times.filter(time => time === 'yellow').length
      const redCount = habit.times.filter(time => time === 'red').length
      const emptyCount = habit.times.filter(time => time === '').length
      const total = greenCount + yellowCount + redCount + emptyCount
      
      // 달성률 계산: green은 100%, yellow는 50%로 계산
      const successRate = total > 0 ? ((greenCount + yellowCount * 0.5) / total) * 100 : 0
      
      return {
        name: habit.name,
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
        empty: emptyCount,
        total: total,
        successRate: Math.round(successRate)
      }
    }).filter(habit => habit.total > 0) // 데이터가 있는 습관만 표시
  }

  // 레벨 계산
  useEffect(() => {
    const totalScore = habits.reduce((total, habit) => {
      return total + habit.times.filter(time => time === 'green').length
    }, 0)
    
    const newLevel = Math.floor(totalScore / 10) + 1
    setCurrentLevel(newLevel)
    
    // 연속 달성 계산
    const today = new Date().getDay() - 1 // 월요일이 0
    let currentStreak = 0
    for (let i = today; i >= 0; i--) {
      const dayScore = habits.reduce((total, habit) => {
        if (habit.times[i] === 'green') return total + 1
        return total
      }, 0)
      if (dayScore >= habits.length * 0.7) {
        currentStreak++
      } else {
        break
      }
    }
    setStreak(currentStreak)
  }, [habits])

  // 배지 시스템
  useEffect(() => {
    const newBadges = []
    const totalScore = habits.reduce((total, habit) => {
      return total + habit.times.filter(time => time === 'green').length
    }, 0)
    
    if (totalScore >= 10) newBadges.push({ name: '초보 습관러', icon: '🌱', color: '#10B981' })
    if (totalScore >= 20) newBadges.push({ name: '성장 습관러', icon: '🌿', color: '#059669' })
    if (totalScore >= 30) newBadges.push({ name: '숙련 습관러', icon: '🌳', color: '#047857' })
    if (streak >= 3) newBadges.push({ name: '연속 달성왕', icon: '🔥', color: '#DC2626' })
    if (streak >= 7) newBadges.push({ name: '완벽한 한 주', icon: '👑', color: '#F59E0B' })
    
    setBadges(newBadges)
  }, [habits, streak])

  // viewMode 변경 시 데이터 로드
  useEffect(() => {
    loadHistoricalData()
  }, [viewMode, childName])

  const weeklyScores = getWeeklyScores()
  const colorStats = getColorStats()
  const habitPerformance = getHabitPerformance()
  const weeklyPerformanceData = getWeeklyPerformanceData()
  const totalScore = habits.reduce((total, habit) => {
    return total + habit.times.filter(time => time === 'green').length
  }, 0)
  const maxScore = habits.length * 7
  const successRate = Math.round((totalScore / maxScore) * 100)



  // 파이 차트 데이터
  const pieData = [
    { name: '목표 달성', value: colorStats.green, color: '#10B981' },
    { name: '부분 달성', value: colorStats.yellow, color: '#F59E0B' },
    { name: '미달성', value: colorStats.red, color: '#EF4444' }
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      {/* 헤더 - 레벨과 점수 */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Crown className="w-8 h-8 text-yellow-300" />
            {childName}의 습관 성장 대시보드
            <Crown className="w-8 h-8 text-yellow-300" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">{currentLevel}</div>
              <div className="text-sm">현재 레벨</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">{totalScore}</div>
              <div className="text-sm">총 점수</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold">{successRate}%</div>
              <div className="text-sm">달성률</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-3xl font-bold flex items-center justify-center gap-1">
                <Flame className="w-6 h-6 text-orange-300" />
                {streak}
              </div>
              <div className="text-sm">연속 달성</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 배지 섹션 */}
      {badges.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-400 to-orange-400">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6" />
              획득한 배지들
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className="bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="font-semibold text-gray-800">{badge.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 조회 모드 선택 */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            조회 기간 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('weekly')}
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              className={viewMode === 'weekly' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Calendar className="w-4 h-4 mr-1" />
              주간 조회
            </Button>
            <Button
              onClick={() => setViewMode('monthly')}
              variant={viewMode === 'monthly' ? 'default' : 'outline'}
              className={viewMode === 'monthly' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              월간 조회 (4주)
            </Button>
            {loading && (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                데이터 로딩 중...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 주간 성과 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {viewMode === 'weekly' ? '주간 성과 추이' : '월간 성과 추이'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={viewMode === 'weekly' ? weeklyScores : weeklyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={viewMode === 'weekly' ? 'day' : 'week'} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, viewMode === 'weekly' ? '점수' : '달성률']}
                  labelFormatter={(label) => viewMode === 'weekly' ? `${label}요일` : label}
                />
                <Area 
                  type="monotone" 
                  dataKey={viewMode === 'weekly' ? 'score' : 'successRate'} 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 색상별 통계 파이 차트 */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
              <Target className="w-5 h-5" />
              색상별 성과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 월간 조회 시 주간별 성과 요약 */}
      {viewMode === 'monthly' && weeklyPerformanceData.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              주간별 성과 요약 (최근 4주)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {weeklyPerformanceData.map((week, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-1">{week.week}</div>
                    <div className="text-2xl font-bold text-purple-800 mb-1">{week.successRate}%</div>
                    <div className="text-xs text-gray-500 mb-2">달성률</div>
                    <div className="text-sm font-medium text-gray-700">{week.score}/{week.maxScore}</div>
                    <div className="text-xs text-gray-500">점수</div>
                    {week.theme && week.theme !== '테마 없음' && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {week.theme}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 습관별 성과 분석 */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <Star className="w-5 h-5" />
            습관별 성과 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          {habitPerformance.length > 0 ? (
            <>
              {/* 막대 그래프 */}
              <div className="mb-6">
                <div className="space-y-4">
                  {habitPerformance.map((habit, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-48 text-sm font-medium text-gray-700 truncate">
                        {habit.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-6 rounded-full transition-all duration-300"
                          style={{ width: `${habit.successRate}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-white drop-shadow-sm">
                            {habit.successRate}%
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm font-medium text-gray-600">
                        {habit.successRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 상세 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {habitPerformance.map((habit, index) => (
                  <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
                    <div className="text-center">
                      <div className="font-semibold text-gray-800 mb-2 text-sm">{habit.name}</div>
                      <div className="text-2xl font-bold text-purple-800 mb-1">{habit.successRate}%</div>
                      <div className="text-xs text-gray-500 mb-3">달성률</div>
                      <div className="flex justify-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">{habit.green}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="font-medium">{habit.yellow}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-medium">{habit.red}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium">아직 습관 데이터가 없습니다</div>
              <div className="text-sm">습관 추적에서 데이터를 입력해보세요!</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 동기부여 메시지 */}
      <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              <Heart className="w-6 h-6" />
              오늘도 멋진 하루를 보내고 있어요!
              <Heart className="w-6 h-6" />
            </div>
            <div className="text-lg">
              {successRate >= 80 ? (
                <span className="flex items-center justify-center gap-2">
                  <Smile className="w-5 h-5" />
                  완벽해요! 정말 대단해요! 🎉
                </span>
              ) : successRate >= 60 ? (
                <span className="flex items-center justify-center gap-2">
                  <Target className="w-5 h-5" />
                  잘하고 있어요! 조금만 더 힘내세요! 💪
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  괜찮아요! 내일은 더 잘할 수 있어요! 🌟
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 