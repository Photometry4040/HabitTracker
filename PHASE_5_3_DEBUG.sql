-- ============================================================================
-- Phase 5.3 디버깅 스크립트
-- ============================================================================
-- Child: '아빠' (55e4812d-605e-4570-aa41-338e17339d64)
-- ============================================================================

-- 1. 테스트 습관이 제대로 생성되었는지 확인
SELECT
  '🔍 1. 테스트 습관 확인' as section,
  h.name as habit_name,
  w.week_start_date,
  w.theme,
  COUNT(hr.id) as total_records,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  MIN(hr.record_date) as first_date,
  MAX(hr.record_date) as last_date
FROM habits h
JOIN weeks w ON w.id = h.week_id
LEFT JOIN habit_records hr ON hr.habit_id = h.id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name IN ('21일 연속 테스트 습관', '30일 마스터리 테스트')
GROUP BY h.name, w.week_start_date, w.theme
ORDER BY h.name, w.week_start_date;

-- 2. 오늘 날짜에 green 기록이 있는지 확인
SELECT
  '📅 2. 오늘 날짜 기록 확인' as section,
  h.name as habit_name,
  hr.record_date,
  hr.status,
  hr.created_at
FROM habits h
JOIN weeks w ON w.id = h.week_id
JOIN habit_records hr ON hr.habit_id = h.id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name IN ('21일 연속 테스트 습관', '30일 마스터리 테스트')
  AND hr.record_date = CURRENT_DATE
ORDER BY h.name;

-- 3. 가장 최근 habit_records 확인
SELECT
  '⏰ 3. 최근 habit_records' as section,
  h.name as habit_name,
  hr.record_date,
  hr.status,
  hr.created_at
FROM habits h
JOIN weeks w ON w.id = h.week_id
JOIN habit_records hr ON hr.habit_id = h.id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name IN ('21일 연속 테스트 습관', '30일 마스터리 테스트')
ORDER BY hr.created_at DESC
LIMIT 10;

-- 4. 연속 기록 확인 (21일 streak)
SELECT
  '🔥 4. 21일 Streak 연속성 확인' as section,
  hr.record_date,
  hr.status,
  COUNT(*) OVER (ORDER BY hr.record_date) as day_number
FROM habits h
JOIN weeks w ON w.id = h.week_id
JOIN habit_records hr ON hr.habit_id = h.id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name = '21일 연속 테스트 습관'
ORDER BY hr.record_date;

-- 5. 모든 progress_events 확인 (Phase 5.3 외 다른 이벤트도)
SELECT
  '📋 5. 모든 Progress Events' as section,
  event_type,
  payload,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
ORDER BY occurred_at DESC;

-- 6. Habit ID 확인 (streak-calculator.js에서 사용)
SELECT
  '🆔 6. Habit UUID 확인' as section,
  h.id as habit_uuid,
  h.name as habit_name,
  w.week_start_date,
  (SELECT COUNT(*) FROM habit_records WHERE habit_id = h.id) as record_count
FROM habits h
JOIN weeks w ON w.id = h.week_id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name IN ('21일 연속 테스트 습관', '30일 마스터리 테스트')
ORDER BY h.name, w.week_start_date;

-- ============================================================================
-- 예상 결과 해석:
-- ============================================================================
--
-- 섹션 1: 테스트 습관 확인
-- - 21일 연속 테스트 습관: 3주 (21 records)
-- - 30일 마스터리 테스트: 5주 (35 records)
--
-- 섹션 2: 오늘 날짜 기록 확인
-- - 0개 행 → UI에서 green 클릭 안 함 (문제!)
-- - 1~2개 행 → green 클릭함 (정상)
--
-- 섹션 3: 최근 habit_records
-- - created_at 시간 확인 → UI 클릭 시간
--
-- 섹션 4: 연속성 확인
-- - day_number가 1~21까지 연속되어야 함
-- - 중간에 빠진 날짜 있으면 streak 끊김
--
-- 섹션 5: Progress Events
-- - 0~2개 → 기존 이벤트만 있음
-- - 이벤트가 없으면 UI에서 트리거 안 됨
--
-- ============================================================================
