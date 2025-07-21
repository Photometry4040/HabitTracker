-- 1. user_id 컬럼 추가
ALTER TABLE habit_tracker ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 기존 데이터 확인 (user_id가 NULL인 데이터가 있는지 확인)
SELECT COUNT(*) as null_user_count FROM habit_tracker WHERE user_id IS NULL;

-- 3. 기존 데이터에 대한 user_id 설정 (관리자가 수동으로 처리해야 함)
-- 예시: 특정 사용자 ID로 기존 데이터 연결
-- UPDATE habit_tracker SET user_id = 'your-user-id-here' WHERE user_id IS NULL;

-- 4. user_id를 NOT NULL로 설정 (새 데이터부터)
-- ALTER TABLE habit_tracker ALTER COLUMN user_id SET NOT NULL;

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_habit_tracker_user_id ON habit_tracker(user_id);

-- 6. 기존 정책 삭제
DROP POLICY IF EXISTS "Allow all operations" ON habit_tracker;

-- 7. 새로운 보안 정책 생성
CREATE POLICY "Users can only access their own data" ON habit_tracker
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

-- 8. RLS 활성화 확인
ALTER TABLE habit_tracker ENABLE ROW LEVEL SECURITY;

-- 9. 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'habit_tracker' 
ORDER BY ordinal_position; 