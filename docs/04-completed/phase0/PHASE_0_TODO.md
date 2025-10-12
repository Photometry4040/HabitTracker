# Phase 0 TODO: 준비 단계 (2주)

> **목표**: 무중단 마이그레이션을 위한 섀도 스키마 및 자동화 구축
> **기간**: 2주 (10 영업일)
> **리스크**: 낮음 (프로덕션 영향 없음, 읽기 전용 검증)

---

## 📊 전체 타임라인

```
Week 1 (Day 1-5)  ████████ 섀도 스키마 + 백필
Week 2 (Day 6-10) ████████ 검증 자동화 + 이중쓰기 준비
```

---

## Week 1: 섀도 스키마 + 백필

### Day 1-2: 섀도 스키마 생성 (Shadow Schema Creation)

**목표**: 새 테이블을 프로덕션에 영향 없이 생성

#### ✅ Task 1.1: 새 테이블 생성 (제약 조건 `NOT VALID`)
**파일**: `supabase/migrations/001_create_shadow_schema.sql`

```sql
-- 1. children 테이블
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_children_user FOREIGN KEY (user_id)
    REFERENCES auth.users(id) NOT VALID  -- 제약 조건을 검증하지 않음 (빠른 생성)
);

-- 2. weeks 테이블
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  theme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_version TEXT DEFAULT 'new_schema',  -- 'dual_write', 'new_schema', 'migration'
  CONSTRAINT fk_weeks_child FOREIGN KEY (child_id)
    REFERENCES children(id) ON DELETE CASCADE NOT VALID
);

-- 3. habits 테이블
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_habits_week FOREIGN KEY (week_id)
    REFERENCES weeks(id) ON DELETE CASCADE NOT VALID
);

-- 4. completions 테이블
CREATE TABLE completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_completions_habit FOREIGN KEY (habit_id)
    REFERENCES habits(id) ON DELETE CASCADE NOT VALID,
  CONSTRAINT unique_habit_day UNIQUE (habit_id, day_of_week) NOT VALID
);

-- 5. templates 테이블
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  theme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_templates_user FOREIGN KEY (user_id)
    REFERENCES auth.users(id) NOT VALID
);

-- 6. template_habits 테이블
CREATE TABLE template_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_template_habits_template FOREIGN KEY (template_id)
    REFERENCES templates(id) ON DELETE CASCADE NOT VALID
);

-- 7. statistics 테이블
CREATE TABLE statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  total_habits INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  streak_days INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_statistics_child FOREIGN KEY (child_id)
    REFERENCES children(id) ON DELETE CASCADE NOT VALID,
  CONSTRAINT unique_child_week UNIQUE (child_id, week_start_date) NOT VALID
);
```

**검증**:
```bash
# Supabase CLI로 마이그레이션 실행
npx supabase db push

# 테이블 생성 확인
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('children', 'weeks', 'habits', 'completions', 'templates', 'template_habits', 'statistics');"
```

**완료 기준**:
- [ ] 7개 테이블 모두 생성됨
- [ ] `NOT VALID` 제약 조건으로 빠르게 생성됨 (프로덕션 영향 없음)
- [ ] 마이그레이션 파일이 Git에 커밋됨

---

#### ✅ Task 1.2: 인덱스 생성 (CONCURRENTLY)
**파일**: `supabase/migrations/002_create_indexes.sql`

```sql
-- 인덱스는 CONCURRENTLY로 생성 (잠금 방지)
CREATE INDEX CONCURRENTLY idx_children_user_id ON children(user_id);
CREATE INDEX CONCURRENTLY idx_children_name ON children(name);

CREATE INDEX CONCURRENTLY idx_weeks_child_id ON weeks(child_id);
CREATE INDEX CONCURRENTLY idx_weeks_start_date ON weeks(week_start_date);
CREATE INDEX CONCURRENTLY idx_weeks_source_version ON weeks(source_version);

CREATE INDEX CONCURRENTLY idx_habits_week_id ON habits(week_id);
CREATE INDEX CONCURRENTLY idx_habits_sort_order ON habits(week_id, sort_order);

CREATE INDEX CONCURRENTLY idx_completions_habit_id ON completions(habit_id);
CREATE INDEX CONCURRENTLY idx_completions_day ON completions(habit_id, day_of_week);

CREATE INDEX CONCURRENTLY idx_templates_user_id ON templates(user_id);
CREATE INDEX CONCURRENTLY idx_templates_public ON templates(is_public) WHERE is_public = true;

CREATE INDEX CONCURRENTLY idx_template_habits_template_id ON template_habits(template_id);

CREATE INDEX CONCURRENTLY idx_statistics_child_week ON statistics(child_id, week_start_date);
```

**검증**:
```bash
npx supabase db query "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('children', 'weeks', 'habits', 'completions', 'templates', 'template_habits', 'statistics');"
```

**완료 기준**:
- [ ] 모든 인덱스가 CONCURRENTLY로 생성됨
- [ ] 인덱스 생성 중 프로덕션 잠금 없음 확인

---

#### ✅ Task 1.3: RLS 정책 생성 (비활성화 상태)
**파일**: `supabase/migrations/003_create_rls_policies.sql`

```sql
-- RLS 정책 생성 (아직 활성화하지 않음)

-- children 테이블
CREATE POLICY policy_children_select ON children
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY policy_children_insert ON children
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY policy_children_update ON children
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY policy_children_delete ON children
  FOR DELETE USING (auth.uid() = user_id);

-- weeks 테이블
CREATE POLICY policy_weeks_select ON weeks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = weeks.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY policy_weeks_insert ON weeks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = weeks.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY policy_weeks_update ON weeks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = weeks.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY policy_weeks_delete ON weeks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = weeks.child_id
      AND children.user_id = auth.uid()
    )
  );

-- habits, completions, templates, template_habits, statistics도 동일한 패턴으로 작성
-- (생략 - 전체 코드는 DB_MIGRATION_PLAN_V2.md 참조)

-- ⚠️ 중요: RLS는 아직 활성화하지 않음!
-- ALTER TABLE children ENABLE ROW LEVEL SECURITY;  -- Phase 2에서 활성화
```

**완료 기준**:
- [ ] RLS 정책이 생성됨 (비활성화 상태)
- [ ] Phase 2까지 RLS는 꺼져 있음을 확인

---

### Day 3-4: 백필 자동화 스크립트 개발

**목표**: 기존 데이터를 새 스키마로 이관하는 자동화 스크립트 작성

#### ✅ Task 2.1: 백필 스크립트 작성
**파일**: `scripts/backfill.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // 서비스 역할 키 필요
);

const BATCH_SIZE = 1000;
const DRY_RUN = process.argv.includes('--dry-run');

// 1. children 백필
async function backfillChildren() {
  console.log('\n📦 백필 시작: children 테이블');

  const { data: oldData, error } = await supabase
    .from('habit_tracker')
    .select('child_name, user_id, created_at')
    .order('id');

  if (error) throw error;

  // 중복 제거
  const uniqueChildren = new Map();
  for (const row of oldData) {
    if (!uniqueChildren.has(row.child_name)) {
      uniqueChildren.set(row.child_name, {
        user_id: row.user_id || '00000000-0000-0000-0000-000000000000',
        name: row.child_name,
        created_at: row.created_at || new Date().toISOString()
      });
    }
  }

  const childrenArray = Array.from(uniqueChildren.values());
  console.log(`✅ 총 ${childrenArray.length}명의 아이 발견`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN: 실제 삽입하지 않음');
    console.log(childrenArray.slice(0, 5));  // 샘플 출력
    return;
  }

  // 배치 삽입
  for (let i = 0; i < childrenArray.length; i += BATCH_SIZE) {
    const batch = childrenArray.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('children')
      .upsert(batch, {
        onConflict: 'name',
        ignoreDuplicates: false
      });

    if (insertError) throw insertError;
    console.log(`   진행: ${Math.min(i + BATCH_SIZE, childrenArray.length)}/${childrenArray.length}`);
  }

  console.log('✅ children 백필 완료');
}

// 2. weeks 백필
async function backfillWeeks() {
  console.log('\n📦 백필 시작: weeks 테이블');

  const { data: oldData, error } = await supabase
    .from('habit_tracker')
    .select('*')
    .order('id');

  if (error) throw error;

  // children ID 매핑
  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name');

  const childNameToId = new Map(
    childrenData.map(c => [c.name, c.id])
  );

  const weeksData = oldData.map(row => ({
    child_id: childNameToId.get(row.child_name),
    week_start_date: row.week_start_date,
    week_end_date: calculateWeekEnd(row.week_start_date),
    theme: row.theme,
    created_at: row.created_at || new Date().toISOString(),
    source_version: 'migration'
  })).filter(w => w.child_id);  // child_id 없는 행 제거

  console.log(`✅ 총 ${weeksData.length}개의 주차 발견`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN: 실제 삽입하지 않음');
    console.log(weeksData.slice(0, 5));
    return;
  }

  // 배치 삽입
  for (let i = 0; i < weeksData.length; i += BATCH_SIZE) {
    const batch = weeksData.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('weeks')
      .upsert(batch, {
        onConflict: 'child_id,week_start_date',
        ignoreDuplicates: false
      });

    if (insertError) throw insertError;
    console.log(`   진행: ${Math.min(i + BATCH_SIZE, weeksData.length)}/${weeksData.length}`);
  }

  console.log('✅ weeks 백필 완료');
}

// 3. habits 백필
async function backfillHabits() {
  console.log('\n📦 백필 시작: habits 테이블');

  const { data: oldData, error } = await supabase
    .from('habit_tracker')
    .select('*')
    .order('id');

  if (error) throw error;

  // weeks ID 매핑
  const { data: weeksData } = await supabase
    .from('weeks')
    .select('id, child_id, week_start_date')
    .order('week_start_date');

  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name');

  const childNameToId = new Map(
    childrenData.map(c => [c.name, c.id])
  );

  const weekKey = (childId, weekStart) => `${childId}_${weekStart}`;
  const weekMap = new Map(
    weeksData.map(w => [weekKey(w.child_id, w.week_start_date), w.id])
  );

  const habitsData = [];
  for (const row of oldData) {
    const childId = childNameToId.get(row.child_name);
    const weekId = weekMap.get(weekKey(childId, row.week_start_date));

    if (!weekId) continue;

    const habits = JSON.parse(row.habits || '[]');
    for (let i = 0; i < habits.length; i++) {
      habitsData.push({
        week_id: weekId,
        text: habits[i].text || habits[i],
        sort_order: i,
        color: habits[i].color || '#3B82F6',
        created_at: row.created_at || new Date().toISOString()
      });
    }
  }

  console.log(`✅ 총 ${habitsData.length}개의 습관 발견`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN: 실제 삽입하지 않음');
    console.log(habitsData.slice(0, 5));
    return;
  }

  // 배치 삽입
  for (let i = 0; i < habitsData.length; i += BATCH_SIZE) {
    const batch = habitsData.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('habits')
      .insert(batch);

    if (insertError) throw insertError;
    console.log(`   진행: ${Math.min(i + BATCH_SIZE, habitsData.length)}/${habitsData.length}`);
  }

  console.log('✅ habits 백필 완료');
}

// 4. completions 백필
async function backfillCompletions() {
  console.log('\n📦 백필 시작: completions 테이블');

  const { data: oldData, error } = await supabase
    .from('habit_tracker')
    .select('*')
    .order('id');

  if (error) throw error;

  // habits ID 매핑 (복잡하므로 JOIN 사용)
  const completionsData = [];

  for (const row of oldData) {
    const habits = JSON.parse(row.habits || '[]');

    for (let habitIdx = 0; habitIdx < habits.length; habitIdx++) {
      const habit = habits[habitIdx];
      const checks = habit.checks || [];

      for (let dayIdx = 0; dayIdx < checks.length; dayIdx++) {
        if (checks[dayIdx]) {
          // habit ID를 찾기 위해 쿼리 필요
          const { data: habitData } = await supabase
            .from('habits')
            .select('id')
            .eq('week_id', row.week_id)  // 이전 단계에서 매핑 필요
            .eq('sort_order', habitIdx)
            .single();

          if (habitData) {
            completionsData.push({
              habit_id: habitData.id,
              day_of_week: dayIdx,
              completed_at: calculateCompletionDate(row.week_start_date, dayIdx),
              created_at: row.created_at || new Date().toISOString()
            });
          }
        }
      }
    }
  }

  console.log(`✅ 총 ${completionsData.length}개의 완료 기록 발견`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN: 실제 삽입하지 않음');
    console.log(completionsData.slice(0, 5));
    return;
  }

  // 배치 삽입
  for (let i = 0; i < completionsData.length; i += BATCH_SIZE) {
    const batch = completionsData.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('completions')
      .insert(batch);

    if (insertError) throw insertError;
    console.log(`   진행: ${Math.min(i + BATCH_SIZE, completionsData.length)}/${completionsData.length}`);
  }

  console.log('✅ completions 백필 완료');
}

// 헬퍼 함수들
function calculateWeekEnd(weekStart) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  return date.toISOString().split('T')[0];
}

function calculateCompletionDate(weekStart, dayOfWeek) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOfWeek);
  return date.toISOString();
}

// 메인 실행
async function main() {
  console.log('🚀 백필 프로세스 시작');
  console.log(`⚙️  모드: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);

  try {
    await backfillChildren();
    await backfillWeeks();
    await backfillHabits();
    await backfillCompletions();

    console.log('\n✅ 모든 백필 완료!');
  } catch (error) {
    console.error('❌ 백필 오류:', error);
    process.exit(1);
  }
}

main();
```

**실행**:
```bash
# Dry run으로 먼저 테스트
node scripts/backfill.js --dry-run

# 실제 실행
node scripts/backfill.js
```

**완료 기준**:
- [ ] 백필 스크립트가 작성됨
- [ ] Dry run으로 테스트 완료
- [ ] 실제 백필 실행 완료 (데이터 이관 확인)

---

#### ✅ Task 2.2: 백필 검증 쿼리
**파일**: `scripts/validate-backfill.sql`

```sql
-- 1. children 개수 비교
SELECT
  '구 스키마' AS source,
  COUNT(DISTINCT child_name) AS count
FROM habit_tracker
UNION ALL
SELECT
  '신 스키마' AS source,
  COUNT(*) AS count
FROM children;

-- 2. weeks 개수 비교
SELECT
  '구 스키마' AS source,
  COUNT(*) AS count
FROM habit_tracker
UNION ALL
SELECT
  '신 스키마' AS source,
  COUNT(*) AS count
FROM weeks;

-- 3. habits 개수 비교
SELECT
  '구 스키마' AS source,
  SUM(jsonb_array_length(habits)) AS count
FROM habit_tracker
UNION ALL
SELECT
  '신 스키마' AS source,
  COUNT(*) AS count
FROM habits;

-- 4. completions 개수 비교
WITH old_completions AS (
  SELECT
    jsonb_array_elements(habits) AS habit,
    jsonb_array_length(jsonb_array_elements(habits)->'checks') AS check_count
  FROM habit_tracker
)
SELECT
  '구 스키마' AS source,
  SUM(check_count) AS count
FROM old_completions
UNION ALL
SELECT
  '신 스키마' AS source,
  COUNT(*) AS count
FROM completions;

-- 5. 샘플 데이터 비교
SELECT
  ht.child_name,
  ht.week_period,
  c.name,
  w.week_start_date,
  COUNT(h.id) AS habit_count
FROM habit_tracker ht
LEFT JOIN children c ON c.name = ht.child_name
LEFT JOIN weeks w ON w.child_id = c.id AND w.week_start_date = ht.week_start_date
LEFT JOIN habits h ON h.week_id = w.id
GROUP BY ht.child_name, ht.week_period, c.name, w.week_start_date
LIMIT 10;
```

**실행**:
```bash
npx supabase db query --file scripts/validate-backfill.sql
```

**완료 기준**:
- [ ] 구/신 스키마 데이터 개수가 일치함
- [ ] 샘플 데이터 비교 시 내용 일치 확인

---

### Day 5: Week 1 검증 및 문서화

#### ✅ Task 3.1: Week 1 데이터 무결성 검증
**체크리스트**:
- [ ] 7개 테이블 모두 생성됨
- [ ] 인덱스 생성 완료 (잠금 없음)
- [ ] RLS 정책 생성됨 (비활성화 상태)
- [ ] 백필 완료 (데이터 개수 일치)
- [ ] 외래 키 제약 조건 존재 (`NOT VALID` 상태)

#### ✅ Task 3.2: Week 1 회고 문서 작성
**파일**: `docs/phase0-week1-retrospective.md`

```markdown
# Phase 0 Week 1 회고

## 완료된 작업
- ✅ 섀도 스키마 생성 (7개 테이블)
- ✅ 인덱스 생성 (CONCURRENTLY)
- ✅ RLS 정책 생성 (비활성화)
- ✅ 백필 자동화 스크립트
- ✅ 데이터 이관 완료

## 데이터 통계
- 총 아이: XX명
- 총 주차: XX개
- 총 습관: XX개
- 총 완료 기록: XX개

## 이슈 및 해결
- (이슈가 있었다면 기록)

## 다음 주 계획
- 드리프트 검증 자동화
- 이중쓰기 준비
```

**완료 기준**:
- [ ] Week 1 회고 문서 작성 완료
- [ ] Git에 커밋 및 푸시

---

## Week 2: 검증 자동화 + 이중쓰기 준비

### Day 6-7: 드리프트 검증 자동화

**목표**: 구/신 스키마 간 데이터 불일치를 자동으로 감지

#### ✅ Task 4.1: 드리프트 검증 스크립트 작성
**파일**: `scripts/drift-detection.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function detectDrift() {
  console.log('🔍 드리프트 검증 시작...');
  const issues = [];

  // 1. children 개수 비교
  const { data: oldChildren } = await supabase
    .from('habit_tracker')
    .select('child_name', { count: 'exact', head: true });

  const { data: newChildren } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true });

  if (oldChildren.count !== newChildren.count) {
    issues.push({
      table: 'children',
      type: 'count_mismatch',
      old: oldChildren.count,
      new: newChildren.count
    });
  }

  // 2. weeks 개수 비교
  const { data: oldWeeks } = await supabase
    .from('habit_tracker')
    .select('*', { count: 'exact', head: true });

  const { data: newWeeks } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true });

  if (oldWeeks.count !== newWeeks.count) {
    issues.push({
      table: 'weeks',
      type: 'count_mismatch',
      old: oldWeeks.count,
      new: newWeeks.count
    });
  }

  // 3. 샘플 데이터 내용 비교
  const { data: sampleOld } = await supabase
    .from('habit_tracker')
    .select('*')
    .limit(10);

  for (const oldRow of sampleOld) {
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('name', oldRow.child_name)
      .single();

    if (!child) {
      issues.push({
        table: 'children',
        type: 'missing_data',
        child_name: oldRow.child_name
      });
      continue;
    }

    const { data: week } = await supabase
      .from('weeks')
      .select('*')
      .eq('child_id', child.id)
      .eq('week_start_date', oldRow.week_start_date)
      .single();

    if (!week) {
      issues.push({
        table: 'weeks',
        type: 'missing_data',
        child_name: oldRow.child_name,
        week_start_date: oldRow.week_start_date
      });
    } else if (week.theme !== oldRow.theme) {
      issues.push({
        table: 'weeks',
        type: 'data_mismatch',
        child_name: oldRow.child_name,
        week_start_date: oldRow.week_start_date,
        field: 'theme',
        old: oldRow.theme,
        new: week.theme
      });
    }
  }

  // 결과 출력
  if (issues.length === 0) {
    console.log('✅ 드리프트 없음 - 구/신 스키마 일치');
  } else {
    console.log(`❌ ${issues.length}개의 드리프트 발견:`);
    console.table(issues);
  }

  return issues;
}

// 메인 실행
detectDrift().catch(console.error);
```

**실행**:
```bash
node scripts/drift-detection.js
```

**완료 기준**:
- [ ] 드리프트 검증 스크립트 작성 완료
- [ ] 실행 시 드리프트 없음 확인

---

#### ✅ Task 4.2: 드리프트 검증 CI/CD 통합
**파일**: `.github/workflows/drift-detection.yml`

```yaml
name: Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다 실행
  workflow_dispatch:  # 수동 실행 가능

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run drift detection
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node scripts/drift-detection.js

      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Drift Detection Failed',
              body: '드리프트가 감지되었습니다. 즉시 확인해주세요.',
              labels: ['bug', 'high-priority']
            })
```

**완료 기준**:
- [ ] GitHub Actions 워크플로우 추가됨
- [ ] 수동 실행 테스트 완료
- [ ] 6시간마다 자동 실행 확인

---

### Day 8-9: 이중쓰기 준비

**목표**: Phase 1에서 사용할 이중쓰기 로직 준비

#### ✅ Task 5.1: Edge Function 스켈레톤 작성
**파일**: `supabase/functions/dual-write-habit/index.ts`

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

async function createWeekDualWrite(supabase: any, data: any) {
  // TODO: Phase 1에서 구현
  return new Response(
    JSON.stringify({ message: 'Not implemented yet' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
  );
}

async function updateHabitDualWrite(supabase: any, data: any) {
  // TODO: Phase 1에서 구현
  return new Response(
    JSON.stringify({ message: 'Not implemented yet' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
  );
}

async function toggleCompletionDualWrite(supabase: any, data: any) {
  // TODO: Phase 1에서 구현
  return new Response(
    JSON.stringify({ message: 'Not implemented yet' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
  );
}
```

**배포**:
```bash
npx supabase functions deploy dual-write-habit
```

**완료 기준**:
- [ ] Edge Function 스켈레톤 작성 완료
- [ ] Supabase에 배포 완료
- [ ] 호출 시 501 응답 확인 (아직 미구현)

---

#### ✅ Task 5.2: Database Trigger 스켈레톤 작성
**파일**: `supabase/migrations/004_create_dual_write_triggers.sql`

```sql
-- 이중쓰기 트리거 함수 (Edge Function 실패 시 백업용)
CREATE OR REPLACE FUNCTION sync_old_to_new()
RETURNS TRIGGER AS $$
BEGIN
  -- TODO: Phase 1에서 구현
  -- 지금은 로그만 남김
  RAISE NOTICE 'Trigger fired for table %, operation %', TG_TABLE_NAME, TG_OP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (아직 활성화하지 않음)
CREATE TRIGGER trigger_habit_tracker_dual_write
  AFTER INSERT OR UPDATE OR DELETE ON habit_tracker
  FOR EACH ROW
  EXECUTE FUNCTION sync_old_to_new();

-- ⚠️ 중요: 트리거는 생성되지만 함수가 아무것도 하지 않음
-- Phase 1에서 실제 로직 구현
```

**완료 기준**:
- [ ] 트리거 함수 스켈레톤 작성 완료
- [ ] 트리거 생성 완료 (아직 동작하지 않음)

---

### Day 10: Phase 0 최종 검증 및 승인

#### ✅ Task 6.1: Phase 0 완료 체크리스트

**인프라**:
- [ ] 7개 테이블 생성 완료
- [ ] 인덱스 생성 완료 (CONCURRENTLY)
- [ ] RLS 정책 생성 완료 (비활성화 상태)
- [ ] 외래 키 제약 조건 존재 (`NOT VALID`)

**데이터**:
- [ ] 백필 완료 (모든 데이터 이관)
- [ ] 데이터 개수 일치 확인
- [ ] 샘플 데이터 내용 일치 확인

**자동화**:
- [ ] 백필 스크립트 작성 완료
- [ ] 드리프트 검증 스크립트 작성 완료
- [ ] CI/CD 통합 완료 (6시간마다 자동 실행)

**이중쓰기 준비**:
- [ ] Edge Function 스켈레톤 배포 완료
- [ ] Database Trigger 스켈레톤 생성 완료

**문서화**:
- [ ] Week 1 회고 작성 완료
- [ ] Phase 0 회고 작성 완료

---

#### ✅ Task 6.2: Phase 0 회고 문서 작성
**파일**: `docs/phase0-retrospective.md`

```markdown
# Phase 0 회고: 준비 단계 완료

## 목표 달성도
- ✅ 섀도 스키마 구축 완료
- ✅ 데이터 백필 완료
- ✅ 검증 자동화 구축 완료
- ✅ 이중쓰기 준비 완료

## 주요 성과
1. **무중단 마이그레이션 준비 완료**: 프로덕션에 영향 없이 새 스키마 구축
2. **데이터 무결성 보장**: 백필 + 드리프트 검증으로 100% 일치 확인
3. **자동화 구축**: CI/CD로 6시간마다 자동 검증

## 데이터 통계
- 총 아이: XX명
- 총 주차: XX개
- 총 습관: XX개
- 총 완료 기록: XX개
- 백필 소요 시간: XX분
- 드리프트 검증 소요 시간: XX초

## 이슈 및 해결
### Issue 1: (이슈가 있었다면 기록)
**문제**: ...
**해결**: ...

## 다음 단계 (Phase 1)
- 이중쓰기 로직 구현
- 템플릿 기능 개발
- Feature Flag 설정

## 승인
- [ ] 기술 리드 승인
- [ ] PM 승인
- [ ] Phase 1 시작 가능
```

**완료 기준**:
- [ ] Phase 0 회고 작성 완료
- [ ] 팀 리뷰 및 승인 완료
- [ ] Phase 1 시작 준비 완료

---

## 🎯 Phase 0 완료 후 다음 단계

### Phase 1 Preview (4주)
1. **Week 1-2**: 이중쓰기 로직 구현 (Edge Function + Trigger)
2. **Week 3**: 템플릿 기능 개발 (신 스키마만 사용)
3. **Week 4**: Feature Flag 설정 및 내부 테스트 (5% 트래픽)

### 성공 기준
- ✅ 섀도 스키마가 프로덕션에 존재
- ✅ 백필로 데이터 100% 이관 완료
- ✅ 드리프트 검증 자동화 실행 중
- ✅ 이중쓰기 준비 완료 (스켈레톤)
- ✅ 프로덕션 다운타임 **0분**

---

## 📞 문제 발생 시

### 백필 실패
```bash
# 롤백
node scripts/rollback-backfill.js

# 로그 확인
npx supabase logs --type=postgres
```

### 드리프트 발견
```bash
# 수동 재백필
node scripts/backfill.js --force

# 특정 테이블만
node scripts/backfill.js --table=children
```

### 긴급 연락처
- 기술 리드: @tech-lead
- PM: @product-manager
- Supabase Support: support@supabase.com

---

**마지막 업데이트**: 2025-10-11
**작성자**: Claude Code (Phase 0 자동 생성)
