# 🚀 배포 확인 가이드

**배포 시간**: 2025-10-19
**Git 커밋**: `4443e85` - Security Invoker 모드로 뷰 변경

---

## ✅ 완료된 작업

### 1. 버그 수정 (모두 완료)
- ✅ Supabase 406 에러 수정 (`.single()` → `.maybeSingle()` 16개소)
- ✅ React key prop 경고 제거 (TrendChart.jsx)
- ✅ PostgreSQL ROUND() 타입 에러 수정 (`::float` → `::numeric`)
- ✅ Security Definer View 보안 경고 해결 (`security_invoker = true`)

### 2. 데이터베이스 뷰 생성 (완료)
- ✅ `v_weekly_completion` - 16 rows
- ✅ `v_daily_completion` - 57 rows
- ✅ `v_habit_failure_patterns` - 186 rows
- ✅ Security Invoker 모드 적용

### 3. Git Push (완료)
- ✅ 모든 코드 변경사항 커밋
- ✅ GitHub에 푸시 완료
- ✅ Netlify 자동 배포 트리거됨

---

## 🔍 배포 확인 절차

### 1단계: Netlify 배포 상태 확인

1. **Netlify 대시보드** 접속: https://app.netlify.com
2. 프로젝트 선택
3. **Deploys** 탭 확인
4. 최신 배포 상태 확인:
   - 🟢 **Published**: 배포 성공
   - 🟡 **Building**: 빌드 진행 중
   - 🔴 **Failed**: 빌드 실패 (로그 확인 필요)

**예상 배포 시간**: 2-5분

---

### 2단계: Supabase Security Advisor 확인

1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `gqvyzqodyspvwlwfjmfg`
3. 왼쪽 사이드바 → **Advisors** 또는 **Settings** → **Security**
4. **Security Advisor** 섹션 확인

**✅ 예상 결과**: 이전에 표시되던 4개의 "Security Definer View" 에러가 **모두 사라져야 함**

**만약 아직 에러가 보인다면**:
- SQL Editor에서 다음 쿼리로 뷰 확인:
  ```sql
  SELECT table_name
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name LIKE 'v_%'
  ORDER BY table_name;
  ```
- 3개 뷰가 모두 보이는지 확인
- 필요시 `SECURITY_INVOKER_VIEWS.sql` 재실행

---

### 3단계: 프로덕션 사이트 테스트

#### 3-1. 사이트 접속
배포된 사이트 URL로 접속 (Netlify 대시보드에서 확인)

#### 3-2. 브라우저 콘솔 확인
1. **F12** → **Console** 탭 열기
2. 페이지 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)

**✅ 확인 포인트**:
```
[Comparison] Attempting to fetch real data (direct DB query)
[Comparison] ✅ Using real comparison data
```

**❌ 나타나면 안 되는 것**:
```
POST .../dashboard-aggregation 500 (Internal Server Error)
GET .../weeks?...&week_start_date=eq.2025-10-13 406 (Not Acceptable)
Warning: Each child in a list should have a unique "key" prop.
```

#### 3-3. 대시보드 기능 테스트

**비교 대시보드**:
1. 대시보드 탭 클릭
2. "비교" 탭 선택
3. ✅ 모든 자녀의 데이터가 표시됨
4. ✅ 완료율이 정확하게 계산됨
5. ✅ 순위가 표시됨

**추세 분석**:
1. "추세 분석" 탭 선택
2. 자녀 선택
3. ✅ 차트가 정상적으로 렌더링됨
4. ✅ Week 33 데이터 포인트가 표시됨 (이전 버그 수정됨)
5. ✅ 연속적인 주차 표시 (빈 주차 포함)

**통찰 (자기인식)**:
1. "통찰" 탭 선택
2. ✅ 강점/약점 분석 표시됨
3. ✅ 요일별 패턴 표시됨

**월간 통계**:
1. "월간 통계" 탭 선택
2. ✅ 월간 요약 표시됨
3. ✅ 캘린더 뷰 정상 작동

#### 3-4. Network 탭 확인 (선택사항)
1. **F12** → **Network** 탭
2. 필터: `supabase` 검색
3. **확인 포인트**:
   - ✅ `weeks`, `children`, `habits`, `habit_records` 쿼리가 200 OK
   - ❌ 406 에러 없어야 함
   - ❌ 500 에러 없어야 함

---

## 🐛 문제 해결

### Q1: Netlify 빌드 실패
**증상**: Deploy 상태가 "Failed"
**해결**:
1. Netlify 대시보드 → Deploy log 확인
2. 에러 메시지 확인
3. 환경 변수 설정 확인:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Q2: 프로덕션에서 여전히 500 에러
**증상**: Edge Function 500 에러 지속
**해결**:
1. Supabase 뷰가 정상 생성되었는지 확인
2. Security Invoker 모드 확인:
   ```sql
   SELECT
     c.relname AS view_name,
     c.reloptions AS options
   FROM pg_class c
   WHERE c.relkind = 'v'
     AND c.relnamespace = 'public'::regnamespace
     AND c.relname LIKE 'v_%';
   ```
3. `SECURITY_INVOKER_VIEWS.sql` 재실행

### Q3: 데이터가 표시되지 않음
**증상**: 대시보드가 비어있음
**해결**:
1. 로그인 상태 확인
2. 자녀 데이터 존재 확인:
   ```sql
   SELECT * FROM children WHERE user_id = auth.uid();
   ```
3. 주차 데이터 확인:
   ```sql
   SELECT * FROM weeks WHERE child_id IN (
     SELECT id FROM children WHERE user_id = auth.uid()
   );
   ```

### Q4: Security Advisor 에러 여전히 존재
**증상**: "Security Definer View" 경고 4개 지속
**원인**: 뷰가 아직 Security Invoker 모드로 재생성되지 않음
**해결**:
1. Supabase SQL Editor 열기
2. `SECURITY_INVOKER_VIEWS.sql` 전체 내용 복사
3. 실행 (RUN 버튼 클릭)
4. 3개 쿼리 모두 "Success. No rows returned" 확인
5. Security Advisor 새로고침

---

## 📊 성공 기준

배포가 성공적으로 완료되었다고 판단하는 기준:

- [ ] Netlify 배포 상태: **Published** ✅
- [ ] Supabase Security Advisor: **에러 0개** ✅
- [ ] 프로덕션 콘솔: **406/500 에러 없음** ✅
- [ ] 프로덕션 콘솔: **React 경고 없음** ✅
- [ ] 비교 대시보드: **데이터 정상 표시** ✅
- [ ] 추세 분석: **차트 정상 렌더링** ✅
- [ ] 통찰: **분석 결과 표시** ✅
- [ ] 월간 통계: **캘린더 정상 작동** ✅

**모든 항목 체크 시 → Phase 4 완료! 🎉**

---

## 🎯 다음 단계 (배포 성공 후)

1. **모니터링**: 1주일간 OLD SCHEMA (`habit_tracker_old`) 상태 확인
2. **사용자 피드백**: 실제 사용자들에게 테스트 요청
3. **성능 최적화**: Edge Function 복원 (현재는 직접 DB 쿼리 사용 중)
4. **문서 정리**: Phase 4 완료 문서화

---

## 📚 관련 문서

- **버그 리포트**: `BUGFIX_2025-10-19.md`
- **보안 수정**: `SECURITY_INVOKER_VIEWS.sql`
- **타입 수정**: `FIXED_VIEWS_SQL.md`
- **사용자 가이드**: `USER_ACTION_REQUIRED.md`
- **프로젝트 가이드**: `CLAUDE.md`

---

**작성일**: 2025-10-19
**마지막 업데이트**: 2025-10-19
**배포 버전**: Phase 4 (98% → 100%)
**Git 커밋**: `4443e85` 🔒 Security Invoker 모드로 뷰 변경
