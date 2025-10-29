-- ============================================================================
-- Phase 5.3 Advanced Reward Triggers - 결과 검증 스크립트
-- ============================================================================
-- 작성일: 2025-10-27
-- Child: '아빠' (55e4812d-605e-4570-aa41-338e17339d64)
--
-- 사용법:
-- UI에서 테스트를 완료한 후 이 스크립트를 실행하여
-- progress_events가 제대로 생성되었는지 확인합니다.
-- ============================================================================

-- ============================================================================
-- 1. 모든 Progress Events 확인
-- ============================================================================

SELECT
  '📋 1. 모든 Progress Events' as section,
  pe.event_type,
  pe.payload,
  pe.reward_issued,
  pe.occurred_at,
  rd.name as reward_name,
  rd.description as reward_description,
  rd.icon
FROM progress_events pe
LEFT JOIN reward_definitions rd ON rd.trigger_event = pe.event_type
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
ORDER BY pe.occurred_at DESC;

-- ============================================================================
-- 2. Phase 5.3 신규 Trigger 이벤트 확인
-- ============================================================================

SELECT
  '🎯 2. Phase 5.3 신규 이벤트' as section,
  event_type,
  payload,
  reward_issued,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type IN (
    'streak_21',
    'first_weakness_resolved',
    'habit_mastery',
    'weekly_planner_perfect'
  )
ORDER BY event_type, occurred_at DESC;

-- ============================================================================
-- 3. 이벤트 타입별 카운트
-- ============================================================================

SELECT
  '📊 3. 이벤트 타입별 카운트' as section,
  event_type,
  COUNT(*) as event_count,
  SUM(CASE WHEN reward_issued THEN 1 ELSE 0 END) as rewards_issued,
  MIN(occurred_at) as first_occurrence,
  MAX(occurred_at) as last_occurrence
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
GROUP BY event_type
ORDER BY event_type;

-- ============================================================================
-- 4. streak_21 이벤트 상세 (있는 경우)
-- ============================================================================

SELECT
  '🔥 4. streak_21 이벤트 상세' as section,
  pe.event_type,
  pe.payload->>'habit_id' as habit_id,
  pe.payload->>'streak_count' as streak_count,
  h.name as habit_name,
  pe.occurred_at
FROM progress_events pe
LEFT JOIN habits h ON h.id::text = pe.payload->>'habit_id'
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND pe.event_type = 'streak_21'
ORDER BY pe.occurred_at DESC;

-- ============================================================================
-- 5. habit_mastery 이벤트 상세 (있는 경우)
-- ============================================================================

SELECT
  '💎 5. habit_mastery 이벤트 상세' as section,
  pe.event_type,
  pe.payload->>'habit_id' as habit_id,
  pe.payload->>'green_days' as green_days,
  h.name as habit_name,
  pe.occurred_at
FROM progress_events pe
LEFT JOIN habits h ON h.id::text = pe.payload->>'habit_id'
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND pe.event_type = 'habit_mastery'
ORDER BY pe.occurred_at DESC;

-- ============================================================================
-- 6. weekly_planner_perfect 이벤트 상세 (있는 경우)
-- ============================================================================

SELECT
  '✨ 6. weekly_planner_perfect 이벤트 상세' as section,
  pe.event_type,
  pe.payload->>'weekly_plan_id' as plan_id,
  pe.payload->>'completion_rate' as completion_rate,
  wp.title as plan_title,
  pe.occurred_at
FROM progress_events pe
LEFT JOIN weekly_plans wp ON wp.id::text = pe.payload->>'weekly_plan_id'
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND pe.event_type = 'weekly_planner_perfect'
ORDER BY pe.occurred_at DESC;

-- ============================================================================
-- 7. first_weakness_resolved 이벤트 상세 (있는 경우)
-- ============================================================================

SELECT
  '💪 7. first_weakness_resolved 이벤트 상세' as section,
  pe.event_type,
  pe.payload->>'weakness_id' as weakness_id,
  w.weakness_note as weakness_description,
  w.resolved_at,
  pe.occurred_at
FROM progress_events pe
LEFT JOIN weaknesses w ON w.id::text = pe.payload->>'weakness_id'
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND pe.event_type = 'first_weakness_resolved'
ORDER BY pe.occurred_at DESC;

-- ============================================================================
-- 8. 중복 이벤트 확인 (정상: 0개 행)
-- ============================================================================

SELECT
  '⚠️ 8. 중복 이벤트 확인' as section,
  child_id,
  event_type,
  payload,
  COUNT(*) as duplicate_count,
  array_agg(occurred_at ORDER BY occurred_at) as timestamps
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type IN (
    'first_weakness_resolved',
    'weekly_planner_perfect'
  )
GROUP BY child_id, event_type, payload
HAVING COUNT(*) > 1;

-- ============================================================================
-- 9. 보상 정의 확인
-- ============================================================================

SELECT
  '🎁 9. Phase 5.3 보상 정의' as section,
  name,
  trigger_event,
  reward_type,
  description,
  icon,
  color,
  is_active
FROM reward_definitions
WHERE trigger_event IN (
  'streak_21',
  'first_weakness_resolved',
  'habit_mastery',
  'weekly_planner_perfect'
)
ORDER BY trigger_event;

-- ============================================================================
-- 10. 최종 요약
-- ============================================================================

SELECT
  '🎉 10. 최종 요약' as section,
  'Total Events' as metric,
  COUNT(*) as value
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'

UNION ALL

SELECT
  '🎉 10. 최종 요약',
  'Phase 5.3 Events',
  COUNT(*)
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type IN ('streak_21', 'first_weakness_resolved', 'habit_mastery', 'weekly_planner_perfect')

UNION ALL

SELECT
  '🎉 10. 최종 요약',
  'streak_21',
  COUNT(*)
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'streak_21'

UNION ALL

SELECT
  '🎉 10. 최종 요약',
  'habit_mastery',
  COUNT(*)
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'habit_mastery'

UNION ALL

SELECT
  '🎉 10. 최종 요약',
  'weekly_planner_perfect',
  COUNT(*)
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'weekly_planner_perfect'

UNION ALL

SELECT
  '🎉 10. 최종 요약',
  'first_weakness_resolved',
  COUNT(*)
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'first_weakness_resolved';

-- ============================================================================
-- 예상 결과 해석:
-- ============================================================================
--
-- ✅ 정상 케이스:
-- - Total Events: 4개 이상 (기존 이벤트 + 신규 Phase 5.3)
-- - Phase 5.3 Events: 2~4개 (UI 테스트 완료 개수에 따라)
-- - streak_21: 0~1개
-- - habit_mastery: 0~1개
-- - weekly_planner_perfect: 0~1개
-- - first_weakness_resolved: 0~1개
-- - 중복 이벤트 확인: 0개 행
--
-- ⚠️ 문제 케이스:
-- - Phase 5.3 Events: 0개 → UI 테스트 미실행 또는 에러 발생
-- - 중복 이벤트 확인: 1개 이상 → 중복 방지 로직 실패
-- - reward_issued: 모두 false → rewards_ledger 삽입 필요
--
-- ============================================================================
