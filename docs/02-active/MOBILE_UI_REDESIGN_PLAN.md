# Mobile UI Redesign Plan - Habit Tracker for Kids

**Date**: 2026-03-10
**Reference**: MyFitnessPal Dashboard/Nutrition/Log Food UI
**Target**: Mobile-first redesign with modern app-like UX

---

## 1. Current State Analysis

### Problems Identified

| Area | Current Issue | Impact |
|------|--------------|--------|
| **Navigation** | Header 영역에 7개 버튼이 3x3 grid로 배치 | 화면 상단 30%를 차지, 콘텐츠 영역 부족 |
| **Header Card** | 아이 이름/주간 시작일/기간/테마가 4칸 grid | 모바일에서 세로 스크롤 과다 |
| **습관 카드** | 각 습관마다 7일 x 3색 = 21개 버튼 표시 | 터치 영역이 밀집, 실수 클릭 발생 |
| **색상 코드** | 매번 화면 상단에 표시 | 불필요한 공간 차지 (한번 보면 충분) |
| **돌아보기/보상** | 카드 3개가 길게 나열 | 스크롤이 너무 길어짐 |
| **저장 버튼** | Navigation 버튼 사이에 혼재 | 중요한 액션이 묻힘 |
| **Lazy loading** | 이미 적용되어 있지만 view 전환이 boolean flag 기반 | URL routing 없어 뒤로가기 불가 |

### Current Navigation Flow
```
[로그아웃]
[아이변경] [앱 제목] [템플릿|목표|약점|만다라|계획|보드|저장]
[아이이름] [시작일] [주간기간] [테마]
---
[색상 코드 카드]
[습관 추적표 카드]
[돌아보기 카드]
[보상 카드]
[서명 카드]
```

---

## 2. Design Concept

### MyFitnessPal에서 차용할 핵심 패턴

1. **Bottom Tab Navigation** - 하단 고정 탭바 (Dashboard, Log Food 스타일)
2. **Summary Card** - 도넛 차트로 주간 달성률 요약 (Calories 카드 스타일)
3. **Quick Action Cards** - Steps/Exercise 같은 요약 카드 그리드
4. **Floating Action Button** - 음식 검색바 대신 저장/추가 FAB
5. **Section-based Scrolling** - 깔끔한 섹션 구분 (Nutrition 탭 스타일)
6. **Clean Header** - 최소화된 상단 바 (Today + Edit)

---

## 3. Proposed Mobile Layout

### 3.1 Bottom Tab Navigation (NEW)

MyFitnessPal의 하단 탭바를 차용한 5탭 네비게이션:

```
┌─────────────────────────────────────┐
│  [습관]  [계획]  [학습]  [보드]  [더보기] │
│   📋      📅      🎯     📊      ···    │
└─────────────────────────────────────┘
```

| Tab | Icon | Content | Priority |
|-----|------|---------|----------|
| **습관** (Home) | ClipboardList | 습관 추적표 (기본 화면) | P0 |
| **계획** | Calendar | 주간 계획 | P1 |
| **학습** | Target | 목표/만다라/약점 (서브탭) | P1 |
| **보드** | BarChart3 | 대시보드 4종 | P2 |
| **더보기** | MoreHorizontal | 템플릿, 설정, 로그아웃 | P3 |

**Design Specs:**
- Height: 56px (safe area 포함 시 ~72px)
- Active tab: 브랜드 컬러 (purple-600) + bold label
- Inactive tab: gray-400
- Background: white, border-top: 1px solid gray-200
- Icon size: 24px, Label: 10px
- Safe area: `env(safe-area-inset-bottom)` padding

### 3.2 Compact Header (REDESIGN)

MyFitnessPal "Today" 헤더 스타일:

```
┌─────────────────────────────────────┐
│  ◀  3월 10일 ~ 3월 16일  ▶    [아이🔽] │
│      {childName}의 습관 챌린지          │
└─────────────────────────────────────┘
```

**Before**: 4-field grid (이름/날짜/기간/테마) = ~160px height
**After**: Date navigator + child selector inline = ~56px height

**Key Changes:**
- 아이 이름: 우상단 드롭다운 (아바타 아이콘 + 이름)
- 주간 날짜: 좌우 화살표로 네비게이션 (MyFitnessPal "< Today >" 스타일)
- 테마: "더보기" 탭 설정으로 이동
- 주간 기간: 날짜 네비게이터에 통합 표시

### 3.3 Weekly Summary Card (NEW)

MyFitnessPal Calories 도넛 차트 스타일:

```
┌─────────────────────────────────────┐
│  이번 주 달성률                         │
│                                       │
│      ┌──────────┐    달성  12/21       │
│      │   도넛    │    초록  8 (38%)     │
│      │  57%     │    노랑  4 (19%)     │
│      │  달성    │    빨강  3 (14%)     │
│      └──────────┘    미입력 6 (29%)     │
│                                       │
│  ● ● ○ ○  (swipe indicator)           │
└─────────────────────────────────────┘
```

**Swipe Pages (Carousel):**
1. Page 1: 주간 달성률 도넛 (Calories Summary 스타일)
2. Page 2: 요일별 달성률 바 차트 (Nutrients 스타일)
3. Page 3: 습관별 달성 현황 (Macros 스타일)
4. Page 4: 이번 주 하이라이트 (Best day, streak)

**Design Specs:**
- Card: rounded-2xl, shadow-md, bg-white
- Donut chart: Recharts PieChart (innerRadius/outerRadius)
- Color: green-500, yellow-500, red-500, gray-200
- Height: ~220px
- Swipe: CSS scroll-snap or touch event

### 3.4 Quick Stat Cards (NEW)

MyFitnessPal Steps/Exercise 요약 카드 스타일:

```
┌─────────────┐ ┌─────────────┐
│ 오늘 달성     │ │ 연속 달성     │
│  😊 3/5      │ │  🔥 5일       │
│ Goal: 5 habits│ │ Best: 12일    │
│ ████░░  60%  │ │              │
└─────────────┘ └─────────────┘
```

**Cards:**
- **오늘 달성**: 오늘 입력된 습관 수 / 전체 습관 수 + progress bar
- **연속 달성**: streak count + best streak

**Design Specs:**
- 2-column grid, gap-3
- Height: ~100px
- Rounded-xl, shadow-sm
- Progress bar: h-1.5, rounded-full

### 3.5 Habit Tracker (REDESIGN)

현재 카드 레이아웃을 더 컴팩트한 리스트 형태로 개선:

**Option A: Compact List (Recommended)**
```
┌─────────────────────────────────────┐
│ 📚 독서하기                    5/7 🟢 │
│ 월 화 수 목 금 토 일                   │
│ 🟢 🟢 🟡 🟢 __ 🟢 __                 │
├─────────────────────────────────────┤
│ 🏃 운동하기                    3/7 🟡 │
│ 월 화 수 목 금 토 일                   │
│ 🟢 __ 🟢 __ __ 🟢 __                 │
├─────────────────────────────────────┤
│ 🧹 정리정돈                    2/7 🔴 │
│ 월 화 수 목 금 토 일                   │
│ 🟢 __ __ __ __ 🟢 __                 │
└─────────────────────────────────────┘
│         [+ 습관 추가]                  │
```

**Key Changes:**
- 3색 버튼 대신 **한번 탭으로 순환**: 빈칸 → 초록 → 노랑 → 빨강 → 빈칸
- 7일을 한 줄로 표시 (요일 헤더 공유)
- 각 셀: 32px circle, gap-1
- 주간 점수를 우상단에 색상 인디케이터와 함께 표시
- 삭제는 왼쪽 스와이프 or 편집 모드

**터치 인터랙션:**
- Single tap: 색상 순환 (빈칸→초록→노랑→빨강→빈칸)
- Long press: 색상 선택 팝오버 (기존 3버튼 방식)
- Swipe left: 삭제 확인

### 3.6 Reflection & Reward Section (REDESIGN)

MyFitnessPal "COMPLETE DIARY" 스타일:

```
┌─────────────────────────────────────┐
│  📝 이번 주 돌아보기                    │
│                                       │
│  가장 잘한 점   [텍스트 입력...]         │
│  어려웠던 점    [텍스트 입력...]         │
│  다음 주 목표   [텍스트 입력...]         │
│                                       │
│  🏆 보상 아이디어                       │
│  [텍스트 입력...]                       │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │       이번 주 완료하기            │  │
│  └─────────────────────────────────┘  │
│                                       │
│  [영양분석]  [메모]                     │
└─────────────────────────────────────┘
```

**Key Changes:**
- 돌아보기 3개 + 보상을 하나의 카드에 통합
- 각 필드를 접을 수 있는 아코디언 방식 (처음엔 접혀있음)
- "이번 주 완료하기" = 저장 버튼 (큰 CTA)
- 하단에 보조 버튼 2개 (대시보드 바로가기, 메모)

### 3.7 Floating Save Button (NEW)

```
                          ┌─────┐
                          │ 💾  │  ← FAB (Floating Action Button)
                          └─────┘
```

**Design Specs:**
- Position: fixed, bottom-20 (탭바 위), right-4
- Size: 56px circle
- Color: green-600, shadow-lg
- Icon: Save or CheckCircle
- Animation: pulse when unsaved changes exist
- Badge: 변경사항 수 표시

---

## 4. Color System Update

### Current → Proposed

| Element | Current | Proposed | Reason |
|---------|---------|----------|--------|
| **Primary** | purple-600 (#7C3AED) | blue-600 (#2563EB) | MyFitnessPal 스타일, 더 깔끔한 느낌 |
| **Background** | gradient blue-50 to purple-50 | gray-50 (#F9FAFB) | 플랫한 배경으로 카드 강조 |
| **Cards** | white/80 backdrop-blur | white, shadow-sm | 글래스모피즘 제거, 깔끔한 그림자 |
| **Active Tab** | N/A | blue-600 | 하단 탭 활성 색상 |
| **CTA Button** | green-600 | blue-600 | 통일된 브랜드 컬러 |
| **Traffic Light** | green/yellow/red-500 | 유지 | 핵심 UX, 변경 불필요 |

### Typography Scale (Mobile)

| Level | Current | Proposed | Usage |
|-------|---------|----------|-------|
| **H1** | text-2xl (24px) | text-xl (20px) | 페이지 타이틀 |
| **H2** | text-xl (20px) | text-lg (18px) | 섹션 타이틀 |
| **Body** | text-sm~base | text-sm (14px) | 본문 |
| **Caption** | text-xs (12px) | text-xs (12px) | 보조 텍스트 |
| **Tab Label** | N/A | 10px | 탭바 라벨 |

---

## 5. Component Architecture Changes

### New Components to Create

```
src/components/
├── layout/
│   ├── BottomTabBar.jsx          ← NEW: 하단 탭 네비게이션
│   ├── CompactHeader.jsx         ← NEW: 날짜 네비게이터 + 아이 선택
│   └── FloatingSaveButton.jsx    ← NEW: FAB 저장 버튼
├── summary/
│   ├── WeeklySummaryCard.jsx     ← NEW: 도넛 차트 요약
│   ├── QuickStatCards.jsx        ← NEW: 오늘달성/연속달성 카드
│   └── SummaryCarousel.jsx       ← NEW: 스와이프 캐러셀
├── tracker/
│   ├── CompactHabitList.jsx      ← NEW: 컴팩트 습관 리스트
│   ├── HabitRow.jsx              ← NEW: 단일 습관 행 (탭 순환)
│   └── ColorCyclePicker.jsx      ← NEW: 탭/롱프레스 색상 선택
└── reflection/
    └── UnifiedReflection.jsx     ← NEW: 통합 돌아보기/보상 카드
```

### Modified Components

| Component | Change | Description |
|-----------|--------|-------------|
| `App.jsx` | Major | boolean flag → tab-based routing |
| `NavigationButtons` | Remove | BottomTabBar로 대체 |
| `HabitTrackerView` | Refactor | CompactHabitList 사용 |
| `App.css` | Update | 새로운 레이아웃 CSS 추가 |

### State Management Changes

```javascript
// Before: Multiple boolean flags
showDashboard, showTemplateManager, showGoals,
showWeaknesses, showMandala, showWeeklyPlanner

// After: Single activeTab state
const [activeTab, setActiveTab] = useState('habits')
// 'habits' | 'planner' | 'learning' | 'dashboard' | 'more'

// Learning sub-tab
const [learningSubTab, setLearningSubTab] = useState('goals')
// 'goals' | 'mandala' | 'weaknesses'
```

---

## 6. Implementation Phases

### Phase A: Foundation (Layout Restructure)
1. BottomTabBar 컴포넌트 구현
2. CompactHeader 컴포넌트 구현
3. App.jsx를 tab-based routing으로 리팩토링
4. NavigationButtons 제거
5. Safe area / viewport 최적화

### Phase B: Home Tab (습관 추적)
1. WeeklySummaryCard (도넛 차트)
2. QuickStatCards (오늘/연속 달성)
3. CompactHabitList (탭 순환 방식)
4. FloatingSaveButton
5. UnifiedReflection (통합 돌아보기)

### Phase C: Visual Polish
1. Color system 업데이트 (purple → blue)
2. Card 스타일 통일 (글래스모피즘 → flat shadow)
3. Typography scale 조정
4. Animation/transition 추가
5. Dark mode 업데이트

### Phase D: Enhanced Interactions
1. Swipe-to-delete on habits
2. Long-press color picker
3. Pull-to-refresh
4. Haptic feedback (진동)
5. Skeleton loading states

---

## 7. Responsive Breakpoint Strategy

```
Mobile (< 640px):   Bottom tabs + compact layout (PRIMARY TARGET)
Tablet (640-1024px): Bottom tabs + 2-column grid
Desktop (> 1024px):  Side navigation + full table layout (기존 유지)
```

### Desktop Preservation
- 데스크톱 테이블 레이아웃은 유지 (md:block)
- 새로운 모바일 레이아웃은 md:hidden
- BottomTabBar는 lg:hidden (데스크톱에서 숨김)
- 데스크톱은 기존 상단 NavigationButtons 유지하거나 좌측 사이드바로 전환

---

## 8. Performance Considerations

| Optimization | Method |
|-------------|--------|
| **Code Splitting** | 이미 lazy() 적용 - 유지 |
| **Chart Lazy Load** | 도넛 차트는 viewport 진입 시 로드 |
| **Image Optimization** | SVG 아이콘 사용 (Lucide) |
| **Touch Optimization** | passive event listeners |
| **Scroll Performance** | will-change, transform 사용 |
| **Bundle Impact** | 캐러셀은 CSS scroll-snap으로 구현 (라이브러리 불필요) |

---

## 9. Accessibility Checklist

- [ ] Touch target minimum 44px 유지
- [ ] Color contrast ratio 4.5:1 이상
- [ ] Screen reader: aria-label on tabs, buttons
- [ ] Keyboard navigation: Tab order 정리
- [ ] Reduced motion: prefers-reduced-motion 지원
- [ ] Focus visible: 모든 인터랙티브 요소

---

## 10. Visual Comparison

### Before (Current)
```
┌─────────────────────────────┐
│ [로그아웃]                    │ ← 16px
│ [아이변경] 주간습관성장챌린지    │ ← 60px
│ [템플릿][목표][약점]...        │ ← 80px  (Navigation)
│ 이름|날짜|기간|테마            │ ← 120px (Header Fields)
│ 색상 코드 카드                 │ ← 100px
│ ─────────────────────        │
│ 습관 추적표 (카드 레이아웃)      │ ← Variable
│ ─────────────────────        │
│ 돌아보기 카드 1               │
│ 돌아보기 카드 2               │
│ 보상 카드                    │
│ 서명 카드                    │
└─────────────────────────────┘
Total header area: ~376px (화면의 ~56%)
```

### After (Proposed)
```
┌─────────────────────────────┐
│ ◀ 3/10~3/16 ▶    [아이🔽]   │ ← 48px (Compact Header)
│                              │
│ ┌──────────────────────────┐ │
│ │  도넛차트 57% 달성        │ │ ← 200px (Summary)
│ └──────────────────────────┘ │
│ ┌────────┐ ┌────────┐       │
│ │오늘 3/5│ │연속 5일 │       │ ← 80px (Quick Stats)
│ └────────┘ └────────┘       │
│                              │
│ 📚 독서하기          5/7 🟢  │ ← Compact Habit List
│ 🟢🟢🟡🟢__🟢__              │
│ 🏃 운동하기          3/7 🟡  │
│ 🟢__🟢____🟢__              │
│ ...                          │
│                          💾  │ ← FAB
│ ─────────────────────────── │
│ [습관] [계획] [학습] [보드] [···] │ ← 56px (Bottom Tab)
└─────────────────────────────┘
Total header area: ~48px (화면의 ~7%)
Content-first layout!
```

---

## Summary

이 디자인은 MyFitnessPal의 검증된 모바일 UX 패턴을 습관 트래커에 맞게 적용합니다:

1. **Bottom Tab** → 네비게이션을 하단으로 이동, 콘텐츠 영역 극대화
2. **Summary Card** → 도넛 차트로 즉시 달성률 파악
3. **Compact Habit List** → 탭 순환으로 3버튼 → 1셀 터치
4. **FAB Save** → 항상 접근 가능한 저장 버튼
5. **Clean Header** → 56% → 7%로 헤더 축소

핵심은 **"콘텐츠 우선, 네비게이션은 하단"** 원칙입니다.
