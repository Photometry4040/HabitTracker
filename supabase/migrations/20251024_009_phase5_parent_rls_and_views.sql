-- ============================================================================
-- Migration: 20251024_009_phase5_parent_rls_and_views
-- Description: Phase 5 - Create parent RLS policies and emotion summary views
-- Dependencies: goals, weaknesses, mandala_charts, helper functions
-- ============================================================================

-- ============================================================================
-- 부모용 RLS 정책 추가
-- ============================================================================

-- goals 테이블: 부모는 읽기만 가능
CREATE POLICY goals_select_guardian ON goals
FOR SELECT USING (
  auth.uid() = user_id
  OR
  (is_guardian(auth.uid(), child_id) AND has_scope(auth.uid(), child_id, 'read_goals'))
);

-- mandala_charts 테이블: 부모는 읽기만 가능
CREATE POLICY mandala_select_guardian ON mandala_charts
FOR SELECT USING (
  auth.uid() = user_id
  OR
  (is_guardian(auth.uid(), child_id) AND has_scope(auth.uid(), child_id, 'read_mandala'))
);

-- ============================================================================
-- 감정 요약 뷰 (부모용 - 개인정보 보호)
-- ============================================================================

CREATE OR REPLACE VIEW v_emotion_summary AS
SELECT
  w.child_id,
  DATE_TRUNC('week', w.record_date) AS week_start,
  w.emotion,
  COUNT(*) AS emotion_count,
  COUNT(*) FILTER (WHERE w.resolved) AS resolved_count
FROM weaknesses w
WHERE
  NOT w.is_anonymized
  AND w.emotion IS NOT NULL
  AND w.record_date >= NOW() - INTERVAL '30 days'
GROUP BY w.child_id, week_start, w.emotion;

-- RLS (Security Invoker 모드)
ALTER VIEW v_emotion_summary SET (security_invoker = true);

COMMENT ON VIEW v_emotion_summary IS 'Phase 5: 감정 패턴 요약 (부모용 읽기 전용, 원본 비공개)';

-- ============================================================================
-- 약점 요약 뷰 (부모용 - 개인정보 보호)
-- ============================================================================

CREATE OR REPLACE VIEW v_weakness_summary AS
SELECT
  w.child_id,
  w.cause_type,
  DATE_TRUNC('week', w.record_date) AS week_start,
  COUNT(*) AS weakness_count,
  COUNT(*) FILTER (WHERE w.resolved) AS resolved_count,
  AVG(CASE WHEN w.resolved THEN EXTRACT(EPOCH FROM (w.resolved_at - w.created_at)) / 86400 ELSE NULL END)::NUMERIC(10, 2) AS avg_resolution_days
FROM weaknesses w
WHERE
  NOT w.is_anonymized
  AND w.record_date >= NOW() - INTERVAL '30 days'
GROUP BY w.child_id, w.cause_type, week_start;

ALTER VIEW v_weakness_summary SET (security_invoker = true);

COMMENT ON VIEW v_weakness_summary IS 'Phase 5: 약점 원인별 요약 (부모용, 세부 내용 비공개)';

-- ============================================================================
-- 목표 진행률 뷰 (부모용)
-- ============================================================================

CREATE OR REPLACE VIEW v_goal_progress_summary AS
SELECT
  g.child_id,
  g.status,
  COUNT(*) AS goal_count,
  AVG(CASE
    WHEN g.metric_type = 'percentage' THEN g.current_value
    WHEN g.target_value > 0 THEN (g.current_value / g.target_value * 100)
    ELSE NULL
  END)::NUMERIC(10, 2) AS avg_completion_rate
FROM goals g
WHERE g.status IN ('active', 'completed')
GROUP BY g.child_id, g.status;

ALTER VIEW v_goal_progress_summary SET (security_invoker = true);

COMMENT ON VIEW v_goal_progress_summary IS 'Phase 5: 목표 진행률 요약 (부모용)';

-- ============================================================================
-- 만다라트 요약 뷰 (부모용)
-- ============================================================================

CREATE OR REPLACE VIEW v_mandala_summary AS
SELECT
  m.child_id,
  COUNT(*) AS mandala_count,
  AVG(m.overall_completion_rate)::NUMERIC(10, 2) AS avg_completion_rate,
  MAX(m.created_at) AS latest_mandala_date
FROM mandala_charts m
WHERE m.is_active
GROUP BY m.child_id;

ALTER VIEW v_mandala_summary SET (security_invoker = true);

COMMENT ON VIEW v_mandala_summary IS 'Phase 5: 만다라트 요약 (부모용)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE policyname IN ('goals_select_guardian', 'mandala_select_guardian');

-- 뷰 목록 확인
-- SELECT table_name FROM information_schema.views
-- WHERE table_name IN ('v_emotion_summary', 'v_weakness_summary', 'v_goal_progress_summary', 'v_mandala_summary');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 부모용 RLS 정책 추가 (읽기 전용, 스코프 기반)
-- 2. 감정 요약 뷰 (주별 감정 패턴, 개인정보 비공개)
-- 3. 약점 요약 뷰 (원인별 통계, 세부 내용 비공개)
-- 4. 목표 진행률 뷰 (전체 진행률 요약)
-- 5. 만다라트 요약 뷰 (완성도 요약)
-- 6. Security Invoker 모드 (RLS 적용)
-- ============================================================================
