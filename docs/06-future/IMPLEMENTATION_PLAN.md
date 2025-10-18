# 향상된 대시보드 기능 - 상세 구현 계획

**작성일**: 2025-10-18
**버전**: 1.0 (Technical)
**예상 일정**: 4-6주

---

## 📊 프로젝트 개요

| 항목 | 설명 |
|------|------|
| **목표** | 단순한 4주 대시보드 → 종합적인 다중 대시보드 시스템 |
| **범위** | 비교, 추세, 자기인식, 월간 상세, 실시간 동기화 |
| **팀** | 1 PM (당신) + 1-2 개발자 (필요시) |
| **기간** | 4-6주 |
| **우선순위** | HIGH |
| **의존성** | Phase 3 완료 (RLS), Supabase |

---

## 🛠️ 기술 스택 (상세)

### 프론트엔드

#### 라이브러리
```json
{
  "react": "^18.2.0",
  "react-query": "^3.39.3",
  "@supabase/supabase-js": "^2.x",
  "recharts": "^2.10.0",
  "date-fns": "^2.30.0",
  "tailwindcss": "^3.3.0",
  "lucide-react": "^latest",
  "lodash": "^4.17.21"
}
```

#### 컴포넌트 구조
```
src/components/
├── Dashboard/
│   ├── DashboardHub.jsx              # 메인 허브
│   ├── TabNavigation.jsx             # 5개 탭 네비게이션
│   │
│   ├── ComparisonDashboard/
│   │   ├── ComparisonChart.jsx       # 막대 그래프
│   │   ├── ComparisonCard.jsx        # 아이별 카드
│   │   └── ComparisonFilters.jsx     # 필터 UI
│   │
│   ├── TrendDashboard/
│   │   ├── TrendChart.jsx            # 라인/면적 차트
│   │   ├── TrendTable.jsx            # 주별 데이터 테이블
│   │   └── TrendControls.jsx         # 기간 선택 등
│   │
│   ├── SelfAwarenessDashboard/
│   │   ├── StrengthCard.jsx          # 강점 분석
│   │   ├── WeaknessCard.jsx          # 약점 분석
│   │   ├── InsightGeneration.jsx     # AI 제안
│   │   └── GoalSetting.jsx           # 목표 설정 폼
│   │
│   ├── MonthlyDashboard/
│   │   ├── MonthSelector.jsx         # 월 선택
│   │   ├── HeatmapCalendar.jsx       # 히트맵
│   │   ├── MonthlySummary.jsx        # 월별 통계
│   │   └── ExportButtons.jsx         # 내보내기 버튼
│   │
│   └── Sync/
│       ├── SyncStatus.jsx            # 동기화 상태 표시
│       ├── RealtimeListener.jsx      # Realtime 리스너
│       └── NotificationBadge.jsx     # 실시간 알림
│
├── charts/
│   ├── CustomBarChart.jsx            # 커스텀 막대 차트
│   ├── CustomLineChart.jsx           # 커스텀 라인 차트
│   └── HeatmapGrid.jsx               # 히트맵 그리드
│
└── common/
    ├── LoadingSpinner.jsx
    ├── ErrorBoundary.jsx
    └── EmptyState.jsx
```

### 백엔드

#### Edge Function: 데이터 집계

**파일**: `supabase/functions/dashboard-aggregation/index.ts`

```typescript
/**
 * 대시보드 데이터 집계 함수
 * 역할:
 * 1. 다중 아이 비교 데이터
 * 2. 기간별 추세 계산
 * 3. 자기인식 분석
 * 4. 월간 요약 통계
 */

export async function aggregateCompletionByChild(
  supabase,
  userId: string,
  weekStart?: Date
): Promise<ComparisonData[]> {
  // 쿼리: 모든 아이의 이번 주 달성률
}

export async function calculateTrends(
  supabase,
  childId: string,
  weeks: number
): Promise<TrendData[]> {
  // 쿼리: N주간 주별 추세
}

export async function generateInsights(
  supabase,
  childId: string,
  weeks: number = 4
): Promise<InsightData> {
  // 분석: 약점, 강점, 패턴
}

export async function getMonthlyStats(
  supabase,
  childId: string,
  year: number,
  month: number
): Promise<MonthlySummary> {
  // 쿼리: 특정 월의 통계
}
```

#### 데이터베이스 뷰

**파일**: `supabase/migrations/017_create_dashboard_views.sql`

```sql
-- 뷰 1: 일별 달성률
CREATE OR REPLACE VIEW v_daily_completion AS
SELECT
  c.id as child_id,
  c.user_id,
  c.name as child_name,
  DATE(hr.record_date) as record_date,
  COUNT(DISTINCT h.id) as total_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'green' THEN h.id END) as completed_habits,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as completion_rate
FROM children c
LEFT JOIN weeks w ON c.id = w.child_id
LEFT JOIN habits h ON w.id = h.week_id
LEFT JOIN habit_records hr ON h.id = hr.habit_id
GROUP BY c.id, c.user_id, c.name, DATE(hr.record_date);

-- 뷰 2: 주별 달성률
CREATE OR REPLACE VIEW v_weekly_completion AS
SELECT
  c.id as child_id,
  c.user_id,
  c.name as child_name,
  w.id as week_id,
  w.week_start_date,
  w.week_end_date,
  COUNT(DISTINCT h.id) as total_habits,
  COUNT(DISTINCT CASE WHEN hr.status = 'green' THEN h.id END) as completed_habits,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status = 'green' THEN 1 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as completion_rate
FROM children c
LEFT JOIN weeks w ON c.id = w.child_id
LEFT JOIN habits h ON w.id = h.week_id
LEFT JOIN habit_records hr ON h.id = hr.habit_id
GROUP BY c.id, c.user_id, c.name, w.id, w.week_start_date, w.week_end_date;

-- 뷰 3: 습관별 실패 패턴
CREATE OR REPLACE VIEW v_habit_failure_patterns AS
SELECT
  c.id as child_id,
  h.id as habit_id,
  h.name as habit_name,
  EXTRACT(DOW FROM hr.record_date) as day_of_week,
  COUNT(*) as total_records,
  COUNT(CASE WHEN hr.status != 'green' THEN 1 END) as failure_count,
  ROUND(
    100.0 * COUNT(CASE WHEN hr.status != 'green' THEN 1 END) / COUNT(*),
    2
  ) as failure_rate
FROM children c
JOIN weeks w ON c.id = w.child_id
JOIN habits h ON w.id = h.week_id
JOIN habit_records hr ON h.id = hr.habit_id
GROUP BY c.id, h.id, h.name, EXTRACT(DOW FROM hr.record_date);
```

### 상태 관리

#### React Query 설정

```typescript
// hooks/useDashboardData.ts

export function useComparisonData(userId: string) {
  return useQuery(
    ['comparison', userId],
    () => fetchComparisonData(userId),
    {
      staleTime: 5 * 60 * 1000, // 5분
      refetchInterval: 30 * 1000, // 30초마다
    }
  );
}

export function useTrendData(childId: string, weeks: number) {
  return useQuery(
    ['trend', childId, weeks],
    () => fetchTrendData(childId, weeks),
    {
      staleTime: 10 * 60 * 1000, // 10분
    }
  );
}

export function useRealtimeSync(childId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .from(`habit_records`)
      .on('*', (payload) => {
        queryClient.invalidateQueries(['trend', childId]);
        queryClient.invalidateQueries(['comparison']);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [childId, queryClient]);
}
```

---

## 📋 구현 단계별 상세 계획

### Phase 1: 기초 (Week 1)

#### 1.1 데이터베이스 준비
- [ ] 마이그레이션 파일 작성 (뷰 3개)
- [ ] 인덱스 최적화
- [ ] 샘플 데이터로 쿼리 테스트

**SQL 파일**: `supabase/migrations/017_create_dashboard_views.sql`

#### 1.2 Edge Function
- [ ] 기본 함수 구조 생성
- [ ] `aggregateCompletionByChild()` 구현
- [ ] 에러 처리 및 로깅
- [ ] 로컬 테스트

**파일**: `supabase/functions/dashboard-aggregation/index.ts`

#### 1.3 프론트엔드 기초
- [ ] DashboardHub 컴포넌트 생성
- [ ] 탭 네비게이션 구현
- [ ] React Query 설정

**파일들**:
- `src/components/Dashboard/DashboardHub.jsx`
- `src/components/Dashboard/TabNavigation.jsx`
- `src/hooks/useDashboardData.ts`

#### 1.4 테스트
- [ ] 데이터 정확성 검증
- [ ] 쿼리 성능 측정
- [ ] 에러 케이스 테스트

**완료 기준**:
- ✅ Edge Function 배포 완료
- ✅ 샘플 데이터로 검증
- ✅ 로컬 개발 환경에서 테스트 완료

---

### Phase 2: 비교 & 추세 대시보드 (Week 2-3)

#### 2.1 비교 대시보드
- [ ] ComparisonChart 컴포넌트 (Recharts 막대 그래프)
- [ ] ComparisonCard 컴포넌트
- [ ] 필터링 UI (주/월 선택)
- [ ] 순위 표시 로직

**파일들**:
```
src/components/Dashboard/ComparisonDashboard/
├── ComparisonChart.jsx
├── ComparisonCard.jsx
├── ComparisonFilters.jsx
└── useComparisonData.ts
```

**작업 예시**:
```typescript
// ComparisonChart.jsx
function ComparisonChart({ data }) {
  return (
    <BarChart data={data} width={800} height={400}>
      <CartesianGrid />
      <XAxis dataKey="childName" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="completionRate" fill="#10B981" />
    </BarChart>
  );
}
```

#### 2.2 추세 대시보드
- [ ] TrendChart 컴포넌트 (라인 차트)
- [ ] TrendTable 컴포넌트 (주별 데이터)
- [ ] 기간 선택 (4주, 8주, 12주, 등)
- [ ] 통계 요약 (평균, 최고, 최저)

**파일들**:
```
src/components/Dashboard/TrendDashboard/
├── TrendChart.jsx
├── TrendTable.jsx
├── TrendControls.jsx
└── useTrendData.ts
```

**작업 예시**:
```typescript
// TrendChart.jsx
function TrendChart({ data, weeks }) {
  return (
    <LineChart data={data}>
      <CartesianGrid />
      <XAxis dataKey="week" />
      <YAxis domain={[0, 100]} />
      <Line type="monotone" dataKey="rate" stroke="#3B82F6" />
    </LineChart>
  );
}
```

#### 2.3 테스트
- [ ] 차트 렌더링 검증
- [ ] 데이터 정확성 확인
- [ ] 반응형 동작 테스트
- [ ] 성능 측정 (<2초 로드)

**완료 기준**:
- ✅ 모든 차트 정상 렌더링
- ✅ 데이터 정확성 100%
- ✅ 페이지 로드 시간 <2초

---

### Phase 3: 자기인식 대시보드 (Week 3-4)

#### 3.1 패턴 분석 로직
- [ ] `calculateWeaknesses()` 함수
- [ ] `calculateStrengths()` 함수
- [ ] `identifyPatterns()` 함수 (요일별, 시간대별)
- [ ] 추세 분석 (상승/하락)

**파일**: `src/lib/analysis.ts`

```typescript
export function identifyWeaknesses(data: HabitRecord[]): Weakness[] {
  // 가장 못한 습관들 추출
  // 실패율 계산
  // 요일별 패턴 분석
}

export function identifyPatterns(data: HabitRecord[]) {
  // 요일별 패턴 (월요일이 가장 어렵다 등)
  // 시간대별 패턴 (저녁이 어렵다 등)
  // 최근 하락세 습관들
}
```

#### 3.2 UI 컴포넌트
- [ ] StrengthCard 컴포넌트
- [ ] WeaknessCard 컴포넌트
- [ ] InsightGeneration 컴포넌트 (제안 텍스트)
- [ ] GoalSetting 컴포넌트 (폼)

**파일들**:
```
src/components/Dashboard/SelfAwarenessdashboard/
├── StrengthCard.jsx
├── WeaknessCard.jsx
├── InsightGeneration.jsx
├── GoalSetting.jsx
└── useInsights.ts
```

**작업 예시**:
```typescript
// StrengthCard.jsx
function StrengthCard({ strength }) {
  return (
    <div className="card bg-green-50">
      <h3>🥇 {strength.habitName}</h3>
      <p className="text-xl">{strength.rate}%</p>
      <p className="insight">{strength.message}</p>
    </div>
  );
}
```

#### 3.3 데이터베이스 확장
- [ ] `insights_log` 테이블 추가 (선택)
- [ ] `user_goals` 테이블 추가 (선택)

```sql
CREATE TABLE insights_log (
  id UUID PRIMARY KEY,
  child_id UUID FOREIGN KEY,
  week_start_date DATE,
  insights JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE user_goals (
  id UUID PRIMARY KEY,
  child_id UUID FOREIGN KEY,
  week_start_date DATE,
  goal_text TEXT,
  parent_encouragement TEXT,
  created_at TIMESTAMPTZ
);
```

#### 3.4 테스트
- [ ] 분석 로직 정확성
- [ ] 제안 문구 검증
- [ ] 목표 저장/로드 테스트

**완료 기준**:
- ✅ 분석 로직 정확도 >95%
- ✅ 제안이 부모/아이에게 적절함
- ✅ 목표 저장/조회 정상 작동

---

### Phase 4: 월간 상세 대시보드 (Week 4)

#### 4.1 월별 데이터 조회
- [ ] `getMonthlyStats()` Edge Function
- [ ] 월 단위 쿼리 최적화
- [ ] 히트맵 데이터 생성

**파일**: `src/lib/monthly-data.ts`

```typescript
export async function getMonthlyStats(
  childId: string,
  year: number,
  month: number
) {
  // 월별 집계
  // 주별 요약
  // 일별 상세
}
```

#### 4.2 UI 컴포넌트
- [ ] MonthSelector 컴포넌트 (캘린더 또는 탭)
- [ ] HeatmapCalendar 컴포넌트
- [ ] MonthlySummary 컴포넌트
- [ ] ExportButtons 컴포넌트 (PDF, Excel)

**파일들**:
```
src/components/Dashboard/MonthlyDashboard/
├── MonthSelector.jsx
├── HeatmapCalendar.jsx
├── MonthlySummary.jsx
├── ExportButtons.jsx
└── useMonthlyData.ts
```

**작업 예시**:
```typescript
// HeatmapCalendar.jsx
function HeatmapCalendar({ data, monthStart }) {
  return (
    <div className="grid grid-cols-7">
      {data.map(day => (
        <div
          key={day.date}
          className={`cell ${getColorClass(day.rate)}`}
          title={`${day.date}: ${day.rate}%`}
        >
          {day.rate}%
        </div>
      ))}
    </div>
  );
}
```

#### 4.3 내보내기 기능
- [ ] PDF 생성 (html2pdf 라이브러리)
- [ ] Excel 내보내기 (xlsx 라이브러리)
- [ ] 서버 사이드 생성 (선택)

```typescript
// export-utils.ts
export async function generatePDF(monthlyData) {
  const html = formatMonthlyDataAsHTML(monthlyData);
  return html2pdf(html);
}

export async function generateExcel(monthlyData) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(monthlyData);
  XLSX.utils.book_append_sheet(workbook, sheet);
  return XLSX.write(workbook, { bookType: 'xlsx' });
}
```

#### 4.4 테스트
- [ ] 월별 데이터 정확성
- [ ] 히트맵 렌더링
- [ ] PDF/Excel 생성 검증

**완료 기준**:
- ✅ 모든 월의 데이터 정상 조회
- ✅ 히트맵 정확성 100%
- ✅ 내보내기 기능 정상 작동

---

### Phase 5: 실시간 동기화 (Week 4-5)

#### 5.1 Supabase Realtime 설정
- [ ] Realtime 구독 설정
- [ ] 이벤트 리스너 등록
- [ ] 자동 새로고침 로직

**파일**: `src/hooks/useRealtimeSync.ts`

```typescript
export function useRealtimeSync(childId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // habit_records 변경 구독
    const subscription = supabase
      .from(`habit_records`)
      .on('INSERT', (payload) => {
        console.log('New record:', payload);
        queryClient.invalidateQueries(['trend', childId]);
      })
      .on('UPDATE', (payload) => {
        queryClient.invalidateQueries(['comparison']);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [childId, queryClient]);
}
```

#### 5.2 상태 표시
- [ ] SyncStatus 컴포넌트
- [ ] 연결 상태 표시 (🟢 온라인 / 🔴 오프라인)
- [ ] 마지막 업데이트 시간

**파일**: `src/components/Dashboard/Sync/SyncStatus.jsx`

```typescript
function SyncStatus({ isConnected, lastUpdate }) {
  return (
    <div className="status-bar">
      <span className={isConnected ? 'green' : 'red'}>
        {isConnected ? '🟢 연결됨' : '🔴 오프라인'}
      </span>
      <span>마지막 업데이트: {formatTime(lastUpdate)}</span>
    </div>
  );
}
```

#### 5.3 실시간 알림
- [ ] NotificationBadge 컴포넌트
- [ ] 토스트 알림 (완료, 격려 메시지)
- [ ] 사운드/진동 (선택)

#### 5.4 멀티 디바이스 테스트
- [ ] 모바일 & 웹 동시 테스트
- [ ] 데이터 충돌 해결 (Last-Write-Wins)
- [ ] 오프라인 모드 테스트

**완료 기준**:
- ✅ 실시간 업데이트 <500ms
- ✅ 멀티 디바이스 동기화 검증
- ✅ 오프라인 모드 정상 작동

---

## 🧪 테스트 계획

### 단위 테스트 (Unit Tests)

```typescript
// __tests__/analysis.test.ts
describe('Habit Analysis', () => {
  it('should identify weaknesses correctly', () => {
    const data = [...];
    const result = identifyWeaknesses(data);
    expect(result).toEqual([...]);
  });

  it('should calculate trends accurately', () => {
    // Test cases
  });
});
```

### 통합 테스트 (Integration Tests)

```typescript
// __tests__/dashboard.integration.test.ts
describe('Dashboard Integration', () => {
  it('should render comparison dashboard with real data', async () => {
    // Setup
    // Render
    // Assert
  });
});
```

### E2E 테스트 (Playwright)

```typescript
// e2e/dashboard.e2e.ts
test('Parent can view all children comparison', async ({ page }) => {
  await page.login('parent@example.com');
  await page.goto('/dashboard');
  await page.click('[data-testid="comparison-tab"]');
  // Assertions
});
```

### 성능 테스트

```typescript
// 로드 시간: <2초
// Lighthouse 점수: >80
// 번들 크기 증가: <50KB
```

---

## 📦 배포 계획

### 단계별 배포

1. **Staging 배포** (Week 5-6)
   - 개발팀 테스트
   - 성능 모니터링
   - 피드백 수집

2. **베타 배포** (Week 6)
   - 선별된 사용자 그룹
   - 실시간 피드백
   - 버그 수집

3. **프로덕션 배포** (Week 7)
   - 전체 사용자 롤아웃
   - 모니터링 강화
   - 긴급 패치 준비

### 롤백 계획

- 이전 대시보드 버전 유지
- 기능 플래그로 토글 가능
- 5분 내 롤백 가능

---

## 📈 성공 지표 (KPIs)

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| **페이지 로드** | <2초 | Lighthouse |
| **실시간 동기화** | <500ms | Realtime 테스트 |
| **데이터 정확도** | 100% | 검증 테스트 |
| **사용자 만족도** | >4/5 | 피드백 설문 |
| **버그 밀도** | <5 bugs/1000 LOC | 버그 추적 |

---

## 💰 자원 추정

| 항목 | 시간 | 비용 (예상) |
|------|------|-----------|
| 설계 및 계획 | 8시간 | $200 |
| 프론트엔드 개발 | 60시간 | $1,500 |
| 백엔드 개발 | 30시간 | $750 |
| 테스트 | 20시간 | $500 |
| 배포 & 모니터링 | 12시간 | $300 |
| **총합** | **130시간** | **$3,250** |

---

## ⚠️ 리스크 및 대책

| 리스크 | 영향도 | 대책 |
|--------|--------|------|
| 데이터 쿼리 성능 | HIGH | 뷰 인덱싱, 캐싱 |
| Realtime 지연 | MEDIUM | 폴링 백업 |
| 큰 데이터셋 처리 | MEDIUM | 페이지네이션, 가상화 |
| 모바일 성능 | MEDIUM | 번들 최적화 |

---

## 📅 일정 (Gantt Chart)

```
Week 1: [데이터베이스 ████████████][Edge Fn ████][프론트엔드 ████]
Week 2: [비교 대시보드 ████████████████████]
Week 3: [추세 대시보드 ████████][자기인식 ████████]
Week 4: [월간 상세 ████████][실시간 동기화 ████]
Week 5: [테스트/배포 ████████████]
Week 6: [베타/모니터링 ████████]
Week 7: [프로덕션 롤아웃 ████]
```

---

**버전**: 1.0 (Technical)
**상태**: 📋 준비 완료
**다음 단계**: 개발 시작 승인
