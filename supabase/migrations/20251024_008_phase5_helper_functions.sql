-- ============================================================================
-- Migration: 20251024_008_phase5_helper_functions
-- Description: Phase 5 - Create helper functions (anonymization, permissions)
-- Dependencies: weaknesses, event_log, parent_child_links, share_scopes tables
-- ============================================================================

-- ============================================================================
-- Function 1: anonymize_old_emotion_data (감정 데이터 익명화)
-- ============================================================================

CREATE OR REPLACE FUNCTION anonymize_old_emotion_data()
RETURNS TABLE(anonymized_count BIGINT) AS $$
DECLARE
  v_anonymized_count BIGINT;
BEGIN
  UPDATE weaknesses
  SET
    emotion_note = NULL,
    emotion = NULL,
    failure_context = '{}',
    is_anonymized = true,
    anonymized_at = NOW()
  WHERE
    created_at < NOW() - INTERVAL '30 days'
    AND NOT is_anonymized
    AND emotion_note IS NOT NULL;

  GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;

  -- 감사 로그 기록
  INSERT INTO event_log (
    table_name, action, row_count, details
  ) VALUES (
    'weaknesses', 'anonymize_emotions', v_anonymized_count,
    jsonb_build_object('cutoff_date', NOW() - INTERVAL '30 days')
  );

  RETURN QUERY SELECT v_anonymized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_old_emotion_data IS 'Phase 5: 30일 경과 감정 데이터 자동 익명화';

-- ============================================================================
-- Function 2: delete_my_emotion_data (즉시 삭제)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_my_emotion_data(p_child_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 권한 확인
  SELECT user_id INTO v_user_id
  FROM children
  WHERE id = p_child_id;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  -- 즉시 삭제
  UPDATE weaknesses
  SET
    emotion_note = NULL,
    emotion = NULL,
    failure_context = '{}',
    is_anonymized = true,
    anonymized_at = NOW()
  WHERE child_id = p_child_id;

  -- 감사 로그
  INSERT INTO event_log (
    table_name, action, details
  ) VALUES (
    'weaknesses', 'immediate_emotion_delete',
    jsonb_build_object('child_id', p_child_id, 'requester', auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_my_emotion_data IS 'Phase 5: 아동/부모 요청 시 즉시 감정 데이터 삭제';

-- ============================================================================
-- Function 3: purge_old_anonymized_data (익명화 데이터 영구 삭제)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_anonymized_data()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM weaknesses
  WHERE
    is_anonymized
    AND anonymized_at < NOW() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO event_log (
    table_name, action, row_count
  ) VALUES (
    'weaknesses', 'purge_anonymized', deleted_count
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_anonymized_data IS 'Phase 5: 180일 경과 익명화 데이터 영구 삭제';

-- ============================================================================
-- Function 4: is_guardian (보호자 확인)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_guardian(p_user_id UUID, p_child_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parent_child_links
    WHERE parent_user_id = p_user_id
      AND child_id = p_child_id
      AND state = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_guardian IS 'Phase 5: 보호자 여부 확인 (RLS 헬퍼)';

-- ============================================================================
-- Function 5: has_scope (권한 스코프 확인)
-- ============================================================================

CREATE OR REPLACE FUNCTION has_scope(p_user_id UUID, p_child_id UUID, p_scope TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM share_scopes
    WHERE viewer_user_id = p_user_id
      AND child_id = p_child_id
      AND scope = p_scope
      AND is_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_scope IS 'Phase 5: 권한 스코프 확인 (RLS 헬퍼)';

-- ============================================================================
-- Function 6: purge_old_event_logs (감사 로그 정리)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_event_logs()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM event_log
  WHERE occurred_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_event_logs IS 'Phase 5: 90일 경과 감사 로그 정리';

-- ============================================================================
-- Cron Jobs (Supabase pg_cron 사용)
-- ============================================================================

-- 1. 감정 데이터 익명화 (매일 새벽 1시)
SELECT cron.schedule(
  'anonymize-emotions-daily',
  '0 1 * * *',
  'SELECT anonymize_old_emotion_data();'
);

-- 2. 익명화 데이터 영구 삭제 (매월 1일 새벽 2시)
SELECT cron.schedule(
  'purge-anonymized-monthly',
  '0 2 1 * *',
  'SELECT purge_old_anonymized_data();'
);

-- 3. 감사 로그 정리 (매주 일요일 새벽 3시)
SELECT cron.schedule(
  'purge-event-logs-weekly',
  '0 3 * * 0',
  'SELECT purge_old_event_logs();'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 함수 목록 확인
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'anonymize_old_emotion_data',
--   'delete_my_emotion_data',
--   'purge_old_anonymized_data',
--   'is_guardian',
--   'has_scope',
--   'purge_old_event_logs'
-- );

-- Cron Jobs 확인
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%phase5%' OR jobname LIKE '%anonymize%' OR jobname LIKE '%purge%';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 감정 데이터 익명화 함수 3개 (자동/즉시/영구)
-- 2. RLS 헬퍼 함수 2개 (보호자 확인, 권한 스코프 확인)
-- 3. 감사 로그 정리 함수 1개
-- 4. Cron Jobs 3개 (매일, 매월, 매주)
-- 5. SECURITY DEFINER로 권한 상승 필요한 함수 설정
-- ============================================================================
