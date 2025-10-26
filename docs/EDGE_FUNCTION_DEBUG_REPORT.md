# 🐛 Edge Function 500 에러 디버깅 리포트

**날짜**: 2025-10-26
**Edge Function**: `dashboard-aggregation`
**상태**: 🔍 원인 파악 완료

---

## 📊 발견된 문제점

### 1. ❌ SQL JOIN 문법 오류 (Line 240-243)

**문제 코드**:
```typescript
const { data: habitData, error: habitError } = await supabase
  .from('habits h')
  .select('id, name')
  .join('weeks w', 'h.week_id = w.id')  // ❌ Supabase-JS는 JOIN을 지원하지 않음
  .eq('w.child_id', childId);
```

**에러 원인**:
- Supabase-JS 클라이언트는 `.join()` 메서드를 지원하지 않습니다
- PostgreSQL JOIN은 `.select()` 문자열 내에서 처리해야 합니다
- 또는 별도 쿼리로 분리하고 프론트엔드에서 조인해야 합니다

**올바른 접근**:
```typescript
// Option 1: Select with foreign key relation
const { data: habits, error } = await supabase
  .from('habits')
  .select('id, name, weeks!inner(child_id)')
  .eq('weeks.child_id', childId);

// Option 2: Separate queries
const { data: weeks } = await supabase
  .from('weeks')
  .select('id')
  .eq('child_id', childId);

const weekIds = weeks.map(w => w.id);
const { data: habits } = await supabase
  .from('habits')
  .select('id, name')
  .in('week_id', weekIds);
```

---

### 2. ⚠️ Database Views 의존성

Edge Function이 다음 3개의 뷰에 의존합니다:
- `v_weekly_completion` (line 107, 122, 180, 352)
- `v_daily_completion` (line 251, 339)
- `v_habit_failure_patterns` (line 263)

**확인 필요**:
```sql
-- 이 뷰들이 Supabase에 생성되어 있는지 확인
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%';
```

**예상 결과**:
```
table_name                   | table_type
-----------------------------+-----------
v_weekly_completion          | VIEW
v_daily_completion           | VIEW
v_habit_failure_patterns     | VIEW
```

---

### 3. 🔐 RLS (Row-Level Security) 이슈 가능성

Edge Function이 `SUPABASE_SERVICE_ROLE_KEY`를 사용하므로 RLS를 **무시**합니다.
하지만 뷰가 **Security Invoker 모드**로 생성되었다면:

```sql
-- Security Invoker 뷰는 호출자의 권한으로 실행됨
CREATE VIEW v_weekly_completion
WITH (security_invoker = true)  -- ⚠️ 이 옵션이 있으면 문제 발생 가능
AS ...
```

**해결책**:
- 뷰를 **Security Definer 모드**로 재생성 (Edge Function에서 사용 시)
- 또는 Edge Function에서 뷰 대신 직접 테이블 쿼리 사용

---

## 🔧 수정 사항 (우선순위 순)

### 우선순위 1: JOIN 문법 수정 (Critical)

**파일**: `supabase/functions/dashboard-aggregation/index.ts`
**Line**: 239-243

```typescript
// BEFORE (WRONG):
const { data: habitData, error: habitError } = await supabase
  .from('habits h')
  .select('id, name')
  .join('weeks w', 'h.week_id = w.id')
  .eq('w.child_id', childId);

// AFTER (CORRECT):
// Get weeks first, then habits
const { data: weeksData, error: weeksError } = await supabase
  .from('weeks')
  .select('id')
  .eq('child_id', childId);

if (weeksError) {
  throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
}

const weekIds = weeksData?.map(w => w.id) || [];

if (weekIds.length === 0) {
  return {
    strengths: [],
    weaknesses: [],
    overall_trend: 'stable',
    total_habits: 0,
    data_points: 0,
    timestamp: new Date().toISOString(),
  };
}

const { data: habitData, error: habitError } = await supabase
  .from('habits')
  .select('id, name')
  .in('week_id', weekIds);
```

---

### 우선순위 2: 에러 핸들링 강화

현재 에러 핸들링은 있지만, **어떤 함수에서 에러가 발생했는지** 알기 어렵습니다.

```typescript
// BEFORE:
catch (error) {
  console.error('Dashboard aggregation error:', error);
  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }),
    ...
  );
}

// AFTER:
catch (error) {
  console.error('Dashboard aggregation error:', error);
  console.error('Operation:', operation);
  console.error('Data:', data);
  console.error('Stack:', error.stack);  // 스택 트레이스 추가

  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
      operation: operation || 'unknown',  // 어떤 작업인지 명시
      timestamp: new Date().toISOString(),
    }),
    ...
  );
}
```

---

### 우선순위 3: Database Views 생성 확인

**파일**: `supabase/migrations/20251019142825_create_dashboard_views.sql`

이 마이그레이션이 실행되었는지 확인 필요:

```sql
-- Supabase SQL Editor에서 실행
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%dashboard_views%'
ORDER BY executed_at DESC;
```

---

## 🧪 테스트 계획

### Step 1: 로컬 테스트

```bash
# Edge Function 로컬 실행
supabase functions serve dashboard-aggregation

# 테스트 요청
curl -X POST http://localhost:54321/functions/v1/dashboard-aggregation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "operation": "insights",
    "data": {
      "childId": "test-child-id",
      "weeks": 4
    }
  }'
```

**예상 결과**:
- ❌ 현재: JOIN 에러로 500 응답
- ✅ 수정 후: 200 응답 with 정상 데이터

---

### Step 2: Database Views 확인

```sql
-- 1. 뷰 존재 확인
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name LIKE 'v_%';

-- 2. 각 뷰에서 데이터 조회 테스트
SELECT COUNT(*) FROM v_weekly_completion;
SELECT COUNT(*) FROM v_daily_completion;
SELECT COUNT(*) FROM v_habit_failure_patterns;

-- 3. Security Invoker 모드 확인
SELECT table_name,
       pg_get_viewdef(table_name::regclass) AS view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'v_weekly_completion';
```

---

### Step 3: 프로덕션 배포 전 체크리스트

- [ ] JOIN 문법 수정 완료
- [ ] 로컬 테스트 통과
- [ ] Database Views 생성 확인
- [ ] 에러 핸들링 강화
- [ ] Supabase Functions 로그 확인 활성화
- [ ] 프로덕션 배포
- [ ] 실시간 모니터링 (Supabase Dashboard → Functions → Logs)

---

## 📝 수정 코드 (완전한 generateInsights 함수)

```typescript
async function generateInsights(supabase: any, childId: string, weeks: number) {
  console.log(`[Insights] Generating insights for child: ${childId}`);

  try {
    // Step 1: Get weeks for this child
    const { data: weeksData, error: weeksError } = await supabase
      .from('weeks')
      .select('id')
      .eq('child_id', childId)
      .order('week_start_date', { ascending: false })
      .limit(weeks);

    if (weeksError) {
      throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
    }

    const weekIds = weeksData?.map((w: any) => w.id) || [];

    if (weekIds.length === 0) {
      console.log('[Insights] No weeks found for child');
      return {
        strengths: [],
        weaknesses: [],
        overall_trend: 'stable',
        total_habits: 0,
        data_points: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Step 2: Get habits for these weeks
    const { data: habitData, error: habitError } = await supabase
      .from('habits')
      .select('id, name, week_id')
      .in('week_id', weekIds);

    if (habitError) {
      throw new Error(`Failed to fetch habits: ${habitError.message}`);
    }

    // Step 3: Get recent completion data
    const { data: recentData, error: recentError } = await supabase
      .from('v_daily_completion')
      .select('record_date, completed_habits, total_habits, completion_rate')
      .eq('child_id', childId)
      .order('record_date', { ascending: false })
      .limit(weeks * 7);

    if (recentError) {
      throw new Error(`Failed to fetch recent data: ${recentError.message}`);
    }

    // Step 4: Get failure patterns
    const { data: patterns, error: patternError } = await supabase
      .from('v_habit_failure_patterns')
      .select('habit_name, day_name, failure_rate, success_rate')
      .eq('child_id', childId);

    if (patternError) {
      throw new Error(`Failed to fetch patterns: ${patternError.message}`);
    }

    // ... (rest of the analysis logic remains the same)

  } catch (error) {
    console.error('[Insights] Error:', error);
    throw error;
  }
}
```

---

## 🎯 결론

### 주요 원인
1. **Supabase-JS `.join()` 메서드 사용** → 500 에러의 직접적 원인
2. **Database Views 미생성 가능성** → 추가 확인 필요
3. **Security Invoker 모드** → RLS 이슈 가능성

### 해결 방안
1. ✅ JOIN 로직을 separate queries로 변경
2. ✅ 에러 핸들링 강화 (operation, stack trace)
3. ⏳ Database Views 생성 확인 필요
4. ⏳ Security Definer 모드로 뷰 재생성 고려

### 예상 결과
- 수정 후 Edge Function 정상 동작
- 프론트엔드에서 Edge Function 복원 가능
- Phase 4 원래 설계대로 복구

---

**작성일**: 2025-10-26
**우선순위**: High (프로덕션 영향)
**예상 수정 시간**: 30분
**테스트 시간**: 15분
