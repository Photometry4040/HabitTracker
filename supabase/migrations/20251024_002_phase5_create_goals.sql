-- ============================================================================
-- Migration: 20251024_002_phase5_create_goals
-- Description: Phase 5 - Create goals table for learning mode
-- Dependencies: children table
-- ============================================================================

-- ============================================================================
-- Table: goals
-- Purpose: 학습 목표 설정 (계층 구조 지원)
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 목표 계층
  parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 5),

  -- 목표 내용
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
  description TEXT,

  -- 측정 기준
  metric_type TEXT CHECK (metric_type IN (
    'boolean',       -- 달성/미달성
    'count',         -- 횟수 (예: 문제 수)
    'time',          -- 시간 (분)
    'percentage'     -- 퍼센트
  )),
  target_value NUMERIC CHECK (target_value >= 0),
  current_value NUMERIC DEFAULT 0 CHECK (current_value >= 0),
  unit TEXT,  -- 측정 단위 (예: "문제", "분", "%")

  -- ICE 우선순위 점수 (고등학생/성인용)
  impact SMALLINT CHECK (impact BETWEEN 0 AND 5),
  confidence SMALLINT CHECK (confidence BETWEEN 0 AND 5),
  ease SMALLINT CHECK (ease BETWEEN 0 AND 5),
  ice_score SMALLINT GENERATED ALWAYS AS (
    COALESCE(impact, 0) + COALESCE(confidence, 0) + COALESCE(ease, 0)
  ) STORED,

  -- 기간
  start_date DATE,
  due_date DATE CHECK (due_date IS NULL OR due_date >= start_date),

  -- 상태
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',         -- 초안
    'active',        -- 진행 중
    'completed',     -- 완료
    'failed',        -- 실패
    'paused'         -- 일시정지
  )),
  completed_at TIMESTAMPTZ,

  -- 만다라트 연결 (FK는 나중에 추가)
  mandala_chart_id UUID,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_goals_child_status ON goals(child_id, status);
CREATE INDEX idx_goals_child_due ON goals(child_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_goals_parent ON goals(parent_goal_id) WHERE parent_goal_id IS NOT NULL;
CREATE INDEX idx_goals_ice ON goals(child_id, ice_score DESC) WHERE ice_score IS NOT NULL;

-- ============================================================================
-- Constraints
-- ============================================================================

ALTER TABLE goals ADD CONSTRAINT ck_goals_completed_status
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status != 'completed');

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_own ON goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY goals_insert_own ON goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY goals_update_own ON goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY goals_delete_own ON goals
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE goals IS 'Phase 5: 학습 목표 설정 (계층 구조 지원)';
COMMENT ON COLUMN goals.depth IS '목표 계층 깊이 (0=최상위, 5=최대)';
COMMENT ON COLUMN goals.metric_type IS '측정 방식: boolean/count/time/percentage';
COMMENT ON COLUMN goals.ice_score IS 'ICE 우선순위: Impact + Confidence + Ease (0~15)';
COMMENT ON COLUMN goals.unit IS '측정 단위 (예: "문제", "분", "%")';
COMMENT ON COLUMN goals.mandala_chart_id IS '연결된 만다라트 차트 (FK 나중에 추가)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'goals'
-- ORDER BY ordinal_position;

-- RLS 확인
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'goals';

-- 인덱스 확인
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'goals';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. goals 테이블 생성 (목표 설정 기능)
-- 2. 계층 구조 지원 (parent_goal_id, depth)
-- 3. ICE 점수 자동 계산 (GENERATED ALWAYS AS)
-- 4. RLS 활성화 (소유자만 접근)
-- 5. mandala_chart_id FK는 mandala_charts 테이블 생성 후 추가 예정
-- ============================================================================
