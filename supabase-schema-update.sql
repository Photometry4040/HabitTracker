-- weekStartDate 필드 추가
ALTER TABLE habit_tracker ADD COLUMN week_start_date DATE;

-- 기존 데이터의 week_period에서 week_start_date 추출 (선택사항)
-- UPDATE habit_tracker 
-- SET week_start_date = (
--   CASE 
--     WHEN week_period ~ '(\d{4})년 (\d{1,2})월 (\d{1,2})일' 
--     THEN (regexp_match(week_period, '(\d{4})년 (\d{1,2})월 (\d{1,2})일'))[1] || '-' || 
--          lpad((regexp_match(week_period, '(\d{4})년 (\d{1,2})월 (\d{1,2})일'))[2], 2, '0') || '-' || 
--          lpad((regexp_match(week_period, '(\d{4})년 (\d{1,2})월 (\d{1,2})일'))[3], 2, '0')
--     ELSE NULL
--   END
-- )::DATE
-- WHERE week_start_date IS NULL; 