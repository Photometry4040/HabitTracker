# Phase 5: 학습 모드 ERD 설계 (개선판 v2)

**작성일:** 2025-10-24
**상태:** 🟢 개선 완료 (핵심 8가지 반영)
**목적:** 기존 Habit Tracker에 나이대별 학습 최적화 기능 추가

---

## 📋 Executive Summary

### 핵심 전략
- ✅ 기존 습관 추적 시스템 **100% 유지**
- ✅ "학습 모드" 토글로 선택적 활성화
- ✅ 나이대별 맞춤 기능 제공 (초등 저~성인)
- ✅ 보상 시스템 3분할 (정의/원장/이벤트)
- ✅ 권한 관리 2분할 (링크/스코프)
- ✅ 만다라트 **27칸까지 제한** (81칸 비활성)
- ✅ 감정 데이터 30일 자동 익명화 DPA

### 타겟 사용자
| 나이대 | 특징 | 핵심 기능 |
|--------|------|-----------|
| 초등 저학년 (1~3) | 놀이화, 즉시 보상 | 색상 코드, 스티커, 간단 목표 |
| 초등 고학년 (4~6) | 목표 인식 시작 | 만다라트 9칸, 약점 메모 |
| 중학생 | 자기주도 학습 | 만다라트 27칸, 약점 분석, 시간 최적화 |
| 고등학생 | 입시 집중 | 전체 기능, ICE 점수, Deep Time |
| 성인 | 자기계발/업무 | 프로젝트 관리형 목표, 워라밸 |

---

## 🗂️ 데이터베이스 스키마 확장

### 1. 기존 테이블 확장

#### 1.1 `children` 테이블 확장
```sql
ALTER TABLE children ADD COLUMN IF NOT EXISTS
  -- 나이대 분류 (자동 전환)
  age_group TEXT CHECK (age_group IN (
    'elementary_low',    -- 초등 저학년 (1~3)
    'elementary_high',   -- 초등 고학년 (4~6)
    'middle',            -- 중학생
    'high',              -- 고등학생
    'adult'              -- 성인
  )),

  -- 생일 (나이 자동 계산용)
  birthday DATE,

  -- 학습 모드 활성화 여부
  learning_mode_enabled BOOLEAN DEFAULT false,

  -- 학년 (선택)
  grade SMALLINT CHECK (grade BETWEEN 1 AND 12),

  -- 학교명 (선택)
  school_name TEXT;

COMMENT ON COLUMN children.age_group IS '나이대 자동 분류 (생일 기반)';
COMMENT ON COLUMN children.birthday IS '생일 (나이대 자동 전환용)';
COMMENT ON COLUMN children.learning_mode_enabled IS '학습 모드 ON/OFF (토글)';
```

---

### 2. 신규 테이블 설계 (개선판)

#### 2.1 `goals` (목표 설정) - 1순위 ⭐⭐⭐

**개선사항:**
- ✅ ICE 점수 SMALLINT로 변경
- ✅ depth 컬럼 추가 (계층 구조)
- ✅ unit 컬럼 추가 (측정 단위)
- ✅ 제약 조건 강화

```sql
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

  -- 만다라트 연결
  mandala_chart_id UUID,  -- FK는 나중에 추가

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_goals_child_status ON goals(child_id, status);
CREATE INDEX idx_goals_child_due ON goals(child_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_goals_parent ON goals(parent_goal_id) WHERE parent_goal_id IS NOT NULL;
CREATE INDEX idx_goals_ice ON goals(child_id, ice_score DESC) WHERE ice_score IS NOT NULL;

-- 제약 조건
ALTER TABLE goals ADD CONSTRAINT ck_goals_completed_status
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status != 'completed');

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_own ON goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY goals_insert_own ON goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY goals_update_own ON goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY goals_delete_own ON goals
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE goals IS 'Phase 5: 학습 목표 설정 (계층 구조 지원)';
COMMENT ON COLUMN goals.depth IS '목표 계층 깊이 (0=최상위, 5=최대)';
COMMENT ON COLUMN goals.ice_score IS 'ICE 우선순위: Impact + Confidence + Ease (0~15)';
```

---

#### 2.2 `mandala_charts` (만다라트 차트) - 1순위 ⭐⭐⭐

**개선사항:**
- ✅ **27칸까지만 허용** (9칸 기본 + 1단 확장)
- ✅ 81칸은 `expansion_enabled` 플래그로 비활성
- ✅ v2 마이그레이션 경로 명시 (mandala_nodes 테이블)

```sql
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

-- 인덱스
CREATE INDEX idx_mandala_child_active ON mandala_charts(child_id, is_active);
CREATE INDEX idx_mandala_goal ON mandala_charts(goal_id) WHERE goal_id IS NOT NULL;

-- RLS
ALTER TABLE mandala_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandala_select_own ON mandala_charts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mandala_insert_own ON mandala_charts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mandala_update_own ON mandala_charts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mandala_delete_own ON mandala_charts
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_mandala_updated_at
BEFORE UPDATE ON mandala_charts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- goals 테이블에 FK 추가
ALTER TABLE goals
ADD CONSTRAINT fk_goals_mandala_chart
FOREIGN KEY (mandala_chart_id) REFERENCES mandala_charts(id)
ON DELETE SET NULL;

COMMENT ON TABLE mandala_charts IS 'Phase 5: 만다라트 차트 (MVP 5.1: 최대 27칸)';
COMMENT ON COLUMN mandala_charts.chart_level IS 'basic=9칸, expanded_27=27칸 (81칸은 MVP 5.2)';
COMMENT ON COLUMN mandala_charts.expansion_enabled IS '81칸 확장 플래그 (MVP 5.2 기능)';

-- v2 마이그레이션 예정 (mandala_nodes 테이블)
-- MVP 5.2에서 JSONB → 정규화된 테이블로 전환 예정
COMMENT ON COLUMN mandala_charts.nodes IS 'v1: JSONB / v2: mandala_nodes 테이블로 마이그레이션 예정';
```

---

#### 2.3 `weaknesses` (약점 관리) - 2순위 ⭐⭐

**개선사항:**
- ✅ `cause_type` ENUM 추가
- ✅ `emotion` ENUM 추가 (분석 용이)
- ✅ `retry_schedule_source` 추가
- ✅ `failure_context` JSONB 추가

```sql
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
  --   "distraction": true,      // 방해 요소 있었나?
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

  -- 보상 연동
  badge_earned_id UUID,  -- rewards_ledger FK (나중에 추가)

  -- 익명화 여부 (30일 후 자동)
  is_anonymized BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_weaknesses_child_date ON weaknesses(child_id, record_date DESC);
CREATE INDEX idx_weaknesses_habit ON weaknesses(habit_id) WHERE habit_id IS NOT NULL;
CREATE INDEX idx_weaknesses_goal ON weaknesses(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_weaknesses_resolved ON weaknesses(child_id, resolved) WHERE NOT resolved;
CREATE INDEX idx_weaknesses_retry ON weaknesses(child_id, retry_scheduled_at) WHERE retry_scheduled_at IS NOT NULL;
CREATE INDEX idx_weaknesses_emotion ON weaknesses(child_id, emotion) WHERE emotion IS NOT NULL;

-- RLS
ALTER TABLE weaknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY weaknesses_select_own ON weaknesses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY weaknesses_insert_own ON weaknesses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY weaknesses_update_own ON weaknesses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY weaknesses_delete_own ON weaknesses
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_weaknesses_updated_at
BEFORE UPDATE ON weaknesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE weaknesses IS 'Phase 5: 약점 관리 및 정서 코칭';
COMMENT ON COLUMN weaknesses.emotion_note IS '30일 후 자동 익명화';
COMMENT ON COLUMN weaknesses.failure_context IS '실패 맥락 (시간대, 장소, 방해 요소)';
```

---

#### 2.4 `time_allocations` (시간 최적화) - 3순위 ⭐

**개선사항:**
- ✅ `day_of_week` ENUM 추가
- ✅ `is_exam_week` 플래그 추가
- ✅ `priority` 추가

```sql
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
  optimal_end_time TIME CHECK (optimal_end_time > optimal_start_time),
  duration_minutes INTEGER CHECK (duration_minutes > 0),

  -- 실제 실행 시간 (로깅)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- 효과성 피드백
  effectiveness_score SMALLINT CHECK (effectiveness_score BETWEEN 1 AND 5),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
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

COMMENT ON TABLE time_allocations IS 'Phase 5: 뇌 과학 기반 시간 최적화';
COMMENT ON COLUMN time_allocations.is_exam_week IS '시험주는 알림 완화';
```

---

#### 2.5 보상 시스템 (3분할) ⭐⭐⭐

**개선사항:**
- ✅ **3개 테이블로 분리**
  - `reward_definitions` (보상 정의)
  - `progress_events` (진행 이벤트)
  - `rewards_ledger` (보상 지급 원장)
- ✅ 이벤트-보상 연결을 선언적으로 관리
- ✅ 중복 지급 방지

##### 2.5.1 `reward_definitions` (보상 정의)

```sql
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

-- 인덱스
CREATE INDEX idx_reward_def_event ON reward_definitions(trigger_event) WHERE is_active;

COMMENT ON TABLE reward_definitions IS 'Phase 5: 보상 정의 (이벤트-보상 매핑)';
```

##### 2.5.2 `progress_events` (진행 이벤트)

```sql
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

-- 인덱스
CREATE INDEX idx_progress_child_type ON progress_events(child_id, event_type, occurred_at DESC);
CREATE INDEX idx_progress_unrewarded ON progress_events(child_id, reward_issued) WHERE NOT reward_issued;

-- RLS
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY progress_select_own ON progress_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY progress_insert_own ON progress_events
FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE progress_events IS 'Phase 5: 진행 이벤트 로그 (보상 트리거)';
```

##### 2.5.3 `rewards_ledger` (보상 지급 원장)

```sql
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

-- 인덱스
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
```

---

#### 2.6 권한 관리 (2분할) ⭐⭐⭐

**개선사항:**
- ✅ **2개 테이블로 분리**
  - `parent_child_links` (관계)
  - `share_scopes` (권한 스코프)
- ✅ 향후 멘토 확장 용이

##### 2.6.1 `parent_child_links` (부모-자녀 관계)

```sql
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

-- 인덱스
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

COMMENT ON TABLE parent_child_links IS 'Phase 5: 부모-자녀 관계 (멘토 확장 가능)';
```

##### 2.6.2 `share_scopes` (권한 스코프)

```sql
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

-- 인덱스
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
```

---

#### 2.7 `praise_messages` (칭찬 메시지)

**개선사항:**
- ✅ 템플릿 분리 (선택)
- ✅ Rate limit 필드 추가
- ✅ 신고 플래그 추가

```sql
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
  template_id UUID,  -- praise_templates FK (나중에 추가)

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

-- 인덱스
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
```

---

## 🔒 감정 데이터 익명화 DPA (Data Protection Agreement)

### 개요
아동의 감정 데이터는 **민감정보**로 간주되며, PIPA (개인정보 보호법) 준수를 위해 30일 후 자동 익명화됩니다.

### 익명화 규칙

#### 1. 익명화 대상 필드
```sql
-- weaknesses 테이블
- emotion_note → NULL 또는 '[익명화됨]'
- emotion → NULL
- failure_context → '{}' (빈 객체)
```

#### 2. 익명화 배치 함수
```sql
CREATE OR REPLACE FUNCTION anonymize_old_emotion_data()
RETURNS TABLE(anonymized_count BIGINT) AS $$
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
    AND NOT is_anonymized;

  GET DIAGNOSTICS anonymized_count = ROW_COUNT;

  -- 감사 로그 기록
  INSERT INTO event_log (
    table_name, action, row_count, details
  ) VALUES (
    'weaknesses', 'anonymize_emotions', anonymized_count,
    jsonb_build_object('cutoff_date', NOW() - INTERVAL '30 days')
  );

  RETURN QUERY SELECT anonymized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_old_emotion_data IS 'Phase 5: 30일 경과 감정 데이터 자동 익명화';
```

#### 3. Cron Job 설정
```sql
-- Supabase pg_cron 사용
SELECT cron.schedule(
  'anonymize-emotions-daily',
  '0 1 * * *',  -- 매일 새벽 1시
  'SELECT anonymize_old_emotion_data();'
);
```

#### 4. 즉시 삭제 함수 (아동/부모 요청)
```sql
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
```

#### 5. 익명화 후 보존 기간
- **익명화된 데이터:** 180일 보관 후 영구 삭제
- **목적:** 패턴 분석 (개인 식별 불가)

```sql
-- 180일 경과 익명화 데이터 삭제
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

SELECT cron.schedule(
  'purge-anonymized-monthly',
  '0 2 1 * *',  -- 매월 1일 새벽 2시
  'SELECT purge_old_anonymized_data();'
);
```

#### 6. 부모 접근 제한
부모는 **감정 원본 데이터**를 볼 수 없으며, **요약 패턴**만 확인 가능합니다.

```sql
-- 부모용 감정 패턴 요약 뷰
CREATE OR REPLACE VIEW v_emotion_summary AS
SELECT
  w.child_id,
  DATE_TRUNC('week', w.record_date) AS week_start,
  w.emotion,
  COUNT(*) AS emotion_count
FROM weaknesses w
WHERE
  NOT w.is_anonymized
  AND w.emotion IS NOT NULL
  AND w.record_date >= NOW() - INTERVAL '30 days'
GROUP BY w.child_id, week_start, w.emotion;

-- RLS
ALTER VIEW v_emotion_summary SET (security_invoker = true);

COMMENT ON VIEW v_emotion_summary IS 'Phase 5: 감정 패턴 요약 (부모용 읽기 전용)';
```

### 부모/아동 권리

| 권리 | 아동 | 부모 |
|------|------|------|
| 감정 원본 열람 | ✅ | ❌ |
| 감정 요약 열람 | ✅ | ✅ (최근 30일만) |
| 즉시 삭제 요청 | ✅ | ✅ (대리) |
| 익명화 중단 | ❌ (자동) | ❌ (자동) |

### SLA (Service Level Agreement)

| 요청 | 처리 기간 |
|------|-----------|
| 즉시 삭제 요청 | 영업일 1일 이내 |
| 익명화 중단 요청 | 불가 (자동 프로세스) |
| 데이터 다운로드 | 영업일 7일 이내 |

---

## 📊 RLS 정책 및 감사 로그

### RLS 헬퍼 함수

```sql
-- 보호자 확인 함수
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

-- 권한 스코프 확인 함수
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
```

### 부모용 RLS 정책 예시

```sql
-- goals 테이블: 부모는 읽기만 가능
CREATE POLICY goals_select_guardian ON goals
FOR SELECT USING (
  auth.uid() = user_id
  OR
  (is_guardian(auth.uid(), child_id) AND has_scope(auth.uid(), child_id, 'read_goals'))
);

-- weaknesses 테이블: 부모는 요약 뷰만 접근
-- (개별 레코드 접근 불가, v_weakness_summary 뷰 사용)
CREATE POLICY weaknesses_select_guardian_summary ON weaknesses
FOR SELECT USING (
  auth.uid() = user_id
  -- 부모는 뷰를 통해서만 접근 가능 (개별 레코드 차단)
);
```

### 감사 로그 테이블

```sql
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

-- 인덱스
CREATE INDEX idx_event_log_user ON event_log(user_id, occurred_at DESC);
CREATE INDEX idx_event_log_table ON event_log(table_name, action, occurred_at DESC);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at DESC);

-- 보존 기간: 90일
SELECT cron.schedule(
  'purge-old-event-logs',
  '0 3 * * 0',  -- 매주 일요일 새벽 3시
  $$DELETE FROM event_log WHERE occurred_at < NOW() - INTERVAL '90 days'$$
);

COMMENT ON TABLE event_log IS 'Phase 5: 감사 로그 (90일 보존)';
```

---

## 📅 MVP 5.1 타임라인 (D0~D7)

### 착수일 기준 절대 일정

**전제:** 착수일 = D0 (예: 2025-10-25 금요일)

| Day | 날짜 (예시) | 작업 내용 | 예상 시간 |
|-----|-----------|-----------|-----------|
| **D0** | 10/25 (금) | - 스키마 확정 및 마이그레이션 스크립트 작성<br>- RLS 정책 SQL 작성<br>- 테스트 시드 데이터 생성 | 6~8시간 |
| **D1** | 10/26 (토) | - `children` 확장 (age_group, birthday)<br>- 나이대 자동 전환 함수<br>- 학습 모드 토글 UI | 6~8시간 |
| **D2** | 10/27 (일) | - `goals` 테이블 구현 (ICE 점수)<br>- 목표 설정 UI (기본)<br>- 목표-습관 연결 | 6~8시간 |
| **D3** | 10/28 (월) | - `weaknesses` 테이블 구현<br>- 약점 기록 폼 (감정 선택)<br>- 재시도 예약 기능 | 6~8시간 |
| **D4** | 10/29 (화) | - `mandala_charts` 테이블 (9칸/27칸)<br>- 만다라트 UI (기본 9칸)<br>- 1단 확장 플래그 (비활성) | 8~10시간 |
| **D5** | 10/30 (수) | - 보상 시스템 3분할 구현<br>- `reward_definitions`, `progress_events`, `rewards_ledger`<br>- 이벤트-보상 자동 연결 | 6~8시간 |
| **D6** | 10/31 (목) | - 권한 관리 2분할 (`parent_child_links`, `share_scopes`)<br>- 부모 읽기 전용 뷰<br>- 칭찬 메시지 기능 | 6~8시간 |
| **D7** | 11/1 (금) | - 통합 테스트 (시나리오 3종)<br>- 감정 익명화 배치 시뮬레이션<br>- RLS 침투 테스트<br>- 버그 수정 | 6~8시간 |

**총 예상 시간:** 50~66시간 (실제 작업 시간)
**캘린더 기준:** 7영업일 (주말 포함 8일)

### 테스트 시나리오 (D7)

#### 시나리오 1: 초등학생 (10분)
1. 자녀 등록 (나이대: 초등 고학년)
2. 학습 모드 ON
3. 목표 설정 ("수학 문제 30개 풀기")
4. 만다라트 기본 (9칸) 작성
5. 약점 기록 (감정: 좌절, 재시도 예약)
6. 보상 획득 확인 ("첫 목표 설정" 배지)

#### 시나리오 2: 중고등학생 (10분)
1. 자녀 등록 (나이대: 중학생)
2. 목표 설정 (ICE 점수 입력)
3. 만다라트 27칸 (1단 확장)
4. 약점 기록 3개 (패턴 확인)
5. 시간 최적화 제안 확인
6. 재시도 성공 → 보상 획득

#### 시나리오 3: 부모 (10분)
1. 자녀의 목표 읽기 전용 확인
2. 약점 요약 패턴 확인 (감정 원본 비공개)
3. 칭찬 메시지 전송 (템플릿 사용)
4. 감정 데이터 즉시 삭제 요청 (대리)
5. 권한 스코프 확인

**목표 통과율:** ≥ 80% (24/30 시나리오 성공)

---

## 🎯 나이대별 기능 활성화 매트릭스 (개정)

| 기능 | 초등 저 | 초등 고 | 중학생 | 고등생 | 성인 |
|------|---------|---------|--------|--------|------|
| **기본 습관 추적** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **목표 설정** | 🟡 간단 | ✅ | ✅ | ✅ | ✅ |
| **만다라트 (9칸)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **만다라트 확장 (27칸)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **만다라트 (81칸)** | ❌ | ❌ | ❌ | 🔒 MVP 5.2 | 🔒 MVP 5.2 |
| **약점 관리** | 🟡 메모만 | ✅ | ✅ | ✅ | ✅ |
| **감정 기록** | ❌ | 🟡 | ✅ | ✅ | ✅ |
| **시간 최적화** | ❌ | ❌ | 🟡 | ✅ | ✅ |
| **ICE 점수** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **보상 (배지/스티커)** | ✅ | ✅ | ✅ | ✅ | 🟡 |
| **부모 공유** | ✅ | ✅ | ✅ | 🟡 | ❌ |

---

## 🔒 보안 체크리스트

### RLS 정책
- [x] 모든 신규 테이블 RLS 활성화
- [x] 소유자 기반 SELECT/INSERT/UPDATE/DELETE 정책
- [x] 부모/멘토 읽기 권한은 `share_scopes`로 제어
- [x] 감정 원본은 부모 접근 차단 (요약만 뷰로 제공)

### 감사 로그
- [x] `event_log` 테이블 생성
- [x] 주요 이벤트 로깅 (익명화, 삭제, 권한 변경)
- [x] 90일 보존 후 자동 삭제

### 데이터 보호
- [x] 감정 데이터 30일 자동 익명화
- [x] 익명화 후 180일 보존
- [x] 즉시 삭제 함수 제공
- [x] 부모/아동 권리 명시

### Rate Limiting
- [ ] 칭찬 메시지 일일 제한 (10회/일)
- [ ] 목표 생성 제한 (50개/자녀)
- [ ] API Rate Limit (Edge Function)

---

## 📈 성공 지표 (첫 30일)

| 지표 | 목표 | 측정 쿼리 |
|------|------|-----------|
| 학습 모드 활성화율 | ≥ 60% | `SELECT COUNT(*) FROM children WHERE learning_mode_enabled` |
| 24시간 내 목표 설정 | ≥ 70% | `SELECT COUNT(*) FROM goals WHERE created_at >= NOW() - INTERVAL '24 hours'` |
| 첫 주 만다라트 작성 | ≥ 50% | `SELECT COUNT(DISTINCT child_id) FROM mandala_charts WHERE created_at >= NOW() - INTERVAL '7 days'` |
| 약점 기록 경험 | ≥ 55% | `SELECT COUNT(DISTINCT child_id) FROM weaknesses` |
| 재시도 예약 사용 | ≥ 25% | `SELECT COUNT(*) FROM weaknesses WHERE retry_scheduled_at IS NOT NULL` |
| 3일 연속 달성 (저학년) | ≥ 40% | (복잡한 쿼리, 별도 함수로 구현) |
| 부모 칭찬 전송 | ≥ 30% | `SELECT COUNT(DISTINCT from_user_id) FROM praise_messages` |
| 배지 획득 | ≥ 70% | `SELECT COUNT(DISTINCT child_id) FROM rewards_ledger` |

---

## 🚀 다음 단계

### 즉시 실행 가능 (승인 후)

1. **마이그레이션 스크립트 작성** (D0)
   - 17개 테이블 DDL
   - RLS 정책 SQL
   - 헬퍼 함수 (익명화, 권한 확인)
   - 시드 데이터

2. **구현 체크리스트 문서 작성**
   - 단계별 작업 목록
   - 완료 조건
   - 테스트 케이스

3. **Git 브랜치 전략**
   - `feature/phase5-mvp-5.1`
   - 기능별 하위 브랜치
   - PR 체크리스트

---

## ❓ 열린 이슈 (해결됨)

### ~~1. MVP 일정/공수~~ ✅ 해결
- **결정:** MVP 5.1만 먼저 (50~66시간, D0~D7)
- **근거:** 린 스타트업, 빠른 피드백

### ~~2. 멘토 역할 범위~~ ✅ 해결
- **결정:** 읽기 + 칭찬 코멘트
- **구현:** `share_scopes` 테이블로 세밀 제어

### ~~3. 감정 데이터 보호~~ ✅ 해결
- **결정:** 30일 후 자동 익명화
- **구현:** DPA 섹션 참조

---

**최종 수정일:** 2025-10-24
**문서 버전:** 2.0 (개선판)
**변경 사항:**
- ✅ 타임라인 정정 (D0~D7 절대 날짜)
- ✅ 만다라트 범위 제한 (27칸)
- ✅ 보상 시스템 3분할
- ✅ 권한 관리 2분할
- ✅ 감정 데이터 익명화 DPA
- ✅ RLS 정책 샘플
- ✅ 감사 로그 구현
- ✅ weaknesses/goals 필드 보강

**승인 대기 중** 🟢
