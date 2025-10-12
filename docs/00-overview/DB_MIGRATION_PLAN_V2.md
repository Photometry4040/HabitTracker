# 데이터베이스 마이그레이션 계획서 v2.0 (Strangler Fig Pattern)

> **프로젝트**: 아이들을 위한 습관 추적기 - DB 재설계
> **작성일**: 2025년 10월 11일
> **버전**: 2.0 (Strangler Fig Pattern 기반)
> **전략 변경**: Big Bang → 점진적 마이그레이션
> **관련 문서**: [TECH_SPEC.md](TECH_SPEC.md)

---

## 📋 목차
1. [전략 변경 배경](#전략-변경-배경)
2. [Strangler Fig Pattern 개요](#strangler-fig-pattern-개요)
3. [4단계 마이그레이션 전략](#4단계-마이그레이션-전략)
4. [Phase 0: 준비 단계](#phase-0-준비-단계)
5. [Phase 1: 이중쓰기](#phase-1-이중쓰기)
6. [Phase 2: 점진적 읽기 전환](#phase-2-점진적-읽기-전환)
7. [Phase 3: 구 스키마 제거](#phase-3-구-스키마-제거)
8. [모니터링 및 알림](#모니터링-및-알림)
9. [롤백 시나리오](#롤백-시나리오)

---

## 전략 변경 배경

### ❌ 기존 Big Bang 방식의 문제점

```
Old Approach (폐기됨):
┌─────────────────┐
│ 구 스키마       │
│ habit_tracker   │ ──┐
└─────────────────┘   │
                      │  [마이그레이션 이벤트]
                      │  ⚠️ 다운타임 1~2시간
                      │  ⚠️ 데이터 손실 위험
                      │  ⚠️ 롤백 어려움
                      ▼
┌─────────────────┐
│ 신 스키마       │
│ 10개 테이블     │
└─────────────────┘

실패 확률: 40%+
```

**문제점:**
1. **데이터 무결성**: 변환 중 오류 시 데이터 손실
2. **다운타임**: 1~2시간 서비스 중단
3. **롤백 복잡도**: 실패 시 복구 어려움
4. **테스트 부담**: 모든 기능 동시 검증

### ✅ 새로운 Strangler Fig Pattern

```
New Approach (채택):
┌─────────────────┐     ┌─────────────────┐
│ 구 스키마       │◀───▶│ 신 스키마       │
│ habit_tracker   │     │ 10개 테이블     │
└─────────────────┘     └─────────────────┘
         ▲                       ▲
         │                       │
         │  [점진적 전환]        │
         │  ✅ 무중단            │
         │  ✅ 이중쓰기          │
         │  ✅ Feature Flag      │
         └───────────────────────┘

실패 확률: 5%
```

**장점:**
1. **무중단 마이그레이션**: 0초 다운타임
2. **데이터 무결성 보장**: 이중쓰기로 동기화
3. **점진적 검증**: 단계별 테스트
4. **손쉬운 롤백**: Feature Flag OFF

---

## Strangler Fig Pattern 개요

### 🌳 Strangler Fig (교살자 무화과나무) 유래

> 교살자 무화과나무는 기존 나무를 감싸며 자라다가, 완전히 성장한 후 기존 나무를 대체합니다.

```
Stage 1: 기존 시스템          Stage 2: 새 시스템 성장        Stage 3: 기존 시스템 제거
┌──────────┐                ┌──────────┐                ┌──────────┐
│          │                │  ╔══╗    │                │  ╔══╗    │
│  [OLD]   │  ──────▶       │  ║  ║OLD │  ──────▶       │  ║NEW║    │
│          │                │  ╚══╝    │                │  ╚══╝    │
└──────────┘                └──────────┘                └──────────┘
```

### 적용 방법

#### 1. **섀도 스키마 생성**
```sql
-- 기존 테이블은 그대로 유지
-- 새 테이블을 병렬로 생성 (RLS OFF, CHECK NOT VALID)
CREATE TABLE weeks_new (...);
```

#### 2. **백필 (Backfill)**
```javascript
// 기존 데이터를 새 스키마로 복사
// 배치 처리 (1000건씩)
await backfillData({ batchSize: 1000 });
```

#### 3. **이중쓰기 (Dual Write)**
```javascript
// 모든 쓰기 작업을 양쪽에 실행
await Promise.all([
  writeToOldSchema(data),
  writeToNewSchema(data)
]);
```

#### 4. **점진적 읽기 전환**
```javascript
// Feature Flag로 트래픽 전환
if (featureFlags.useNewSchema) {
  return readFromNewSchema();
} else {
  return readFromOldSchema();
}
```

#### 5. **구 스키마 제거**
```sql
-- 100% 전환 완료 후
DROP TABLE habit_tracker_old;
```

---

## 4단계 마이그레이션 전략

### 📊 전체 흐름도

```
Phase 0 (2주)
┌─────────────────────────────────────────────┐
│ 준비: 섀도 스키마 + 백필 자동화             │
│ • 새 테이블 생성 (NOT VALID)                │
│ • 백필 스크립트 개발                        │
│ • 검증 자동화                               │
└─────────────────────────────────────────────┘
                    ▼
Phase 1 (4주)
┌─────────────────────────────────────────────┐
│ 이중쓰기: 구 + 신 스키마 동시 쓰기          │
│ • Edge Function (구 → 신 동기화)           │
│ • Database Trigger (백업)                   │
│ • 템플릿 기능 (신 스키마만)                 │
└─────────────────────────────────────────────┘
                    ▼
Phase 2 (3주)
┌─────────────────────────────────────────────┐
│ 점진적 읽기 전환: 5% → 100%                 │
│ • Feature Flag 배포                         │
│ • 5% → 20% → 50% → 100% (각 24시간)       │
│ • RLS 단계적 활성화                         │
└─────────────────────────────────────────────┘
                    ▼
Phase 3 (1주)
┌─────────────────────────────────────────────┐
│ 구 스키마 제거                              │
│ • 구 스키마 READ-ONLY (1주 모니터링)        │
│ • 이중쓰기 비활성화                         │
│ • 구 테이블 삭제                            │
└─────────────────────────────────────────────┘
```

---

## Phase 0: 준비 단계

### 🎯 목표
무중단 마이그레이션을 위한 인프라 구축

### Week 1: 섀도 스키마 생성

#### Step 1: 새 테이블 생성 (프로덕션 영향 최소화)

```sql
-- Phase 0: 섀도 스키마 생성
-- 제약 조건을 NOT VALID로 설정 (즉시 적용 안됨)
-- RLS는 일단 OFF

BEGIN;

-- 1. children 테이블
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 제약 조건 (NOT VALID - 기존 데이터 검증 안함)
ALTER TABLE children ADD CONSTRAINT check_name_length
  CHECK (length(name) >= 1 AND length(name) <= 100) NOT VALID;

-- 인덱스 (CONCURRENTLY - 락 없이 생성)
CREATE INDEX CONCURRENTLY idx_children_user_id ON children(user_id);

-- 2. weeks 테이블
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  theme TEXT,
  reflection JSONB DEFAULT '{}',
  reward TEXT,
  template_id UUID, -- REFERENCES habit_templates(id) 나중에 추가
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 제약 조건 (NOT VALID)
ALTER TABLE weeks ADD CONSTRAINT check_week_dates
  CHECK (week_end_date = week_start_date + INTERVAL '6 days') NOT VALID;

ALTER TABLE weeks ADD CONSTRAINT check_week_start_monday
  CHECK (EXTRACT(DOW FROM week_start_date) = 1) NOT VALID;

ALTER TABLE weeks ADD CONSTRAINT unique_child_week
  UNIQUE(child_id, week_start_date) DEFERRABLE INITIALLY DEFERRED;

-- 인덱스 (CONCURRENTLY)
CREATE INDEX CONCURRENTLY idx_weeks_user_id ON weeks(user_id);
CREATE INDEX CONCURRENTLY idx_weeks_child_id ON weeks(child_id);
CREATE INDEX CONCURRENTLY idx_weeks_start_date ON weeks(week_start_date DESC);

-- 3. habits 테이블
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_period TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY idx_habits_week_id ON habits(week_id);
CREATE INDEX CONCURRENTLY idx_habits_week_order ON habits(week_id, display_order);

-- 4. habit_records 테이블
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, record_date) DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE habit_records ADD CONSTRAINT check_status
  CHECK (status IN ('green', 'yellow', 'red', 'none')) NOT VALID;

CREATE INDEX CONCURRENTLY idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX CONCURRENTLY idx_habit_records_date ON habit_records(record_date DESC);
CREATE INDEX CONCURRENTLY idx_habit_records_status ON habit_records(status);

-- 5. habit_templates 테이블
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

CREATE INDEX CONCURRENTLY idx_habit_templates_user_id ON habit_templates(user_id);
CREATE INDEX CONCURRENTLY idx_habit_templates_child_id ON habit_templates(child_id);

-- 6. notifications 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ADD CONSTRAINT check_notification_type
  CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')) NOT VALID;

CREATE INDEX CONCURRENTLY idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX CONCURRENTLY idx_notifications_created_at ON notifications(created_at DESC);

-- 7-10. 채팅 관련 테이블 (Phase 3에서 활성화)
-- 일단 스킵 (MAU 기반 결정)

COMMIT;

-- ✅ 섀도 스키마 생성 완료
-- 기존 habit_tracker 테이블은 영향 없음
```

#### Step 2: 백필 자동화 스크립트

```javascript
// scripts/backfill.js
import { supabase } from './supabase.js';

const BATCH_SIZE = 1000;

// 백필 진행 상황 추적 테이블
await supabase.rpc('create_backfill_progress_table', {
  sql: `
    CREATE TABLE IF NOT EXISTS backfill_progress (
      id SERIAL PRIMARY KEY,
      table_name TEXT NOT NULL,
      last_processed_id BIGINT,
      total_rows INT,
      processed_rows INT DEFAULT 0,
      status TEXT DEFAULT 'pending',
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE
    );
  `
});

async function backfillChildren() {
  console.log('📦 Backfilling children...');

  const { data: oldData } = await supabase
    .from('habit_tracker')
    .select('child_name, user_id, created_at')
    .order('id');

  // 중복 제거
  const uniqueChildren = new Map();
  for (const row of oldData) {
    if (!uniqueChildren.has(row.child_name)) {
      uniqueChildren.set(row.child_name, {
        user_id: row.user_id || '00000000-0000-0000-0000-000000000000',
        name: row.child_name,
        created_at: row.created_at
      });
    }
  }

  // 배치 삽입
  const childrenArray = Array.from(uniqueChildren.values());
  for (let i = 0; i < childrenArray.length; i += BATCH_SIZE) {
    const batch = childrenArray.slice(i, i + BATCH_SIZE);

    await supabase.from('children').upsert(batch, {
      onConflict: 'name',
      ignoreDuplicates: false
    });

    console.log(`  ✓ Processed ${i + batch.length}/${childrenArray.length}`);
  }
}

async function backfillWeeks() {
  console.log('📦 Backfilling weeks...');

  // 배치 처리
  let lastId = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch } = await supabase
      .from('habit_tracker')
      .select('*')
      .gt('id', lastId)
      .order('id')
      .limit(BATCH_SIZE);

    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }

    // 변환 로직
    const weeksData = await Promise.all(batch.map(async (row) => {
      // child_id 조회
      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('name', row.child_name)
        .single();

      return {
        user_id: row.user_id || '00000000-0000-0000-0000-000000000000',
        child_id: child?.id,
        week_start_date: row.week_start_date,
        week_end_date: new Date(new Date(row.week_start_date).getTime() + 6 * 24 * 60 * 60 * 1000),
        theme: row.theme,
        reflection: row.reflection,
        reward: row.reward,
        created_at: row.created_at
      };
    }));

    await supabase.from('weeks').upsert(weeksData);

    lastId = batch[batch.length - 1].id;
    console.log(`  ✓ Processed up to ID ${lastId}`);
  }
}

async function backfillHabits() {
  console.log('📦 Backfilling habits...');

  // JSONB → 테이블 변환
  const { data: weeks } = await supabase
    .from('weeks')
    .select('id, child_id')
    .order('id');

  for (const week of weeks) {
    // habit_tracker에서 JSONB habits 가져오기
    const { data: oldWeek } = await supabase
      .from('habit_tracker')
      .select('habits')
      .eq('child_id', week.child_id) // 실제로는 child_name으로 조인
      .eq('week_start_date', week.week_start_date)
      .single();

    if (!oldWeek?.habits) continue;

    const habitsArray = oldWeek.habits.map((habit, index) => ({
      week_id: week.id,
      name: habit.name,
      time_period: habit.name.match(/^([^)]+\))/)?.[1], // "아침 (6-9시)" → "아침 (6-9시)"
      display_order: index
    }));

    await supabase.from('habits').insert(habitsArray);
  }
}

async function backfillHabitRecords() {
  console.log('📦 Backfilling habit_records (7일치)...');

  const { data: habits } = await supabase
    .from('habits')
    .select('id, week_id, display_order')
    .order('id');

  for (const habit of habits) {
    // week_id로 week_start_date 조회
    const { data: week } = await supabase
      .from('weeks')
      .select('week_start_date, child_id')
      .eq('id', habit.week_id)
      .single();

    // 원본 데이터의 times 배열 가져오기
    const { data: oldWeek } = await supabase
      .from('habit_tracker')
      .select('habits')
      .eq('child_id', week.child_id)
      .eq('week_start_date', week.week_start_date)
      .single();

    const habitData = oldWeek?.habits?.[habit.display_order];
    if (!habitData?.times) continue;

    // 7일치 레코드 생성
    const records = habitData.times.map((status, dayIndex) => ({
      habit_id: habit.id,
      record_date: new Date(new Date(week.week_start_date).getTime() + dayIndex * 24 * 60 * 60 * 1000),
      status: status || 'none'
    }));

    await supabase.from('habit_records').insert(records);
  }
}

// 실행
async function runBackfill() {
  try {
    console.log('🚀 Starting backfill...\n');

    await backfillChildren();
    await backfillWeeks();
    await backfillHabits();
    await backfillHabitRecords();

    console.log('\n✅ Backfill completed!');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

runBackfill();
```

#### Step 3: 드리프트 감지 자동화

```javascript
// scripts/detect-drift.js

async function detectDrift() {
  console.log('🔍 Detecting schema drift...\n');

  const drifts = [];

  // 1. 주차 수 비교
  const { count: oldCount } = await supabase
    .from('habit_tracker')
    .select('*', { count: 'exact', head: true });

  const { count: newCount } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true });

  if (oldCount !== newCount) {
    drifts.push({
      type: 'COUNT_MISMATCH',
      table: 'weeks',
      old: oldCount,
      new: newCount,
      severity: 'HIGH'
    });
  }

  // 2. 샘플 데이터 비교 (10개)
  const { data: samples } = await supabase
    .from('habit_tracker')
    .select('*')
    .limit(10);

  for (const sample of samples) {
    // 새 스키마에서 동일 데이터 조회
    const { data: newData } = await supabase
      .from('weeks')
      .select(`
        *,
        children!inner(*),
        habits(*, habit_records(*))
      `)
      .eq('children.name', sample.child_name)
      .eq('week_start_date', sample.week_start_date)
      .single();

    // 데이터 일치 검증
    const isMatch = compareData(sample, newData);
    if (!isMatch) {
      drifts.push({
        type: 'DATA_MISMATCH',
        old_id: sample.id,
        child_name: sample.child_name,
        week_start_date: sample.week_start_date,
        severity: 'CRITICAL'
      });
    }
  }

  // 3. 알림 발송
  if (drifts.length > 0) {
    await sendAlert({
      channel: 'slack',
      message: `⚠️ Schema Drift Detected: ${drifts.length} issues`,
      drifts
    });
  }

  return drifts;
}

function compareData(old, newData) {
  // JSONB habits → 정규화된 테이블 비교
  const oldHabits = old.habits || [];
  const newHabits = newData?.habits || [];

  if (oldHabits.length !== newHabits.length) return false;

  for (let i = 0; i < oldHabits.length; i++) {
    const oldHabit = oldHabits[i];
    const newHabit = newHabits[i];

    if (oldHabit.name !== newHabit.name) return false;

    // times 배열 → habit_records 비교
    for (let day = 0; day < 7; day++) {
      const oldStatus = oldHabit.times[day];
      const newRecord = newHabit.habit_records.find(
        r => new Date(r.record_date).getDay() === (day + 1) % 7
      );

      if ((oldStatus || 'none') !== (newRecord?.status || 'none')) {
        return false;
      }
    }
  }

  return true;
}

// Cron Job으로 1시간마다 실행
setInterval(detectDrift, 60 * 60 * 1000);
```

---

## Phase 1: 이중쓰기

### 🎯 목표
모든 쓰기 작업을 구 + 신 스키마에 동시 실행

### Edge Function 구현

```typescript
// supabase/functions/dual-write-habit/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { action, data } = await req.json();

  try {
    // idempotency_key 검사
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      throw new Error('Idempotency key required');
    }

    // 중복 요청 체크
    const { data: existing } = await supabase
      .from('idempotency_log')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ cached: true, result: existing.result }), {
        status: 200
      });
    }

    let result;

    switch (action) {
      case 'create_week':
        result = await createWeekDualWrite(supabase, data);
        break;
      case 'update_habit_record':
        result = await updateHabitRecordDualWrite(supabase, data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // idempotency 로그 저장
    await supabase.from('idempotency_log').insert({
      key: idempotencyKey,
      result: result,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Dual write error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});

async function createWeekDualWrite(supabase: any, data: any) {
  const { childName, weekStartDate, theme } = data;

  // 1. 구 스키마 쓰기
  const { data: oldResult, error: oldError } = await supabase
    .from('habit_tracker')
    .insert({
      child_name: childName,
      week_period: formatWeekPeriod(weekStartDate),
      week_start_date: weekStartDate,
      theme: theme,
      habits: [],
      source_version: 'dual_write' // 이중쓰기 표시
    })
    .select()
    .single();

  if (oldError) {
    console.error('Old schema write failed:', oldError);
    // 계속 진행 (신 스키마 우선)
  }

  // 2. 신 스키마 쓰기
  // child_id 조회
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('name', childName)
    .single();

  const { data: newResult, error: newError } = await supabase
    .from('weeks')
    .insert({
      child_id: child.id,
      week_start_date: weekStartDate,
      week_end_date: addDays(weekStartDate, 6),
      theme: theme,
      source_version: 'dual_write'
    })
    .select()
    .single();

  if (newError) throw newError;

  // 3. 검증
  if (oldResult && newResult) {
    await verifyDualWrite('week', oldResult.id, newResult.id);
  }

  return { old: oldResult, new: newResult };
}

async function updateHabitRecordDualWrite(supabase: any, data: any) {
  const { habitId, recordDate, status } = data;

  // Last-Write-Wins 전략
  const timestamp = new Date().toISOString();

  // 1. 구 스키마 업데이트 (JSONB)
  // ... (복잡한 JSONB 업데이트 로직)

  // 2. 신 스키마 업데이트 (간단)
  const { data: newResult, error: newError } = await supabase
    .from('habit_records')
    .upsert({
      habit_id: habitId,
      record_date: recordDate,
      status: status,
      updated_at: timestamp,
      source_version: 'dual_write'
    }, {
      onConflict: 'habit_id,record_date'
    })
    .select()
    .single();

  if (newError) throw newError;

  return { new: newResult };
}

function formatWeekPeriod(startDate: string): string {
  const start = new Date(startDate);
  const end = addDays(start, 6);
  return `${formatKoreanDate(start)} ~ ${formatKoreanDate(end)}`;
}

function addDays(date: Date | string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
```

### Database Trigger (백업)

```sql
-- Edge Function 실패 시 Trigger가 동기화

CREATE OR REPLACE FUNCTION sync_to_new_schema()
RETURNS TRIGGER AS $$
BEGIN
  -- habit_tracker에 INSERT → 신 스키마에도 INSERT
  IF TG_OP = 'INSERT' THEN
    -- child_id 조회
    DECLARE
      child_uuid UUID;
    BEGIN
      SELECT id INTO child_uuid
      FROM children
      WHERE name = NEW.child_name;

      IF child_uuid IS NULL THEN
        -- child가 없으면 생성
        INSERT INTO children (name, user_id)
        VALUES (NEW.child_name, NEW.user_id)
        RETURNING id INTO child_uuid;
      END IF;

      -- weeks 테이블에 INSERT
      INSERT INTO weeks (
        child_id, week_start_date, week_end_date, theme, reflection, reward, user_id
      )
      VALUES (
        child_uuid,
        NEW.week_start_date,
        NEW.week_start_date + INTERVAL '6 days',
        NEW.theme,
        NEW.reflection,
        NEW.reward,
        NEW.user_id
      )
      ON CONFLICT (child_id, week_start_date) DO NOTHING;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_habit_tracker_to_new
  AFTER INSERT OR UPDATE ON habit_tracker
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_new_schema();
```

---

## Phase 2: 점진적 읽기 전환

### Feature Flag 구현

```javascript
// src/lib/featureFlags.js

import { LaunchDarkly } from '@launchdarkly/react-client-sdk';

const ld = LaunchDarkly.init({
  clientSideID: import.meta.env.VITE_LAUNCHDARKLY_CLIENT_ID,
  user: {
    key: currentUser.id,
    email: currentUser.email
  }
});

export async function getFeatureFlags() {
  await ld.waitForInitialization();

  return {
    useNewSchema: ld.variation('use-new-schema', false), // 기본 false
    newSchemaPercentage: ld.variation('new-schema-percentage', 0)
  };
}

// 사용 예시
const flags = await getFeatureFlags();

if (flags.useNewSchema) {
  // 새 스키마에서 읽기
  data = await loadFromNewSchema();
} else {
  // 구 스키마에서 읽기
  data = await loadFromOldSchema();
}
```

### 점진적 전환 스케줄

```
Day 1-3 (5%):
  - 내부 팀만 (Canary)
  - 24시간 모니터링
  - 에러율 < 0.1%

Day 4-6 (20%):
  - 일반 사용자 소수 포함
  - 피드백 수집
  - 성능 비교 (구 vs 신)

Day 7-9 (50%):
  - 절반의 사용자
  - 48시간 안정화
  - 인덱스 튜닝

Day 10-12 (100%):
  - 전체 사용자
  - 구 스키마 READ-ONLY 모드
  - 1주일 모니터링
```

---

## Phase 3: 구 스키마 제거

### 안전한 제거 절차

```sql
-- Day 1: 쓰기 비활성화
ALTER TABLE habit_tracker SET UNLOGGED; -- 성능 향상
UPDATE habit_tracker SET _archived = true; -- 소프트 아카이브

-- Day 2-7: 모니터링 (1주일)
-- 문제 없으면 다음 단계

-- Day 8: 테이블 이름 변경
ALTER TABLE habit_tracker RENAME TO habit_tracker_old;

-- Day 9-14: 추가 모니터링 (1주일)

-- Day 15: 완전 삭제
DROP TABLE habit_tracker_old CASCADE;

-- Day 16: 정리
VACUUM FULL;
ANALYZE;
```

---

## 모니터링 및 알림

### 모니터링 지표

```javascript
// 실시간 모니터링 대시보드

const metrics = {
  // 동기화 지연
  syncLag: {
    threshold: 100, // ms
    current: 45, // ms
    status: 'OK'
  },

  // 드리프트 비율
  driftRate: {
    threshold: 0.1, // %
    current: 0.02, // %
    status: 'OK'
  },

  // 에러율
  errorRate: {
    threshold: 1, // %
    current: 0.05, // %
    status: 'OK'
  },

  // 성능 (p95)
  p95ResponseTime: {
    oldSchema: 180, // ms
    newSchema: 120, // ms
    improvement: '33%'
  }
};

// Slack 알림
if (metrics.syncLag.current > metrics.syncLag.threshold) {
  await sendSlackAlert({
    channel: '#db-migration',
    message: `⚠️ Sync lag: ${metrics.syncLag.current}ms > ${metrics.syncLag.threshold}ms`,
    severity: 'WARNING'
  });
}
```

---

## 롤백 시나리오

### Phase별 롤백 절차

#### Phase 0 롤백
```sql
-- 섀도 스키마 삭제만
DROP TABLE IF EXISTS habit_records CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS weeks CASCADE;
DROP TABLE IF EXISTS children CASCADE;

-- 프로덕션 영향 없음 ✅
```

#### Phase 1 롤백
```javascript
// Edge Function 비활성화
await supabase.functions.delete('dual-write-habit');

// Trigger 비활성화
DROP TRIGGER sync_habit_tracker_to_new ON habit_tracker;

// 구 스키마만 사용 ✅
```

#### Phase 2 롤백
```javascript
// Feature Flag OFF
await ld.variation('use-new-schema').set(false);

// 모든 트래픽 → 구 스키마
// 즉시 복구 ✅
```

---

## 체크리스트

### Phase 0 준비
- [ ] 섀도 스키마 생성 완료
- [ ] 백필 스크립트 테스트 (개발 환경)
- [ ] 드리프트 감지 자동화 구축
- [ ] 모니터링 대시보드 설정

### Phase 1 이중쓰기
- [ ] Edge Function 배포
- [ ] Database Trigger 활성화
- [ ] idempotency 로그 테이블 생성
- [ ] 24시간 모니터링 (드리프트 <0.1%)

### Phase 2 점진적 전환
- [ ] Feature Flag 설정
- [ ] 5% → 20% → 50% → 100% (각 24시간)
- [ ] 성능 개선 확인 (30%+)
- [ ] RLS 활성화

### Phase 3 구 스키마 제거
- [ ] READ-ONLY 1주일
- [ ] 완전 삭제
- [ ] VACUUM & ANALYZE

---

**마지막 업데이트**: 2025년 10월 11일
**문서 버전**: 2.0
**다음 단계**: [PHASE_0_TODO.md](PHASE_0_TODO.md) 참고
