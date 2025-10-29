-- ============================================
-- Security Invoker Views (보안 권장)
-- Supabase Security Advisor 경고 해결
-- ============================================

-- 기존 뷰 삭제 후 Security Invoker 모드로 재생성
-- Security Invoker: 뷰를 호출하는 사용자의 권한으로 실행 (RLS 적용)
-- Security Definer: 뷰를 생성한 사용자의 권한으로 실행 (RLS 우회 가능)

-- ============================================
-- 1. v_weekly_completion (주간 완료율)
-- ============================================
DROP VIEW IF EXISTS v_weekly_completion;

CREATE VIEW v_weekly_completion
WITH (security_invoker = true)
AS
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

-- ============================================
-- 2. v_daily_completion (일간 완료율)
-- ============================================
DROP VIEW IF EXISTS v_daily_completion;

CREATE VIEW v_daily_completion
WITH (security_invoker = true)
AS
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

-- ============================================
-- 3. v_habit_failure_patterns (습관 실패 패턴)
-- ============================================
DROP VIEW IF EXISTS v_habit_failure_patterns;

CREATE VIEW v_habit_failure_patterns
WITH (security_invoker = true)
AS
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

-- ============================================
-- 확인 쿼리
-- ============================================

-- 1. 뷰 목록 확인
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'v_%'
ORDER BY viewname;

-- 2. 뷰 옵션 확인 (security_invoker 설정 확인)
-- PostgreSQL 15 이상에서만 작동
-- SELECT
--   c.relname AS view_name,
--   c.reloptions AS options
-- FROM pg_class c
-- WHERE c.relkind = 'v'
--   AND c.relnamespace = 'public'::regnamespace
--   AND c.relname LIKE 'v_%';

-- 3. 데이터 확인 (각 뷰에서 샘플 데이터 조회)
SELECT 'v_weekly_completion' AS view_name, COUNT(*) AS row_count
FROM v_weekly_completion
UNION ALL
SELECT 'v_daily_completion', COUNT(*)
FROM v_daily_completion
UNION ALL
SELECT 'v_habit_failure_patterns', COUNT(*)
FROM v_habit_failure_patterns;

-- ============================================
-- 주의사항
-- ============================================
--
-- 1. Security Invoker 모드:
--    - 뷰를 조회하는 사용자의 권한으로 실행됩니다
--    - RLS (Row Level Security)가 자동으로 적용됩니다
--    - 사용자는 자신의 데이터만 볼 수 있습니다
--
-- 2. RLS 정책 확인:
--    - children, weeks, habits, habit_records 테이블에 RLS가 활성화되어야 합니다
--    - 각 테이블의 RLS 정책이 user_id를 기반으로 필터링해야 합니다
--
-- 3. Edge Function 사용 시:
--    - Edge Function에서 Service Role Key를 사용하면 RLS를 우회할 수 있습니다
--    - 대신 사용자의 JWT 토큰을 사용하여 RLS를 적용해야 합니다
--
-- ============================================
