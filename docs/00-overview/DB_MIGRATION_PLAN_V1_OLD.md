# 데이터베이스 마이그레이션 계획서

> **프로젝트**: 아이들을 위한 습관 추적기 - DB 재설계
> **작성일**: 2025년 10월 11일
> **버전**: 1.0
> **관련 문서**: [TECH_SPEC.md](TECH_SPEC.md)

---

## 📋 목차
1. [개요](#개요)
2. [현재 스키마 분석](#현재-스키마-분석)
3. [새로운 스키마 설계](#새로운-스키마-설계)
4. [마이그레이션 스크립트](#마이그레이션-스크립트)
5. [데이터 검증 계획](#데이터-검증-계획)
6. [롤백 전략](#롤백-전략)
7. [실행 계획](#실행-계획)

---

## 개요

### 🎯 마이그레이션 목표
1. **정규화**: JSONB 기반 단일 테이블을 정규화된 관계형 구조로 변환
2. **성능 향상**: 통계 쿼리 성능 개선 (JSONB → JOIN)
3. **확장성**: 새 기능(채팅, 알림, 템플릿) 지원 가능한 구조
4. **데이터 무결성**: 외래키 제약 조건으로 데이터 정합성 보장

### 📊 마이그레이션 범위
- **테이블 수**: 1개 → 10개
- **데이터 크기**: 예상 ~10,000 레코드
- **다운타임**: 최대 30분 (서비스 점검)
- **예상 소요 시간**: 2시간 (준비 + 실행 + 검증)

---

## 현재 스키마 분석

### 📋 기존 테이블: `habit_tracker`

#### 테이블 구조
```sql
CREATE TABLE habit_tracker (
  id BIGSERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,           -- 🔴 비정규화: 중복 허용
  week_period TEXT,                   -- 🔴 문자열 형식: "2025년 7월 21일 ~ 2025년 7월 27일"
  week_start_date DATE,               -- 🟡 중복 필드: week_period와 중복
  theme TEXT,
  habits JSONB DEFAULT '[]',          -- 🔴 비정규화: 배열로 저장
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  user_id UUID REFERENCES auth.users(id), -- 🔴 현재 미사용 (코드에서 주석 처리)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 인덱스
```sql
CREATE INDEX idx_habit_tracker_child_name ON habit_tracker(child_name);
CREATE INDEX idx_habit_tracker_updated_at ON habit_tracker(updated_at);
CREATE INDEX idx_habit_tracker_user_id ON habit_tracker(user_id); -- 미사용
```

#### RLS 정책
```sql
-- 🔴 보안 취약: 모든 사용자가 모든 데이터 접근 가능
CREATE POLICY "Allow all operations" ON habit_tracker
  FOR ALL USING (true);
```

### 🔍 문제점 분석

#### 1. 데이터 중복
```sql
-- 예시 데이터
SELECT id, child_name, week_start_date FROM habit_tracker LIMIT 5;

-- 결과:
id | child_name | week_start_date
---|------------|----------------
1  | 김철수     | 2025-07-07
2  | 김철수     | 2025-07-14      -- 중복!
3  | 김철수     | 2025-07-21      -- 중복!
4  | 이영희     | 2025-07-07
5  | 이영희     | 2025-07-14      -- 중복!
```
- **문제**: `child_name`이 매 주차마다 반복 저장
- **영향**: 스토리지 낭비, 이름 변경 시 일괄 업데이트 필요

#### 2. JSONB 쿼리 복잡도
```sql
-- ❌ 복잡한 통계 쿼리 (현재)
SELECT
  child_name,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(habits) as habit,
         jsonb_array_elements_text(habit->'times') as time
    WHERE time = 'green'
  ) as green_count
FROM habit_tracker;

-- ✅ 간단한 쿼리 (새 스키마)
SELECT
  c.name,
  COUNT(*) as green_count
FROM habit_records hr
JOIN habits h ON h.id = hr.habit_id
JOIN weeks w ON w.id = h.week_id
JOIN children c ON c.id = w.child_id
WHERE hr.status = 'green'
GROUP BY c.name;
```

#### 3. 날짜 처리 문제
```sql
-- week_period: "2025년 7월 21일 ~ 2025년 7월 27일" (TEXT)
-- 문제점:
-- 1. 정렬 어려움 (문자열 정렬 != 날짜 정렬)
-- 2. 범위 검색 복잡 (LIKE 쿼리 필요)
-- 3. 언어 종속적 (한국어만 지원)

-- 예시: 7월 데이터 조회
SELECT * FROM habit_tracker
WHERE week_period LIKE '2025년 7월%';  -- 비효율적!

-- 개선 후:
SELECT * FROM weeks
WHERE week_start_date >= '2025-07-01'
  AND week_start_date < '2025-08-01';   -- 인덱스 사용 가능!
```

#### 4. 통계 쿼리 성능 측정

```sql
-- 성능 테스트 (10,000 레코드 기준)
EXPLAIN ANALYZE
SELECT
  child_name,
  jsonb_array_length(habits) as habit_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(habits) as habit,
         jsonb_array_elements_text(habit->'times') as time
    WHERE time = 'green'
  ) as green_count
FROM habit_tracker
WHERE child_name = '김철수';

-- 예상 결과:
-- Planning Time: 0.5 ms
-- Execution Time: 150.2 ms  🔴 느림!
```

### 📊 현재 데이터 샘플

#### JSONB `habits` 구조
```json
[
  {
    "id": 1,
    "name": "아침 (6-9시) 스스로 일어나기",
    "times": ["green", "yellow", "red", "", "green", "green", "yellow"]
  },
  {
    "id": 2,
    "name": "오전 (9-12시) 집중해서 공부/놀이",
    "times": ["green", "green", "green", "yellow", "red", "green", "green"]
  }
]
```

#### JSONB `reflection` 구조
```json
{
  "bestDay": "화요일 아침 시간대가 가장 좋았어요!",
  "easiestHabit": "아침에 일어나기는 쉬웠지만, 정리정돈은 어려웠어요.",
  "nextWeekGoal": "다음 주에는 저녁 정리 시간을 더 잘 지키고 싶어요!"
}
```

---

## 새로운 스키마 설계

### 🏗️ 테이블 구조 (ERD)

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
└────────┬────────┘
         │
         ├──────────────────────────────────┬─────────────────┬──────────────────┐
         │                                  │                 │                  │
┌────────▼──────────┐         ┌─────────────▼──────┐  ┌──────▼────────┐  ┌─────▼─────────┐
│  user_profiles    │         │   children         │  │notifications  │  │  chat_rooms   │
│  - display_name   │         │   - name           │  │  - type       │  │  - name       │
│  - avatar_url     │         │   - birth_date     │  │  - message    │  │  - type       │
│  - role           │         └──────────┬─────────┘  │  - is_read    │  └───────┬───────┘
└───────────────────┘                    │            └───────────────┘          │
                                         │                                       │
                                ┌────────▼─────────┐                   ┌────────▼────────┐
                                │  weeks           │                   │ chat_messages   │
                                │  - start_date    │                   │  - message      │
                                │  - end_date      │                   │  - mentions[]   │
                                │  - theme         │                   └─────────────────┘
                                │  - reflection    │
                                │  - reward        │
                                └────────┬─────────┘
                                         │
                                ┌────────▼─────────┐
                                │  habits          │
                                │  - name          │
                                │  - time_period   │
                                └────────┬─────────┘
                                         │
                                ┌────────▼─────────┐
                                │  habit_records   │
                                │  - record_date   │
                                │  - status        │
                                │  - note          │
                                └──────────────────┘

┌──────────────────────┐
│ habit_templates      │ (템플릿 기능)
│  - name              │
│  - habits (JSONB)    │
└──────────────────────┘
```

### 📋 상세 테이블 정의

#### 1. `user_profiles` (사용자 프로필)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('parent', 'child')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### 2. `children` (아이 정보) ⭐ 핵심
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_children_user_id ON children(user_id);

-- RLS 정책
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own children"
  ON children FOR ALL
  USING (auth.uid() = user_id);
```

**마이그레이션 로직:**
```sql
-- 기존 child_name → 새 children 테이블
INSERT INTO children (user_id, name)
SELECT DISTINCT
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) as user_id,
  child_name
FROM habit_tracker
WHERE child_name IS NOT NULL;
```

#### 3. `weeks` (주차 정보) ⭐ 핵심
```sql
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,         -- 주차 시작일 (월요일)
  week_end_date DATE NOT NULL,           -- 주차 종료일 (일요일)
  theme TEXT,
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  template_id UUID REFERENCES habit_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT check_week_dates CHECK (week_end_date = week_start_date + INTERVAL '6 days'),
  CONSTRAINT check_week_start_monday CHECK (EXTRACT(DOW FROM week_start_date) = 1), -- 월요일
  UNIQUE(child_id, week_start_date)      -- 아이별 주차 중복 방지
);

-- 인덱스
CREATE INDEX idx_weeks_user_id ON weeks(user_id);
CREATE INDEX idx_weeks_child_id ON weeks(child_id);
CREATE INDEX idx_weeks_start_date ON weeks(week_start_date DESC); -- 최신순 정렬
CREATE INDEX idx_weeks_child_start ON weeks(child_id, week_start_date DESC);

-- RLS 정책
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own weeks"
  ON weeks FOR ALL
  USING (auth.uid() = user_id);
```

**마이그레이션 로직:**
```sql
-- 기존 habit_tracker → weeks
INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme, reflection, reward)
SELECT
  COALESCE(ht.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  c.id,
  ht.week_start_date,
  ht.week_start_date + INTERVAL '6 days',
  ht.theme,
  ht.reflection,
  ht.reward
FROM habit_tracker ht
JOIN children c ON c.name = ht.child_name
WHERE ht.week_start_date IS NOT NULL;
```

#### 4. `habits` (습관 정의) ⭐ 핵심
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_period TEXT,                      -- "아침 (6-9시)"
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_habits_week_id ON habits(week_id);
CREATE INDEX idx_habits_week_order ON habits(week_id, display_order);

-- RLS 정책
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage habits via weeks"
  ON habits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weeks w
      WHERE w.id = habits.week_id AND w.user_id = auth.uid()
    )
  );
```

**마이그레이션 로직:**
```sql
-- JSONB habits 배열 → habits 테이블
WITH habit_data AS (
  SELECT
    w.id as week_id,
    jsonb_array_elements(ht.habits) as habit_json,
    row_number() OVER (PARTITION BY w.id) as display_order
  FROM habit_tracker ht
  JOIN weeks w ON w.week_start_date = ht.week_start_date
                AND w.child_id IN (SELECT id FROM children WHERE name = ht.child_name)
)
INSERT INTO habits (week_id, name, time_period, display_order)
SELECT
  week_id,
  habit_json->>'name',
  -- 시간대 추출 (예: "아침 (6-9시) 스스로 일어나기" → "아침 (6-9시)")
  SUBSTRING(habit_json->>'name' FROM '^[^)]+\)'),
  display_order::integer
FROM habit_data;
```

#### 5. `habit_records` (습관 기록) ⭐ 핵심
```sql
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red', 'none')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(habit_id, record_date)          -- 습관별 일자별 중복 방지
);

-- 인덱스
CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_date ON habit_records(record_date DESC);
CREATE INDEX idx_habit_records_status ON habit_records(status);
CREATE INDEX idx_habit_records_habit_date ON habit_records(habit_id, record_date);

-- RLS 정책
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage habit records via habits"
  ON habit_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM habits h
      JOIN weeks w ON w.id = h.week_id
      WHERE h.id = habit_records.habit_id AND w.user_id = auth.uid()
    )
  );
```

**마이그레이션 로직:**
```sql
-- JSONB times 배열 → habit_records (7일치)
WITH habit_times AS (
  SELECT
    h.id as habit_id,
    w.week_start_date,
    generate_series(0, 6) as day_offset,
    ht.habits as all_habits
  FROM habit_tracker ht
  JOIN weeks w ON w.week_start_date = ht.week_start_date
  JOIN habits h ON h.week_id = w.id
)
INSERT INTO habit_records (habit_id, record_date, status)
SELECT
  ht.habit_id,
  ht.week_start_date + (ht.day_offset || ' days')::interval,
  COALESCE(
    (SELECT jsonb_array_elements(all_habits)->>'times'->>day_offset
     FROM habit_tracker
     WHERE week_start_date = ht.week_start_date LIMIT 1
    ),
    'none'
  )::text
FROM habit_times ht;
```

#### 6. `habit_templates` (템플릿)
```sql
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  habits JSONB NOT NULL DEFAULT '[]',    -- 습관 정의 (구조 동일)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_habit_templates_user_id ON habit_templates(user_id);
CREATE INDEX idx_habit_templates_child_id ON habit_templates(child_id);

-- RLS 정책
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON habit_templates FOR ALL
  USING (auth.uid() = user_id);
```

#### 7. `notifications` (알림)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',           -- 추가 데이터
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 8-10. 채팅 관련 테이블
```sql
-- 8. chat_rooms
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('family', 'child_specific')),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_child_id ON chat_rooms(child_id);

-- 9. chat_room_members
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);

-- 10. chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji')),
  image_url TEXT,
  mentions UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- RLS 정책 (채팅방 멤버만 접근 가능)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members crm
      WHERE crm.room_id = chat_messages.room_id AND crm.user_id = auth.uid()
    )
  );
```

---

## 마이그레이션 스크립트

### 📄 `supabase-migration-v2.sql`

```sql
-- ============================================================================
-- 아이들을 위한 습관 추적기 - DB 마이그레이션 v2
-- 작성일: 2025-10-11
-- 목적: JSONB 기반 단일 테이블 → 정규화된 관계형 구조
-- ============================================================================

-- 마이그레이션 시작
BEGIN;

-- ----------------------------------------------------------------------------
-- Step 1: 새 테이블 생성
-- ----------------------------------------------------------------------------

-- 1.1 사용자 프로필
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('parent', 'child')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 아이 정보
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_children_user_id ON children(user_id);

-- 1.3 습관 템플릿
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  habits JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habit_templates_user_id ON habit_templates(user_id);
CREATE INDEX idx_habit_templates_child_id ON habit_templates(child_id);

-- 1.4 주차 정보
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  theme TEXT,
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  template_id UUID REFERENCES habit_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_week_dates CHECK (week_end_date = week_start_date + INTERVAL '6 days'),
  UNIQUE(child_id, week_start_date)
);

CREATE INDEX idx_weeks_user_id ON weeks(user_id);
CREATE INDEX idx_weeks_child_id ON weeks(child_id);
CREATE INDEX idx_weeks_start_date ON weeks(week_start_date DESC);
CREATE INDEX idx_weeks_child_start ON weeks(child_id, week_start_date DESC);

-- 1.5 습관 정의
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_period TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habits_week_id ON habits(week_id);
CREATE INDEX idx_habits_week_order ON habits(week_id, display_order);

-- 1.6 습관 기록
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red', 'none')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, record_date)
);

CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_date ON habit_records(record_date DESC);
CREATE INDEX idx_habit_records_status ON habit_records(status);
CREATE INDEX idx_habit_records_habit_date ON habit_records(habit_id, record_date);

-- 1.7 알림
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 1.8 채팅방
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('family', 'child_specific')),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_child_id ON chat_rooms(child_id);

-- 1.9 채팅방 멤버
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);

-- 1.10 채팅 메시지
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji')),
  image_url TEXT,
  mentions UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ----------------------------------------------------------------------------
-- Step 2: 데이터 마이그레이션
-- ----------------------------------------------------------------------------

RAISE NOTICE '>>> 데이터 마이그레이션 시작';

-- 2.1 아이 정보 마이그레이션
RAISE NOTICE '2.1 아이 정보 마이그레이션...';

INSERT INTO children (user_id, name, created_at)
SELECT DISTINCT
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) as user_id,
  child_name,
  MIN(created_at)
FROM habit_tracker
WHERE child_name IS NOT NULL AND child_name != ''
GROUP BY user_id, child_name;

RAISE NOTICE '완료: % 명의 아이', (SELECT COUNT(*) FROM children);

-- 2.2 주차 정보 마이그레이션
RAISE NOTICE '2.2 주차 정보 마이그레이션...';

INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme, reflection, reward, created_at)
SELECT
  COALESCE(ht.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  c.id,
  ht.week_start_date,
  ht.week_start_date + INTERVAL '6 days',
  ht.theme,
  ht.reflection,
  ht.reward,
  ht.created_at
FROM habit_tracker ht
JOIN children c ON c.name = ht.child_name
WHERE ht.week_start_date IS NOT NULL;

RAISE NOTICE '완료: % 개의 주차', (SELECT COUNT(*) FROM weeks);

-- 2.3 습관 정의 마이그레이션 (JSONB → 테이블)
RAISE NOTICE '2.3 습관 정의 마이그레이션...';

WITH habit_data AS (
  SELECT
    w.id as week_id,
    jsonb_array_elements(ht.habits) as habit_json,
    row_number() OVER (PARTITION BY w.id ORDER BY (jsonb_array_elements(ht.habits)->>'id')::int) - 1 as display_order
  FROM habit_tracker ht
  JOIN children c ON c.name = ht.child_name
  JOIN weeks w ON w.child_id = c.id AND w.week_start_date = ht.week_start_date
)
INSERT INTO habits (week_id, name, time_period, display_order)
SELECT
  week_id,
  habit_json->>'name',
  SUBSTRING(habit_json->>'name' FROM '^[^)]+\)'),
  display_order
FROM habit_data;

RAISE NOTICE '완료: % 개의 습관', (SELECT COUNT(*) FROM habits);

-- 2.4 습관 기록 마이그레이션 (JSONB times 배열 → 테이블)
RAISE NOTICE '2.4 습관 기록 마이그레이션 (7일치)...';

WITH habit_times AS (
  SELECT
    h.id as habit_id,
    w.week_start_date,
    h.display_order,
    (jsonb_array_elements(
      (SELECT habits FROM habit_tracker ht
       JOIN children c ON c.name = ht.child_name
       WHERE ht.week_start_date = w.week_start_date AND c.id = w.child_id
       LIMIT 1)
    )::jsonb) as habit_json
  FROM habits h
  JOIN weeks w ON w.id = h.week_id
),
expanded_times AS (
  SELECT
    ht.habit_id,
    ht.week_start_date + (day_offset || ' days')::interval as record_date,
    COALESCE(
      nullif(jsonb_array_element_text(ht.habit_json->'times', day_offset), ''),
      'none'
    ) as status
  FROM habit_times ht
  CROSS JOIN generate_series(0, 6) as day_offset
)
INSERT INTO habit_records (habit_id, record_date, status)
SELECT
  habit_id,
  record_date::date,
  status
FROM expanded_times
WHERE status IN ('green', 'yellow', 'red', 'none');

RAISE NOTICE '완료: % 개의 기록', (SELECT COUNT(*) FROM habit_records);

-- ----------------------------------------------------------------------------
-- Step 3: RLS (Row Level Security) 설정
-- ----------------------------------------------------------------------------

RAISE NOTICE '>>> RLS 정책 설정';

-- 3.1 user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- 3.2 children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own children" ON children FOR ALL USING (auth.uid() = user_id);

-- 3.3 habit_templates
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own templates" ON habit_templates FOR ALL USING (auth.uid() = user_id);

-- 3.4 weeks
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own weeks" ON weeks FOR ALL USING (auth.uid() = user_id);

-- 3.5 habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage habits via weeks" ON habits FOR ALL USING (
  EXISTS (SELECT 1 FROM weeks w WHERE w.id = habits.week_id AND w.user_id = auth.uid())
);

-- 3.6 habit_records
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage habit records via habits" ON habit_records FOR ALL USING (
  EXISTS (
    SELECT 1 FROM habits h
    JOIN weeks w ON w.id = h.week_id
    WHERE h.id = habit_records.habit_id AND w.user_id = auth.uid()
  )
);

-- 3.7 notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3.8 채팅 관련
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view messages" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_room_members crm WHERE crm.room_id = chat_messages.room_id AND crm.user_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- Step 4: 트리거 설정 (updated_at 자동 업데이트)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weeks_updated_at BEFORE UPDATE ON weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_records_updated_at BEFORE UPDATE ON habit_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Step 5: 데이터 검증
-- ----------------------------------------------------------------------------

RAISE NOTICE '>>> 데이터 검증';

DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
  habits_count INTEGER;
  records_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM habit_tracker;
  SELECT COUNT(*) INTO new_count FROM weeks;
  SELECT COUNT(*) INTO habits_count FROM habits;
  SELECT COUNT(*) INTO records_count FROM habit_records;

  RAISE NOTICE '✅ 기존 habit_tracker 레코드: %', old_count;
  RAISE NOTICE '✅ 새 weeks 레코드: %', new_count;
  RAISE NOTICE '✅ 새 habits 레코드: %', habits_count;
  RAISE NOTICE '✅ 새 habit_records 레코드: %', records_count;

  IF old_count != new_count THEN
    RAISE WARNING '⚠️  주차 수 불일치! 확인 필요';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 6: 기존 테이블 백업 및 이름 변경
-- ----------------------------------------------------------------------------

-- 기존 테이블을 _old로 이름 변경 (롤백 대비)
ALTER TABLE habit_tracker RENAME TO habit_tracker_old;

-- 기존 인덱스 삭제 (새 테이블에 이미 생성됨)
DROP INDEX IF EXISTS idx_habit_tracker_child_name;
DROP INDEX IF EXISTS idx_habit_tracker_updated_at;
DROP INDEX IF EXISTS idx_habit_tracker_user_id;

-- 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Allow all operations" ON habit_tracker_old;

RAISE NOTICE '✅ 기존 테이블을 habit_tracker_old로 이름 변경';
RAISE NOTICE '✅ 새 테이블 구조 적용 완료';

-- 마이그레이션 완료
COMMIT;

RAISE NOTICE '====================================';
RAISE NOTICE '✅ 마이그레이션 완료!';
RAISE NOTICE '====================================';
```

---

## 데이터 검증 계획

### 📊 검증 쿼리 모음

#### 1. 레코드 수 비교
```sql
-- 주차 수 일치 확인
SELECT
  '주차 수 비교' as check_type,
  (SELECT COUNT(*) FROM habit_tracker_old) as old_count,
  (SELECT COUNT(*) FROM weeks) as new_count,
  CASE
    WHEN (SELECT COUNT(*) FROM habit_tracker_old) = (SELECT COUNT(*) FROM weeks)
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as result;
```

#### 2. 아이별 주차 수 비교
```sql
SELECT
  ht.child_name,
  COUNT(*) as old_weeks,
  (
    SELECT COUNT(*)
    FROM weeks w
    JOIN children c ON c.id = w.child_id
    WHERE c.name = ht.child_name
  ) as new_weeks
FROM habit_tracker_old ht
GROUP BY ht.child_name;
```

#### 3. 습관 데이터 샘플 비교
```sql
-- 샘플 데이터 비교 (첫 5개)
SELECT
  ht.child_name,
  ht.week_start_date,
  ht.habits as old_habits,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', h.name,
        'times', (
          SELECT jsonb_agg(hr.status ORDER BY hr.record_date)
          FROM habit_records hr
          WHERE hr.habit_id = h.id
        )
      ) ORDER BY h.display_order
    )
    FROM habits h
    WHERE h.week_id = w.id
  ) as new_habits
FROM habit_tracker_old ht
JOIN children c ON c.name = ht.child_name
JOIN weeks w ON w.child_id = c.id AND w.week_start_date = ht.week_start_date
LIMIT 5;
```

#### 4. 통계 비교 (녹색 카운트)
```sql
-- 기존 방식: JSONB 쿼리
WITH old_stats AS (
  SELECT
    child_name,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(habits) as habit,
           jsonb_array_elements_text(habit->'times') as time
      WHERE time = 'green'
    ) as green_count
  FROM habit_tracker_old
),
-- 새 방식: JOIN 쿼리
new_stats AS (
  SELECT
    c.name as child_name,
    COUNT(*) as green_count
  FROM habit_records hr
  JOIN habits h ON h.id = hr.habit_id
  JOIN weeks w ON w.id = h.week_id
  JOIN children c ON c.id = w.child_id
  WHERE hr.status = 'green'
  GROUP BY c.name
)
SELECT
  COALESCE(o.child_name, n.child_name) as child_name,
  o.green_count as old_green,
  n.green_count as new_green,
  CASE
    WHEN o.green_count = n.green_count THEN '✅'
    ELSE '❌ ' || (o.green_count - n.green_count)::text
  END as result
FROM old_stats o
FULL OUTER JOIN new_stats n ON o.child_name = n.child_name
ORDER BY child_name;
```

#### 5. 날짜 범위 검증
```sql
-- 주차 시작일/종료일 검증
SELECT
  id,
  week_start_date,
  week_end_date,
  week_end_date - week_start_date as day_diff,
  EXTRACT(DOW FROM week_start_date) as start_dow, -- 1 = 월요일
  CASE
    WHEN week_end_date - week_start_date = 6 THEN '✅'
    ELSE '❌'
  END as result
FROM weeks
WHERE week_end_date - week_start_date != 6
   OR EXTRACT(DOW FROM week_start_date) != 1;
```

---

## 롤백 전략

### 🔄 롤백 스크립트

#### `supabase-rollback-v2.sql`
```sql
-- ============================================================================
-- 마이그레이션 롤백 스크립트
-- 주의: 새 테이블의 데이터가 모두 삭제됩니다!
-- ============================================================================

BEGIN;

RAISE NOTICE '>>> 마이그레이션 롤백 시작';

-- Step 1: 새 테이블 삭제 (역순)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_room_members CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS habit_records CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS weeks CASCADE;
DROP TABLE IF EXISTS habit_templates CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

RAISE NOTICE '✅ 새 테이블 삭제 완료';

-- Step 2: 기존 테이블 복원
ALTER TABLE habit_tracker_old RENAME TO habit_tracker;

-- Step 3: 인덱스 재생성
CREATE INDEX idx_habit_tracker_child_name ON habit_tracker(child_name);
CREATE INDEX idx_habit_tracker_updated_at ON habit_tracker(updated_at);
CREATE INDEX idx_habit_tracker_user_id ON habit_tracker(user_id);

-- Step 4: RLS 정책 복원
ALTER TABLE habit_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON habit_tracker FOR ALL USING (true);

RAISE NOTICE '✅ 기존 테이블 복원 완료';

COMMIT;

RAISE NOTICE '====================================';
RAISE NOTICE '✅ 롤백 완료!';
RAISE NOTICE '====================================';
```

---

## 실행 계획

### 📅 타임라인

#### D-7: 준비
- [ ] 개발 환경에서 마이그레이션 테스트
- [ ] 데이터 검증 쿼리 실행 및 결과 확인
- [ ] 팀원 교육 (새 스키마, API 변경사항)
- [ ] 사용자 공지 (서비스 점검 안내)

#### D-3: 최종 점검
- [ ] 프로덕션 DB 백업 (full backup)
- [ ] 롤백 스크립트 테스트
- [ ] 마이그레이션 스크립트 최종 검토

#### D-Day: 실행
- **09:00** - 서비스 점검 공지 활성화
- **09:30** - 프로덕션 DB 백업 시작
- **10:00** - 마이그레이션 스크립트 실행
- **10:30** - 데이터 검증 쿼리 실행
- **11:00** - 새 API 배포
- **11:30** - 프론트엔드 배포
- **12:00** - 기능 테스트 (주요 시나리오)
- **12:30** - 서비스 재개

#### D+1~7: 모니터링
- [ ] 성능 모니터링 (쿼리 속도, 오류율)
- [ ] 사용자 피드백 수집
- [ ] 필요 시 인덱스 추가/조정

#### D+30: 정리
- [ ] `habit_tracker_old` 테이블 삭제 (백업 후)
- [ ] 마이그레이션 완료 보고

---

## 체크리스트

### 📋 마이그레이션 체크리스트

#### Pre-Migration
- [ ] 개발 환경 마이그레이션 테스트 성공
- [ ] 데이터 검증 쿼리 작성 완료
- [ ] 롤백 스크립트 작성 및 테스트 완료
- [ ] 프로덕션 DB 백업 완료
- [ ] 팀원 교육 완료
- [ ] 사용자 공지 (1주일 전)

#### Migration
- [ ] 서비스 점검 모드 활성화
- [ ] 최종 백업 실행
- [ ] 마이그레이션 스크립트 실행
- [ ] 데이터 검증 쿼리 실행
- [ ] 샘플 데이터 육안 확인
- [ ] 새 API 배포
- [ ] 프론트엔드 배포

#### Post-Migration
- [ ] 주요 기능 테스트 (습관 추가, 수정, 삭제)
- [ ] 통계 대시보드 확인
- [ ] 성능 모니터링 (24시간)
- [ ] 오류 로그 확인
- [ ] 사용자 피드백 수집
- [ ] 1주일 간 모니터링
- [ ] 30일 후 구 테이블 삭제

---

**마지막 업데이트**: 2025년 10월 11일
**문서 버전**: 1.0
**검토 필요**: DB 관리자, 백엔드 개발자
