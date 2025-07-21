-- 습관 추적기 테이블 생성
CREATE TABLE habit_tracker (
  id BIGSERIAL PRIMARY KEY,
  child_name TEXT UNIQUE NOT NULL,
  week_period TEXT,
  theme TEXT,
  habits JSONB DEFAULT '[]',
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE habit_tracker ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 정책 설정 (개발용)
-- 실제 운영에서는 인증 시스템을 추가해야 합니다
CREATE POLICY "Allow all operations" ON habit_tracker
  FOR ALL USING (true);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_habit_tracker_updated_at
  BEFORE UPDATE ON habit_tracker
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_habit_tracker_child_name ON habit_tracker(child_name);
CREATE INDEX idx_habit_tracker_updated_at ON habit_tracker(updated_at); 