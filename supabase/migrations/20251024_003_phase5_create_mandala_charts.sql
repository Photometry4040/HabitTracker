-- ============================================================================
-- Migration: 20251024_003_phase5_create_mandala_charts
-- Description: Phase 5 - Create mandala_charts table (9칸/27칸, 81칸 비활성)
-- Dependencies: children, goals tables
-- ============================================================================

-- ============================================================================
-- Table: mandala_charts
-- Purpose: 만다라트 차트 (MVP 5.1: 최대 27칸)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mandala_charts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,

  -- 만다라트 레벨 (MVP 5.1: 최대 27칸)
  chart_level TEXT CHECK (chart_level IN (
    'basic',         -- 기본 9칸 (1개)
    'expanded_27'    -- 확장 27칸 (1개 중앙 + 1단 확장)
  )) DEFAULT 'basic',

  -- 81칸 확장 플래그 (MVP 5.2에서 활성화)
  expansion_enabled BOOLEAN DEFAULT false,

  -- 중앙 목표 (핵심 목표)
  center_goal TEXT NOT NULL CHECK (length(center_goal) >= 3),
  center_goal_color TEXT DEFAULT '#3B82F6',
  center_goal_emoji TEXT,

  -- 주변 노드 (JSONB)
  -- MVP 5.1 구조:
  -- [
  --   {
  --     "position": 1,  // 1~8 (시계방향: 상단=1)
  --     "title": "수학 공부",
  --     "color": "#10B981",
  --     "emoji": "📚",
  --     "goal_id": "uuid",
  --     "completed": false,
  --     "completion_rate": 0.5,
  --     "expanded": false  // true면 3x3 하위 차트 존재
  --   }
  -- ]
  nodes JSONB NOT NULL DEFAULT '[]',

  -- 전체 진행률
  overall_completion_rate NUMERIC DEFAULT 0 CHECK (overall_completion_rate BETWEEN 0 AND 100),

  -- 시각화 옵션
  show_progress BOOLEAN DEFAULT true,
  show_emojis BOOLEAN DEFAULT true,
  color_scheme TEXT DEFAULT 'blue',

  -- 상태
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_mandala_child_active ON mandala_charts(child_id, is_active);
CREATE INDEX idx_mandala_goal ON mandala_charts(goal_id) WHERE goal_id IS NOT NULL;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE mandala_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandala_select_own ON mandala_charts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mandala_insert_own ON mandala_charts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mandala_update_own ON mandala_charts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mandala_delete_own ON mandala_charts
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_mandala_updated_at
BEFORE UPDATE ON mandala_charts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- goals 테이블에 FK 추가
-- ============================================================================

ALTER TABLE goals
ADD CONSTRAINT fk_goals_mandala_chart
FOREIGN KEY (mandala_chart_id) REFERENCES mandala_charts(id)
ON DELETE SET NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mandala_charts IS 'Phase 5: 만다라트 차트 (MVP 5.1: 최대 27칸)';
COMMENT ON COLUMN mandala_charts.chart_level IS 'basic=9칸, expanded_27=27칸 (81칸은 MVP 5.2)';
COMMENT ON COLUMN mandala_charts.expansion_enabled IS '81칸 확장 플래그 (MVP 5.2 기능)';
COMMENT ON COLUMN mandala_charts.nodes IS 'v1: JSONB / v2: mandala_nodes 테이블로 마이그레이션 예정';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mandala_charts';

-- goals FK 확인
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'goals'::regclass AND conname = 'fk_goals_mandala_chart';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 만다라트 차트 테이블 생성 (9칸/27칸만 허용)
-- 2. 81칸 확장은 expansion_enabled 플래그로 비활성화
-- 3. v2 마이그레이션 예정 (JSONB → mandala_nodes 정규화 테이블)
-- 4. goals ↔ mandala_charts 양방향 FK 설정 완료
-- ============================================================================
