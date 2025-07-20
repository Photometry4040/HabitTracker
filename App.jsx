import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Calendar, Star, Trophy, Target, Plus, Trash2 } from 'lucide-react'
import './App.css'

function App() {
  const [childName, setChildName] = useState('')
  const [weekPeriod, setWeekPeriod] = useState('')
  const [theme, setTheme] = useState('')
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

  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
  const colors = [
    { name: '녹색', value: 'green', emoji: '😊', description: '목표 달성!' },
    { name: '노랑', value: 'yellow', emoji: '🤔', description: '조금 아쉽지만 잘했어!' },
    { name: '빨강', value: 'red', emoji: '😔', description: '괜찮아, 내일 다시 해보자!' }
  ]

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem('habitTracker')
    if (savedData) {
      const data = JSON.parse(savedData)
      setChildName(data.childName || '')
      setWeekPeriod(data.weekPeriod || '')
      setTheme(data.theme || '')
      setHabits(data.habits || habits)
      setReflection(data.reflection || reflection)
      setReward(data.reward || '')
    }
  }, [])

  // 데이터 저장
  const saveData = () => {
    const data = {
      childName,
      weekPeriod,
      theme,
      habits,
      reflection,
      reward
    }
    localStorage.setItem('habitTracker', JSON.stringify(data))
  }

  useEffect(() => {
    saveData()
  }, [childName, weekPeriod, theme, habits, reflection, reward])

  const updateHabitColor = (habitId, dayIndex, color) => {
    setHabits(prev => prev.map(habit => 
      habit.id === habitId 
        ? { ...habit, times: habit.times.map((time, index) => 
            index === dayIndex ? color : time
          )}
        : habit
    ))
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-purple-800 flex items-center justify-center gap-2">
              <Star className="text-yellow-500" />
              주간 습관 성장 챌린지
              <Star className="text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="childName">아이 이름</Label>
                <Input
                  id="childName"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="weekPeriod">주간 기간</Label>
                <Input
                  id="weekPeriod"
                  value={weekPeriod}
                  onChange={(e) => setWeekPeriod(e.target.value)}
                  placeholder="2024년 1월 1일 ~ 7일"
                />
              </div>
              <div>
                <Label htmlFor="theme">이번 주 테마</Label>
                <Input
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="시간대별 색상 챌린지!"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 색상 코드 */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
              🎨 색상 코드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {colors.map((color) => (
                <div key={color.value} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-6 h-6 rounded-full ${getColorClass(color.value)}`}></div>
                  <span className="text-2xl">{color.emoji}</span>
                  <div>
                    <div className="font-semibold">{color.name}</div>
                    <div className="text-sm text-gray-600">{color.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 습관 추적 테이블 */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
              <Target />
              습관 추적표
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-3 py-1">
                총점: {getTotalScore()} / {getMaxScore()}
              </Badge>
              <Button onClick={addHabit} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-1" />
                습관 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-3 bg-purple-100 text-left min-w-[250px]">시간대 / 습관</th>
                    {days.map((day) => (
                      <th key={day} className="border p-3 bg-purple-100 text-center min-w-[100px]">{day}</th>
                    ))}
                    <th className="border p-3 bg-purple-100 text-center">주간 합계</th>
                    <th className="border p-3 bg-purple-100 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit) => (
                    <tr key={habit.id}>
                      <td className="border p-2">
                        <Input
                          value={habit.name}
                          onChange={(e) => updateHabitName(habit.id, e.target.value)}
                          className="border-none bg-transparent font-medium"
                        />
                      </td>
                      {habit.times.map((time, dayIndex) => (
                        <td key={dayIndex} className="border p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            {colors.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => updateHabitColor(habit.id, dayIndex, color.value)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  time === color.value 
                                    ? `${getColorClass(color.value)} border-gray-800 scale-110` 
                                    : `${getColorClass(color.value)} border-gray-300 opacity-50 hover:opacity-100`
                                }`}
                                title={color.description}
                              />
                            ))}
                          </div>
                        </td>
                      ))}
                      <td className="border p-3 text-center font-bold text-lg">
                        <Badge variant={getWeeklyScore(habit) >= 5 ? "default" : "secondary"}>
                          {getWeeklyScore(habit)} / 7
                        </Badge>
                      </td>
                      <td className="border p-3 text-center">
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
              <Label htmlFor="bestDay">가장 초록색이 많았던 요일과 시간은 언제였나요?</Label>
              <Textarea
                id="bestDay"
                value={reflection.bestDay}
                onChange={(e) => setReflection(prev => ({ ...prev, bestDay: e.target.value }))}
                placeholder="예: 화요일 아침 시간대가 가장 좋았어요!"
              />
            </div>
            <div>
              <Label htmlFor="easiestHabit">어떤 습관이 가장 쉬웠고, 어떤 습관이 가장 어려웠나요?</Label>
              <Textarea
                id="easiestHabit"
                value={reflection.easiestHabit}
                onChange={(e) => setReflection(prev => ({ ...prev, easiestHabit: e.target.value }))}
                placeholder="예: 아침에 일어나기는 쉬웠지만, 정리정돈은 어려웠어요."
              />
            </div>
            <div>
              <Label htmlFor="nextWeekGoal">다음 주에 더 잘하고 싶은 것은 무엇인가요?</Label>
              <Textarea
                id="nextWeekGoal"
                value={reflection.nextWeekGoal}
                onChange={(e) => setReflection(prev => ({ ...prev, nextWeekGoal: e.target.value }))}
                placeholder="예: 다음 주에는 저녁 정리 시간을 더 잘 지키고 싶어요!"
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
              <Label htmlFor="reward">목표 달성 시 받을 보상을 정해보세요!</Label>
              <Textarea
                id="reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="예: 영화 보기, 특별한 간식 먹기, 보드게임 시간, 공원 가기 등"
              />
            </div>
          </CardContent>
        </Card>

        {/* 푸터 */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                서명: _________________ (부모님) &nbsp;&nbsp;&nbsp; _________________ ({childName || '나'}!)
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                데이터는 자동으로 저장됩니다
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

