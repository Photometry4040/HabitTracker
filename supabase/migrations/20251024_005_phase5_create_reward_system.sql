-- ============================================================================
-- Migration: 20251024_005_phase5_create_reward_system
-- Description: Phase 5 - Create reward system (3 tables: definitions/events/ledger)
-- Dependencies: children, goals, weaknesses tables
-- ============================================================================

-- ============================================================================
-- Table 1: reward_definitions (보상 정의)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_definitions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 보상 정보
  reward_type TEXT CHECK (reward_type IN (
    'badge',         -- 배지
    'sticker',       -- 스티커
    'achievement',   -- 업적
    'theme',         -- 테마 해금
    'level_up'       -- 레벨업
  )),

  -- 보상 이름 및 설명
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,  -- 이모지 또는 이미지 URL
  color TEXT DEFAULT '#FFD700',

  -- 트리거 조건
  trigger_event TEXT CHECK (trigger_event IN (
    'goal_completed',        -- 목표 달성
    'weakness_resolved',     -- 약점 해결
    'retry_success',         -- 재시도 성공
    'streak_3',              -- 3일 연속
    'streak_7',              -- 7일 연속
    'streak_14',             -- 14일 연속
    'first_goal',            -- 첫 목표 설정
    'first_mandala',         -- 첫 만다라트 작성
    'perfect_week'           -- 완벽한 주
  )),

  -- 활성화 여부
  is_active BOOLEAN DEFAULT true,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_def_event ON reward_definitions(trigger_event) WHERE is_active;

COMMENT ON TABLE reward_definitions IS 'Phase 5: 보상 정의 (이벤트-보상 매핑)';

-- ============================================================================
-- Table 2: progress_events (진행 이벤트)
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 이벤트 종류
  event_type TEXT NOT NULL CHECK (event_type IN (
    'goal_completed',
    'weakness_resolved',
    'retry_success',
    'streak_3',
    'streak_7',
    'streak_14',
    'first_goal',
    'first_mandala',
    'perfect_week'
  )),

  -- 이벤트 페이로드 (JSONB)
  -- {
  --   "goal_id": "uuid",
  --   "weakness_id": "uuid",
  --   "streak_count": 7,
  --   "week_start": "2025-01-01"
  -- }
  payload JSONB DEFAULT '{}',

  -- 보상 지급 여부
  reward_issued BOOLEAN DEFAULT false,

  -- 타임스탬프
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_child_type ON progress_events(child_id, event_type, occurred_at DESC);
CREATE INDEX idx_progress_unrewarded ON progress_events(child_id, reward_issued) WHERE NOT reward_issued;

-- RLS
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY progress_select_own ON progress_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY progress_insert_own ON progress_events
FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE progress_events IS 'Phase 5: 진행 이벤트 로그 (보상 트리거)';

-- ============================================================================
-- Table 3: rewards_ledger (보상 지급 원장)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rewards_ledger (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES reward_definitions(id) ON DELETE CASCADE,
  source_event_id UUID NOT NULL REFERENCES progress_events(id) ON DELETE CASCADE,

  -- 획득 정보
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true,  -- 새 보상인지 (알림용)
  viewed_at TIMESTAMPTZ
);

CREATE INDEX idx_rewards_child_earned ON rewards_ledger(child_id, earned_at DESC);
CREATE INDEX idx_rewards_new ON rewards_ledger(child_id, is_new) WHERE is_new;

-- 중복 지급 방지
CREATE UNIQUE INDEX uniq_reward_event ON rewards_ledger(child_id, reward_id, source_event_id);

-- RLS
ALTER TABLE rewards_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY rewards_select_own ON rewards_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY rewards_insert_own ON rewards_ledger
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY rewards_update_own ON rewards_ledger
FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE rewards_ledger IS 'Phase 5: 보상 지급 원장 (중복 방지)';

-- ============================================================================
-- weaknesses 테이블에 FK 추가
-- ============================================================================

ALTER TABLE weaknesses
ADD CONSTRAINT fk_weaknesses_badge
FOREIGN KEY (badge_earned_id) REFERENCES rewards_ledger(id)
ON DELETE SET NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 3개 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename IN ('reward_definitions', 'progress_events', 'rewards_ledger');

-- 중복 방지 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE indexname = 'uniq_reward_event';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 보상 시스템 3분할 설계
--    - reward_definitions: 보상 정의 (어떤 보상이 있는지)
--    - progress_events: 이벤트 로그 (무엇이 달성되었는지)
--    - rewards_ledger: 보상 지급 원장 (누가 언제 받았는지)
-- 2. 이벤트-보상 연결을 선언적으로 관리
-- 3. 중복 지급 방지 (UNIQUE INDEX)
-- 4. RLS 활성화 (소유자만 접근)
-- ============================================================================
