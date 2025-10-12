# Phase 1 TODO: 이중쓰기 + 템플릿 기능 (4주)

> **기간**: 4주 (20 영업일)
> **목표**: 무중단 마이그레이션 (이중쓰기) + 템플릿 기능 개발
> **전략**: Strangler Fig Pattern - 기존 코드 영향 최소화
> **관련 문서**: [TECH_SPEC.md](TECH_SPEC.md), [DB_MIGRATION_PLAN_V2.md](DB_MIGRATION_PLAN_V2.md), [PHASE_0_TODO.md](PHASE_0_TODO.md)

---

## 📊 전체 타임라인

```
Week 1 (Day 1-5)   ████████ 이중쓰기 로직 구현 (Edge Function + Trigger)
Week 2 (Day 6-10)  ████████ 이중쓰기 통합 및 검증
Week 3 (Day 11-15) ████████ 템플릿 기능 개발 (신 스키마만 사용)
Week 4 (Day 16-20) ████████ Feature Flag + 내부 테스트 (5% 트래픽)
```

---

## 📋 목차
1. [Week 1: 이중쓰기 로직 구현](#week-1-이중쓰기-로직-구현)
2. [Week 2: 이중쓰기 통합 및 검증](#week-2-이중쓰기-통합-및-검증)
3. [Week 3: 템플릿 기능 개발](#week-3-템플릿-기능-개발)
4. [Week 4: Feature Flag + 내부 테스트](#week-4-feature-flag--내부-테스트)
5. [완료 기준](#완료-기준)

---

## Week 1: 이중쓰기 로직 구현

### 📅 Day 1-3: Edge Function 개발

**목표**: 구/신 스키마 동시 쓰기를 위한 Edge Function 구현

#### ✅ Task 1.1: Edge Function 기본 구조 작성
**파일**: `supabase/functions/dual-write-habit/index.ts`

**TODO**:
- [ ] Edge Function 프로젝트 초기화
  ```bash
  npx supabase functions new dual-write-habit
  ```

- [ ] 기본 구조 작성 (Day 1, 2시간)
  ```typescript
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { operation, data } = await req.json();

      switch (operation) {
        case 'create_week':
          return await createWeekDualWrite(supabase, data);
        case 'update_habit':
          return await updateHabitDualWrite(supabase, data);
        case 'toggle_completion':
          return await toggleCompletionDualWrite(supabase, data);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  });
  ```

- [ ] 배포 테스트 (Day 1, 1시간)
  ```bash
  npx supabase functions deploy dual-write-habit
  npx supabase functions invoke dual-write-habit --data '{"operation":"test"}'
  ```

**완료 기준**:
- [ ] Edge Function 배포 성공
- [ ] OPTIONS 요청 응답 확인
- [ ] 기본 에러 핸들링 동작

---

#### ✅ Task 1.2: createWeekDualWrite 구현
**파일**: `supabase/functions/dual-write-habit/index.ts`

**TODO**:
- [ ] 구 스키마 쓰기 로직 (Day 2, 3시간)
  ```typescript
  async function createWeekDualWrite(supabase: any, data: any) {
    const { childName, weekStartDate, theme, habits } = data;

    // 1. 구 스키마 쓰기 (habit_tracker)
    const { data: oldResult, error: oldError } = await supabase
      .from('habit_tracker')
      .insert({
        child_name: childName,
        week_period: formatWeekPeriod(weekStartDate),
        week_start_date: weekStartDate,
        theme: theme,
        habits: habits || [],
        source_version: 'dual_write',
        idempotency_key: data.idempotencyKey  // 중복 방지
      })
      .select()
      .single();

    if (oldError) {
      console.error('Old schema write failed:', oldError);
      throw new Error('Failed to write to old schema');
    }

    // 2. 신 스키마 쓰기 (children, weeks, habits)
    try {
      // 2-1. child 찾기 또는 생성
      let { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('name', childName)
        .eq('user_id', data.userId)
        .single();

      if (!child) {
        const { data: newChild, error: childError } = await supabase
          .from('children')
          .insert({
            user_id: data.userId,
            name: childName,
            source_version: 'dual_write'
          })
          .select()
          .single();

        if (childError) throw childError;
        child = newChild;
      }

      // 2-2. week 생성
      const { data: newWeek, error: weekError } = await supabase
        .from('weeks')
        .insert({
          child_id: child.id,
          week_start_date: weekStartDate,
          week_end_date: addDays(weekStartDate, 6),
          theme: theme,
          source_version: 'dual_write',
          idempotency_key: data.idempotencyKey
        })
        .select()
        .single();

      if (weekError) throw weekError;

      // 2-3. habits 생성 (있다면)
      if (habits && habits.length > 0) {
        const habitRecords = habits.map((habit: any, index: number) => ({
          week_id: newWeek.id,
          text: habit.text || habit,
          sort_order: index,
          color: habit.color || '#3B82F6'
        }));

        const { error: habitsError } = await supabase
          .from('habits')
          .insert(habitRecords);

        if (habitsError) throw habitsError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          old: oldResult,
          new: newWeek
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (newError) {
      // 신 스키마 실패 시 구 스키마는 유지 (롤백 안 함)
      console.error('New schema write failed:', newError);

      return new Response(
        JSON.stringify({
          success: true,
          old: oldResult,
          new: null,
          warning: 'New schema write failed but old schema succeeded'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 207 }
      );
    }
  }

  function formatWeekPeriod(weekStartDate: string): string {
    const start = new Date(weekStartDate);
    const end = addDays(weekStartDate, 6);
    return `${start.toLocaleDateString('ko-KR')} - ${end.toLocaleDateString('ko-KR')}`;
  }

  function addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
  ```

**완료 기준**:
- [ ] 구 스키마 쓰기 성공
- [ ] 신 스키마 쓰기 성공
- [ ] 신 스키마 실패 시 구 스키마 유지 (부분 성공 처리)

---

#### ✅ Task 1.3: toggleCompletionDualWrite 구현
**파일**: `supabase/functions/dual-write-habit/index.ts`

**TODO**:
- [ ] 구 스키마 업데이트 로직 (Day 3, 3시간)
  ```typescript
  async function toggleCompletionDualWrite(supabase: any, data: any) {
    const { childName, weekStartDate, habitIndex, dayIndex, newStatus } = data;

    // 1. 구 스키마 업데이트 (JSONB 수정)
    const { data: oldWeek } = await supabase
      .from('habit_tracker')
      .select('*')
      .eq('child_name', childName)
      .eq('week_start_date', weekStartDate)
      .single();

    if (!oldWeek) throw new Error('Week not found in old schema');

    const habits = JSON.parse(JSON.stringify(oldWeek.habits || []));
    if (!habits[habitIndex]) throw new Error('Habit not found');

    // checks 배열 업데이트
    if (!habits[habitIndex].checks) {
      habits[habitIndex].checks = Array(7).fill(false);
    }
    habits[habitIndex].checks[dayIndex] = newStatus;

    const { data: oldResult, error: oldError } = await supabase
      .from('habit_tracker')
      .update({ habits, updated_at: new Date().toISOString() })
      .eq('id', oldWeek.id)
      .select()
      .single();

    if (oldError) throw oldError;

    // 2. 신 스키마 업데이트 (completions 테이블)
    try {
      // 2-1. week_id 찾기
      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('name', childName)
        .single();

      const { data: week } = await supabase
        .from('weeks')
        .select('id')
        .eq('child_id', child.id)
        .eq('week_start_date', weekStartDate)
        .single();

      // 2-2. habit_id 찾기
      const { data: habitsData } = await supabase
        .from('habits')
        .select('id')
        .eq('week_id', week.id)
        .order('sort_order');

      const habitId = habitsData[habitIndex]?.id;
      if (!habitId) throw new Error('Habit not found in new schema');

      // 2-3. completion 토글
      const recordDate = addDays(weekStartDate, dayIndex);

      if (newStatus) {
        // 완료 추가
        await supabase
          .from('completions')
          .upsert({
            habit_id: habitId,
            day_of_week: dayIndex,
            completed_at: new Date().toISOString(),
          }, {
            onConflict: 'habit_id,day_of_week'
          });
      } else {
        // 완료 제거
        await supabase
          .from('completions')
          .delete()
          .eq('habit_id', habitId)
          .eq('day_of_week', dayIndex);
      }

      return new Response(
        JSON.stringify({
          success: true,
          old: oldResult,
          new: { habitId, dayIndex, newStatus }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (newError) {
      console.error('New schema update failed:', newError);

      return new Response(
        JSON.stringify({
          success: true,
          old: oldResult,
          new: null,
          warning: 'New schema update failed but old schema succeeded'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 207 }
      );
    }
  }
  ```

**완료 기준**:
- [ ] 구 스키마 JSONB 업데이트 성공
- [ ] 신 스키마 completions 테이블 업데이트 성공
- [ ] true/false 토글 동작 확인

---

### 📅 Day 4-5: Database Trigger 백업 구현

**목표**: Edge Function 실패 시 Database Trigger가 자동으로 동기화

#### ✅ Task 2.1: Trigger Function 작성
**파일**: `supabase/migrations/005_dual_write_triggers.sql`

**TODO**:
- [ ] Trigger 함수 작성 (Day 4, 4시간)
  ```sql
  -- INSERT 트리거: habit_tracker에 새 행 추가 시 신 스키마 동기화
  CREATE OR REPLACE FUNCTION sync_old_to_new_insert()
  RETURNS TRIGGER AS $$
  DECLARE
    v_child_id UUID;
    v_week_id UUID;
  BEGIN
    -- source_version이 'dual_write'면 이미 Edge Function에서 처리됨 (스킵)
    IF NEW.source_version = 'dual_write' THEN
      RETURN NEW;
    END IF;

    -- 1. child 찾기 또는 생성
    SELECT id INTO v_child_id
    FROM children
    WHERE name = NEW.child_name AND user_id = NEW.user_id;

    IF v_child_id IS NULL THEN
      INSERT INTO children (user_id, name, source_version)
      VALUES (NEW.user_id, NEW.child_name, 'trigger')
      RETURNING id INTO v_child_id;
    END IF;

    -- 2. week 생성
    INSERT INTO weeks (child_id, week_start_date, week_end_date, theme, source_version)
    VALUES (
      v_child_id,
      NEW.week_start_date,
      NEW.week_start_date + INTERVAL '6 days',
      NEW.theme,
      'trigger'
    )
    ON CONFLICT (child_id, week_start_date) DO UPDATE
    SET theme = EXCLUDED.theme
    RETURNING id INTO v_week_id;

    -- 3. habits 생성 (JSONB → 테이블)
    INSERT INTO habits (week_id, text, sort_order, color)
    SELECT
      v_week_id,
      habit->>'text',
      (habit->>'sort_order')::INTEGER,
      COALESCE(habit->>'color', '#3B82F6')
    FROM jsonb_array_elements(NEW.habits) WITH ORDINALITY AS t(habit, sort_order);

    RAISE NOTICE 'Trigger synced INSERT for child_name=%, week=%', NEW.child_name, NEW.week_start_date;
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Trigger sync failed: %', SQLERRM;
      RETURN NEW;  -- 에러 시에도 구 스키마는 유지
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger 생성
  CREATE TRIGGER trigger_habit_tracker_insert
    AFTER INSERT ON habit_tracker
    FOR EACH ROW
    EXECUTE FUNCTION sync_old_to_new_insert();
  ```

- [ ] UPDATE 트리거 작성 (Day 4, 2시간)
  ```sql
  CREATE OR REPLACE FUNCTION sync_old_to_new_update()
  RETURNS TRIGGER AS $$
  BEGIN
    -- source_version이 'dual_write'면 스킵
    IF NEW.source_version = 'dual_write' THEN
      RETURN NEW;
    END IF

    -- habits JSONB가 변경되었으면 신 스키마 업데이트
    IF NEW.habits IS DISTINCT FROM OLD.habits THEN
      -- 복잡한 로직이므로 간단히 로그만
      RAISE NOTICE 'Trigger detected UPDATE for child_name=%, week=%', NEW.child_name, NEW.week_start_date;

      -- 실제로는 habits 재생성 로직 필요 (생략)
      -- DELETE FROM habits WHERE week_id = ...
      -- INSERT INTO habits ...
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trigger_habit_tracker_update
    AFTER UPDATE ON habit_tracker
    FOR EACH ROW
    EXECUTE FUNCTION sync_old_to_new_update();
  ```

- [ ] 트리거 배포 (Day 5, 1시간)
  ```bash
  npx supabase db push
  ```

**완료 기준**:
- [ ] INSERT 트리거 동작 확인
- [ ] UPDATE 트리거 동작 확인
- [ ] source_version='dual_write'일 때 스킵 확인

---

#### ✅ Task 2.2: Trigger 테스트
**TODO**:
- [ ] 직접 INSERT 테스트 (Day 5, 2시간)
  ```sql
  -- 테스트 1: 직접 INSERT (Trigger 발동)
  INSERT INTO habit_tracker (child_name, week_start_date, theme, habits, user_id)
  VALUES ('테스트아이', '2025-10-13', '테스트주제', '[]'::jsonb, 'user-id');

  -- 검증: children, weeks 테이블에 데이터 생성 확인
  SELECT * FROM children WHERE name = '테스트아이';
  SELECT * FROM weeks WHERE week_start_date = '2025-10-13';

  -- 테스트 2: Edge Function INSERT (Trigger 스킵)
  INSERT INTO habit_tracker (child_name, week_start_date, theme, habits, user_id, source_version)
  VALUES ('테스트아이2', '2025-10-13', '테스트주제2', '[]'::jsonb, 'user-id', 'dual_write');

  -- 검증: Trigger 로그 없어야 함
  ```

**완료 기준**:
- [ ] 직접 INSERT 시 Trigger 발동 확인
- [ ] Edge Function INSERT 시 Trigger 스킵 확인

---

## Week 2: 이중쓰기 통합 및 검증

### 📅 Day 6-8: Frontend 통합

**목표**: 기존 `saveChildData` 함수를 Edge Function으로 전환

#### ✅ Task 3.1: Edge Function 호출 래퍼 작성
**파일**: `src/lib/dualWrite.js`

**TODO**:
- [ ] 래퍼 함수 작성 (Day 6, 3시간)
  ```javascript
  // src/lib/dualWrite.js
  import { supabase } from './database';
  import { v4 as uuidv4 } from 'uuid';

  export async function createWeekDualWrite(childName, weekStartDate, theme, habits = []) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('dual-write-habit', {
      body: {
        operation: 'create_week',
        data: {
          userId: user.id,
          childName,
          weekStartDate,
          theme,
          habits,
          idempotencyKey: uuidv4()  // 중복 방지
        }
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Dual write failed');

    return data;
  }

  export async function toggleCompletionDualWrite(childName, weekStartDate, habitIndex, dayIndex, newStatus) {
    const { data, error } = await supabase.functions.invoke('dual-write-habit', {
      body: {
        operation: 'toggle_completion',
        data: {
          childName,
          weekStartDate,
          habitIndex,
          dayIndex,
          newStatus
        }
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Dual write failed');

    return data;
  }
  ```

**완료 기준**:
- [ ] Edge Function 호출 성공
- [ ] 에러 핸들링 동작 확인

---

#### ✅ Task 3.2: database.js 수정
**파일**: `src/lib/database.js`

**TODO**:
- [ ] saveChildData 수정 (Day 7, 4시간)
  ```javascript
  // src/lib/database.js
  import { createWeekDualWrite, toggleCompletionDualWrite } from './dualWrite';

  // ❌ 기존 (직접 쓰기)
  export const saveChildData = async (childName, weekStartDate, data) => {
    const { data: result, error } = await supabase
      .from('habit_tracker')
      .upsert({
        child_name: childName,
        week_start_date: weekStartDate,
        ...data
      });

    if (error) throw error;
    return result;
  };

  // ✅ 새 방식 (이중쓰기)
  export const saveChildData = async (childName, weekStartDate, data) => {
    try {
      // Edge Function으로 이중쓰기
      const result = await createWeekDualWrite(
        childName,
        weekStartDate,
        data.theme,
        data.habits
      );

      console.log('Dual write result:', result);

      // 신 스키마 실패 시 경고 표시
      if (result.warning) {
        console.warn('Warning:', result.warning);
      }

      return result.old;  // 구 스키마 데이터 반환 (기존 호환성)
    } catch (error) {
      console.error('Dual write failed, falling back to old schema:', error);

      // Fallback: 구 스키마만 쓰기
      const { data: result, error: oldError } = await supabase
        .from('habit_tracker')
        .upsert({
          child_name: childName,
          week_start_date: weekStartDate,
          ...data,
          source_version: 'fallback'
        });

      if (oldError) throw oldError;
      return result;
    }
  };
  ```

**완료 기준**:
- [ ] saveChildData가 Edge Function 사용
- [ ] Fallback 동작 확인 (Edge Function 실패 시)

---

#### ✅ Task 3.3: 습관 완료 토글 수정
**파일**: `src/components/Dashboard.jsx` (또는 App.jsx)

**TODO**:
- [ ] 토글 함수 수정 (Day 8, 3시간)
  ```javascript
  // Dashboard.jsx 또는 App.jsx
  import { toggleCompletionDualWrite } from '../lib/dualWrite';

  const handleToggleCompletion = async (habitIndex, dayIndex) => {
    const currentStatus = currentData.habits[habitIndex].checks[dayIndex];
    const newStatus = !currentStatus;

    // 낙관적 업데이트 (UI 즉시 반영)
    const updatedHabits = [...currentData.habits];
    updatedHabits[habitIndex].checks[dayIndex] = newStatus;
    setCurrentData({ ...currentData, habits: updatedHabits });

    try {
      // 이중쓰기
      await toggleCompletionDualWrite(
        currentData.childName,
        currentData.weekStartDate,
        habitIndex,
        dayIndex,
        newStatus
      );
    } catch (error) {
      console.error('Toggle failed:', error);

      // 롤백
      updatedHabits[habitIndex].checks[dayIndex] = currentStatus;
      setCurrentData({ ...currentData, habits: updatedHabits });

      alert('변경 사항 저장 실패');
    }
  };
  ```

**완료 기준**:
- [ ] 토글 시 Edge Function 호출
- [ ] 낙관적 업데이트 동작
- [ ] 에러 시 롤백 확인

---

### 📅 Day 9-10: 드리프트 검증 자동화

**목표**: 구/신 스키마 간 데이터 일치 확인

#### ✅ Task 4.1: 드리프트 검증 스크립트 개선
**파일**: `scripts/drift-detection.js` (Phase 0에서 작성한 것 개선)

**TODO**:
- [ ] 이중쓰기 검증 추가 (Day 9, 4시간)
  ```javascript
  // scripts/drift-detection.js

  async function detectDualWriteDrift() {
    console.log('🔍 이중쓰기 드리프트 검증 시작...');
    const issues = [];

    // 1. 최근 1주일 데이터만 검증 (이중쓰기 시작 이후)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: recentOld } = await supabase
      .from('habit_tracker')
      .select('*')
      .gte('created_at', oneWeekAgo.toISOString())
      .eq('source_version', 'dual_write');

    console.log(`✅ 최근 이중쓰기 데이터: ${recentOld.length}개`);

    // 2. 각 행마다 신 스키마 데이터 비교
    for (const oldRow of recentOld) {
      // child 확인
      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('name', oldRow.child_name)
        .eq('user_id', oldRow.user_id)
        .single();

      if (!child) {
        issues.push({
          type: 'missing_child',
          child_name: oldRow.child_name,
          old_id: oldRow.id
        });
        continue;
      }

      // week 확인
      const { data: week } = await supabase
        .from('weeks')
        .select('*')
        .eq('child_id', child.id)
        .eq('week_start_date', oldRow.week_start_date)
        .single();

      if (!week) {
        issues.push({
          type: 'missing_week',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          old_id: oldRow.id
        });
        continue;
      }

      // habits 개수 비교
      const oldHabits = JSON.parse(oldRow.habits || '[]');
      const { data: newHabits } = await supabase
        .from('habits')
        .select('*')
        .eq('week_id', week.id);

      if (oldHabits.length !== newHabits.length) {
        issues.push({
          type: 'habit_count_mismatch',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          old_count: oldHabits.length,
          new_count: newHabits.length
        });
      }

      // completions 개수 비교
      let oldCompletionCount = 0;
      for (const habit of oldHabits) {
        const checks = habit.checks || [];
        oldCompletionCount += checks.filter(c => c).length;
      }

      const { data: newCompletions } = await supabase
        .from('completions')
        .select('id')
        .in('habit_id', newHabits.map(h => h.id));

      if (oldCompletionCount !== newCompletions.length) {
        issues.push({
          type: 'completion_count_mismatch',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          old_count: oldCompletionCount,
          new_count: newCompletions.length
        });
      }
    }

    // 결과 출력
    if (issues.length === 0) {
      console.log('✅ 드리프트 없음 - 이중쓰기 정상 동작');
    } else {
      console.log(`❌ ${issues.length}개의 드리프트 발견:`);
      console.table(issues);
    }

    return issues;
  }

  detectDualWriteDrift().catch(console.error);
  ```

**완료 기준**:
- [ ] 최근 이중쓰기 데이터 검증
- [ ] 드리프트 0개 확인

---

#### ✅ Task 4.2: 자동 수정 스크립트
**파일**: `scripts/fix-drift.js`

**TODO**:
- [ ] 드리프트 자동 수정 (Day 10, 3시간)
  ```javascript
  // scripts/fix-drift.js

  async function fixDrift() {
    console.log('🔧 드리프트 자동 수정 시작...');

    // 드리프트 검증 실행
    const issues = await detectDualWriteDrift();

    for (const issue of issues) {
      if (issue.type === 'missing_week') {
        // week 재생성
        console.log(`수정 중: ${issue.child_name} - ${issue.week_start_date}`);

        // 구 스키마에서 데이터 가져오기
        const { data: oldData } = await supabase
          .from('habit_tracker')
          .select('*')
          .eq('child_name', issue.child_name)
          .eq('week_start_date', issue.week_start_date)
          .single();

        // 신 스키마 재생성 (Trigger 없이 직접)
        // ... (재생성 로직)
      }
    }

    console.log('✅ 드리프트 수정 완료');
  }

  fixDrift().catch(console.error);
  ```

**완료 기준**:
- [ ] 드리프트 자동 수정 동작
- [ ] 수정 후 검증 통과

---

## Week 3: 템플릿 기능 개발

### 📅 Day 11-13: 템플릿 기능 (신 스키마만 사용)

**목표**: 새로운 템플릿 기능을 신 스키마로만 개발

#### ✅ Task 5.1: React Query 설정
**파일**: `src/lib/queryClient.js`, `src/lib/queryKeys.js`

**TODO**:
- [ ] React Query 설치 (Day 11, 1시간)
  ```bash
  npm install @tanstack/react-query @tanstack/react-query-devtools
  ```

- [ ] QueryClient 설정 (Day 11, 1시간)
  ```javascript
  // src/lib/queryClient.js
  import { QueryClient } from '@tanstack/react-query';

  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,  // 5분
        cacheTime: 1000 * 60 * 30, // 30분
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
  ```

- [ ] App.jsx에 Provider 추가 (Day 11, 30분)
  ```javascript
  // App.jsx
  import { QueryClientProvider } from '@tanstack/react-query';
  import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
  import { queryClient } from './lib/queryClient';

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        {/* 기존 코드 */}

        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    );
  }
  ```

- [ ] QueryKey 정의 (Day 11, 1시간)
  ```javascript
  // src/lib/queryKeys.js
  export const templateKeys = {
    all: ['templates'],
    lists: () => [...templateKeys.all, 'list'],
    list: (filters) => [...templateKeys.lists(), filters],
    detail: (id) => [...templateKeys.all, 'detail', id],
    mine: (userId) => [...templateKeys.all, 'mine', userId],
    public: (filters) => [...templateKeys.all, 'public', filters],
  };

  export const commentKeys = {
    all: ['comments'],
    byTemplate: (templateId) => [...commentKeys.all, { templateId }],
  };
  ```

**완료 기준**:
- [ ] React Query 설치 완료
- [ ] DevTools 표시 확인

---

#### ✅ Task 5.2: 템플릿 CRUD hooks
**파일**: `src/hooks/templates/`

**TODO**:
- [ ] useTemplates (Day 12, 2시간)
  ```javascript
  // src/hooks/templates/useTemplates.js
  import { useQuery } from '@tanstack/react-query';
  import { supabase } from '../../lib/database';
  import { templateKeys } from '../../lib/queryKeys';

  export function useTemplates(filters = {}) {
    return useQuery({
      queryKey: templateKeys.list(filters),
      queryFn: async () => {
        let query = supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters.isPublic !== undefined) {
          query = query.eq('is_public', filters.isPublic);
        }

        if (filters.userId) {
          query = query.eq('user_id', filters.userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
    });
  }
  ```

- [ ] useCreateTemplate (Day 12, 2시간)
  ```javascript
  // src/hooks/templates/useCreateTemplate.js
  import { useMutation, useQueryClient } from '@tanstack/react-query';
  import { supabase } from '../../lib/database';
  import { templateKeys } from '../../lib/queryKeys';

  export function useCreateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (newTemplate) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('templates')
          .insert({
            ...newTemplate,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      },
    });
  }
  ```

- [ ] useUpdateTemplate, useDeleteTemplate (Day 13, 3시간)
  - 위와 유사한 패턴으로 작성

**완료 기준**:
- [ ] 템플릿 조회/생성/수정/삭제 hooks 완성
- [ ] React Query DevTools에서 쿼리 확인

---

#### ✅ Task 5.3: 템플릿 UI 컴포넌트
**파일**: `src/components/templates/`

**TODO**:
- [ ] TemplateList.jsx (Day 13, 3시간)
  ```javascript
  // src/components/templates/TemplateList.jsx
  import { useTemplates } from '../../hooks/templates/useTemplates';

  export function TemplateList() {
    const { data: templates, isLoading, error } = useTemplates({ isPublic: true });

    if (isLoading) return <div>로딩 중...</div>;
    if (error) return <div>오류: {error.message}</div>;

    return (
      <div className="template-list">
        <h2>공개 템플릿</h2>
        <ul>
          {templates?.map(template => (
            <li key={template.id}>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  ```

- [ ] TemplateForm.jsx (Day 13, 2시간)
  - 템플릿 생성/수정 폼

**완료 기준**:
- [ ] 템플릿 목록 표시
- [ ] 템플릿 생성 폼 동작

---

### 📅 Day 14-15: 템플릿 습관 연동

**목표**: 템플릿의 습관들을 새 주차에 적용

#### ✅ Task 6.1: 템플릿 → 주차 적용 함수
**파일**: `src/lib/templates.js`

**TODO**:
- [ ] applyTemplateToWeek (Day 14, 4시간)
  ```javascript
  // src/lib/templates.js
  import { supabase } from './database';

  export async function applyTemplateToWeek(templateId, childId, weekStartDate) {
    // 1. 템플릿 조회
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select(`
        *,
        template_habits (
          id,
          text,
          color,
          sort_order
        )
      `)
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // 2. 주차 생성
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .insert({
        child_id: childId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate.toISOString().split('T')[0],
        theme: template.theme || template.name
      })
      .select()
      .single();

    if (weekError) throw weekError;

    // 3. 템플릿 습관들을 주차에 복사
    const habits = template.template_habits.map(habit => ({
      week_id: week.id,
      text: habit.text,
      color: habit.color,
      sort_order: habit.sort_order
    }));

    const { error: habitsError } = await supabase
      .from('habits')
      .insert(habits);

    if (habitsError) throw habitsError;

    return week;
  }
  ```

**완료 기준**:
- [ ] 템플릿 → 주차 적용 동작
- [ ] 습관들이 올바르게 복사됨

---

#### ✅ Task 6.2: UI에 템플릿 적용 버튼 추가
**TODO**:
- [ ] Dashboard에 버튼 추가 (Day 15, 3시간)
  ```javascript
  // Dashboard.jsx
  import { applyTemplateToWeek } from '../lib/templates';

  const handleApplyTemplate = async (templateId) => {
    try {
      await applyTemplateToWeek(templateId, currentChild.id, weekStartDate);
      alert('템플릿이 적용되었습니다!');

      // 데이터 새로고침
      refetch();
    } catch (error) {
      console.error('템플릿 적용 실패:', error);
      alert('템플릿 적용에 실패했습니다.');
    }
  };

  return (
    <div>
      <button onClick={() => setShowTemplates(true)}>
        템플릿에서 시작하기
      </button>

      {showTemplates && (
        <TemplateList onSelect={handleApplyTemplate} />
      )}
    </div>
  );
  ```

**완료 기준**:
- [ ] 템플릿 선택 UI 표시
- [ ] 템플릿 적용 동작 확인

---

## Week 4: Feature Flag + 내부 테스트

### 📅 Day 16-18: Feature Flag 설정

**목표**: LaunchDarkly 또는 Unleash로 트래픽 점진적 전환

#### ✅ Task 7.1: Feature Flag 라이브러리 선택
**TODO**:
- [ ] LaunchDarkly vs Unleash 비교 (Day 16, 2시간)
  - LaunchDarkly: 무료 티어 10,000 MAU
  - Unleash: 오픈소스, 자체 호스팅 가능

- [ ] LaunchDarkly 가입 및 SDK 설치 (Day 16, 1시간)
  ```bash
  npm install launchdarkly-react-client-sdk
  ```

**완료 기준**:
- [ ] Feature Flag 서비스 선택 완료
- [ ] SDK 설치 완료

---

#### ✅ Task 7.2: Feature Flag 구현
**파일**: `src/lib/featureFlags.js`

**TODO**:
- [ ] Flag 초기화 (Day 17, 3시간)
  ```javascript
  // src/lib/featureFlags.js
  import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';

  export async function initializeFlags() {
    const LDProvider = await asyncWithLDProvider({
      clientSideID: import.meta.env.VITE_LAUNCHDARKLY_CLIENT_ID,
      context: {
        kind: 'user',
        key: 'anonymous',  // 추후 user.id로 변경
      },
    });

    return LDProvider;
  }
  ```

- [ ] App.jsx에 적용 (Day 17, 2시간)
  ```javascript
  // App.jsx
  import { useFlags } from 'launchdarkly-react-client-sdk';

  function App() {
    const flags = useFlags();

    // 이중쓰기 활성화 여부
    const useDualWrite = flags.useDualWrite || false;

    console.log('Feature Flags:', { useDualWrite });

    // ...
  }
  ```

- [ ] LaunchDarkly 대시보드에서 Flag 생성 (Day 17, 1시간)
  - Flag name: `useDualWrite`
  - Default: false
  - Rollout: 5% → 20% → 50% → 100%

**완료 기준**:
- [ ] Feature Flag 초기화 성공
- [ ] 대시보드에서 Flag 변경 시 앱에 반영 확인

---

### 📅 Day 19-20: 내부 테스트 (5% 트래픽)

**목표**: 팀 내부 사용자로 이중쓰기 테스트

#### ✅ Task 8.1: 5% 트래픽 활성화
**TODO**:
- [ ] LaunchDarkly에서 5% 롤아웃 설정 (Day 19, 1시간)
  - Target: 내부 팀원 이메일 목록
  - Percentage rollout: 5%

- [ ] 모니터링 설정 (Day 19, 2시간)
  ```javascript
  // src/lib/monitoring.js
  export function logDualWriteResult(result) {
    console.log('Dual Write Result:', {
      success: result.success,
      old: result.old ? 'OK' : 'FAIL',
      new: result.new ? 'OK' : 'FAIL',
      warning: result.warning || null,
      timestamp: new Date().toISOString()
    });

    // Sentry 또는 LogRocket으로 전송 (선택)
  }
  ```

**완료 기준**:
- [ ] 5% 사용자에게 이중쓰기 적용
- [ ] 모니터링 로그 확인

---

#### ✅ Task 8.2: 테스트 시나리오 실행
**TODO**:
- [ ] 시나리오 1: 새 주차 생성 (Day 19, 2시간)
  - [ ] 아이 추가
  - [ ] 주차 생성
  - [ ] 구/신 스키마 데이터 일치 확인

- [ ] 시나리오 2: 습관 완료 토글 (Day 20, 2시간)
  - [ ] 습관 추가
  - [ ] 완료 토글 (녹색/노랑/빨강)
  - [ ] 구/신 스키마 일치 확인

- [ ] 시나리오 3: 템플릿 적용 (Day 20, 2시간)
  - [ ] 공개 템플릿 선택
  - [ ] 주차에 적용
  - [ ] 습관들이 올바르게 생성됨 확인

**완료 기준**:
- [ ] 모든 시나리오 통과
- [ ] 드리프트 0개 확인

---

#### ✅ Task 8.3: 버그 수정 및 문서화
**TODO**:
- [ ] 발견된 버그 수정 (Day 20, 3시간)
- [ ] Phase 1 회고 작성 (Day 20, 1시간)
  - 성과, 이슈, 배운 점
  - Phase 2 개선 사항

**완료 기준**:
- [ ] 버그 모두 수정
- [ ] Phase 1 회고 작성 완료

---

## 완료 기준

### ✅ Phase 1 완료 조건

#### 필수 항목
- [ ] ✅ Edge Function 배포 및 동작 확인 (createWeekDualWrite, toggleCompletionDualWrite)
- [ ] ✅ Database Trigger 배포 및 동작 확인 (INSERT, UPDATE)
- [ ] ✅ Frontend 이중쓰기 통합 완료 (saveChildData, toggleCompletion)
- [ ] ✅ 드리프트 검증 자동화 (scripts/drift-detection.js)
- [ ] ✅ 템플릿 기능 완성 (조회/생성/수정/삭제)
- [ ] ✅ 템플릿 → 주차 적용 기능
- [ ] ✅ React Query 설정 및 hooks 작성
- [ ] ✅ Feature Flag 설정 (LaunchDarkly)
- [ ] ✅ 5% 트래픽 내부 테스트 완료

#### 데이터 무결성
- [ ] 최근 1주일 이중쓰기 데이터 드리프트 0개
- [ ] 구/신 스키마 데이터 개수 일치
- [ ] 샘플 데이터 내용 일치 (5개 이상 확인)

#### 성능 기준
- [ ] Edge Function 응답 시간 < 500ms
- [ ] 이중쓰기 실패율 < 1%
- [ ] Frontend 응답성 저하 없음

#### 문서
- [ ] Phase 1 회고 작성
- [ ] 템플릿 사용 가이드
- [ ] 이중쓰기 트러블슈팅 가이드

---

## 리스크 관리

### 🔴 High Risk

#### 리스크 1: Edge Function 실패로 인한 데이터 불일치
**대응**:
- Database Trigger 백업으로 자동 동기화
- 드리프트 검증 자동화 (6시간마다)
- 실패 시 알림 (Slack, Email)

#### 리스크 2: 성능 저하
**대응**:
- Edge Function 타임아웃 설정 (5초)
- Fallback으로 구 스키마만 쓰기
- 비동기 처리 (응답 먼저, 동기화 나중)

#### 리스크 3: 신 스키마 버그
**대응**:
- 구 스키마는 항상 성공하도록 설계
- 신 스키마 실패 시 경고만 표시 (앱 중단 안 함)
- Phase 2에서 수정 후 재동기화

---

## 다음 단계 (Phase 2)

Phase 1 완료 후:

1. ✅ Phase 1 회고 및 팀 공유
2. ➡️ Phase 2 킥오프: 점진적 읽기 전환 (Feature Flag 5% → 100%)
3. 📄 [PHASE_2_TODO.md](PHASE_2_TODO.md) 작성

---

**마지막 업데이트**: 2025-10-11
**작성자**: Claude Code (Strangler Fig Pattern)
**검토자**: GPT-5, Gemini
**현재 상태**: ⏸️ 대기 중 (Phase 0 완료 후 시작)
**다음 액션**: Edge Function 개발 시작 (Task 1.1)
