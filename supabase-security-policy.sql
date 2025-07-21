-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow all operations" ON habit_tracker;

-- 사용자별 데이터 접근 정책 (인증된 사용자만)
CREATE POLICY "Users can only access their own data" ON habit_tracker
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id
  );

-- 테이블에 user_id 컬럼 추가 (아직 없다면)
ALTER TABLE habit_tracker ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 기존 데이터에 대한 user_id 설정 (관리자가 수동으로 처리해야 함)
-- UPDATE habit_tracker SET user_id = 'your-user-id' WHERE user_id IS NULL;

-- user_id를 NOT NULL로 설정 (새 데이터부터)
ALTER TABLE habit_tracker ALTER COLUMN user_id SET NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_habit_tracker_user_id ON habit_tracker(user_id);

-- RLS 활성화 확인
ALTER TABLE habit_tracker ENABLE ROW LEVEL SECURITY; 