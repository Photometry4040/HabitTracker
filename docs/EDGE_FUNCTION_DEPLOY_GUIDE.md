# 🚀 Edge Function 배포 가이드

**날짜**: 2025-10-26
**Function**: `dashboard-aggregation`
**Status**: 수정 완료, 배포 대기

---

## 📋 Pre-Deploy Checklist

배포 전 확인 사항:

- [x] JOIN 문법 오류 수정 완료
- [x] 에러 핸들링 강화 완료
- [ ] Supabase CLI 인증 확인
- [ ] Database Views 생성 확인
- [ ] 로컬 테스트 (선택사항)
- [ ] 프로덕션 배포
- [ ] 배포 후 검증

---

## 🔑 Step 1: Supabase CLI 인증

### 1-1. Supabase 로그인
```bash
supabase login
```

**예상 출력**:
```
Opening browser for authentication...
✔ Logged in successfully
```

### 1-2. 프로젝트 링크 확인
```bash
supabase projects list
```

**예상 출력**:
```
┌────────────────────────┬──────────────────────┬────────────┐
│     Organization ID    │       Project ID     │    Name    │
├────────────────────────┼──────────────────────┼────────────┤
│ ...                    │ gqvyzqodyspvwlwfjmfg │ HabitTracker│
└────────────────────────┴──────────────────────┴────────────┘
```

### 1-3. 프로젝트 연결 (필요 시)
```bash
supabase link --project-ref gqvyzqodyspvwlwfjmfg
```

---

## 🗄️ Step 2: Database Views 확인

배포 전 Database Views가 생성되어 있는지 확인:

### 2-1. Supabase SQL Editor에서 실행
```sql
-- 1. 뷰 목록 확인
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%'
ORDER BY table_name;

-- 예상 결과:
-- v_daily_completion        | VIEW
-- v_habit_failure_patterns  | VIEW
-- v_weekly_completion       | VIEW
```

### 2-2. 각 뷰 데이터 확인
```sql
-- 데이터 있는지 확인
SELECT COUNT(*) as count FROM v_weekly_completion;
SELECT COUNT(*) as count FROM v_daily_completion;
SELECT COUNT(*) as count FROM v_habit_failure_patterns;

-- 예상: 각각 0 이상의 숫자
```

### 2-3. 뷰가 없는 경우

마이그레이션 파일 실행:
```bash
# 방법 1: SQL 파일 직접 실행
# Supabase SQL Editor에서 파일 내용 복사/붙여넣기
# 파일: supabase/migrations/20251019142825_create_dashboard_views.sql

# 방법 2: Migration 실행
supabase db push
```

---

## 🧪 Step 3: 로컬 테스트 (선택사항)

로컬에서 Edge Function 테스트:

### 3-1. 로컬 Supabase 시작
```bash
supabase start
```

### 3-2. Edge Function 서빙
```bash
supabase functions serve dashboard-aggregation
```

**예상 출력**:
```
Serving functions on http://localhost:54321...
  - dashboard-aggregation (deployed)
```

### 3-3. 테스트 요청
```bash
# Comparison 테스트
curl -X POST http://localhost:54321/functions/v1/dashboard-aggregation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "operation": "comparison",
    "data": {
      "userId": "test-user-id"
    }
  }'

# Insights 테스트 (JOIN 수정 확인)
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

**예상 성공 응답**:
```json
{
  "success": true,
  "operation": "insights",
  "result": {
    "strengths": [...],
    "weaknesses": [...],
    "overall_trend": "stable",
    "total_habits": 10,
    "data_points": 28
  },
  "timestamp": "2025-10-26T..."
}
```

---

## 🚀 Step 4: 프로덕션 배포

### 4-1. Edge Function 배포
```bash
supabase functions deploy dashboard-aggregation
```

**예상 출력**:
```
Deploying function dashboard-aggregation...
✔ Bundling function
✔ Deploying function
✔ Function dashboard-aggregation deployed successfully

Function URL:
https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dashboard-aggregation
```

### 4-2. 배포 로그 확인
```bash
supabase functions logs dashboard-aggregation
```

또는 Supabase Dashboard에서:
- Functions → dashboard-aggregation → Logs

---

## ✅ Step 5: 배포 후 검증

### 5-1. Supabase Dashboard 로그 모니터링

**위치**: Supabase Dashboard → Functions → dashboard-aggregation → Logs

**확인 사항**:
- ✅ 500 에러가 사라졌는지
- ✅ 요청이 정상 처리되는지
- ✅ 로그에 에러 스택 트레이스가 없는지

### 5-2. 프론트엔드 테스트

**방법 1**: 로컬 개발 환경
```bash
npm run dev
```

- 대시보드 페이지 접속
- 브라우저 콘솔 확인
- ❌ 사라져야 할 에러: `POST .../dashboard-aggregation 500`
- ✅ 나타나야 할 로그: `[Comparison] ✅ Using real comparison data`

**방법 2**: 프로덕션 사이트

배포된 Netlify 사이트에서:
1. 대시보드 페이지 접속
2. F12 → Console 탭 열기
3. 네트워크 탭에서 dashboard-aggregation 요청 확인
4. Status Code 200 확인

### 5-3. 각 Operation 테스트

대시보드에서 각 탭 클릭:
- [ ] 비교 (Comparison) - 정상 작동
- [ ] 추세 (Trends) - 차트 표시
- [ ] 통찰 (Insights) - 강점/약점 표시
- [ ] 월간 (Monthly) - 월간 통계 표시

---

## 🔄 Step 6: 프론트엔드 Edge Function 복원

배포가 성공하면 프론트엔드 코드를 원래대로 복원:

### 6-1. useDashboardData.ts 수정

**파일**: `src/hooks/useDashboardData.ts`

현재 코드에서 주석 처리된 Edge Function 코드 활성화:

```typescript
// BEFORE (현재 - 직접 DB 쿼리):
export function useComparisonData(userId: string, period: string) {
  return useQuery({
    queryKey: ['comparison', userId, period],
    queryFn: async () => {
      console.log('[Comparison] Attempting to fetch real data (direct DB query)');
      const realData = await generateRealComparisonData(userId, period);
      // ...
    }
  });
}

// AFTER (복원 - Edge Function 사용):
export function useComparisonData(userId: string, period: string) {
  return useQuery({
    queryKey: ['comparison', userId, period],
    queryFn: async () => {
      try {
        const response = await fetch(DASHBOARD_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'comparison',
            data: { userId, period }
          })
        });

        if (!response.ok) {
          throw new Error(`Edge Function error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Edge Function returned error');
        }

        console.log('[Comparison] ✅ Using Edge Function data');
        return result.result;
      } catch (error) {
        console.error('[Comparison] Edge Function failed, falling back to direct query', error);
        const realData = await generateRealComparisonData(userId, period);
        return realData;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

### 6-2. 동일하게 4개 훅 모두 수정
- `useComparisonData` ✅
- `useTrendData` ⏳
- `useInsights` ⏳
- `useMonthlyStats` ⏳

---

## 🎯 성공 기준

### ✅ 배포 성공 체크리스트

- [ ] Edge Function 배포 완료 (no errors)
- [ ] Supabase Functions 로그에서 500 에러 없음
- [ ] 프론트엔드에서 Edge Function 호출 성공
- [ ] 4개 대시보드 모두 정상 작동
- [ ] 브라우저 콘솔에 Edge Function 성공 로그
- [ ] 네트워크 탭에서 200 status code 확인

---

## 🐛 문제 해결

### 문제 1: 배포 시 "Function not found" 에러

```bash
# 원인: 프로젝트 링크 안됨
# 해결:
supabase link --project-ref gqvyzqodyspvwlwfjmfg
supabase functions deploy dashboard-aggregation
```

### 문제 2: 배포 후에도 500 에러 발생

```bash
# 원인: Database Views 미생성
# 해결: Step 2 다시 확인
# Supabase SQL Editor에서 뷰 생성 마이그레이션 실행
```

### 문제 3: "Unauthorized" 에러

```bash
# 원인: Supabase CLI 인증 만료
# 해결:
supabase logout
supabase login
supabase link --project-ref gqvyzqodyspvwlwfjmfg
```

### 문제 4: CORS 에러

```javascript
// Edge Function에 CORS 헤더 확인
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 이미 코드에 포함되어 있음 (line 4-7)
```

---

## 📚 관련 문서

- **디버깅 리포트**: `docs/EDGE_FUNCTION_DEBUG_REPORT.md`
- **임시 수정 내역**: `EDGE_FUNCTION_500_FIX.md`
- **프로젝트 가이드**: `CLAUDE.md`

---

## 🎉 배포 후 정리

배포가 성공하면:

1. **문서 업데이트**:
   - `CLAUDE.md`: Edge Function status를 "✅ Operational"로 변경
   - `EDGE_FUNCTION_500_FIX.md`: "RESOLVED" 상태로 업데이트

2. **코드 정리**:
   - `useDashboardData.ts`에서 fallback 코드는 유지 (안전장치)
   - 주석 정리 및 TODO 제거

3. **Git 커밋**:
   ```bash
   git add .
   git commit -m "🔧 Fix Edge Function JOIN syntax & restore dashboard-aggregation"
   git push
   ```

---

**작성일**: 2025-10-26
**예상 배포 시간**: 15분
**테스트 시간**: 10분
