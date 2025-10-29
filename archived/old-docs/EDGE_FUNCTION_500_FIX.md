# 🔧 Edge Function 500 에러 수정

**날짜**: 2025-10-19
**문제**: 프로덕션 배포 사이트에서 대시보드 그래프가 표시되지 않음
**원인**: Edge Function `dashboard-aggregation`이 500 에러 반환

---

## 📊 문제 현상

### 콘솔 에러 로그
```
POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dashboard-aggregation 500 (Internal Server Error)
```

### 증상
- ❌ 대시보드 그래프가 표시되지 않음
- ❌ 추세 분석, 통찰, 월간 통계 모두 실패
- ✅ 비교 대시보드는 정상 작동 (이미 직접 DB 쿼리 사용 중)

---

## 🔍 원인 분석

### Edge Function 500 에러 발생 이유 (추정)

1. **Database Views 미생성**:
   - `v_weekly_completion`
   - `v_daily_completion`
   - `v_habit_failure_patterns`

   → Edge Function이 이 뷰들을 참조하려고 시도하지만 존재하지 않음

2. **Security Invoker 모드 이슈**:
   - 뷰가 생성되었더라도 RLS 권한 문제로 조회 실패 가능

3. **Edge Function 코드 오류**:
   - TypeScript 컴파일 에러
   - 런타임 예외

---

## ✅ 임시 해결 방법 (현재 적용됨)

### 변경 사항

**파일**: `src/hooks/useDashboardData.ts`

모든 대시보드 훅에서 **Edge Function 대신 직접 DB 쿼리 사용**:

#### 1. useComparisonData (이미 수정됨)
```typescript
// TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용
console.log('[Comparison] Attempting to fetch real data (direct DB query)');
const realData = await generateRealComparisonData(userId, period, customWeekStart);
```

#### 2. useTrendData (신규 수정)
```typescript
// TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용
console.log('[Trend] Attempting to fetch real trend data (direct DB query)');
const realData = await generateRealTrendData(childId, weeks);
```

#### 3. useInsights (신규 수정)
```typescript
// TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용
console.log('[Insights] Attempting to fetch data (direct DB query)');
const { data: weeksData } = await supabase
  .from('weeks')
  .select('id')
  .eq('child_id', childId)
  .limit(weeks);

return await generateMockInsightsData(childId, weeks);
```

#### 4. useMonthlyStats (신규 수정)
```typescript
// TEMPORARY FIX: 프로덕션에서도 직접 DB 조회 사용
console.log('[Monthly] Attempting to fetch real monthly data (direct DB query)');
const realData = await generateRealMonthlyData(childId, year, month);
```

---

## 📦 배포 정보

### Git 커밋
```bash
423d658 🔧 프로덕션 Edge Function 500 에러 우회
```

### 변경된 파일
- `src/hooks/useDashboardData.ts` (105줄 추가, 121줄 삭제)

### 빌드 결과
```
✓ 2377 modules transformed.
dist/index.html                   1.87 kB
dist/assets/index-f3580228.css   43.20 kB
dist/assets/index-65540746.js   797.68 kB
✓ built in 4.58s
```

### Netlify 자동 배포
- GitHub에 푸시 완료 → Netlify 자동 빌드 트리거됨
- 예상 배포 시간: 2-5분

---

## 🧪 예상 테스트 결과

### 프로덕션 사이트 (배포 후)

**콘솔 로그 (정상)**:
```
[Comparison] Attempting to fetch real data (direct DB query)
[Comparison] ✅ Using real comparison data

[Trend] Attempting to fetch real trend data (direct DB query)
[Trend] ✅ Using real trend data (continuous weeks)

[Insights] Attempting to fetch data (direct DB query)
[Insights] ⚠️ Using mock insights (TODO: implement real insights)

[Monthly] Attempting to fetch real monthly data (direct DB query)
[Monthly] ✅ Using real monthly data
```

**❌ 사라져야 할 에러**:
```
POST .../dashboard-aggregation 500 (Internal Server Error)
```

### 그래프 표시
- ✅ 비교 대시보드: 모든 자녀 데이터 표시
- ✅ 추세 분석: 차트 정상 렌더링
- ✅ 통찰: Mock 데이터 표시 (향후 실제 데이터로 교체)
- ✅ 월간 통계: 실제 월간 데이터 표시

---

## 🔄 향후 계획 (TODO)

### Edge Function 디버깅 및 복구

1. **Edge Function 로그 확인**:
   ```
   Supabase Dashboard → Functions → dashboard-aggregation → Logs
   ```
   → 500 에러의 정확한 원인 파악

2. **Database Views 생성 확인**:
   ```sql
   SELECT table_name
   FROM information_schema.views
   WHERE table_schema = 'public'
     AND table_name LIKE 'v_%';
   ```
   → 3개 뷰가 모두 존재하는지 확인

3. **Edge Function 코드 수정** (필요 시):
   - TypeScript 타입 에러 수정
   - 에러 핸들링 개선
   - 디버그 로깅 추가

4. **원래 코드로 복구**:
   - `useDashboardData.ts`에서 주석 처리된 Edge Function 코드 활성화
   - 직접 DB 쿼리 코드 제거
   - 프로덕션 테스트

---

## 📝 관련 문서

- **버그 리포트**: `BUGFIX_2025-10-19.md`
- **보안 수정**: `SECURITY_INVOKER_VIEWS.sql`
- **배포 가이드**: `DEPLOYMENT_VERIFICATION.md`
- **프로젝트 가이드**: `CLAUDE.md`

---

## 💡 참고 사항

### 현재 구조

```
Frontend (React)
    ↓
useDashboardData.ts (직접 DB 쿼리)
    ↓
Supabase Database (NEW SCHEMA)
    ↓
RLS Policies (user_id 기반 격리)
```

### 원래 설계 (Phase 4)

```
Frontend (React)
    ↓
useDashboardData.ts (Edge Function 호출)
    ↓
Edge Function: dashboard-aggregation
    ↓
Database Views (v_weekly_completion, v_daily_completion, v_habit_failure_patterns)
    ↓
Supabase Database (NEW SCHEMA)
```

### 임시 수정의 장단점

**장점**:
- ✅ 즉시 사용 가능
- ✅ Edge Function 의존성 제거
- ✅ 디버깅 및 로깅 용이

**단점**:
- ❌ 프론트엔드에서 복잡한 쿼리 수행 (성능 저하 가능)
- ❌ Database Views의 집계 최적화 미활용
- ❌ Phase 4 설계 의도와 불일치

→ **Edge Function 복구 후 원래 구조로 되돌리는 것이 이상적**

---

**작성일**: 2025-10-19
**마지막 업데이트**: 2025-10-19
**Git 커밋**: `423d658` 🔧 프로덕션 Edge Function 500 에러 우회
