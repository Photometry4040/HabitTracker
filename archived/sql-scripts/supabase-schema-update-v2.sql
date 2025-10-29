-- 기존 unique 제약 조건 제거
ALTER TABLE habit_tracker DROP CONSTRAINT IF EXISTS habit_tracker_child_name_key;

-- 복합 키 추가 (아이별 + 주간별 구분)
ALTER TABLE habit_tracker ADD CONSTRAINT habit_tracker_child_week_unique UNIQUE (child_name, week_period);

-- week_start_date 필드 추가 (아직 없다면)
ALTER TABLE habit_tracker ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_habit_tracker_child_week ON habit_tracker(child_name, week_period); 