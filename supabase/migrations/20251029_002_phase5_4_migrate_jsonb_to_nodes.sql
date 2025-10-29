-- ============================================================================
-- Migration: 20251029_002_phase5_4_migrate_jsonb_to_nodes
-- Description: Migrate existing JSONB nodes to mandala_nodes table
-- Dependencies: 20251029_001_phase5_4_mandala_nodes_table.sql
-- ============================================================================

-- ============================================================================
-- Data Migration Function
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_mandala_jsonb_to_nodes()
RETURNS TABLE (
  chart_id UUID,
  nodes_migrated INTEGER,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  chart_record RECORD;
  node_record RECORD;
  new_node_id UUID;
  migrated_count INTEGER;
BEGIN
  -- 모든 만다라트 차트에 대해 반복
  FOR chart_record IN
    SELECT
      id,
      user_id,
      child_id,
      nodes,
      center_goal
    FROM mandala_charts
    WHERE nodes IS NOT NULL
      AND jsonb_array_length(nodes) > 0
  LOOP
    migrated_count := 0;

    BEGIN
      -- JSONB 배열의 각 노드에 대해 반복
      FOR node_record IN
        SELECT
          value->>'position' as position,
          value->>'title' as title,
          value->>'color' as color,
          value->>'emoji' as emoji,
          value->>'goal_id' as goal_id,
          COALESCE((value->>'completed')::boolean, false) as completed,
          COALESCE((value->>'completion_rate')::numeric, 0) as completion_rate,
          COALESCE((value->>'expanded')::boolean, false) as expanded
        FROM jsonb_array_elements(chart_record.nodes)
      LOOP
        -- mandala_nodes 테이블에 삽입
        INSERT INTO mandala_nodes (
          user_id,
          mandala_chart_id,
          parent_node_id,
          level,
          position,
          title,
          color,
          emoji,
          goal_id,
          completed,
          completion_rate,
          expanded
        ) VALUES (
          chart_record.user_id,
          chart_record.id,
          NULL, -- level 1 노드는 parent가 없음
          1, -- 기존 노드는 모두 level 1
          node_record.position::integer,
          COALESCE(node_record.title, '(제목 없음)'),
          COALESCE(node_record.color, '#3B82F6'),
          node_record.emoji,
          CASE
            WHEN node_record.goal_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN node_record.goal_id::uuid
            ELSE NULL
          END,
          node_record.completed,
          node_record.completion_rate,
          node_record.expanded
        )
        RETURNING id INTO new_node_id;

        migrated_count := migrated_count + 1;

        RAISE NOTICE 'Migrated node: chart_id=%, node_id=%, position=%, title=%',
          chart_record.id, new_node_id, node_record.position, node_record.title;
      END LOOP;

      -- 마이그레이션 성공 기록
      RETURN QUERY SELECT
        chart_record.id,
        migrated_count,
        true,
        NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      -- 오류 발생 시 기록
      RETURN QUERY SELECT
        chart_record.id,
        migrated_count,
        false,
        SQLERRM::TEXT;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Execute Migration
-- ============================================================================

-- 마이그레이션 실행 및 결과 출력
DO $$
DECLARE
  result RECORD;
  total_charts INTEGER := 0;
  success_charts INTEGER := 0;
  total_nodes INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting JSONB to mandala_nodes migration...';
  RAISE NOTICE '========================================';

  FOR result IN SELECT * FROM migrate_mandala_jsonb_to_nodes()
  LOOP
    total_charts := total_charts + 1;

    IF result.success THEN
      success_charts := success_charts + 1;
      total_nodes := total_nodes + result.nodes_migrated;
      RAISE NOTICE '✅ Chart % migrated: % nodes', result.chart_id, result.nodes_migrated;
    ELSE
      RAISE WARNING '❌ Chart % failed: %', result.chart_id, result.error_message;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE 'Total charts processed: %', total_charts;
  RAISE NOTICE 'Successful: %', success_charts;
  RAISE NOTICE 'Failed: %', total_charts - success_charts;
  RAISE NOTICE 'Total nodes migrated: %', total_nodes;
  RAISE NOTICE '========================================';
END;
$$;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- 마이그레이션 결과 확인
SELECT
  mc.id as chart_id,
  mc.center_goal,
  jsonb_array_length(mc.nodes) as jsonb_node_count,
  COUNT(mn.id) as table_node_count,
  jsonb_array_length(mc.nodes) = COUNT(mn.id) as migration_complete
FROM mandala_charts mc
LEFT JOIN mandala_nodes mn ON mn.mandala_chart_id = mc.id AND mn.level = 1
WHERE mc.nodes IS NOT NULL
GROUP BY mc.id, mc.center_goal, mc.nodes
ORDER BY mc.created_at DESC;

-- ============================================================================
-- Update mandala_charts: Set max_level based on migrated data
-- ============================================================================

-- 마이그레이션된 노드 개수에 따라 max_level 설정
UPDATE mandala_charts
SET max_level = 1
WHERE EXISTS (
  SELECT 1 FROM mandala_nodes
  WHERE mandala_nodes.mandala_chart_id = mandala_charts.id
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION migrate_mandala_jsonb_to_nodes IS 'Phase 5.4: JSONB nodes를 mandala_nodes 테이블로 마이그레이션';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 기존 mandala_charts.nodes (JSONB) → mandala_nodes 테이블로 마이그레이션
-- 2. 모든 기존 노드는 level 1로 설정 (기본 9칸 구조)
-- 3. parent_node_id = NULL (중앙 목표 주변 노드)
-- 4. goal_id UUID 유효성 검사
-- 5. 마이그레이션 성공 여부 및 통계 출력
-- 6. 기존 JSONB 데이터는 보존 (롤백 가능하도록)
-- 7. NEXT STEP: 프론트엔드에서 mandala_nodes 테이블 사용하도록 API 함수 업데이트
-- ============================================================================
