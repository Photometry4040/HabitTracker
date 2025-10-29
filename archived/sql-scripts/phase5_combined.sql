-- ============================================================================
-- Phase 5 Combined Migration
-- Generated: 2025-10-26
-- ============================================================================
-- 이 파일은 Phase 5의 모든 마이그레이션을 포함합니다.
-- Supabase Dashboard SQL Editor에서 실행하세요.
-- ============================================================================

-- ============================================================================
-- Phase 5 Combined Migration
-- Generated: $(date)
-- ============================================================================
-- 이 파일은 Phase 5의 모든 마이그레이션을 포함합니다.
-- Supabase Dashboard SQL Editor에서 실행하세요.
-- ============================================================================


-- ========================================================================
-- File: 20251024_001_phase5_extend_children.sql
-- ========================================================================

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


-- ========================================================================
-- File: 20251024_002_phase5_create_goals.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_002_phase5_create_goals
-- Description: Phase 5 - Create goals table for learning mode
-- Dependencies: children table
-- ============================================================================

-- ============================================================================
-- Table: goals
-- Purpose: 학습 목표 설정 (계층 구조 지원)
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 목표 계층
  parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 5),

  -- 목표 내용
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
  description TEXT,

  -- 측정 기준
  metric_type TEXT CHECK (metric_type IN (
    'boolean',       -- 달성/미달성
    'count',         -- 횟수 (예: 문제 수)
    'time',          -- 시간 (분)
    'percentage'     -- 퍼센트
  )),
  target_value NUMERIC CHECK (target_value >= 0),
  current_value NUMERIC DEFAULT 0 CHECK (current_value >= 0),
  unit TEXT,  -- 측정 단위 (예: "문제", "분", "%")

  -- ICE 우선순위 점수 (고등학생/성인용)
  impact SMALLINT CHECK (impact BETWEEN 0 AND 5),
  confidence SMALLINT CHECK (confidence BETWEEN 0 AND 5),
  ease SMALLINT CHECK (ease BETWEEN 0 AND 5),
  ice_score SMALLINT GENERATED ALWAYS AS (
    COALESCE(impact, 0) + COALESCE(confidence, 0) + COALESCE(ease, 0)
  ) STORED,

  -- 기간
  start_date DATE,
  due_date DATE CHECK (due_date IS NULL OR due_date >= start_date),

  -- 상태
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',         -- 초안
    'active',        -- 진행 중
    'completed',     -- 완료
    'failed',        -- 실패
    'paused'         -- 일시정지
  )),
  completed_at TIMESTAMPTZ,

  -- 만다라트 연결 (FK는 나중에 추가)
  mandala_chart_id UUID,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_goals_child_status ON goals(child_id, status);
CREATE INDEX idx_goals_child_due ON goals(child_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_goals_parent ON goals(parent_goal_id) WHERE parent_goal_id IS NOT NULL;
CREATE INDEX idx_goals_ice ON goals(child_id, ice_score DESC) WHERE ice_score IS NOT NULL;

-- ============================================================================
-- Constraints
-- ============================================================================

ALTER TABLE goals ADD CONSTRAINT ck_goals_completed_status
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status != 'completed');

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_own ON goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY goals_insert_own ON goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY goals_update_own ON goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY goals_delete_own ON goals
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE goals IS 'Phase 5: 학습 목표 설정 (계층 구조 지원)';
COMMENT ON COLUMN goals.depth IS '목표 계층 깊이 (0=최상위, 5=최대)';
COMMENT ON COLUMN goals.metric_type IS '측정 방식: boolean/count/time/percentage';
COMMENT ON COLUMN goals.ice_score IS 'ICE 우선순위: Impact + Confidence + Ease (0~15)';
COMMENT ON COLUMN goals.unit IS '측정 단위 (예: "문제", "분", "%")';
COMMENT ON COLUMN goals.mandala_chart_id IS '연결된 만다라트 차트 (FK 나중에 추가)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'goals'
-- ORDER BY ordinal_position;

-- RLS 확인
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'goals';

-- 인덱스 확인
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'goals';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. goals 테이블 생성 (목표 설정 기능)
-- 2. 계층 구조 지원 (parent_goal_id, depth)
-- 3. ICE 점수 자동 계산 (GENERATED ALWAYS AS)
-- 4. RLS 활성화 (소유자만 접근)
-- 5. mandala_chart_id FK는 mandala_charts 테이블 생성 후 추가 예정
-- ============================================================================


-- ========================================================================
-- File: 20251024_003_phase5_create_mandala_charts.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_003_phase5_create_mandala_charts
-- Description: Phase 5 - Create mandala_charts table (9칸/27칸, 81칸 비활성)
-- Dependencies: children, goals tables
-- ============================================================================

-- ============================================================================
-- Table: mandala_charts
-- Purpose: 만다라트 차트 (MVP 5.1: 최대 27칸)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mandala_charts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,

  -- 만다라트 레벨 (MVP 5.1: 최대 27칸)
  chart_level TEXT CHECK (chart_level IN (
    'basic',         -- 기본 9칸 (1개)
    'expanded_27'    -- 확장 27칸 (1개 중앙 + 1단 확장)
  )) DEFAULT 'basic',

  -- 81칸 확장 플래그 (MVP 5.2에서 활성화)
  expansion_enabled BOOLEAN DEFAULT false,

  -- 중앙 목표 (핵심 목표)
  center_goal TEXT NOT NULL CHECK (length(center_goal) >= 3),
  center_goal_color TEXT DEFAULT '#3B82F6',
  center_goal_emoji TEXT,

  -- 주변 노드 (JSONB)
  -- MVP 5.1 구조:
  -- [
  --   {
  --     "position": 1,  // 1~8 (시계방향: 상단=1)
  --     "title": "수학 공부",
  --     "color": "#10B981",
  --     "emoji": "📚",
  --     "goal_id": "uuid",
  --     "completed": false,
  --     "completion_rate": 0.5,
  --     "expanded": false  // true면 3x3 하위 차트 존재
  --   }
  -- ]
  nodes JSONB NOT NULL DEFAULT '[]',

  -- 전체 진행률
  overall_completion_rate NUMERIC DEFAULT 0 CHECK (overall_completion_rate BETWEEN 0 AND 100),

  -- 시각화 옵션
  show_progress BOOLEAN DEFAULT true,
  show_emojis BOOLEAN DEFAULT true,
  color_scheme TEXT DEFAULT 'blue',

  -- 상태
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_mandala_child_active ON mandala_charts(child_id, is_active);
CREATE INDEX idx_mandala_goal ON mandala_charts(goal_id) WHERE goal_id IS NOT NULL;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE mandala_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandala_select_own ON mandala_charts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mandala_insert_own ON mandala_charts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mandala_update_own ON mandala_charts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mandala_delete_own ON mandala_charts
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_mandala_updated_at
BEFORE UPDATE ON mandala_charts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- goals 테이블에 FK 추가
-- ============================================================================

ALTER TABLE goals
ADD CONSTRAINT fk_goals_mandala_chart
FOREIGN KEY (mandala_chart_id) REFERENCES mandala_charts(id)
ON DELETE SET NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mandala_charts IS 'Phase 5: 만다라트 차트 (MVP 5.1: 최대 27칸)';
COMMENT ON COLUMN mandala_charts.chart_level IS 'basic=9칸, expanded_27=27칸 (81칸은 MVP 5.2)';
COMMENT ON COLUMN mandala_charts.expansion_enabled IS '81칸 확장 플래그 (MVP 5.2 기능)';
COMMENT ON COLUMN mandala_charts.nodes IS 'v1: JSONB / v2: mandala_nodes 테이블로 마이그레이션 예정';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mandala_charts';

-- goals FK 확인
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'goals'::regclass AND conname = 'fk_goals_mandala_chart';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 만다라트 차트 테이블 생성 (9칸/27칸만 허용)
-- 2. 81칸 확장은 expansion_enabled 플래그로 비활성화
-- 3. v2 마이그레이션 예정 (JSONB → mandala_nodes 정규화 테이블)
-- 4. goals ↔ mandala_charts 양방향 FK 설정 완료
-- ============================================================================


-- ========================================================================
-- File: 20251024_004_phase5_create_weaknesses.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_004_phase5_create_weaknesses
-- Description: Phase 5 - Create weaknesses table (약점 관리 및 정서 코칭)
-- Dependencies: children, habits, goals tables
-- ============================================================================

-- ============================================================================
-- Table: weaknesses
-- Purpose: 약점 관리 및 정서 코칭 (30일 후 감정 데이터 자동 익명화)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weaknesses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  record_date DATE NOT NULL,

  -- 약점 원인 분류
  cause_type TEXT CHECK (cause_type IN (
    'concept',           -- 개념 이해 부족
    'procedure',         -- 절차/방법 모름
    'attention',         -- 집중력/주의분산
    'fatigue',           -- 피로/컨디션
    'tool',              -- 도구/환경 문제
    'time',              -- 시간 부족
    'other'              -- 기타
  )),

  -- 약점 내용
  weakness_note TEXT NOT NULL CHECK (length(weakness_note) >= 5),
  self_question TEXT,  -- 자체 질문 ("이 조건은 어떻게 쓰는가?")

  -- 감정 기록 (정서 코칭)
  emotion TEXT CHECK (emotion IN (
    'joy',               -- 기쁨
    'neutral',           -- 평온
    'frustration',       -- 좌절
    'anxiety',           -- 불안
    'boredom',           -- 지루함
    'anger',             -- 화남
    'confidence'         -- 자신감
  )),
  emotion_note TEXT,  -- 감정 메모 (30일 후 익명화)

  -- 실패 맥락 (JSONB)
  -- {
  --   "time_of_day": "morning", // morning/afternoon/evening
  --   "location": "home",       // home/school/library
  --   "distraction": true,      -- 방해 요소 있었나?
  --   "previous_activity": "gaming"
  -- }
  failure_context JSONB DEFAULT '{}',

  -- 보완 계획 (If-Then)
  improvement_plan TEXT,
  retry_scheduled_at TIMESTAMPTZ,
  retry_schedule_source TEXT CHECK (retry_schedule_source IN (
    'auto_48h',          -- 자동 48시간 후
    'manual',            -- 수동 예약
    'parent_suggested'   -- 부모 제안
  )),

  -- 해결 여부
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- 보상 연동 (FK 나중에 추가)
  badge_earned_id UUID,

  -- 익명화 여부 (30일 후 자동)
  is_anonymized BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_weaknesses_child_date ON weaknesses(child_id, record_date DESC);
CREATE INDEX idx_weaknesses_habit ON weaknesses(habit_id) WHERE habit_id IS NOT NULL;
CREATE INDEX idx_weaknesses_goal ON weaknesses(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_weaknesses_resolved ON weaknesses(child_id, resolved) WHERE NOT resolved;
CREATE INDEX idx_weaknesses_retry ON weaknesses(child_id, retry_scheduled_at) WHERE retry_scheduled_at IS NOT NULL;
CREATE INDEX idx_weaknesses_emotion ON weaknesses(child_id, emotion) WHERE emotion IS NOT NULL;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE weaknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY weaknesses_select_own ON weaknesses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY weaknesses_insert_own ON weaknesses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY weaknesses_update_own ON weaknesses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY weaknesses_delete_own ON weaknesses
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER set_weaknesses_updated_at
BEFORE UPDATE ON weaknesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE weaknesses IS 'Phase 5: 약점 관리 및 정서 코칭';
COMMENT ON COLUMN weaknesses.emotion_note IS '30일 후 자동 익명화';
COMMENT ON COLUMN weaknesses.failure_context IS '실패 맥락 (시간대, 장소, 방해 요소)';
COMMENT ON COLUMN weaknesses.is_anonymized IS '익명화 완료 여부 (30일 후 자동 true)';
COMMENT ON COLUMN weaknesses.badge_earned_id IS '약점 해결 시 획득한 보상 ID (FK 나중에 추가)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'weaknesses';

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename = 'weaknesses';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 약점 관리 테이블 생성 (원인, 감정, 보완 계획 기록)
-- 2. 감정 데이터 30일 후 자동 익명화 (함수는 별도 마이그레이션)
-- 3. 재시도 예약 기능 (retry_scheduled_at, retry_schedule_source)
-- 4. failure_context JSONB로 실패 맥락 상세 기록
-- 5. RLS 활성화 (소유자만 접근, 부모는 요약 뷰로 제공 예정)
-- ============================================================================


-- ========================================================================
-- File: 20251024_005_phase5_create_reward_system.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_005_phase5_create_reward_system
-- Description: Phase 5 - Create reward system (3 tables: definitions/events/ledger)
-- Dependencies: children, goals, weaknesses tables
-- ============================================================================

-- ============================================================================
-- Table 1: reward_definitions (보상 정의)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_definitions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 보상 정보
  reward_type TEXT CHECK (reward_type IN (
    'badge',         -- 배지
    'sticker',       -- 스티커
    'achievement',   -- 업적
    'theme',         -- 테마 해금
    'level_up'       -- 레벨업
  )),

  -- 보상 이름 및 설명
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,  -- 이모지 또는 이미지 URL
  color TEXT DEFAULT '#FFD700',

  -- 트리거 조건
  trigger_event TEXT CHECK (trigger_event IN (
    'goal_completed',        -- 목표 달성
    'weakness_resolved',     -- 약점 해결
    'retry_success',         -- 재시도 성공
    'streak_3',              -- 3일 연속
    'streak_7',              -- 7일 연속
    'streak_14',             -- 14일 연속
    'first_goal',            -- 첫 목표 설정
    'first_mandala',         -- 첫 만다라트 작성
    'perfect_week'           -- 완벽한 주
  )),

  -- 활성화 여부
  is_active BOOLEAN DEFAULT true,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_def_event ON reward_definitions(trigger_event) WHERE is_active;

COMMENT ON TABLE reward_definitions IS 'Phase 5: 보상 정의 (이벤트-보상 매핑)';

-- ============================================================================
-- Table 2: progress_events (진행 이벤트)
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 이벤트 종류
  event_type TEXT NOT NULL CHECK (event_type IN (
    'goal_completed',
    'weakness_resolved',
    'retry_success',
    'streak_3',
    'streak_7',
    'streak_14',
    'first_goal',
    'first_mandala',
    'perfect_week'
  )),

  -- 이벤트 페이로드 (JSONB)
  -- {
  --   "goal_id": "uuid",
  --   "weakness_id": "uuid",
  --   "streak_count": 7,
  --   "week_start": "2025-01-01"
  -- }
  payload JSONB DEFAULT '{}',

  -- 보상 지급 여부
  reward_issued BOOLEAN DEFAULT false,

  -- 타임스탬프
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_child_type ON progress_events(child_id, event_type, occurred_at DESC);
CREATE INDEX idx_progress_unrewarded ON progress_events(child_id, reward_issued) WHERE NOT reward_issued;

-- RLS
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY progress_select_own ON progress_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY progress_insert_own ON progress_events
FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE progress_events IS 'Phase 5: 진행 이벤트 로그 (보상 트리거)';

-- ============================================================================
-- Table 3: rewards_ledger (보상 지급 원장)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rewards_ledger (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES reward_definitions(id) ON DELETE CASCADE,
  source_event_id UUID NOT NULL REFERENCES progress_events(id) ON DELETE CASCADE,

  -- 획득 정보
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true,  -- 새 보상인지 (알림용)
  viewed_at TIMESTAMPTZ
);

CREATE INDEX idx_rewards_child_earned ON rewards_ledger(child_id, earned_at DESC);
CREATE INDEX idx_rewards_new ON rewards_ledger(child_id, is_new) WHERE is_new;

-- 중복 지급 방지
CREATE UNIQUE INDEX uniq_reward_event ON rewards_ledger(child_id, reward_id, source_event_id);

-- RLS
ALTER TABLE rewards_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY rewards_select_own ON rewards_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY rewards_insert_own ON rewards_ledger
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY rewards_update_own ON rewards_ledger
FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE rewards_ledger IS 'Phase 5: 보상 지급 원장 (중복 방지)';

-- ============================================================================
-- weaknesses 테이블에 FK 추가
-- ============================================================================

ALTER TABLE weaknesses
ADD CONSTRAINT fk_weaknesses_badge
FOREIGN KEY (badge_earned_id) REFERENCES rewards_ledger(id)
ON DELETE SET NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 3개 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename IN ('reward_definitions', 'progress_events', 'rewards_ledger');

-- 중복 방지 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE indexname = 'uniq_reward_event';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 보상 시스템 3분할 설계
--    - reward_definitions: 보상 정의 (어떤 보상이 있는지)
--    - progress_events: 이벤트 로그 (무엇이 달성되었는지)
--    - rewards_ledger: 보상 지급 원장 (누가 언제 받았는지)
-- 2. 이벤트-보상 연결을 선언적으로 관리
-- 3. 중복 지급 방지 (UNIQUE INDEX)
-- 4. RLS 활성화 (소유자만 접근)
-- ============================================================================


-- ========================================================================
-- File: 20251024_006_phase5_create_permission_system.sql
-- ========================================================================

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


-- ========================================================================
-- File: 20251024_007_phase5_create_remaining_tables.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_007_phase5_create_remaining_tables
-- Description: Phase 5 - Create praise_messages, time_allocations, event_log
-- Dependencies: children, goals, weaknesses, share_scopes tables
-- ============================================================================

-- ============================================================================
-- Table 1: praise_messages (칭찬 메시지)
-- ============================================================================

CREATE TABLE IF NOT EXISTS praise_messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 메시지 내용
  message_text TEXT NOT NULL CHECK (length(message_text) >= 5 AND length(message_text) <= 500),
  message_type TEXT CHECK (message_type IN (
    'praise',        -- 칭찬
    'encouragement', -- 격려
    'advice'         -- 조언
  )),

  -- 템플릿 ID (선택)
  template_id UUID,  -- praise_templates FK (나중에 추가 가능)

  -- 연결
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  weakness_id UUID REFERENCES weaknesses(id) ON DELETE SET NULL,

  -- 읽음 여부
  read_at TIMESTAMPTZ,

  -- 신고 플래그 (악용 방지)
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,

  -- 타임스탬프
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_praise_child_sent ON praise_messages(child_id, sent_at DESC);
CREATE INDEX idx_praise_unread ON praise_messages(child_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_praise_flagged ON praise_messages(is_flagged) WHERE is_flagged;

-- RLS
ALTER TABLE praise_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY praise_select_involved ON praise_messages
FOR SELECT USING (
  auth.uid() = from_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY praise_insert_sender ON praise_messages
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id
  AND
  child_id IN (
    SELECT child_id FROM share_scopes
    WHERE viewer_user_id = auth.uid() AND scope = 'send_praise' AND is_active
  )
);

CREATE POLICY praise_update_sender ON praise_messages
FOR UPDATE USING (auth.uid() = from_user_id);

CREATE POLICY praise_delete_sender ON praise_messages
FOR DELETE USING (auth.uid() = from_user_id);

COMMENT ON TABLE praise_messages IS 'Phase 5: 칭찬 메시지 (부모→자녀 격려)';
COMMENT ON COLUMN praise_messages.is_flagged IS '악용 방지용 신고 플래그';

-- ============================================================================
-- Table 2: time_allocations (시간 최적화)
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_allocations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- 요일
  day_of_week TEXT CHECK (day_of_week IN (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  )),

  -- 시간대 분류
  time_slot TEXT CHECK (time_slot IN (
    'morning_focus',       -- 오전 9~11시 (깊은 생각, 결정)
    'morning_routine',     -- 오전 11~12시 (루틴)
    'afternoon_routine',   -- 오후 2~4시 (루틴, 창의적)
    'afternoon_rest',      -- 오후 4~6시 (휴식)
    'evening_reflection',  -- 밤 9~11시 (성찰, 회고)
    'custom'               -- 사용자 정의
  )),

  -- 작업 종류
  task_type TEXT CHECK (task_type IN (
    'deep_thinking',   -- 깊은 생각 (수학 문제 풀이)
    'decision',        -- 결정 (계획 수립)
    'routine',         -- 루틴 (단어 암기)
    'creative',        -- 창의적 (글쓰기)
    'reflection'       -- 성찰 (회고)
  )),

  -- 우선순위
  priority SMALLINT CHECK (priority BETWEEN 1 AND 5),

  -- 시험주 플래그
  is_exam_week BOOLEAN DEFAULT false,

  -- 최적 시간
  optimal_start_time TIME,
  optimal_end_time TIME CHECK (optimal_end_time IS NULL OR optimal_end_time > optimal_start_time),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),

  -- 실제 실행 시간 (로깅)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- 효과성 피드백
  effectiveness_score SMALLINT CHECK (effectiveness_score IS NULL OR effectiveness_score BETWEEN 1 AND 5),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_child_day ON time_allocations(child_id, day_of_week);
CREATE INDEX idx_time_slot ON time_allocations(child_id, time_slot);

-- RLS
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_select_own ON time_allocations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY time_insert_own ON time_allocations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY time_update_own ON time_allocations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY time_delete_own ON time_allocations
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_time_updated_at
BEFORE UPDATE ON time_allocations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE time_allocations IS 'Phase 5: 뇌 과학 기반 시간 최적화';
COMMENT ON COLUMN time_allocations.is_exam_week IS '시험주는 알림 완화';

-- ============================================================================
-- Table 3: event_log (감사 로그)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What
  table_name TEXT NOT NULL,
  row_id UUID,
  action TEXT NOT NULL CHECK (action IN (
    'insert', 'update', 'delete',
    'anonymize_emotions', 'immediate_emotion_delete', 'purge_anonymized',
    'grant_scope', 'revoke_scope'
  )),

  -- When
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Where (IP/Device)
  ip_address INET,
  user_agent TEXT,

  -- Details
  row_count BIGINT,
  details JSONB DEFAULT '{}'
);

CREATE INDEX idx_event_log_user ON event_log(user_id, occurred_at DESC);
CREATE INDEX idx_event_log_table ON event_log(table_name, action, occurred_at DESC);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at DESC);

COMMENT ON TABLE event_log IS 'Phase 5: 감사 로그 (90일 보존)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 3개 테이블 확인
-- SELECT tablename FROM pg_tables WHERE tablename IN ('praise_messages', 'time_allocations', 'event_log');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. praise_messages: 부모→자녀 칭찬 메시지 (악용 방지 플래그 포함)
-- 2. time_allocations: 뇌 과학 기반 시간 최적화 (고등학생/성인용)
-- 3. event_log: 감사 로그 (90일 보존, Cron으로 자동 정리)
-- 4. RLS 활성화 (소유자 + 권한 부여받은 사용자만 접근)
-- ============================================================================


-- ========================================================================
-- File: 20251024_008_phase5_helper_functions.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_008_phase5_helper_functions
-- Description: Phase 5 - Create helper functions (anonymization, permissions)
-- Dependencies: weaknesses, event_log, parent_child_links, share_scopes tables
-- ============================================================================

-- ============================================================================
-- Function 1: anonymize_old_emotion_data (감정 데이터 익명화)
-- ============================================================================

CREATE OR REPLACE FUNCTION anonymize_old_emotion_data()
RETURNS TABLE(anonymized_count BIGINT) AS $$
DECLARE
  v_anonymized_count BIGINT;
BEGIN
  UPDATE weaknesses
  SET
    emotion_note = NULL,
    emotion = NULL,
    failure_context = '{}',
    is_anonymized = true,
    anonymized_at = NOW()
  WHERE
    created_at < NOW() - INTERVAL '30 days'
    AND NOT is_anonymized
    AND emotion_note IS NOT NULL;

  GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;

  -- 감사 로그 기록
  INSERT INTO event_log (
    table_name, action, row_count, details
  ) VALUES (
    'weaknesses', 'anonymize_emotions', v_anonymized_count,
    jsonb_build_object('cutoff_date', NOW() - INTERVAL '30 days')
  );

  RETURN QUERY SELECT v_anonymized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_old_emotion_data IS 'Phase 5: 30일 경과 감정 데이터 자동 익명화';

-- ============================================================================
-- Function 2: delete_my_emotion_data (즉시 삭제)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_my_emotion_data(p_child_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 권한 확인
  SELECT user_id INTO v_user_id
  FROM children
  WHERE id = p_child_id;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  -- 즉시 삭제
  UPDATE weaknesses
  SET
    emotion_note = NULL,
    emotion = NULL,
    failure_context = '{}',
    is_anonymized = true,
    anonymized_at = NOW()
  WHERE child_id = p_child_id;

  -- 감사 로그
  INSERT INTO event_log (
    table_name, action, details
  ) VALUES (
    'weaknesses', 'immediate_emotion_delete',
    jsonb_build_object('child_id', p_child_id, 'requester', auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_my_emotion_data IS 'Phase 5: 아동/부모 요청 시 즉시 감정 데이터 삭제';

-- ============================================================================
-- Function 3: purge_old_anonymized_data (익명화 데이터 영구 삭제)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_anonymized_data()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM weaknesses
  WHERE
    is_anonymized
    AND anonymized_at < NOW() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO event_log (
    table_name, action, row_count
  ) VALUES (
    'weaknesses', 'purge_anonymized', deleted_count
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_anonymized_data IS 'Phase 5: 180일 경과 익명화 데이터 영구 삭제';

-- ============================================================================
-- Function 4: is_guardian (보호자 확인)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_guardian(p_user_id UUID, p_child_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parent_child_links
    WHERE parent_user_id = p_user_id
      AND child_id = p_child_id
      AND state = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_guardian IS 'Phase 5: 보호자 여부 확인 (RLS 헬퍼)';

-- ============================================================================
-- Function 5: has_scope (권한 스코프 확인)
-- ============================================================================

CREATE OR REPLACE FUNCTION has_scope(p_user_id UUID, p_child_id UUID, p_scope TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM share_scopes
    WHERE viewer_user_id = p_user_id
      AND child_id = p_child_id
      AND scope = p_scope
      AND is_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_scope IS 'Phase 5: 권한 스코프 확인 (RLS 헬퍼)';

-- ============================================================================
-- Function 6: purge_old_event_logs (감사 로그 정리)
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_old_event_logs()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM event_log
  WHERE occurred_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_event_logs IS 'Phase 5: 90일 경과 감사 로그 정리';

-- ============================================================================
-- Cron Jobs (Supabase pg_cron 사용)
-- ============================================================================

-- 1. 감정 데이터 익명화 (매일 새벽 1시)
SELECT cron.schedule(
  'anonymize-emotions-daily',
  '0 1 * * *',
  'SELECT anonymize_old_emotion_data();'
);

-- 2. 익명화 데이터 영구 삭제 (매월 1일 새벽 2시)
SELECT cron.schedule(
  'purge-anonymized-monthly',
  '0 2 1 * *',
  'SELECT purge_old_anonymized_data();'
);

-- 3. 감사 로그 정리 (매주 일요일 새벽 3시)
SELECT cron.schedule(
  'purge-event-logs-weekly',
  '0 3 * * 0',
  'SELECT purge_old_event_logs();'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 함수 목록 확인
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'anonymize_old_emotion_data',
--   'delete_my_emotion_data',
--   'purge_old_anonymized_data',
--   'is_guardian',
--   'has_scope',
--   'purge_old_event_logs'
-- );

-- Cron Jobs 확인
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%phase5%' OR jobname LIKE '%anonymize%' OR jobname LIKE '%purge%';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 감정 데이터 익명화 함수 3개 (자동/즉시/영구)
-- 2. RLS 헬퍼 함수 2개 (보호자 확인, 권한 스코프 확인)
-- 3. 감사 로그 정리 함수 1개
-- 4. Cron Jobs 3개 (매일, 매월, 매주)
-- 5. SECURITY DEFINER로 권한 상승 필요한 함수 설정
-- ============================================================================


-- ========================================================================
-- File: 20251024_009_phase5_parent_rls_and_views.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_009_phase5_parent_rls_and_views
-- Description: Phase 5 - Create parent RLS policies and emotion summary views
-- Dependencies: goals, weaknesses, mandala_charts, helper functions
-- ============================================================================

-- ============================================================================
-- 부모용 RLS 정책 추가
-- ============================================================================

-- goals 테이블: 부모는 읽기만 가능
CREATE POLICY goals_select_guardian ON goals
FOR SELECT USING (
  auth.uid() = user_id
  OR
  (is_guardian(auth.uid(), child_id) AND has_scope(auth.uid(), child_id, 'read_goals'))
);

-- mandala_charts 테이블: 부모는 읽기만 가능
CREATE POLICY mandala_select_guardian ON mandala_charts
FOR SELECT USING (
  auth.uid() = user_id
  OR
  (is_guardian(auth.uid(), child_id) AND has_scope(auth.uid(), child_id, 'read_mandala'))
);

-- ============================================================================
-- 감정 요약 뷰 (부모용 - 개인정보 보호)
-- ============================================================================

CREATE OR REPLACE VIEW v_emotion_summary AS
SELECT
  w.child_id,
  DATE_TRUNC('week', w.record_date) AS week_start,
  w.emotion,
  COUNT(*) AS emotion_count,
  COUNT(*) FILTER (WHERE w.resolved) AS resolved_count
FROM weaknesses w
WHERE
  NOT w.is_anonymized
  AND w.emotion IS NOT NULL
  AND w.record_date >= NOW() - INTERVAL '30 days'
GROUP BY w.child_id, week_start, w.emotion;

-- RLS (Security Invoker 모드)
ALTER VIEW v_emotion_summary SET (security_invoker = true);

COMMENT ON VIEW v_emotion_summary IS 'Phase 5: 감정 패턴 요약 (부모용 읽기 전용, 원본 비공개)';

-- ============================================================================
-- 약점 요약 뷰 (부모용 - 개인정보 보호)
-- ============================================================================

CREATE OR REPLACE VIEW v_weakness_summary AS
SELECT
  w.child_id,
  w.cause_type,
  DATE_TRUNC('week', w.record_date) AS week_start,
  COUNT(*) AS weakness_count,
  COUNT(*) FILTER (WHERE w.resolved) AS resolved_count,
  AVG(CASE WHEN w.resolved THEN EXTRACT(EPOCH FROM (w.resolved_at - w.created_at)) / 86400 ELSE NULL END)::NUMERIC(10, 2) AS avg_resolution_days
FROM weaknesses w
WHERE
  NOT w.is_anonymized
  AND w.record_date >= NOW() - INTERVAL '30 days'
GROUP BY w.child_id, w.cause_type, week_start;

ALTER VIEW v_weakness_summary SET (security_invoker = true);

COMMENT ON VIEW v_weakness_summary IS 'Phase 5: 약점 원인별 요약 (부모용, 세부 내용 비공개)';

-- ============================================================================
-- 목표 진행률 뷰 (부모용)
-- ============================================================================

CREATE OR REPLACE VIEW v_goal_progress_summary AS
SELECT
  g.child_id,
  g.status,
  COUNT(*) AS goal_count,
  AVG(CASE
    WHEN g.metric_type = 'percentage' THEN g.current_value
    WHEN g.target_value > 0 THEN (g.current_value / g.target_value * 100)
    ELSE NULL
  END)::NUMERIC(10, 2) AS avg_completion_rate
FROM goals g
WHERE g.status IN ('active', 'completed')
GROUP BY g.child_id, g.status;

ALTER VIEW v_goal_progress_summary SET (security_invoker = true);

COMMENT ON VIEW v_goal_progress_summary IS 'Phase 5: 목표 진행률 요약 (부모용)';

-- ============================================================================
-- 만다라트 요약 뷰 (부모용)
-- ============================================================================

CREATE OR REPLACE VIEW v_mandala_summary AS
SELECT
  m.child_id,
  COUNT(*) AS mandala_count,
  AVG(m.overall_completion_rate)::NUMERIC(10, 2) AS avg_completion_rate,
  MAX(m.created_at) AS latest_mandala_date
FROM mandala_charts m
WHERE m.is_active
GROUP BY m.child_id;

ALTER VIEW v_mandala_summary SET (security_invoker = true);

COMMENT ON VIEW v_mandala_summary IS 'Phase 5: 만다라트 요약 (부모용)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE policyname IN ('goals_select_guardian', 'mandala_select_guardian');

-- 뷰 목록 확인
-- SELECT table_name FROM information_schema.views
-- WHERE table_name IN ('v_emotion_summary', 'v_weakness_summary', 'v_goal_progress_summary', 'v_mandala_summary');

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 부모용 RLS 정책 추가 (읽기 전용, 스코프 기반)
-- 2. 감정 요약 뷰 (주별 감정 패턴, 개인정보 비공개)
-- 3. 약점 요약 뷰 (원인별 통계, 세부 내용 비공개)
-- 4. 목표 진행률 뷰 (전체 진행률 요약)
-- 5. 만다라트 요약 뷰 (완성도 요약)
-- 6. Security Invoker 모드 (RLS 적용)
-- ============================================================================


-- ========================================================================
-- File: 20251024_010_phase5_seed_data.sql
-- ========================================================================

-- ============================================================================
-- Migration: 20251024_010_phase5_seed_data
-- Description: Phase 5 - Seed data for reward_definitions
-- Dependencies: reward_definitions table
-- ============================================================================

-- ============================================================================
-- reward_definitions 시드 데이터
-- ============================================================================

INSERT INTO reward_definitions (reward_type, name, description, icon, color, trigger_event)
VALUES
  -- 목표 관련
  ('badge', '첫 목표 설정', '처음으로 목표를 설정했어요!', '🎯', '#3B82F6', 'first_goal'),
  ('badge', '목표 달성자', '목표를 완벽하게 달성했어요!', '🏆', '#FFD700', 'goal_completed'),

  -- 만다라트 관련
  ('badge', '만다라트 마스터', '처음으로 만다라트를 작성했어요!', '🗂️', '#8B5CF6', 'first_mandala'),

  -- 약점 관리 관련
  ('badge', '약점 정복자', '약점을 극복했어요!', '💪', '#10B981', 'weakness_resolved'),
  ('badge', '재도전 영웅', '다시 도전해서 성공했어요!', '🔁', '#F59E0B', 'retry_success'),

  -- 연속 달성 (Streak)
  ('sticker', '3일 연속 달성', '3일 연속으로 목표를 달성했어요!', '🔥', '#EF4444', 'streak_3'),
  ('sticker', '7일 연속 달성', '일주일 내내 완벽해요!', '⭐', '#F59E0B', 'streak_7'),
  ('badge', '2주 연속 마스터', '2주 연속 완벽! 정말 대단해요!', '👑', '#FFD700', 'streak_14'),

  -- 완벽한 주
  ('achievement', '완벽한 주', '이번 주 모든 습관을 완수했어요!', '✨', '#EC4899', 'perfect_week')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 확인용 쿼리
-- ============================================================================

-- 시드 데이터 확인
-- SELECT name, reward_type, trigger_event FROM reward_definitions ORDER BY created_at;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. 9개 보상 정의 추가 (배지 6개, 스티커 2개, 업적 1개)
-- 2. ON CONFLICT DO NOTHING으로 중복 방지
-- 3. 이벤트 발생 시 자동으로 rewards_ledger에 지급됨
-- ============================================================================

-- ============================================================================
-- 다음 단계 (프론트엔드)
-- ============================================================================
-- 1. 보상 알림 UI 구현
-- 2. progress_events 자동 생성 로직
-- 3. rewards_ledger 자동 지급 트리거
-- 4. 보상 목록 페이지
-- ============================================================================

