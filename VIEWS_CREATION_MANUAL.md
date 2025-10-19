# 뷰 생성 - 수동 가이드 (Supabase 대시보드에서 직접)

**⚠️ 현재 상태:** 뷰 생성만 남았습니다!

## 빠른 시작 (3-5분)

### 단계 1: Supabase 로그인
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택

### 단계 2: SQL 에디터 열기
1. 왼쪽 메뉴 → **SQL Editor**
2. 새 쿼리 클릭 or **+ New query** 버튼

### 단계 3: 각 뷰를 개별 쿼리로 실행

**쿼리 1번 - 이것부터 실행:**

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

**쿼리 2번:**

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

**쿼리 3번:**

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
ORDER BY c.id, h.name, day_name;
```

**쿼리 4번 (인덱스 생성):**

```sql
CREATE INDEX IF NOT EXISTS idx_weeks_child_date ON weeks(child_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_records_habit_date ON habit_records(habit_id, record_date);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_week_id ON habits(week_id);
```

### 각 단계별 실행 방법

1. **SQL 에디터에 첫 번째 쿼리 복사**
2. **실행** 버튼 클릭 (또는 Ctrl+Enter / Cmd+Enter)
3. **결과 확인** - 상단에 "✓ View created successfully" 표시 확인
4. 다음 쿼리로 반복

> 💡 **팁:** 한 번에 여러 쿼리를 실행해도 됩니다. 세미콜론(`;`)으로 구분하면 됨.

## 검증 - 뷰가 정상 생성되었는지 확인

실행 후, 다음 쿼리로 검증:

```sql
-- 1. 생성된 뷰 목록 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'VIEW'
AND table_name LIKE 'v_%';

-- 결과:
-- v_weekly_completion
-- v_daily_completion
-- v_habit_failure_patterns
```

```sql
-- 2. 각 뷰의 데이터 확인
SELECT * FROM v_weekly_completion LIMIT 5;
SELECT * FROM v_daily_completion LIMIT 5;
SELECT * FROM v_habit_failure_patterns LIMIT 5;
```

## 뷰 생성 완료 후

1. **로컬 서버 재시작**
   ```bash
   npm run dev
   ```

2. **개발자 도구 콘솔 확인** (F12)
   - 각 탭에서 `[Mock]` 태그 제거 확인
   - Network 탭에서 Edge Function 호출 확인

3. **모든 대시보드 탭 테스트**
   - ✅ 비교 대시보드
   - ✅ 추세 대시보드
   - ✅ 자기인식 대시보드
   - ✅ 월간 분석

## 문제 해결

### "View already exists" 오류
- **해결**: `CREATE OR REPLACE VIEW`를 사용하고 있어서 정상. 다시 실행하면 갱신됨.

### "Column does not exist" 오류
- **확인**: `weeks`, `children`, `habits`, `habit_records` 테이블이 존재하는지
- **실행**: `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema='public';`

### 데이터가 없음
- **확인**: 실제 데이터가 DB에 있는지
- **실행**: `SELECT COUNT(*) FROM weeks;`

### "Permission denied" 오류
- **확인**: Supabase API 키 권한
- **해결**: SQL Editor에서는 자동으로 권한 부여

## 완료 확인 체크리스트

- [ ] v_weekly_completion 생성됨
- [ ] v_daily_completion 생성됨
- [ ] v_habit_failure_patterns 생성됨
- [ ] 4개 인덱스 생성됨
- [ ] 각 뷰에서 데이터 조회 확인됨
- [ ] 로컬 서버 실행됨
- [ ] 모든 대시보드 탭 테스트됨

---

**완료되면 다음 단계:**

1. 모든 4개 대시보드 탭 확인
2. Console에서 `[Mock]` 로그 없어졌는지 확인
3. Network 탭에서 Edge Function 호출 확인
4. 모든 데이터가 정확한지 검증

**축하합니다! 🎉 Phase 4 완료!!**
