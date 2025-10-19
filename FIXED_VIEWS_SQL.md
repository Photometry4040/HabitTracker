# 🔧 수정된 데이터베이스 뷰 생성 SQL

**문제 해결**: `ROUND(double precision, integer)` 타입 에러 수정
**해결 방법**: `::float` → `::numeric` 타입 변환 사용

---

## ✅ 쿼리 1: v_weekly_completion (수정됨)

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
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
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

---

## ✅ 쿼리 2: v_daily_completion (수정됨)

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
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
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

---

## ✅ 쿼리 3: v_habit_failure_patterns (수정됨)

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
      (SUM(CASE WHEN hr.status != 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
      1
    )
  END AS failure_rate,
  CASE
    WHEN COUNT(DISTINCT hr.id) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN hr.status = 'green' THEN 1 ELSE 0 END)::numeric /
       COUNT(DISTINCT hr.id)::numeric) * 100,
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

---

## 🔍 변경 사항 요약

**Before** (에러 발생):
```sql
::float / ... ::float
```

**After** (수정됨):
```sql
::numeric / ... ::numeric
```

**이유**: PostgreSQL의 `ROUND()` 함수는 `numeric` 타입만 받습니다.

---

## ✅ 실행 순서

1. **Supabase SQL Editor** 열기
2. 위 쿼리 1 → RUN
3. 위 쿼리 2 → RUN
4. 위 쿼리 3 → RUN

모두 "Success. No rows returned" 메시지가 나오면 ✅ **완료!**

---

## 🧪 확인

```sql
-- 뷰 목록 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%'
ORDER BY table_name;
```

**예상 결과**: 3개 뷰가 보여야 함

```
v_daily_completion
v_habit_failure_patterns
v_weekly_completion
```

---

**작성일**: 2025-10-19
**문제**: PostgreSQL ROUND() 타입 에러
**해결**: ::float → ::numeric 변환
