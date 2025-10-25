-- ============================================================================
-- Migration: 20251024_004_phase5_create_weaknesses
-- Description: Phase 5 - Create weaknesses table (약점 관리 및 정서 코칭)
-- Dependencies: children, habits, goals tables
-- ============================================================================

-- ============================================================================
-- Table: weaknesses
-- Purpose: 약점 관리 및 정서 코칭 (30일 후 감정 데이터 자동 익명화)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weaknesses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  record_date DATE NOT NULL,

  -- 약점 원인 분류
  cause_type TEXT CHECK (cause_type IN (
    'concept',           -- 개념 이해 부족
    'procedure',         -- 절차/방법 모름
    'attention',         -- 집중력/주의분산
    'fatigue',           -- 피로/컨디션
    'tool',              -- 도구/환경 문제
    'time',              -- 시간 부족
    'other'              -- 기타
  )),

  -- 약점 내용
  weakness_note TEXT NOT NULL CHECK (length(weakness_note) >= 5),
  self_question TEXT,  -- 자체 질문 ("이 조건은 어떻게 쓰는가?")

  -- 감정 기록 (정서 코칭)
  emotion TEXT CHECK (emotion IN (
    'joy',               -- 기쁨
    'neutral',           -- 평온
    'frustration',       -- 좌절
    'anxiety',           -- 불안
    'boredom',           -- 지루함
    'anger',             -- 화남
    'confidence'         -- 자신감
  )),
  emotion_note TEXT,  -- 감정 메모 (30일 후 익명화)

  -- 실패 맥락 (JSONB)
  -- {
  --   "time_of_day": "morning", // morning/afternoon/evening
  --   "location": "home",       // home/school/library
  --   "distraction": true,      -- 방해 요소 있었나?
  --   "previous_activity": "gaming"
  -- }
  failure_context JSONB DEFAULT '{}',

  -- 보완 계획 (If-Then)
  improvement_plan TEXT,
  retry_scheduled_at TIMESTAMPTZ,
  retry_schedule_source TEXT CHECK (retry_schedule_source IN (
    'auto_48h',          -- 자동 48시간 후
    'manual',            -- 수동 예약
    'parent_suggested'   -- 부모 제안
  )),

  -- 해결 여부
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- 보상 연동 (FK 나중에 추가)
  badge_earned_id UUID,

  -- 익명화 여부 (30일 후 자동)
  is_anonymized BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_weaknesses_child_date ON weaknesses(child_id, record_date DESC);
CREATE INDEX idx_weaknesses_habit ON weaknesses(habit_id) WHERE habit_id IS NOT NULL;
CREATE INDEX idx_weaknesses_goal ON weaknesses(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_weaknesses_resolved ON weaknesses(child_id, resolved) WHERE NOT resolved;
CREATE INDEX idx_weaknesses_retry ON weaknesses(child_id, retry_scheduled_at) WHERE retry_scheduled_at IS NOT NULL;
CREATE INDEX idx_weaknesses_emotion ON weaknesses(child_id, emotion) WHERE emotion IS NOT NULL;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE weaknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY weaknesses_select_own ON weaknesses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY weaknesses_insert_own ON weaknesses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY weaknesses_update_own ON weaknesses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY weaknesses_delete_own ON weaknesses
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_weaknesses_updated_at
BEFORE UPDATE ON weaknesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE weaknesses IS 'Phase 5: 약점 관리 및 정서 코칭';
COMMENT ON COLUMN weaknesses.emotion_note IS '30일 후 자동 익명화';
COMMENT ON COLUMN weaknesses.failure_context IS '실패 맥락 (시간대, 장소, 방해 요소)';
COMMENT ON COLUMN weaknesses.is_anonymized IS '익명화 완료 여부 (30일 후 자동 true)';
COMMENT ON COLUMN weaknesses.badge_earned_id IS '약점 해결 시 획득한 보상 ID (FK 나중에 추가)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'weaknesses';

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename = 'weaknesses';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 약점 관리 테이블 생성 (원인, 감정, 보완 계획 기록)
-- 2. 감정 데이터 30일 후 자동 익명화 (함수는 별도 마이그레이션)
-- 3. 재시도 예약 기능 (retry_scheduled_at, retry_schedule_source)
-- 4. failure_context JSONB로 실패 맥락 상세 기록
-- 5. RLS 활성화 (소유자만 접근, 부모는 요약 뷰로 제공 예정)
-- ============================================================================
