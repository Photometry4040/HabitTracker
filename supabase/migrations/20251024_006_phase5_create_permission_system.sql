-- ============================================================================
-- Migration: 20251024_006_phase5_create_permission_system
-- Description: Phase 5 - Create permission system (2 tables: links/scopes)
-- Dependencies: children table
-- ============================================================================

-- ============================================================================
-- Table 1: parent_child_links (부모-자녀 관계)
-- ============================================================================

CREATE TABLE IF NOT EXISTS parent_child_links (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 역할
  role TEXT CHECK (role IN (
    'parent',        -- 부모
    'mentor',        -- 멘토
    'guardian'       -- 보호자
  )) DEFAULT 'parent',

  -- 상태
  state TEXT CHECK (state IN (
    'active',        -- 활성
    'inactive',      -- 비활성
    'pending'        -- 승인 대기
  )) DEFAULT 'active',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_links_parent ON parent_child_links(parent_user_id, state);
CREATE INDEX idx_links_child ON parent_child_links(child_id, state);

-- 중복 방지
CREATE UNIQUE INDEX uniq_parent_child ON parent_child_links(parent_user_id, child_id);

-- RLS
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY links_select_own ON parent_child_links
FOR SELECT USING (
  auth.uid() = parent_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY links_insert_own ON parent_child_links
FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY links_update_own ON parent_child_links
FOR UPDATE USING (auth.uid() = parent_user_id);

-- 트리거
CREATE TRIGGER set_links_updated_at
BEFORE UPDATE ON parent_child_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE parent_child_links IS 'Phase 5: 부모-자녀 관계 (멘토 확장 가능)';

-- ============================================================================
-- Table 2: share_scopes (권한 스코프)
-- ============================================================================

CREATE TABLE IF NOT EXISTS share_scopes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  link_id UUID NOT NULL REFERENCES parent_child_links(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 권한 스코프
  scope TEXT CHECK (scope IN (
    'read_goals',              -- 목표 읽기
    'read_weaknesses_summary', -- 약점 요약만 (세부 비공개)
    'read_mandala',            -- 만다라트 읽기
    'read_habits',             -- 습관 읽기
    'send_praise'              -- 칭찬 전송
  )),

  -- 활성화 여부
  is_active BOOLEAN DEFAULT true,

  -- 타임스탬프
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scopes_viewer ON share_scopes(viewer_user_id, child_id, is_active);
CREATE INDEX idx_scopes_child ON share_scopes(child_id, scope, is_active);

-- 중복 방지
CREATE UNIQUE INDEX uniq_scope_grant ON share_scopes(link_id, child_id, viewer_user_id, scope);

-- RLS
ALTER TABLE share_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scopes_select_own ON share_scopes
FOR SELECT USING (
  auth.uid() = viewer_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY scopes_insert_link_owner ON share_scopes
FOR INSERT WITH CHECK (
  link_id IN (SELECT id FROM parent_child_links WHERE parent_user_id = auth.uid())
);

COMMENT ON TABLE share_scopes IS 'Phase 5: 권한 스코프 (세밀한 접근 제어)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 2개 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename IN ('parent_child_links', 'share_scopes');

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('parent_child_links', 'share_scopes');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 권한 관리 2분할 설계
--    - parent_child_links: 관계 정의 (누가 누구의 부모/멘토인지)
--    - share_scopes: 권한 스코프 (어떤 데이터를 볼 수 있는지)
-- 2. 향후 멘토 기능 확장 용이
-- 3. 세밀한 권한 제어 (읽기 전용, 칭찬 전송 등)
-- 4. RLS 활성화 (소유자 + 권한 부여받은 사용자만 접근)
-- ============================================================================
