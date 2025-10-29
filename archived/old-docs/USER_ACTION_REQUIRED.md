# 🎯 사용자 액션 필요 - Phase 4 완료를 위한 마지막 단계

**현재 상태**: Phase 4 98% 완료 ✅
**남은 작업**: 데이터베이스 뷰 생성 (5분 소요)

---

## ✅ 완료된 작업

1. ✅ Edge Function 배포 (`dashboard-aggregation`)
2. ✅ React Query hooks 구현
3. ✅ 모든 버그 수정 완료
   - Supabase 406 에러 수정
   - React 경고 제거
4. ✅ Dashboard UI 개선
5. ✅ 문서 업데이트 및 Git 커밋/푸시

---

## 🚨 **지금 해야 할 일** (필수)

### 📍 데이터베이스 뷰 생성

**소요 시간**: 약 5분
**난이도**: 쉬움 (복사-붙여넣기)

---

## 📋 실행 가이드

### 1️⃣ Supabase 대시보드 접속

1. 브라우저에서 https://supabase.com/dashboard 접속
2. 로그인
3. 프로젝트 선택: `gqvyzqodyspvwlwfjmfg` (또는 현재 사용 중인 프로젝트)

---

### 2️⃣ SQL Editor 열기

1. 왼쪽 사이드바에서 **"SQL Editor"** 클릭
2. **"+ New query"** 버튼 클릭

---

### 3️⃣ 뷰 생성 SQL 실행

**총 3개의 쿼리를 순서대로 실행**해야 합니다.

#### 🟢 쿼리 1: v_weekly_completion (주간 완료율 뷰)

SQL Editor에 아래 쿼리를 **복사-붙여넣기** 후 **RUN** 클릭:

```sql
CREATE OR REPLACE VIEW v_weekly_completion AS
SELECT
  w.id AS week_id,
  w.child_id,
  c.name AS child_name,
  c.user_id,
  w.week_start_date,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
      1
    )
  END AS completion_rate,
  COUNT(DISTINCT h.id) AS total_habits,
  SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END) AS completed_habits,
  COUNT(DISTINCT hr.record_date) AS days_tracked
FROM weeks w
LEFT JOIN children c ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
GROUP BY w.id, w.child_id, c.name, c.user_id, w.week_start_date
ORDER BY w.week_start_date DESC;
```

✅ **성공 메시지**: "Success. No rows returned"

---

#### 🟡 쿼리 2: v_daily_completion (일간 완료율 뷰)

새 쿼리 탭 열기 (`+ New query`) 후 실행:

```sql
CREATE OR REPLACE VIEW v_daily_completion AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  hr.record_date,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
      1
    )
  END AS completion_rate,
  COUNT(DISTINCT h.id) AS total_habits,
  SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END) AS completed_habits
FROM children c
LEFT JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
WHERE hr.record_date IS NOT NULL
GROUP BY c.id, c.name, c.user_id, hr.record_date
ORDER BY hr.record_date DESC;
```

✅ **성공 메시지**: "Success. No rows returned"

---

#### 🔵 쿼리 3: v_habit_failure_patterns (습관 실패 패턴 뷰)

새 쿼리 탭 열기 후 실행:

```sql
CREATE OR REPLACE VIEW v_habit_failure_patterns AS
SELECT
  c.id AS child_id,
  c.name AS child_name,
  c.user_id,
  h.name AS habit_name,
  TO_CHAR(hr.record_date, 'Day') AS day_name,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status != 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
      1
    )
  END AS failure_rate,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::float /
       COUNT(DISTINCT hr.id)) * 100,
      1
    )
  END AS success_rate,
  COUNT(DISTINCT hr.id) AS total_records
FROM children c
LEFT JOIN weeks w ON w.child_id = c.id
LEFT JOIN habits h ON h.week_id = w.id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
WHERE hr.record_date IS NOT NULL
GROUP BY c.id, c.name, c.user_id, h.name, TO_CHAR(hr.record_date, 'Day')
ORDER BY c.name, h.name, day_name;
```

✅ **성공 메시지**: "Success. No rows returned"

---

### 4️⃣ 뷰 생성 확인

SQL Editor에서 다음 쿼리로 확인:

```sql
-- 뷰 목록 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%'
ORDER BY table_name;
```

**예상 결과**:
```
v_daily_completion
v_habit_failure_patterns
v_weekly_completion
```

3개 모두 보이면 ✅ **성공!**

---

### 5️⃣ 데이터 확인 (선택사항)

뷰에 실제 데이터가 있는지 확인:

```sql
-- 주간 완료율 확인 (최근 5주)
SELECT * FROM v_weekly_completion
ORDER BY week_start_date DESC
LIMIT 5;

-- 일간 완료율 확인 (최근 10일)
SELECT * FROM v_daily_completion
ORDER BY record_date DESC
LIMIT 10;
```

데이터가 보이면 ✅ **완벽!**

---

## 🧪 로컬 테스트 (뷰 생성 후)

뷰 생성이 완료되면 로컬에서 테스트하세요:

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 브라우저 확인 (http://localhost:5173)

1. **F12** → **Console** 탭 열기
2. 대시보드 탭들 클릭 (비교, 추세, 통찰, 월간)
3. **확인 포인트**:
   - ✅ `[Dev] ✅ Using real comparison data` 메시지 확인
   - ✅ `[Mock]` 로그가 **사라져야** 함
   - ✅ 실제 데이터가 대시보드에 표시됨
   - ❌ 에러 메시지 없어야 함

### 3. Network 탭 확인 (선택사항)

1. **F12** → **Network** 탭
2. 필터: `dashboard-aggregation` 검색
3. 프로덕션 환경에서 Edge Function 호출 확인

---

## 🔍 문제 해결

### Q1: "permission denied for table" 에러
**해결**: Supabase 대시보드에서 SQL Editor를 사용 중인지 확인 (관리자 권한 필요)

### Q2: 뷰가 생성되지 않음
**해결**:
1. SQL 쿼리 전체를 다시 복사
2. 세미콜론(`;`)이 끝에 있는지 확인
3. RUN 버튼을 정확히 클릭했는지 확인

### Q3: 데이터가 안 보임
**해결**:
1. `SELECT * FROM children` 실행해서 데이터 존재 확인
2. `SELECT * FROM weeks` 실행해서 주차 데이터 확인
3. 데이터가 없다면 먼저 습관 트래커에서 데이터 입력 필요

---

## 📊 완료 후 상태

뷰 생성 완료 시:

- ✅ **Phase 4: 100% 완료** 🎉
- ✅ Mock 데이터 → 실제 데이터베이스 전환
- ✅ Edge Function 활성화
- ✅ 대시보드 완전 가동

---

## 📚 추가 참고 자료

- **상세 가이드**: `VIEWS_CREATION_MANUAL.md`
- **완료 체크리스트**: `PHASE_4_COMPLETION.md`
- **버그 리포트**: `BUGFIX_2025-10-19.md`
- **프로젝트 가이드**: `CLAUDE.md`

---

## 💬 문제가 있다면?

1. 콘솔 에러 메시지 확인
2. Supabase Functions 로그 확인
3. `VIEWS_CREATION_MANUAL.md`의 문제 해결 섹션 참고

---

## 🎉 완료 확인

뷰 생성이 끝나면 다음을 확인하세요:

- [ ] 3개 뷰 모두 생성됨 (`v_weekly_completion`, `v_daily_completion`, `v_habit_failure_patterns`)
- [ ] 뷰에서 데이터 조회 가능
- [ ] `npm run dev` 실행 시 `[Mock]` 로그 사라짐
- [ ] 대시보드에 실제 데이터 표시됨
- [ ] 콘솔 에러 없음

**모두 체크되면 Phase 4 완료!** 🚀

---

**작성일**: 2025-10-19
**마지막 업데이트**: 2025-10-19
**다음 단계**: 위 가이드대로 뷰 생성 → 로컬 테스트 → 완료!
