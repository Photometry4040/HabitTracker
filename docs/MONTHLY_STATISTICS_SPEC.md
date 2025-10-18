# 월간 통계 (Monthly Statistics) 기능 명세서

## 📊 개요
주간 통계를 확장하여 월간(4주) 단위의 습관 트래킹 통계를 제공합니다.

## 🎯 목표
- 부모가 자녀의 한 달 간의 습관 형성 추이를 한눈에 파악
- 주별 비교를 통한 개선 사항 확인
- 장기적인 습관 형성 패턴 분석

---

## 📐 UI 레이아웃

### Desktop Layout
```
┌────────────────────────────────────────────────────────────────┐
│  월간 통계 (Monthly Statistics)  [2025년 10월]        📅       │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐│
│  │  주별 성공률 추이             │  │  월간 성과 분포            ││
│  │                             │  │                           ││
│  │   100%                      │  │                           ││
│  │    80% ●─●─●─●              │  │       85%                 ││
│  │    60%                      │  │     ┌─────┐               ││
│  │    40%                      │  │    │🟢🟡🔴│               ││
│  │    20%                      │  │     └─────┘               ││
│  │     0%                      │  │                           ││
│  │       1주 2주 3주 4주        │  │  MonthlyDonut             ││
│  │                             │  │                           ││
│  │  WeeklyTrendChart           │  └───────────────────────────┘│
│  └─────────────────────────────┘                                │
│                                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ 최고의 주 │ 최저의 주 │ 평균 성공률│총 습관 수│총 완료 수││
│  │   2주차   │   4주차   │   78%    │   20개   │  112개   ││
│  │   92%     │   65%     │          │          │          ││
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  습관별 월간 성과                                      │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │  🟢 아침 일어나기         ████████████████░░ 88%      │      │
│  │  🟡 숙제 하기             ████████████░░░░░ 68%      │      │
│  │  🟢 저녁 정리하기         ██████████████████ 95%     │      │
│  │  🔴 운동하기              ██████░░░░░░░░░░ 42%       │      │
│  │  HabitProgressBars                                   │      │
│  └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)
```
┌────────────────────────────┐
│ 월간 통계 [2025년 10월]     │
├────────────────────────────┤
│                            │
│  [주별 성공률 추이]         │
│  (WeeklyTrendChart)        │
│                            │
│  [월간 성과 분포]           │
│  (MonthlyDonut)            │
│                            │
│  [요약 카드들]              │
│  2x2 그리드                │
│                            │
│  [습관별 월간 성과]         │
│  (HabitProgressBars)       │
│                            │
└────────────────────────────┘
```

---

## 🎨 컴포넌트 상세

### 1. WeeklyTrendChart (주별 성공률 추이)
**타입**: Line Chart (Recharts)

**데이터 구조**:
```javascript
[
  { week: '1주', successRate: 75, totalHabits: 5, completedHabits: 23 },
  { week: '2주', successRate: 82, totalHabits: 5, completedHabits: 27 },
  { week: '3주', successRate: 78, totalHabits: 5, completedHabits: 25 },
  { week: '4주', successRate: 70, totalHabits: 5, completedHabits: 21 }
]
```

**특징**:
- X축: 주차 (1주, 2주, 3주, 4주)
- Y축: 성공률 (0-100%)
- 색상: 동적 (주별 성공률에 따라 green/yellow/red)
- 툴팁: 주차, 성공률, 완료 습관 수

### 2. MonthlyDonut (월간 성과 분포)
**타입**: Donut Chart (Recharts PieChart)

**데이터 구조**:
```javascript
{
  green: 45,   // 전체 월간 green 횟수
  yellow: 28,  // 전체 월간 yellow 횟수
  red: 15,     // 전체 월간 red 횟수
  none: 4      // 기록 안 한 횟수
}
```

**중앙 텍스트**: 전체 월간 성공률 (%) - 큰 폰트

### 3. HabitProgressBars (습관별 월간 성과)
**타입**: Horizontal Progress Bars

**데이터 구조**:
```javascript
[
  {
    habitName: '아침 일어나기',
    completed: 25,
    total: 28,
    successRate: 89,
    color: 'green'
  },
  ...
]
```

**특징**:
- 각 습관별 한 줄 표시
- 프로그레스 바 + 퍼센트 텍스트
- 성공률에 따른 색상 (green/yellow/red)

### 4. Summary Cards (요약 카드)
5개의 미니 카드:
- **최고의 주**: 가장 높은 성공률 주차 + %
- **최저의 주**: 가장 낮은 성공률 주차 + %
- **평균 성공률**: 4주 평균 성공률
- **총 습관 수**: 월간 유니크 습관 개수
- **총 완료 수**: 전체 green + yellow 횟수

---

## 📦 데이터 로직

### 월간 데이터 조회 함수
```javascript
// src/lib/statistics.js

/**
 * Calculate monthly statistics for a child
 * @param {string} childName - Child name
 * @param {string} monthStartDate - ISO date (first day of month)
 * @returns {Object} Monthly stats object
 */
export const calculateMonthStats = async (childName, monthStartDate) => {
  // 1. 해당 월의 모든 주차 데이터 조회 (4-5주)
  // 2. 각 주별 통계 계산
  // 3. 월간 집계

  return {
    exists: true,
    month: '2025-10',
    weeks: [
      { weekNumber: 1, successRate: 75, ... },
      { weekNumber: 2, successRate: 82, ... },
      ...
    ],
    overall: {
      successRate: 78,
      distribution: { green: 45, yellow: 28, red: 15, none: 4 },
      bestWeek: { number: 2, rate: 82 },
      worstWeek: { number: 4, rate: 70 },
      totalHabits: 5,
      totalCompleted: 112
    },
    habitBreakdown: [
      { name: '아침 일어나기', successRate: 89, ... },
      ...
    ]
  }
}
```

### React Hook
```javascript
// src/hooks/useStatistics.js

export const useMonthStats = (childName, monthStartDate) => {
  return useQuery({
    queryKey: ['monthStats', childName, monthStartDate],
    queryFn: () => calculateMonthStats(childName, monthStartDate),
    staleTime: 5 * 60 * 1000, // 5분
    enabled: !!childName && !!monthStartDate
  })
}
```

---

## 🎯 Phase 1 구현 계획 (우선순위)

### Step 1: 데이터 레이어 (1시간)
- [ ] `calculateMonthStats()` 함수 구현
- [ ] 테스트 데이터로 검증

### Step 2: 기본 컴포넌트 (2시간)
- [ ] `MonthlyStats.jsx` 메인 컨테이너
- [ ] `WeeklyTrendChart.jsx`
- [ ] `MonthlyDonut.jsx` (기존 SuccessRateDonut 재사용)

### Step 3: 세부 컴포넌트 (1시간)
- [ ] `HabitProgressBars.jsx`
- [ ] Summary Cards (간단한 Card 컴포넌트)

### Step 4: 통합 및 테스트 (1시간)
- [ ] Dashboard에 월간 통계 탭 추가
- [ ] 주간/월간 전환 버튼
- [ ] 반응형 테스트

---

## 🚀 향후 확장 (Phase 2)

1. **연간 통계**: 12개월 트렌드
2. **비교 기능**: 지난 달과 비교
3. **목표 설정**: 월간 목표 성공률 설정 및 추적
4. **내보내기**: PDF 리포트 생성
5. **성취 배지**: 특정 조건 달성 시 뱃지 수여

---

## 📝 참고 사항

- 주간 통계와 동일한 색상 팔레트 사용
- Recharts 라이브러리 활용 (이미 프로젝트에 포함)
- 반응형 디자인 (모바일 우선)
- 성능 최적화: React Query 캐싱

---

**작성자**: Agent 2 (Statistics Engineer)
**작성일**: 2025-10-18
**버전**: 1.0
