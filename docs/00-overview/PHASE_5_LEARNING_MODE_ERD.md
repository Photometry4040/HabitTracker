# Phase 5: 학습 모드(Learning Mode) ERD 설계

**작성일:** 2025-10-24
**상태:** 🔵 설계 완료 (구현 대기)
**목적:** 기존 Habit Tracker에 나이대별 학습 최적화 기능 추가

---

## 📋 Executive Summary

### 핵심 전략
- ✅ 기존 습관 추적 시스템 **100% 유지**
- ✅ "학습 모드" 토글로 선택적 활성화
- ✅ 나이대별 맞춤 기능 제공 (초등 저~성인)
- ✅ 보상 시스템을 학습 이벤트와 연동
- ✅ 부모-자녀 공유/멘토링 강화
- ✅ 만다라트 차트를 핵심 시각화 도구로 활용

### 타겟 사용자
| 나이대 | 특징 | 핵심 기능 |
|--------|------|-----------|
| 초등 저학년 (1~3) | 놀이화, 즉시 보상 | 색상 코드, 스티커, 간단 목표 |
| 초등 고학년 (4~6) | 목표 인식 시작 | 만다라트 기본, 약점 메모 |
| 중학생 | 자기주도 학습 | 만다라트 확장, 약점 분석, 시간 최적화 |
| 고등학생 | 입시 집중 | 전체 기능, KPI 목표, Deep Time |
| 성인 | 자기계발/업무 | 프로젝트 관리형 목표, 워라밸 |

---

## 🗂️ 데이터베이스 스키마 확장

### 1. 기존 테이블 확장

#### 1.1 `children` 테이블 확장
```sql
ALTER TABLE children ADD COLUMN IF NOT EXISTS:
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
  grade INTEGER,

  -- 학교명 (선택)
  school_name TEXT;

COMMENT ON COLUMN children.age_group IS '나이대 자동 분류 (생일 기반)';
COMMENT ON COLUMN children.birthday IS '생일 (나이대 자동 전환용)';
COMMENT ON COLUMN children.learning_mode_enabled IS '학습 모드 ON/OFF (토글)';
```

---

### 2. 신규 테이블 설계

#### 2.1 `goals` (목표 설정) - 1순위 ⭐⭐⭐

**목적:** 장기/단기 목표를 설정하고 만다라트와 연동

```sql
CREATE TABLE IF NOT EXISTS goals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 목표 계층
  goal_level TEXT CHECK (goal_level IN (
    'identity',      -- 정체성 문구 (가장 상위)
    'long_term',     -- 장기 목표 (1년)
    'short_term',    -- 단기 목표 (1~3개월)
    'weekly'         -- 주간 목표
  )),

  -- 목표 내용
  title TEXT NOT NULL,
  description TEXT,

  -- 정체성 문구 (goal_level = 'identity'일 때)
  identity_statement TEXT,

  -- 측정 기준
  measurement_type TEXT CHECK (measurement_type IN (
    'boolean',       -- 달성/미달성
    'count',         -- 횟수 (예: 문제 수)
    'time',          -- 시간 (분)
    'percentage'     -- 퍼센트
  )),
  target_value NUMERIC,  -- 목표치
  current_value NUMERIC DEFAULT 0,  -- 현재 진행

  -- ICE 우선순위 점수 (선택)
  impact_score INTEGER CHECK (impact_score BETWEEN 0 AND 5),      -- 영향도
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 5),  -- 자신감
  ease_score INTEGER CHECK (ease_score BETWEEN 0 AND 5),          -- 쉬움
  ice_total INTEGER GENERATED ALWAYS AS (
    COALESCE(impact_score, 0) + COALESCE(confidence_score, 0) + COALESCE(ease_score, 0)
  ) STORED,

  -- 기간
  start_date DATE,
  due_date DATE,

  -- 연결
  parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,  -- 상위 목표
  mandala_chart_id UUID,  -- 연결된 만다라트 (FK는 나중에 추가)

  -- 상태
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',        -- 진행 중
    'completed',     -- 완료
    'failed',        -- 실패
    'paused'         -- 일시정지
  )),
  completed_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_goals_child_id ON goals(child_id);
CREATE INDEX idx_goals_due_date ON goals(child_id, due_date);
CREATE INDEX idx_goals_parent_goal ON goals(parent_goal_id);
CREATE INDEX idx_goals_ice_score ON goals(child_id, ice_total DESC);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_policy ON goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY goals_insert_policy ON goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY goals_update_policy ON goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY goals_delete_policy ON goals
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

#### 2.2 `mandala_charts` (만다라트 차트) - 1순위 ⭐⭐⭐

**목적:** 3×3 격자로 목표를 시각화하고 세분화

```sql
CREATE TABLE IF NOT EXISTS mandala_charts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,  -- 연결된 목표

  -- 만다라트 계층
  chart_level TEXT CHECK (chart_level IN (
    'basic',         -- 기본 9칸 (1개)
    'expanded'       -- 확장 81칸 (9개)
  )) DEFAULT 'basic',

  -- 중앙 목표 (핵심 목표)
  center_goal TEXT NOT NULL,
  center_goal_color TEXT DEFAULT '#3B82F6',  -- 색상
  center_goal_emoji TEXT,  -- 이모지

  -- 주변 8칸 (세부 목표)
  -- JSONB 구조:
  -- [
  --   {
  --     "position": 1,  // 1~8 (시계방향: 상단부터)
  --     "title": "수학 공부",
  --     "color": "#10B981",
  --     "emoji": "📚",
  --     "goal_id": "uuid",  // 연결된 goal
  --     "completed": false,
  --     "completion_rate": 0.5,
  --     "expanded_chart_id": "uuid"  // 확장된 만다라트 ID (81칸용)
  --   },
  --   ...
  -- ]
  sub_goals JSONB DEFAULT '[]',

  -- 전체 진행률
  overall_completion_rate NUMERIC DEFAULT 0 CHECK (overall_completion_rate BETWEEN 0 AND 100),

  -- 시각화 옵션
  show_progress BOOLEAN DEFAULT true,
  show_emojis BOOLEAN DEFAULT true,
  color_scheme TEXT DEFAULT 'blue',  -- 테마

  -- 상태
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_mandala_child_id ON mandala_charts(child_id);
CREATE INDEX idx_mandala_goal_id ON mandala_charts(goal_id);
CREATE INDEX idx_mandala_active ON mandala_charts(child_id, is_active);

-- RLS
ALTER TABLE mandala_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandala_select_policy ON mandala_charts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mandala_insert_policy ON mandala_charts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mandala_update_policy ON mandala_charts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mandala_delete_policy ON mandala_charts
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
```

---

#### 2.3 `weaknesses` (약점 관리) - 2순위 ⭐⭐

**목적:** 실패/어려움을 기록하고 보완 계획 수립

```sql
CREATE TABLE IF NOT EXISTS weaknesses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,  -- 연결된 습관
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,    -- 연결된 목표
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
  weakness_note TEXT NOT NULL,  -- 무엇이 어려웠는지
  self_question TEXT,           -- 자체 질문 ("이 조건은 어떻게 쓰는가?")

  -- 감정 기록 (정서 코칭) - Grok 추천 ⭐
  emotion_note TEXT,  -- 좌절, 불안, 흥미, 짜증 등
  emotion_type TEXT CHECK (emotion_type IN (
    'frustrated',    -- 좌절
    'anxious',       -- 불안
    'bored',         -- 지루함
    'interested',    -- 흥미
    'angry',         -- 화남
    'confident'      -- 자신감
  )),

  -- 보완 계획 (If-Then)
  improvement_plan TEXT,  -- 다음에 어떻게 할 것인가
  retry_scheduled_at TIMESTAMPTZ,  -- 재시도 예약 시간

  -- 해결 여부
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,  -- 어떻게 해결했는지

  -- 보상 연동
  badge_earned TEXT,  -- "약점 정복" 배지

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_weaknesses_child_date ON weaknesses(child_id, record_date DESC);
CREATE INDEX idx_weaknesses_habit ON weaknesses(habit_id);
CREATE INDEX idx_weaknesses_resolved ON weaknesses(child_id, resolved);
CREATE INDEX idx_weaknesses_retry ON weaknesses(child_id, retry_scheduled_at);

-- RLS
ALTER TABLE weaknesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY weaknesses_select_policy ON weaknesses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY weaknesses_insert_policy ON weaknesses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY weaknesses_update_policy ON weaknesses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY weaknesses_delete_policy ON weaknesses
FOR DELETE USING (auth.uid() = user_id);

-- 트리거
CREATE TRIGGER set_weaknesses_updated_at
BEFORE UPDATE ON weaknesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

#### 2.4 `time_allocations` (시간 최적화) - 3순위 ⭐

**목적:** 뇌 과학 기반 시간대별 작업 배치

```sql
CREATE TABLE IF NOT EXISTS time_allocations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,

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

  -- 최적 시간
  optimal_start_time TIME,
  optimal_end_time TIME,
  duration_minutes INTEGER,

  -- 실제 실행 시간 (로깅)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- 효과성 피드백
  effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 5),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_time_child ON time_allocations(child_id);
CREATE INDEX idx_time_slot ON time_allocations(time_slot);

-- RLS
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_select_policy ON time_allocations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY time_insert_policy ON time_allocations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY time_update_policy ON time_allocations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY time_delete_policy ON time_allocations
FOR DELETE USING (auth.uid() = user_id);
```

---

#### 2.5 `rewards` (보상 시스템) - 학습 모드 연동 ⭐⭐

**목적:** 목표 달성, 약점 극복 시 배지/스티커 지급

```sql
CREATE TABLE IF NOT EXISTS rewards (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 보상 종류
  reward_type TEXT CHECK (reward_type IN (
    'badge',         -- 배지
    'sticker',       -- 스티커
    'achievement',   -- 업적
    'level_up'       -- 레벨업
  )),

  -- 보상 이름
  reward_name TEXT NOT NULL,  -- "약점 정복", "3일 연속", "목표 달성"
  reward_description TEXT,
  reward_icon TEXT,  -- 이모지 또는 이미지 URL
  reward_color TEXT DEFAULT '#FFD700',

  -- 트리거 이벤트
  trigger_event TEXT CHECK (trigger_event IN (
    'goal_completed',        -- 목표 달성
    'weakness_resolved',     -- 약점 해결
    'streak_3',              -- 3일 연속
    'streak_7',              -- 7일 연속
    'streak_14',             -- 14일 연속
    'first_goal',            -- 첫 목표 설정
    'first_mandala',         -- 첫 만다라트 작성
    'perfect_week'           -- 완벽한 주
  )),

  -- 연결
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  weakness_id UUID REFERENCES weaknesses(id) ON DELETE SET NULL,

  -- 획득 정보
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true,  -- 새 보상인지 (알림용)
  viewed_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_rewards_child ON rewards(child_id, earned_at DESC);
CREATE INDEX idx_rewards_new ON rewards(child_id, is_new);

-- RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY rewards_select_policy ON rewards
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY rewards_insert_policy ON rewards
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY rewards_update_policy ON rewards
FOR UPDATE USING (auth.uid() = user_id);
```

---

#### 2.6 `parent_child_sharing` (부모-자녀 공유) - Grok 추천 ⭐⭐

**목적:** 부모가 자녀의 목표/약점/진행상황을 읽기 전용으로 확인

```sql
CREATE TABLE IF NOT EXISTS parent_child_sharing (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 공유 권한
  can_view_goals BOOLEAN DEFAULT true,
  can_view_weaknesses BOOLEAN DEFAULT true,
  can_view_mandala BOOLEAN DEFAULT true,
  can_send_praise BOOLEAN DEFAULT true,  -- 칭찬 메시지 전송

  -- 멘토 역할 (선택)
  is_mentor BOOLEAN DEFAULT false,
  mentor_name TEXT,

  -- 상태
  is_active BOOLEAN DEFAULT true,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_sharing_parent ON parent_child_sharing(parent_user_id);
CREATE INDEX idx_sharing_child ON parent_child_sharing(child_id);

-- RLS
ALTER TABLE parent_child_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY sharing_select_policy ON parent_child_sharing
FOR SELECT USING (
  auth.uid() = parent_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY sharing_insert_policy ON parent_child_sharing
FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY sharing_update_policy ON parent_child_sharing
FOR UPDATE USING (auth.uid() = parent_user_id);
```

---

#### 2.7 `praise_messages` (칭찬 메시지) - 부모 코칭 도구

**목적:** 부모가 자녀에게 칭찬 메시지 전송

```sql
CREATE TABLE IF NOT EXISTS praise_messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- 메시지 내용
  message_text TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN (
    'praise',        -- 칭찬
    'encouragement', -- 격려
    'advice'         -- 조언
  )),

  -- 템플릿 (선택)
  template_used TEXT,  -- "수고했어!", "잘했어!", "다음엔 더 잘할 거야!"

  -- 연결
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  weakness_id UUID REFERENCES weaknesses(id) ON DELETE SET NULL,

  -- 읽음 여부
  read_at TIMESTAMPTZ,

  -- 타임스탬프
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_praise_child ON praise_messages(child_id, sent_at DESC);
CREATE INDEX idx_praise_unread ON praise_messages(child_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE praise_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY praise_select_policy ON praise_messages
FOR SELECT USING (
  auth.uid() = from_user_id
  OR
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

CREATE POLICY praise_insert_policy ON praise_messages
FOR INSERT WITH CHECK (auth.uid() = from_user_id);
```

---

## 🔗 ERD 관계 다이어그램

```
users (Supabase Auth)
  ↓
children (+ age_group, birthday, learning_mode_enabled)
  ↓
  ├─ weeks → habits → habit_records (기존 시스템 유지) ✅
  │
  ├─ goals (목표 설정) ⭐
  │    ├─ parent_goal_id (계층 구조)
  │    └─ mandala_charts (시각화) ⭐
  │         └─ sub_goals (JSONB: 8개 세부 목표)
  │
  ├─ weaknesses (약점 관리) ⭐
  │    ├─ habit_id (연결)
  │    ├─ goal_id (연결)
  │    ├─ emotion_note (감정 기록)
  │    └─ retry_scheduled_at (재시도 예약)
  │
  ├─ time_allocations (시간 최적화)
  │    ├─ habit_id
  │    └─ goal_id
  │
  ├─ rewards (보상) ⭐
  │    ├─ goal_id (목표 달성)
  │    └─ weakness_id (약점 극복)
  │
  ├─ parent_child_sharing (부모-자녀 공유) ⭐
  │    └─ can_view_* (권한)
  │
  └─ praise_messages (칭찬) ⭐
       ├─ goal_id
       └─ weakness_id
```

---

## 🎯 나이대별 기능 활성화 매트릭스

| 기능 | 초등 저 | 초등 고 | 중학생 | 고등생 | 성인 |
|------|---------|---------|--------|--------|------|
| **기본 습관 추적** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **목표 설정** | 🟡 간단 | ✅ | ✅ | ✅ | ✅ |
| **만다라트 (9칸)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **만다라트 확장 (81칸)** | ❌ | ❌ | 🟡 | ✅ | ✅ |
| **약점 관리** | 🟡 메모만 | ✅ | ✅ | ✅ | ✅ |
| **감정 기록** | ❌ | 🟡 | ✅ | ✅ | ✅ |
| **시간 최적화** | ❌ | ❌ | 🟡 | ✅ | ✅ |
| **ICE 점수** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **보상 (배지/스티커)** | ✅ | ✅ | ✅ | ✅ | 🟡 |
| **부모 공유** | ✅ | ✅ | ✅ | 🟡 | ❌ |

---

## 🚀 MVP 범위 및 개발 일정

### MVP Phase 5.1 (핵심 기능) - 약 40~50시간

| 단계 | 기능 | 예상 시간 | 우선순위 |
|------|------|-----------|----------|
| **Step 1** | 나이대 선택 & 생일 자동 전환 | 3~4시간 | 필수 |
| **Step 2** | 학습 모드 토글 (대시보드) | 2~3시간 | 필수 |
| **Step 3** | 목표 설정 (기본) | 6~8시간 | ⭐⭐⭐ |
| **Step 4** | 만다라트 기본 (9칸) | 10~12시간 | ⭐⭐⭐ |
| **Step 5** | 약점 관리 (메모+재시도) | 8~10시간 | ⭐⭐ |
| **Step 6** | 보상 시스템 연동 | 6~8시간 | ⭐⭐ |
| **Step 7** | 부모-자녀 공유 (읽기 전용) | 5~7시간 | ⭐⭐ |
| **테스트** | 통합 테스트 & 버그 수정 | 4~6시간 | 필수 |
| **총합** | **MVP 5.1** | **44~58시간** | - |

### MVP Phase 5.2 (고급 기능) - 약 30~40시간

| 단계 | 기능 | 예상 시간 |
|------|------|-----------|
| **Step 8** | 만다라트 확장 (81칸) | 8~10시간 |
| **Step 9** | 감정 기록 & 정서 코칭 | 6~8시간 |
| **Step 10** | 시간 최적화 제안 | 6~8시간 |
| **Step 11** | ICE 점수 & 우선순위 | 4~6시간 |
| **Step 12** | 칭찬 메시지 & 템플릿 | 4~6시간 |
| **Step 13** | 통계 대시보드 확장 | 6~8시간 |
| **총합** | **MVP 5.2** | **34~46시간** |

**전체 Phase 5 예상 시간:** 78~104시간

---

## 📊 만다라트 구현 세부 사항

### 연령별 만다라트 템플릿

#### 초등 고학년 (4~6학년)
```json
{
  "center_goal": "성적 올리기",
  "center_emoji": "📚",
  "sub_goals": [
    {"position": 1, "title": "국어", "emoji": "✏️", "color": "#EF4444"},
    {"position": 2, "title": "수학", "emoji": "🔢", "color": "#3B82F6"},
    {"position": 3, "title": "과학", "emoji": "🔬", "color": "#10B981"},
    {"position": 4, "title": "영어", "emoji": "🇬🇧", "color": "#F59E0B"},
    {"position": 5, "title": "책읽기", "emoji": "📖", "color": "#8B5CF6"},
    {"position": 6, "title": "일찍 자기", "emoji": "😴", "color": "#EC4899"},
    {"position": 7, "title": "아침밥 먹기", "emoji": "🍚", "color": "#14B8A6"},
    {"position": 8, "title": "준비물 챙기기", "emoji": "🎒", "color": "#F97316"}
  ]
}
```

#### 중학생
```json
{
  "center_goal": "고등학교 진학 성공",
  "center_emoji": "🎯",
  "sub_goals": [
    {"position": 1, "title": "내신 성적", "target": "90점 이상"},
    {"position": 2, "title": "봉사활동", "target": "20시간"},
    {"position": 3, "title": "체험활동", "target": "월 1회"},
    {"position": 4, "title": "자기관리", "target": "매일"},
    {"position": 5, "title": "체력 기르기", "target": "주 3회 운동"},
    {"position": 6, "title": "시간 관리", "target": "계획표 준수"},
    {"position": 7, "title": "대인관계", "target": "친구 관계 개선"},
    {"position": 8, "title": "진로 탐색", "target": "월 1회 직업 조사"}
  ]
}
```

#### 고등학생
```json
{
  "center_goal": "서울대 합격",
  "center_emoji": "🏆",
  "sub_goals": [
    {"position": 1, "title": "내신 등급", "target": "1.5 이내", "expanded": true},
    {"position": 2, "title": "모의고사", "target": "1등급", "expanded": true},
    {"position": 3, "title": "EBS 공부", "target": "주 10시간"},
    {"position": 4, "title": "자기소개서", "target": "월 1회 수정"},
    {"position": 5, "title": "논술", "target": "주 2회 연습"},
    {"position": 6, "title": "동아리", "target": "리더 역할"},
    {"position": 7, "title": "봉사활동", "target": "30시간"},
    {"position": 8, "title": "체력관리", "target": "주 3회 운동"}
  ]
}
```

### 만다라트 확장 구조 (81칸)

```
기본 9칸 (Level 1)
  ↓
각 세부 목표를 클릭 → 새로운 9칸 생성 (Level 2)
  ↓
총 1 + 8 = 9개의 만다라트 차트
총 81칸 (1 중앙 + 8 세부 × (1 중앙 + 8 세부))
```

**데이터 구조:**
```json
{
  "main_chart_id": "uuid-1",
  "center_goal": "서울대 합격",
  "sub_goals": [
    {
      "position": 1,
      "title": "내신 등급",
      "expanded_chart_id": "uuid-2",  // 확장된 차트 참조
      "expansion": {
        "center_goal": "내신 1.5 이내",
        "sub_goals": [
          {"position": 1, "title": "국어 1등급"},
          {"position": 2, "title": "수학 1등급"},
          {"position": 3, "title": "영어 1등급"},
          {"position": 4, "title": "과탐 1등급"},
          {"position": 5, "title": "수행평가 A+"},
          {"position": 6, "title": "중간고사 대비"},
          {"position": 7, "title": "기말고사 대비"},
          {"position": 8, "title": "모의고사 연계"}
        ]
      }
    },
    // ... 나머지 7개
  ]
}
```

---

## 🎨 UI/UX 가이드

### 1. 학습 모드 토글

**위치:** 대시보드 상단 (우측)

```jsx
// 컴포넌트 예시
<div className="flex items-center gap-2">
  <span className="text-sm">학습 모드</span>
  <Switch
    checked={learningMode}
    onCheckedChange={(checked) => toggleLearningMode(checked)}
  />
</div>

// 학습 모드 ON일 때 보이는 메뉴
{learningMode && (
  <div className="grid grid-cols-3 gap-4 mt-4">
    <Card>🎯 목표 설정</Card>
    <Card>🗂️ 만다라트</Card>
    <Card>📝 약점 노트</Card>
  </div>
)}
```

### 2. 만다라트 UI

**기본 9칸 레이아웃:**

```
┌─────────┬─────────┬─────────┐
│  목표1  │  목표2  │  목표3  │
│  📚 50% │  🔢 30% │  🔬 80% │
├─────────┼─────────┼─────────┤
│  목표8  │  핵심   │  목표4  │
│  🎒 90% │  📈 65% │  🇬🇧 40% │
├─────────┼─────────┼─────────┤
│  목표7  │  목표6  │  목표5  │
│  🍚 70% │  😴 60% │  📖 55% │
└─────────┴─────────┴─────────┘
```

**인터랙션:**
- 클릭 → 세부 목표 수정 모달
- 우클릭 → 삭제
- 드래그 → 순서 변경 (선택)
- 더블클릭 → 확장 (81칸)

### 3. 약점 기록 폼

**실패/어려움 발생 시 팝업:**

```
┌────────────────────────────────────┐
│  😢 무엇이 어려웠나요?              │
├────────────────────────────────────┤
│  원인:                              │
│  [○ 개념 모름  ○ 집중 안됨          │
│   ○ 피곤함    ○ 시간 부족]          │
│                                     │
│  자세히:                            │
│  ┌──────────────────────────────┐  │
│  │ 분수 나눗셈 방법을 잘 모르겠음│  │
│  └──────────────────────────────┘  │
│                                     │
│  기분:                              │
│  [😢 좌절  😰 불안  😠 짜증  😐 그냥] │
│                                     │
│  다음엔?                            │
│  ┌──────────────────────────────┐  │
│  │ 교과서 예제 다시 보기          │  │
│  └──────────────────────────────┘  │
│                                     │
│  [48시간 후 재시도 예약]  [저장]    │
└────────────────────────────────────┘
```

### 4. 보상 알림

**배지 획득 시 애니메이션:**

```
┌────────────────────────────────────┐
│              🎉                     │
│                                     │
│      축하합니다!                     │
│                                     │
│      🏆 "약점 정복" 배지 획득!      │
│                                     │
│  분수 나눗셈을 완벽하게 이해했어요!  │
│                                     │
│         [확인]                      │
└────────────────────────────────────┘
```

---

## 🔒 보안 및 개인정보 보호

### 1. RLS (Row-Level Security)

- ✅ 모든 신규 테이블에 RLS 활성화
- ✅ `user_id` 기반 접근 제어
- ✅ 부모-자녀 공유는 `parent_child_sharing` 테이블로 권한 관리

### 2. 감정 데이터 보호 (PIPA 준수)

**원칙:**
- 감정 데이터는 **30일 후 자동 익명화** (선택)
- 부모도 감정 원본은 볼 수 없고, "최근 감정 패턴" 요약만 제공
- 아동이 삭제 요청 시 즉시 삭제

**구현:**
```sql
-- 30일 후 감정 데이터 익명화 함수
CREATE OR REPLACE FUNCTION anonymize_old_emotions()
RETURNS void AS $$
BEGIN
  UPDATE weaknesses
  SET emotion_note = '[익명화됨]',
      emotion_type = NULL
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND emotion_note IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 매일 자정 실행 (Cron Job)
SELECT cron.schedule(
  'anonymize-emotions',
  '0 0 * * *',
  'SELECT anonymize_old_emotions();'
);
```

### 3. 부모-자녀 권한 분리

| 데이터 | 자녀 | 부모 (읽기 전용) | 멘토 |
|--------|------|------------------|------|
| 목표 | 읽기/쓰기 | 읽기 | 읽기 |
| 만다라트 | 읽기/쓰기 | 읽기 | 읽기 |
| 약점 메모 | 읽기/쓰기 | 요약만 | 요약만 |
| 감정 원본 | 읽기/쓰기 | ❌ 접근 불가 | ❌ 접근 불가 |
| 습관 기록 | 읽기/쓰기 | 읽기 | 읽기 |

---

## 📈 성공 지표 (첫 30일)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 학습 모드 활성화율 | ≥ 60% | `children.learning_mode_enabled = true` |
| 24시간 내 목표 설정 | ≥ 70% | `goals` 생성 후 24시간 이내 |
| 첫 주 만다라트 작성 | ≥ 50% | `mandala_charts` 생성 |
| 약점 기록 경험 | ≥ 55% | `weaknesses` 최소 1개 이상 |
| 재시도 예약 사용 | ≥ 25% | `retry_scheduled_at IS NOT NULL` |
| 3일 연속 달성 (저학년) | ≥ 40% | 연속 3일 `habit_records.status = 'green'` |
| 부모 칭찬 전송 | ≥ 30% | `praise_messages` 최소 1개 |
| 배지 획득 | ≥ 70% | `rewards` 최소 1개 |

---

## ❓ 열린 이슈 (결정 필요)

### 1. MVP 일정/공수 확정

**현재 추정:**
- MVP 5.1 (핵심): 44~58시간
- MVP 5.2 (고급): 34~46시간
- **총 78~104시간**

**Grok의 212~128시간**과 차이가 있습니다.

**제 의견:**
- **현실적 범위:** MVP 5.1만 먼저 구현 (약 6~7일 작업)
- **점진적 확장:** 5.1 완료 후 사용자 피드백 받고 5.2 진행
- **우선순위:** 나이대 선택 → 목표 설정 → 만다라트 기본 → 약점 관리 → 보상 연동

### 2. 멘토 역할 범위

**옵션:**
- A) 읽기 전용만 (현재 설계)
- B) 읽기 + 칭찬 코멘트 가능 (추천 ⭐)
- C) 읽기 + 코멘트 + 목표 제안

**제 추천:** **B) 읽기 + 칭찬 코멘트**
- 부모/멘토가 `praise_messages`만 전송 가능
- 목표/약점은 자녀가 직접 작성 (자기주도성 유지)
- 코멘트 템플릿 제공 ("수고했어!", "다음엔 더 잘할 거야!")

### 3. 감정 데이터 보호 정책

**옵션:**
- A) 30일 후 자동 익명화 (제 설계)
- B) 60일 후 완전 삭제
- C) 영구 보관 (부모도 볼 수 없음)

**제 추천:** **A) 30일 후 자동 익명화**
- PIPA 준수
- 아동이 원하면 즉시 삭제 가능
- 부모는 "최근 감정 패턴" 요약만 확인

---

## 🎯 다음 단계

1. **ERD 승인:** 위 설계를 검토하고 수정 사항 알려주세요
2. **MVP 범위 확정:** MVP 5.1만 먼저? 아니면 전체?
3. **열린 이슈 결정:** 멘토 권한, 감정 데이터 보호 방향
4. **마이그레이션 스크립트 작성:** 승인 후 즉시 시작
5. **UI 목업 필요 여부:** 화면 디자인 시안을 먼저 보고 싶으신가요?

---

**최종 수정일:** 2025-10-24
**문서 버전:** 1.0
**작성자:** Claude Code
**검토 대기 중**
