-- ============================================================================
-- Migration: 20251029_001_phase5_4_mandala_nodes_table
-- Description: Phase 5.4 - Create mandala_nodes table for 81칸 expansion
-- Dependencies: mandala_charts, goals tables
-- ============================================================================

-- ============================================================================
-- Table: mandala_nodes
-- Purpose: 정규화된 만다라트 노드 테이블 (81칸 지원)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mandala_nodes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mandala_chart_id UUID NOT NULL REFERENCES mandala_charts(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES mandala_nodes(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- 계층 구조 (3단계)
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  -- level 1: 기본 9칸 (중앙 목표 주변 8개)
  -- level 2: 확장 27칸 (각 level 1 노드당 8개)
  -- level 3: 확장 81칸 (각 level 2 노드당 8개)

  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 8),
  -- 시계방향: 1=상단, 2=우상, 3=우, 4=우하, 5=하, 6=좌하, 7=좌, 8=좌상

  -- 노드 데이터
  title TEXT NOT NULL CHECK (length(title) >= 1),
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  emoji TEXT,

  -- 진행 상태
  completed BOOLEAN DEFAULT false,
  completion_rate NUMERIC DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),

  -- 확장 플래그
  expanded BOOLEAN DEFAULT false,
  -- true: 하위 노드(level+1) 존재
  -- false: 하위 노드 없음 (더 이상 확장 안 함)

  -- 정렬 및 표시
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT unique_node_position UNIQUE (mandala_chart_id, parent_node_id, level, position)
  -- 같은 차트의 같은 부모 노드 아래에서 같은 레벨에 같은 position은 중복 불가
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- 차트별 노드 조회 (가장 빈번)
CREATE INDEX idx_mandala_nodes_chart ON mandala_nodes(mandala_chart_id, level, is_active);

-- 계층 구조 조회
CREATE INDEX idx_mandala_nodes_parent ON mandala_nodes(parent_node_id) WHERE parent_node_id IS NOT NULL;

-- 목표 연동 조회
CREATE INDEX idx_mandala_nodes_goal ON mandala_nodes(goal_id) WHERE goal_id IS NOT NULL;

-- 사용자별 노드 조회
CREATE INDEX idx_mandala_nodes_user ON mandala_nodes(user_id, mandala_chart_id);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE mandala_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandala_nodes_select_own ON mandala_nodes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mandala_nodes_insert_own ON mandala_nodes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mandala_nodes_update_own ON mandala_nodes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mandala_nodes_delete_own ON mandala_nodes
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_mandala_nodes_updated_at
BEFORE UPDATE ON mandala_nodes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Function: Get Node Hierarchy
-- ============================================================================

-- 노드의 전체 계층 경로를 가져오는 재귀 함수
CREATE OR REPLACE FUNCTION get_node_hierarchy(node_id UUID)
RETURNS TABLE (
  id UUID,
  level INTEGER,
  position INTEGER,
  title TEXT,
  parent_node_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Base case: 현재 노드
    SELECT
      n.id,
      n.level,
      n.position,
      n.title,
      n.parent_node_id
    FROM mandala_nodes n
    WHERE n.id = node_id

    UNION ALL

    -- Recursive case: 부모 노드들
    SELECT
      n.id,
      n.level,
      n.position,
      n.title,
      n.parent_node_id
    FROM mandala_nodes n
    INNER JOIN hierarchy h ON n.id = h.parent_node_id
  )
  SELECT * FROM hierarchy
  ORDER BY level ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Get Child Nodes
-- ============================================================================

-- 특정 노드의 직속 자식 노드들 가져오기
CREATE OR REPLACE FUNCTION get_child_nodes(node_id UUID)
RETURNS TABLE (
  id UUID,
  level INTEGER,
  position INTEGER,
  title TEXT,
  color TEXT,
  emoji TEXT,
  completed BOOLEAN,
  completion_rate NUMERIC,
  expanded BOOLEAN,
  goal_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.level,
    n.position,
    n.title,
    n.color,
    n.emoji,
    n.completed,
    n.completion_rate,
    n.expanded,
    n.goal_id
  FROM mandala_nodes n
  WHERE n.parent_node_id = node_id
    AND n.is_active = true
  ORDER BY n.position ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Get All Descendants
-- ============================================================================

-- 노드의 모든 하위 노드들 (재귀적으로 모든 레벨)
CREATE OR REPLACE FUNCTION get_all_descendants(node_id UUID)
RETURNS TABLE (
  id UUID,
  level INTEGER,
  position INTEGER,
  title TEXT,
  parent_node_id UUID,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    -- Base case: 직속 자식들
    SELECT
      n.id,
      n.level,
      n.position,
      n.title,
      n.parent_node_id,
      1 as depth
    FROM mandala_nodes n
    WHERE n.parent_node_id = node_id
      AND n.is_active = true

    UNION ALL

    -- Recursive case: 자식의 자식들
    SELECT
      n.id,
      n.level,
      n.position,
      n.title,
      n.parent_node_id,
      d.depth + 1
    FROM mandala_nodes n
    INNER JOIN descendants d ON n.parent_node_id = d.id
    WHERE n.is_active = true
  )
  SELECT * FROM descendants
  ORDER BY depth ASC, position ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update mandala_charts table
-- ============================================================================

-- 81칸 확장 레벨 추가
ALTER TABLE mandala_charts
DROP CONSTRAINT IF EXISTS mandala_charts_chart_level_check;

ALTER TABLE mandala_charts
ADD CONSTRAINT mandala_charts_chart_level_check
CHECK (chart_level IN (
  'basic',         -- 기본 9칸
  'expanded_27',   -- 확장 27칸
  'expanded_81'    -- 확장 81칸 (NEW)
));

-- expansion_enabled를 max_level로 변경 (더 명확한 네이밍)
ALTER TABLE mandala_charts
ADD COLUMN max_level INTEGER DEFAULT 1 CHECK (max_level BETWEEN 1 AND 3);

COMMENT ON COLUMN mandala_charts.max_level IS '최대 확장 레벨 (1=9칸, 2=27칸, 3=81칸)';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mandala_nodes IS 'Phase 5.4: 만다라트 노드 테이블 (81칸 지원)';
COMMENT ON COLUMN mandala_nodes.level IS '1=기본9칸, 2=확장27칸, 3=확장81칸';
COMMENT ON COLUMN mandala_nodes.position IS '1-8 시계방향 (1=상단)';
COMMENT ON COLUMN mandala_nodes.expanded IS 'true: 하위 노드 존재, false: 미확장';
COMMENT ON COLUMN mandala_nodes.parent_node_id IS 'NULL=level 1 노드 (중앙 목표 주변)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mandala_nodes' ORDER BY ordinal_position;

-- 인덱스 확인
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'mandala_nodes';

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'mandala_nodes';

-- 함수 확인
-- SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE proname LIKE '%node%' AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. mandala_nodes 정규화 테이블 생성 (81칸 지원)
-- 2. 3단계 계층 구조 (level 1/2/3)
-- 3. 재귀 쿼리 헬퍼 함수 3개 제공
-- 4. mandala_charts 테이블에 expanded_81 레벨 추가
-- 5. max_level 컬럼 추가 (expansion_enabled 대체)
-- 6. NEXT STEP: 기존 JSONB nodes 데이터를 mandala_nodes로 마이그레이션하는 스크립트 필요
-- ============================================================================
