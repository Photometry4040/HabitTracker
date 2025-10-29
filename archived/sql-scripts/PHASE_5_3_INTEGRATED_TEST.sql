-- ============================================================================
-- Phase 5.3 Advanced Reward Triggers - 통합 테스트 스크립트
-- ============================================================================
-- 작성일: 2025-10-27
-- Child: '아빠' (55e4812d-605e-4570-aa41-338e17339d64)
--
-- 사용법:
-- 1. 이 파일 전체를 Supabase SQL Editor에 복사
-- 2. "Run" 버튼 클릭
-- 3. 결과 확인 (하단에 요약 출력됨)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: 21일 연속 Streak 테스트 데이터 생성
-- ============================================================================

DO $$
DECLARE
  v_child_id UUID := '55e4812d-605e-4570-aa41-338e17339d64';
  v_user_id UUID := (SELECT user_id FROM children WHERE id = v_child_id);
  v_week_id UUID;
  v_habit_id UUID;
  v_week_start DATE;
  i INTEGER;
  j INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STEP 1: 21일 Streak 데이터 생성 시작...';
  RAISE NOTICE '============================================';

  -- 3주 생성 (과거 → 현재)
  FOR i IN 0..2 LOOP
    v_week_start := CURRENT_DATE - (21 - i*7);
    v_week_start := v_week_start - EXTRACT(DOW FROM v_week_start)::INTEGER + 1; -- 월요일로 조정

    -- Week 생성 (week_end_date는 week_start_date + 6일)
    INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme)
    VALUES (v_user_id, v_child_id, v_week_start, v_week_start + 6, 'streak_test')
    RETURNING id INTO v_week_id;

    RAISE NOTICE '  Week % created: % ~ %', i+1, v_week_start, v_week_start + 6;

    -- Habit 생성 (동일 이름)
    INSERT INTO habits (week_id, name, display_order)
    VALUES (v_week_id, '21일 연속 테스트 습관', 1)
    RETURNING id INTO v_habit_id;

    -- 7일치 records 생성 (모두 green)
    FOR j IN 0..6 LOOP
      INSERT INTO habit_records (habit_id, record_date, status)
      VALUES (v_habit_id, v_week_start + j, 'green');
    END LOOP;

    RAISE NOTICE '  → 7 green records created';
  END LOOP;

  RAISE NOTICE '✅ 21일 Streak 데이터 생성 완료!';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: 30일 연속 Green Mastery 테스트 데이터 생성
-- ============================================================================

DO $$
DECLARE
  v_child_id UUID := '55e4812d-605e-4570-aa41-338e17339d64';
  v_user_id UUID := (SELECT user_id FROM children WHERE id = v_child_id);
  v_week_id UUID;
  v_habit_id UUID;
  v_week_start DATE;
  i INTEGER;
  j INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STEP 2: 30일 Mastery 데이터 생성 시작...';
  RAISE NOTICE '============================================';

  -- 5주 생성
  FOR i IN 0..4 LOOP
    v_week_start := CURRENT_DATE - (35 - i*7);
    v_week_start := v_week_start - EXTRACT(DOW FROM v_week_start)::INTEGER + 1;

    INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme)
    VALUES (v_user_id, v_child_id, v_week_start, v_week_start + 6, 'mastery_test')
    RETURNING id INTO v_week_id;

    RAISE NOTICE '  Week % created: % ~ %', i+1, v_week_start, v_week_start + 6;

    INSERT INTO habits (week_id, name, display_order)
    VALUES (v_week_id, '30일 마스터리 테스트', 1)
    RETURNING id INTO v_habit_id;

    -- 7일치 모두 green
    FOR j IN 0..6 LOOP
      INSERT INTO habit_records (habit_id, record_date, status)
      VALUES (v_habit_id, v_week_start + j, 'green');
    END LOOP;

    RAISE NOTICE '  → 7 green records created';
  END LOOP;

  RAISE NOTICE '✅ 30일 Mastery 데이터 생성 완료!';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: 데이터 검증 및 결과 확인
-- ============================================================================

-- 3-1. 21일 Streak 데이터 확인
SELECT
  '✅ STEP 3-1: 21일 Streak 데이터' as check_point,
  h.name as habit_name,
  COUNT(hr.id) as total_records,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  MIN(hr.record_date) as first_date,
  MAX(hr.record_date) as last_date,
  EXTRACT(DAY FROM MAX(hr.record_date) - MIN(hr.record_date)) + 1 as day_span
FROM habits h
JOIN habit_records hr ON hr.habit_id = h.id
JOIN weeks w ON w.id = h.week_id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name = '21일 연속 테스트 습관'
GROUP BY h.name;

-- 3-2. 30일 Mastery 데이터 확인
SELECT
  '✅ STEP 3-2: 30일 Mastery 데이터' as check_point,
  h.name as habit_name,
  COUNT(hr.id) as total_records,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  MIN(hr.record_date) as first_date,
  MAX(hr.record_date) as last_date,
  EXTRACT(DAY FROM MAX(hr.record_date) - MIN(hr.record_date)) + 1 as day_span
FROM habits h
JOIN habit_records hr ON hr.habit_id = h.id
JOIN weeks w ON w.id = h.week_id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name = '30일 마스터리 테스트'
GROUP BY h.name;

-- 3-3. 생성된 Week 목록 확인
SELECT
  '✅ STEP 3-3: 생성된 Week 목록' as check_point,
  week_start_date,
  week_end_date,
  theme,
  (SELECT COUNT(*) FROM habits WHERE week_id = w.id) as habit_count,
  (SELECT COUNT(*) FROM habit_records hr
   JOIN habits h ON h.id = hr.habit_id
   WHERE h.week_id = w.id) as record_count
FROM weeks w
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND theme IN ('streak_test', 'mastery_test')
ORDER BY week_start_date;

-- 3-4. 전체 통계 요약
SELECT
  '📊 STEP 3-4: 전체 통계 요약' as check_point,
  (SELECT COUNT(*) FROM weeks WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64' AND theme IN ('streak_test', 'mastery_test')) as total_weeks,
  (SELECT COUNT(*) FROM habits h JOIN weeks w ON w.id = h.week_id WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64' AND w.theme IN ('streak_test', 'mastery_test')) as total_habits,
  (SELECT COUNT(*) FROM habit_records hr
   JOIN habits h ON h.id = hr.habit_id
   JOIN weeks w ON w.id = h.week_id
   WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
   AND w.theme IN ('streak_test', 'mastery_test')) as total_records,
  (SELECT COUNT(*) FROM habit_records hr
   JOIN habits h ON h.id = hr.habit_id
   JOIN weeks w ON w.id = h.week_id
   WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
   AND w.theme IN ('streak_test', 'mastery_test')
   AND hr.status = 'green') as green_records;

COMMIT;

-- ============================================================================
-- 🎉 테스트 데이터 생성 완료!
-- ============================================================================
--
-- 다음 단계:
-- 1. UI에서 습관 추적 화면 열기
-- 2. "21일 연속 테스트 습관" 또는 "30일 마스터리 테스트" 찾기
-- 3. 오늘 날짜에 green 클릭
-- 4. 브라우저 콘솔에서 achievement 메시지 확인
--
-- 예상 콘솔 출력:
-- - [Streak Check] 21일 연속 테스트 습관: 21 days total, 21 green days
-- - ✅ streak_21 achievement recorded for 아빠
-- - [Streak Check] 30일 마스터리 테스트: 35 days total, 35 green days
-- - ✅ habit_mastery achievement recorded for 아빠
--
-- ============================================================================
