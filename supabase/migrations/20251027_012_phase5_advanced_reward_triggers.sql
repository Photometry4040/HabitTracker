-- ============================================================================
-- Migration: 20251027_012_phase5_advanced_reward_triggers
-- Description: Phase 5.3 - Add advanced reward trigger types
-- Dependencies: 20251024_005_phase5_create_reward_system.sql
-- ============================================================================

-- ============================================================================
-- Step 1: reward_definitions 테이블에 새 트리거 타입 추가
-- ============================================================================

-- 기존 CHECK constraint 제거
ALTER TABLE reward_definitions
DROP CONSTRAINT IF EXISTS reward_definitions_trigger_event_check;

-- 새로운 CHECK constraint 추가 (기존 9개 + 신규 4개 = 13개)
ALTER TABLE reward_definitions
ADD CONSTRAINT reward_definitions_trigger_event_check CHECK (trigger_event IN (
  -- 기존 트리거 (Phase 5.1)
  'goal_completed',        -- 목표 달성
  'weakness_resolved',     -- 약점 해결
  'retry_success',         -- 재시도 성공
  'streak_3',              -- 3일 연속
  'streak_7',              -- 7일 연속
  'streak_14',             -- 14일 연속
  'first_goal',            -- 첫 목표 설정
  'first_mandala',         -- 첫 만다라트 작성
  'perfect_week',          -- 완벽한 주

  -- 신규 트리거 (Phase 5.3)
  'streak_21',             -- 21일 연속 (습관 형성 기간)
  'first_weakness_resolved', -- 첫 약점 극복
  'habit_mastery',         -- 습관 마스터 (30일 연속 green)
  'weekly_planner_perfect' -- 주간 계획 100% 완수
));

-- ============================================================================
-- Step 2: progress_events 테이블에 새 이벤트 타입 추가
-- ============================================================================

-- 기존 CHECK constraint 제거
ALTER TABLE progress_events
DROP CONSTRAINT IF EXISTS progress_events_event_type_check;

-- 새로운 CHECK constraint 추가 (기존 9개 + 신규 4개 = 13개)
ALTER TABLE progress_events
ADD CONSTRAINT progress_events_event_type_check CHECK (event_type IN (
  -- 기존 이벤트 (Phase 5.1)
  'goal_completed',
  'weakness_resolved',
  'retry_success',
  'streak_3',
  'streak_7',
  'streak_14',
  'first_goal',
  'first_mandala',
  'perfect_week',

  -- 신규 이벤트 (Phase 5.3)
  'streak_21',
  'first_weakness_resolved',
  'habit_mastery',
  'weekly_planner_perfect'
));

-- ============================================================================
-- Step 3: 기본 보상 정의 추가
-- ============================================================================

-- streak_21 보상
INSERT INTO reward_definitions (reward_type, name, description, icon, color, trigger_event)
VALUES (
  'badge',
  '습관의 힘 배지',
  '21일 연속 습관 완수! 습관이 몸에 배었어요! 🎯',
  '🏆',
  '#FFD700',
  'streak_21'
) ON CONFLICT (name) DO NOTHING;

-- first_weakness_resolved 보상
INSERT INTO reward_definitions (reward_type, name, description, icon, color, trigger_event)
VALUES (
  'badge',
  '극복자 배지',
  '첫 약점 극복! 포기하지 않는 당신은 멋져요! 💪',
  '💪',
  '#FF6B6B',
  'first_weakness_resolved'
) ON CONFLICT (name) DO NOTHING;

-- habit_mastery 보상
INSERT INTO reward_definitions (reward_type, name, description, icon, color, trigger_event)
VALUES (
  'achievement',
  '습관 마스터 칭호',
  '30일 연속 완벽한 습관! 진정한 마스터입니다! 🌟',
  '🌟',
  '#9B59B6',
  'habit_mastery'
) ON CONFLICT (name) DO NOTHING;

-- weekly_planner_perfect 보상
INSERT INTO reward_definitions (reward_type, name, description, icon, color, trigger_event)
VALUES (
  'sticker',
  '완벽한 한 주 스티커',
  '주간 계획 100% 완수! 계획적이고 실행력이 뛰어나요! 📅',
  '⭐',
  '#4ECDC4',
  'weekly_planner_perfect'
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 새 트리거 확인
-- SELECT name, trigger_event, description FROM reward_definitions WHERE trigger_event IN ('streak_21', 'first_weakness_resolved', 'habit_mastery', 'weekly_planner_perfect');

-- CHECK constraint 확인
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname IN ('reward_definitions_trigger_event_check', 'progress_events_event_type_check');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 기존 9개 트리거에 4개 추가 (총 13개)
-- 2. streak_21: 습관 형성 과학적 근거 (21일 법칙)
-- 3. first_weakness_resolved: 첫 번째 성취감 강화
-- 4. habit_mastery: 장기 목표 달성 보상
-- 5. weekly_planner_perfect: Phase 5.2 통합
-- 6. 기본 보상 정의 4개 자동 생성 (ON CONFLICT DO NOTHING으로 안전)
-- ============================================================================
