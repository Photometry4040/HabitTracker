# 🚀 Phase 1 배포 가이드 - 향상된 대시보드

**상태**: Phase 1 준비 완료
**날짜**: 2025-10-18
**다음 단계**: 데이터베이스 및 Edge Function 배포

---

## 📋 Phase 1 완성 체크리스트

### ✅ 생성된 파일들

**데이터베이스 마이그레이션**
- ✅ `supabase/migrations/017_create_dashboard_views.sql`
  - v_daily_completion 뷰 (일별 달성률)
  - v_weekly_completion 뷰 (주별 달성률)
  - v_habit_failure_patterns 뷰 (실패 패턴)
  - 성능 인덱스 최적화

**Edge Function**
- ✅ `supabase/functions/dashboard-aggregation/index.ts`
  - `getComparisonData()` - 모든 아이 비교
  - `getTrendData()` - 기간별 추세
  - `generateInsights()` - 자기인식 분석
  - `getMonthlyStats()` - 월간 통계

**프론트엔드 기초**
- ✅ `src/hooks/useDashboardData.ts`
  - `useComparisonData()` - 비교 데이터 훅
  - `useTrendData()` - 추세 데이터 훅
  - `useInsights()` - 인사이트 데이터 훅
  - `useMonthlyStats()` - 월간 통계 훅

- ✅ `src/components/Dashboard/DashboardHub.jsx`
  - 메인 대시보드 컨테이너
  - 탭 관리
  - 기본 레이아웃

- ✅ `src/components/Dashboard/TabNavigation.jsx`
  - 5개 탭 네비게이션
  - 반응형 디자인
  - 아이콘 표시

---

## 🔧 배포 단계별 가이드

### Step 1: 데이터베이스 마이그레이션 실행

**Supabase SQL Editor에서 실행:**

```bash
# 파일 경로
supabase/migrations/017_create_dashboard_views.sql
```

**또는 CLI로 실행:**
```bash
supabase db push
```

**검증 쿼리 (Supabase SQL Editor):**
```sql
-- 뷰 확인
SELECT schemaname, viewname FROM pg_views
WHERE viewname IN (
  'v_daily_completion',
  'v_weekly_completion',
  'v_habit_failure_patterns'
);

-- Expected output: 3개 뷰 표시

-- 샘플 데이터 확인
SELECT * FROM v_weekly_completion
LIMIT 5;
```

**완료 조건:**
- ✅ 3개 뷰가 생성됨
- ✅ 샘플 데이터로 테스트 성공
- ✅ 쿼리 성능 <1초

---

### Step 2: Edge Function 배포

**Option A: Supabase CLI (권장)**

```bash
# 1. CLI 설치 (이미 설치되었으면 스킵)
npm install -g supabase

# 2. 프로젝트 초기화 (이미 되었으면 스킵)
supabase init

# 3. 환경 변수 설정
# .env.local에 다음 추가:
SUPABASE_ACCESS_TOKEN=your_access_token
SUPABASE_PROJECT_ID=your_project_id

# 4. Edge Function 배포
supabase functions deploy dashboard-aggregation --no-verify
```

**Option B: Supabase 대시보드**

1. Supabase 대시보드 → Edge Functions
2. "Create new function" → "dashboard-aggregation"
3. 파일 내용 복사/붙여넣기: `supabase/functions/dashboard-aggregation/index.ts`
4. "Deploy" 클릭

**테스트 (Supabase SQL Editor):**

```javascript
// POST /functions/v1/dashboard-aggregation
// Headers: Authorization: Bearer <access_token>

{
  "operation": "comparison",
  "data": {
    "userId": "your_user_id_here"
  }
}

// Expected response:
{
  "success": true,
  "result": {
    "children": [
      {
        "child_id": "...",
        "child_name": "영희",
        "current_rate": 92,
        "rank": 1,
        "rank_emoji": "🥇"
      }
    ]
  }
}
```

**완료 조건:**
- ✅ Edge Function 배포됨
- ✅ 테스트 요청 성공 (200 응답)
- ✅ 데이터 반환됨

---

### Step 3: 프론트엔드 통합

**1. 필수 라이브러리 확인:**

```bash
npm list react-query recharts lucide-react
```

필요시 설치:
```bash
npm install react-query recharts lucide-react
```

**2. 컴포넌트 경로 확인:**

```
src/components/Dashboard/
├── DashboardHub.jsx          ✅ 생성됨
├── TabNavigation.jsx         ✅ 생성됨
├── ComparisonDashboard/      (다음 Phase)
├── TrendDashboard/           (다음 Phase)
├── SelfAwarenessDashboard/   (다음 Phase)
└── MonthlyDashboard/         (다음 Phase)
```

**3. 프론트엔드 훅 설정:**

```typescript
// src/hooks/useDashboardData.ts
// 이미 생성됨 ✅
```

**4. 환경 변수 확인:**

`.env`에 다음이 이미 있는지 확인:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

### Step 4: 로컬 테스트

**1. 개발 서버 실행:**

```bash
npm run dev
```

**2. 브라우저에서 확인:**

```
http://localhost:5173/dashboard
```

**테스트할 사항:**
- ✅ 대시보드 페이지 로드
- ✅ TabNavigation 5개 탭 표시
- ✅ 콘솔에 에러 없음
- ✅ (API 호출 시작 전 로딩 스피너)

**3. 네트워크 탭 확인:**

개발자 도구 → Network
- Edge Function 호출 성공 여부 확인
- 응답 상태 200인지 확인
- 응답 데이터 확인

---

## 🧪 통합 테스트 체크리스트

### 데이터베이스 테스트

```sql
-- 1. 뷰 성능 테스트
EXPLAIN ANALYZE
SELECT * FROM v_weekly_completion
WHERE user_id = 'test_user_id'
LIMIT 10;

-- Expected: Execution Time < 100ms

-- 2. 데이터 정확성 테스트
SELECT
  child_id,
  week_start_date,
  total_habits,
  completed_habits,
  completion_rate
FROM v_weekly_completion
WHERE user_id = 'test_user_id'
ORDER BY week_start_date DESC
LIMIT 5;

-- Expected: completion_rate 계산 정확
```

### Edge Function 테스트

```bash
# 각 operation 테스트
curl -X POST https://your-project.supabase.co/functions/v1/dashboard-aggregation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "comparison",
    "data": {"userId": "USER_ID"}
  }'
```

### 프론트엔드 테스트

```javascript
// 브라우저 콘솔에서
import { useComparisonData } from '@/hooks/useDashboardData';

// 테스트 코드는 React 컴포넌트 내에서만 가능
// 각 대시보드 컴포넌트에서 데이터 로딩 확인
```

---

## ⚠️ 일반적인 문제 해결

### 문제 1: "Edge Function not found"
**원인**: 함수 배포 실패
**해결**:
```bash
supabase functions deploy dashboard-aggregation --no-verify
```

### 문제 2: "Unauthorized" (401)
**원인**: JWT 토큰 만료 또는 잘못됨
**해결**: 로그인 후 새로운 토큰으로 시도

### 문제 3: "RLS policy violation"
**원인**: 사용자가 다른 사용자의 데이터에 접근 시도
**해결**: RLS 정책이 올바르게 적용되었는지 확인 (정상)

### 문제 4: 뷰에 데이터 없음
**원인**: 데이터베이스에 충분한 기록 부족
**해결**: 샘플 데이터 추가 또는 테스트 데이터 생성

---

## 📊 성능 메트릭

### Phase 1 성능 목표

| 메트릭 | 목표 | 검증 방법 |
|--------|------|---------|
| 뷰 쿼리 응답 | <100ms | EXPLAIN ANALYZE |
| Edge Function 응답 | <500ms | Network tab |
| 페이지 로드 | <2초 | Lighthouse |
| 번들 크기 증가 | <100KB | npm build |

### 모니터링

**Supabase 대시보드:**
- Edge Functions → Logs (배포 확인)
- SQL Editor (뷰 성능 확인)

**브라우저 DevTools:**
- Network tab (API 응답 시간)
- Console (에러 메시지)
- Lighthouse (성능 점수)

---

## 🎯 Phase 1 완료 기준

✅ **모두 충족해야 합니다:**

- [ ] 데이터베이스 뷰 3개 생성됨
- [ ] Edge Function 배포됨
- [ ] 로컬 테스트 성공
- [ ] 네트워크 요청 성공 (200 응답)
- [ ] 샘플 데이터 반환됨
- [ ] 콘솔 에러 없음
- [ ] 성능 메트릭 달성됨

---

## 📝 다음 Phase 준비

**Phase 2 시작 전 완료할 일:**

1. ✅ Phase 1 모든 테스트 완료
2. ✅ Edge Function 안정적 작동 확인
3. ✅ 데이터 정확성 검증
4. ⏳ 개발자 문서 준비 (진행 중)

---

## 🔗 참고 문서

- **기능 요구사항**: `ENHANCED_DASHBOARD_FEATURES.md`
- **UI/UX 설계**: `DASHBOARD_UI_MOCKUP.md`
- **구현 계획**: `IMPLEMENTATION_PLAN.md`
- **Supabase 문서**: https://supabase.com/docs

---

## 💬 피드백 & 질문

배포 중 문제가 발생하면:

1. **콘솔 에러 메시지 확인**
2. **Supabase 대시보드 로그 확인**
3. **네트워크 응답 상태 코드 확인**
4. **위의 문제 해결 섹션 참고**

---

**Phase 1 배포 가이드 완료!**

**다음 단계**: Phase 2 시작 (비교 & 추세 대시보드 UI)

---

**생성 날짜**: 2025-10-18
**상태**: 배포 준비 완료 ✅
