-- ============================================================================
-- Phase 5.3 마이그레이션 상태 확인 스크립트
-- ============================================================================

-- 1. reward_definitions 테이블의 CHECK constraint 확인
SELECT 
  '🔍 1. reward_definitions CHECK constraint' as section,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'reward_definitions'::regclass 
  AND conname = 'reward_definitions_trigger_event_check';

-- 2. progress_events 테이블의 CHECK constraint 확인
SELECT 
  '🔍 2. progress_events CHECK constraint' as section,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'progress_events'::regclass 
  AND conname = 'progress_events_event_type_check';

-- 3. Phase 5.3 신규 보상 정의 확인
SELECT 
  '🎁 3. Phase 5.3 보상 정의' as section,
  name,
  trigger_event,
  reward_type,
  description,
  icon,
  color
FROM reward_definitions
WHERE trigger_event IN ('streak_21', 'first_weakness_resolved', 'habit_mastery', 'weekly_planner_perfect')
ORDER BY trigger_event;

-- 4. 전체 보상 정의 개수 확인
SELECT 
  '📊 4. 보상 정의 총 개수' as section,
  COUNT(*) as total_rewards,
  COUNT(CASE WHEN trigger_event IN ('streak_21', 'first_weakness_resolved', 'habit_mastery', 'weekly_planner_perfect') THEN 1 END) as phase53_rewards
FROM reward_definitions;

-- ============================================================================
-- 예상 결과:
-- - 섹션 1: CHECK constraint에 13개 trigger_event 포함 (기존 9개 + 신규 4개)
-- - 섹션 2: CHECK constraint에 13개 event_type 포함
-- - 섹션 3: 4개 신규 보상 정의 (streak_21, first_weakness_resolved, habit_mastery, weekly_planner_perfect)
-- - 섹션 4: total_rewards >= 13, phase53_rewards = 4
-- ============================================================================
