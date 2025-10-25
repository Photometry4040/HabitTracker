-- ============================================================================
-- Migration: 20251024_001_phase5_extend_children
-- Description: Phase 5 - Extend children table for learning mode
-- Dependencies: children table (existing)
-- ============================================================================

-- ============================================================================
-- Extend children table
-- ============================================================================

ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 나이대 분류 (자동 전환)
  age_group TEXT CHECK (age_group IN (
    'elementary_low',    -- 초등 저학년 (1~3)
    'elementary_high',   -- 초등 고학년 (4~6)
    'middle',            -- 중학생
    'high',              -- 고등학생
    'adult'              -- 성인
  ));

ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 생일 (나이 자동 계산용)
  birthday DATE;

ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 학습 모드 활성화 여부
  learning_mode_enabled BOOLEAN DEFAULT false;

ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 학년 (선택)
  grade SMALLINT CHECK (grade BETWEEN 1 AND 12);

ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 학교명 (선택)
  school_name TEXT;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN children.age_group IS 'Phase 5: 나이대 자동 분류 (생일 기반)';
COMMENT ON COLUMN children.birthday IS 'Phase 5: 생일 (나이대 자동 전환용)';
COMMENT ON COLUMN children.learning_mode_enabled IS 'Phase 5: 학습 모드 ON/OFF (토글)';
COMMENT ON COLUMN children.grade IS 'Phase 5: 학년 (1~12)';
COMMENT ON COLUMN children.school_name IS 'Phase 5: 학교명 (선택)';

-- ============================================================================
-- 나이대 자동 전환 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION update_age_group_from_birthday()
RETURNS TRIGGER AS $$
DECLARE
  age INTEGER;
BEGIN
  IF NEW.birthday IS NOT NULL THEN
    -- 나이 계산 (만 나이)
    age := DATE_PART('year', AGE(NEW.birthday));

    -- 나이대 자동 설정
    IF age BETWEEN 6 AND 9 THEN
      NEW.age_group := 'elementary_low';
    ELSIF age BETWEEN 10 AND 12 THEN
      NEW.age_group := 'elementary_high';
    ELSIF age BETWEEN 13 AND 15 THEN
      NEW.age_group := 'middle';
    ELSIF age BETWEEN 16 AND 18 THEN
      NEW.age_group := 'high';
    ELSE
      NEW.age_group := 'adult';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS set_age_group_on_birthday ON children;
CREATE TRIGGER set_age_group_on_birthday
BEFORE INSERT OR UPDATE OF birthday ON children
FOR EACH ROW
WHEN (NEW.birthday IS NOT NULL)
EXECUTE FUNCTION update_age_group_from_birthday();

COMMENT ON FUNCTION update_age_group_from_birthday IS 'Phase 5: 생일 기반 나이대 자동 업데이트';

-- ============================================================================
-- 배치 업데이트 함수 (기존 데이터 처리용)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_age_groups()
RETURNS TABLE(updated_count BIGINT) AS $$
BEGIN
  UPDATE children
  SET age_group = CASE
    WHEN DATE_PART('year', AGE(birthday)) BETWEEN 6 AND 9 THEN 'elementary_low'
    WHEN DATE_PART('year', AGE(birthday)) BETWEEN 10 AND 12 THEN 'elementary_high'
    WHEN DATE_PART('year', AGE(birthday)) BETWEEN 13 AND 15 THEN 'middle'
    WHEN DATE_PART('year', AGE(birthday)) BETWEEN 16 AND 18 THEN 'high'
    ELSE 'adult'
  END
  WHERE birthday IS NOT NULL AND age_group IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN QUERY SELECT updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_update_age_groups IS 'Phase 5: 기존 생일 데이터 기반 나이대 일괄 업데이트';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 컬럼 확인
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'children' AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name');

-- 트리거 확인
-- SELECT tgname, tgtype, tgenabled FROM pg_trigger WHERE tgrelid = 'children'::regclass AND tgname = 'set_age_group_on_birthday';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 기존 children 테이블에 5개 컬럼 추가
-- 2. 생일 입력 시 자동으로 age_group 업데이트되는 트리거 추가
-- 3. 배치 업데이트 함수로 기존 데이터 처리 가능
-- 4. RLS는 기존 정책 유지 (children 테이블의 기존 정책 적용)
-- ============================================================================
