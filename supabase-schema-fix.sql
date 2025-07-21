-- 기존 unique 제약 조건 제거
ALTER TABLE habit_tracker DROP CONSTRAINT IF EXISTS habit_tracker_child_name_key;

-- 복합 키 추가 (아이별 + 주간별 구분)
ALTER TABLE habit_tracker ADD CONSTRAINT habit_tracker_child_week_unique UNIQUE (child_name, week_period);

-- week_start_date 필드 추가 (아직 없다면)
ALTER TABLE habit_tracker ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- 기존 데이터의 week_period가 null인 경우 빈 문자열로 업데이트
UPDATE habit_tracker SET week_period = '' WHERE week_period IS NULL;

-- week_period 컬럼을 NOT NULL로 설정
ALTER TABLE habit_tracker ALTER COLUMN week_period SET NOT NULL;
ALTER TABLE habit_tracker ALTER COLUMN week_period SET DEFAULT '';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_habit_tracker_child_week ON habit_tracker(child_name, week_period); 