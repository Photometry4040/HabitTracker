-- ============================================================================
-- Migration: 20251024_007_phase5_create_remaining_tables
-- Description: Phase 5 - Create praise_messages, time_allocations, event_log
-- Dependencies: children, goals, weaknesses, share_scopes tables
-- ============================================================================

-- ============================================================================
-- Table 1: praise_messages (칭찬 메시지)
-- ============================================================================

CREATE TABLE IF NOT EXISTS praise_messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 메시지 내용
  message_text TEXT NOT NULL CHECK (length(message_text) >= 5 AND length(message_text) <= 500),
  message_type TEXT CHECK (message_type IN (
    'praise',        -- 칭찬
    'encouragement', -- 격려
    'advice'         -- 조언
  )),

  -- 템플릿 ID (선택)
  template_id UUID,  -- praise_templates FK (나중에 추가 가능)

  -- 연결
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  weakness_id UUID REFERENCES weaknesses(id) ON DELETE SET NULL,

  -- 읽음 여부
  read_at TIMESTAMPTZ,

  -- 신고 플래그 (악용 방지)
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,

  -- 타임스탬프
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_praise_child_sent ON praise_messages(child_id, sent_at DESC);
CREATE INDEX idx_praise_unread ON praise_messages(child_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_praise_flagged ON praise_messages(is_flagged) WHERE is_flagged;

-- RLS
ALTER TABLE praise_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY praise_select_involved ON praise_messages
FOR SELECT USING (
  auth.uid() = from_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY praise_insert_sender ON praise_messages
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
  AND
  child_id IN (
    SELECT child_id FROM share_scopes
    WHERE viewer_user_id = auth.uid() AND scope = 'send_praise' AND is_active
  )
);

CREATE POLICY praise_update_sender ON praise_messages
FOR UPDATE USING (auth.uid() = from_user_id);

CREATE POLICY praise_delete_sender ON praise_messages
FOR DELETE USING (auth.uid() = from_user_id);

COMMENT ON TABLE praise_messages IS 'Phase 5: 칭찬 메시지 (부모→자녀 격려)';
COMMENT ON COLUMN praise_messages.is_flagged IS '악용 방지용 신고 플래그';

-- ============================================================================
-- Table 2: time_allocations (시간 최적화)
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_allocations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- 요일
  day_of_week TEXT CHECK (day_of_week IN (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  )),

  -- 시간대 분류
  time_slot TEXT CHECK (time_slot IN (
    'morning_focus',       -- 오전 9~11시 (깊은 생각, 결정)
    'morning_routine',     -- 오전 11~12시 (루틴)
    'afternoon_routine',   -- 오후 2~4시 (루틴, 창의적)
    'afternoon_rest',      -- 오후 4~6시 (휴식)
    'evening_reflection',  -- 밤 9~11시 (성찰, 회고)
    'custom'               -- 사용자 정의
  )),

  -- 작업 종류
  task_type TEXT CHECK (task_type IN (
    'deep_thinking',   -- 깊은 생각 (수학 문제 풀이)
    'decision',        -- 결정 (계획 수립)
    'routine',         -- 루틴 (단어 암기)
    'creative',        -- 창의적 (글쓰기)
    'reflection'       -- 성찰 (회고)
  )),

  -- 우선순위
  priority SMALLINT CHECK (priority BETWEEN 1 AND 5),

  -- 시험주 플래그
  is_exam_week BOOLEAN DEFAULT false,

  -- 최적 시간
  optimal_start_time TIME,
  optimal_end_time TIME CHECK (optimal_end_time IS NULL OR optimal_end_time > optimal_start_time),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),

  -- 실제 실행 시간 (로깅)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- 효과성 피드백
  effectiveness_score SMALLINT CHECK (effectiveness_score IS NULL OR effectiveness_score BETWEEN 1 AND 5),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_child_day ON time_allocations(child_id, day_of_week);
CREATE INDEX idx_time_slot ON time_allocations(child_id, time_slot);

-- RLS
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_select_own ON time_allocations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY time_insert_own ON time_allocations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY time_update_own ON time_allocations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY time_delete_own ON time_allocations
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_time_updated_at
BEFORE UPDATE ON time_allocations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE time_allocations IS 'Phase 5: 뇌 과학 기반 시간 최적화';
COMMENT ON COLUMN time_allocations.is_exam_week IS '시험주는 알림 완화';

-- ============================================================================
-- Table 3: event_log (감사 로그)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What
  table_name TEXT NOT NULL,
  row_id UUID,
  action TEXT NOT NULL CHECK (action IN (
    'insert', 'update', 'delete',
    'anonymize_emotions', 'immediate_emotion_delete', 'purge_anonymized',
    'grant_scope', 'revoke_scope'
  )),

  -- When
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Where (IP/Device)
  ip_address INET,
  user_agent TEXT,

  -- Details
  row_count BIGINT,
  details JSONB DEFAULT '{}'
);

CREATE INDEX idx_event_log_user ON event_log(user_id, occurred_at DESC);
CREATE INDEX idx_event_log_table ON event_log(table_name, action, occurred_at DESC);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at DESC);

COMMENT ON TABLE event_log IS 'Phase 5: 감사 로그 (90일 보존)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 3개 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename IN ('praise_messages', 'time_allocations', 'event_log');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. praise_messages: 부모→자녀 칭찬 메시지 (악용 방지 플래그 포함)
-- 2. time_allocations: 뇌 과학 기반 시간 최적화 (고등학생/성인용)
-- 3. event_log: 감사 로그 (90일 보존, Cron으로 자동 정리)
-- 4. RLS 활성화 (소유자 + 권한 부여받은 사용자만 접근)
-- ============================================================================
