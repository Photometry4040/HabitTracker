# Phase 5.3 Advanced Reward Triggers - 테스트 가이드

**작성일:** 2025-10-27
**테스트 대상:** '아빠' 계정
**목적:** Phase 5.3 고급 보상 트리거 통합 검증

---

## 📋 테스트 체크리스트

### ✅ 사전 준비

- [ ] Supabase 마이그레이션 적용됨 (`20251027_012_phase5_advanced_reward_triggers.sql`)
- [ ] 브라우저 콘솔 열기 (개발자 도구 → Console)
- [ ] '아빠' 계정으로 로그인
- [ ] Child UUID 확인 (아래 스크립트 실행)

---

## 🔍 Step 0: '아빠' Child UUID 확인

### Supabase SQL Editor에서 실행:

```sql
-- '아빠' child의 UUID 조회
SELECT id, user_id, name, created_at
FROM children
WHERE name = '아빠'
ORDER BY created_at DESC
LIMIT 1;
```

**예상 결과:**
```
id: [UUID 복사 - 아래 테스트에서 사용]
user_id: [User UUID]
name: 아빠
```

**→ 실제 UUID: `55e4812d-605e-4570-aa41-338e17339d64`**

---

## 🎯 Test 1: `first_weakness_resolved` (첫 약점 극복)

### 테스트 시나리오
1. Learning Mode → Weaknesses 탭 이동
2. 새 약점 등록:
   - **약점 내용:** "테스트용 약점 - Phase 5.3 검증"
   - **원인:** 개념 이해 부족
   - **개선 계획:** "내일 복습하기"
3. "해결" 버튼 클릭
4. 브라우저 콘솔 확인

### 예상 콘솔 출력
```javascript
✅ Learning mode 약점이 해결되었습니다! 🎉
🎉 First weakness resolved achievement unlocked!
```

### 데이터베이스 검증 (Supabase SQL Editor)

```sql
-- 1. progress_events 확인
SELECT
  event_type,
  payload,
  reward_issued,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'first_weakness_resolved'
ORDER BY occurred_at DESC;
```

**예상 결과:**
- event_type: `first_weakness_resolved`
- reward_issued: `false` (처음에는)
- payload: `{"weakness_id": "..."}`

```sql
-- 2. 보상 정의 확인
SELECT name, description, icon, trigger_event
FROM reward_definitions
WHERE trigger_event = 'first_weakness_resolved';
```

**예상 결과:**
```
name: 극복자 배지
description: 첫 약점 극복! 포기하지 않는 당신은 멋져요! 💪
icon: 💪
trigger_event: first_weakness_resolved
```

### ✅ 테스트 결과
- [ ] 콘솔에 achievement 메시지 출력됨
- [ ] progress_events에 레코드 생성됨
- [ ] reward_definitions에 보상 정의 존재

---

## 🎯 Test 2: `weekly_planner_perfect` (완벽한 주간 계획)

### 테스트 시나리오

**2-1. 주간 계획 생성**
1. Weekly Planner 탭 이동
2. "새 주간 계획" 클릭
3. 계획 정보 입력:
   - **제목:** "Phase 5.3 테스트 주간 계획"
   - **설명:** "100% 완료 테스트용"
4. 저장

**2-2. 일일 태스크 추가 (7일 달력 뷰)**
1. 월요일 태스크 추가:
   - 제목: "테스트 태스크 1"
   - 우선순위: 1 (긴급)
   - 예상 시간: 30분
2. 화요일 태스크 추가:
   - 제목: "테스트 태스크 2"
   - 우선순위: 3 (보통)
   - 예상 시간: 1시간

**2-3. 모든 태스크 완료**
1. 각 태스크의 체크박스 클릭 (완료 표시)
2. 완료된 태스크 2개 / 총 2개 → 100%

**2-4. 주간 계획 완료**
1. "계획 완료" 버튼 클릭
2. 회고 작성:
   - **성과:** "모든 태스크 완료!"
   - **어려웠던 점:** "없음"
   - **다음 주 계획:** "더 많은 태스크 추가"
3. 저장

### 예상 콘솔 출력
```javascript
✅ 주간 계획이 완료되었습니다!
✅ Completion rate: 100%
🎉 Weekly planner perfect achievement unlocked!
```

### 데이터베이스 검증

```sql
-- 1. 주간 계획 진행률 확인
SELECT
  id,
  title,
  status,
  (SELECT COUNT(*) FROM daily_plan_items WHERE weekly_plan_id = wp.id) as total_tasks,
  (SELECT COUNT(*) FROM daily_plan_items WHERE weekly_plan_id = wp.id AND completed = true) as completed_tasks
FROM weekly_plans wp
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND title LIKE '%Phase 5.3%'
ORDER BY created_at DESC;
```

**예상 결과:** `completed_tasks = total_tasks` (100%)

```sql
-- 2. progress_events 확인
SELECT
  event_type,
  payload->>'weekly_plan_id' as plan_id,
  payload->>'completion_rate' as rate,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'weekly_planner_perfect'
ORDER BY occurred_at DESC;
```

**예상 결과:**
- completion_rate: `100`
- weekly_plan_id: [주간 계획 UUID]

### ✅ 테스트 결과
- [ ] 100% 완료 시 콘솔 메시지 출력됨
- [ ] progress_events에 레코드 생성됨
- [ ] completion_rate = 100 확인

---

## 🎯 Test 3: `streak_21` (21일 연속)

### 테스트 시나리오

**⚠️ 주의:** 21일 연속 데이터가 필요하므로 실제 테스트는 어렵습니다.
**대안:** 시뮬레이션 데이터로 테스트

### 시뮬레이션 방법

**3-1. 과거 데이터 생성 (SQL로 직접 삽입)**

```sql
-- Step 1: 3주치 weeks 생성
DO $$
DECLARE
  v_child_id UUID := '55e4812d-605e-4570-aa41-338e17339d64';
  v_user_id UUID := (SELECT user_id FROM children WHERE id = v_child_id);
  v_week_id UUID;
  v_habit_id UUID;
  v_week_start DATE;
  i INTEGER;
  j INTEGER;
BEGIN
  -- 3주 생성 (과거 → 현재)
  FOR i IN 0..2 LOOP
    v_week_start := CURRENT_DATE - (21 - i*7);
    v_week_start := v_week_start - EXTRACT(DOW FROM v_week_start)::INTEGER + 1; -- 월요일로 조정

    -- Week 생성 (week_end_date는 week_start_date + 6일)
    INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme)
    VALUES (v_user_id, v_child_id, v_week_start, v_week_start + 6, 'streak_test')
    RETURNING id INTO v_week_id;

    -- Habit 생성 (동일 이름)
    INSERT INTO habits (week_id, name, display_order)
    VALUES (v_week_id, '21일 연속 테스트 습관', 1)
    RETURNING id INTO v_habit_id;

    -- 7일치 records 생성 (모두 green)
    FOR j IN 0..6 LOOP
      INSERT INTO habit_records (habit_id, record_date, status)
      VALUES (v_habit_id, v_week_start + j, 'green');
    END LOOP;
  END LOOP;
END $$;
```

**3-2. 21일째 기록 추가 (UI에서)**
1. 습관 추적 화면으로 이동
2. "21일 연속 테스트 습관" 찾기
3. 오늘 날짜에 green 클릭
4. 콘솔 확인

### 예상 콘솔 출력
```javascript
[Streak Check] 21일 연속 테스트 습관: 21 days total, 21 green days
✅ streak_21 achievement recorded for 아빠
```

### 데이터베이스 검증

```sql
-- Streak 확인
SELECT
  h.name,
  COUNT(hr.id) as total_records,
  MIN(hr.record_date) as first_record,
  MAX(hr.record_date) as last_record
FROM habits h
JOIN habit_records hr ON hr.habit_id = h.id
JOIN weeks w ON w.id = h.week_id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name = '21일 연속 테스트 습관'
GROUP BY h.name;
```

**예상 결과:** `total_records >= 21`

```sql
-- progress_events 확인
SELECT
  event_type,
  payload->>'habit_id' as habit_id,
  payload->>'streak_count' as streak_count,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'streak_21'
ORDER BY occurred_at DESC;
```

### ✅ 테스트 결과
- [ ] Streak 계산 로직 작동 (콘솔 로그)
- [ ] 21일 이상 시 progress_event 생성
- [ ] habit_id가 payload에 포함됨

---

## 🎯 Test 4: `habit_mastery` (30일 green 마스터)

### 테스트 시나리오

**⚠️ 주의:** 30일 연속 green 데이터 필요
**대안:** 시뮬레이션 데이터로 테스트

### 시뮬레이션 방법

```sql
-- Step 1: 5주치 데이터 생성 (30일 green)
DO $$
DECLARE
  v_child_id UUID := '55e4812d-605e-4570-aa41-338e17339d64';
  v_user_id UUID := (SELECT user_id FROM children WHERE id = v_child_id);
  v_week_id UUID;
  v_habit_id UUID;
  v_week_start DATE;
  i INTEGER;
  j INTEGER;
BEGIN
  -- 5주 생성
  FOR i IN 0..4 LOOP
    v_week_start := CURRENT_DATE - (35 - i*7);
    v_week_start := v_week_start - EXTRACT(DOW FROM v_week_start)::INTEGER + 1;

    INSERT INTO weeks (user_id, child_id, week_start_date, week_end_date, theme)
    VALUES (v_user_id, v_child_id, v_week_start, v_week_start + 6, 'mastery_test')
    RETURNING id INTO v_week_id;

    INSERT INTO habits (week_id, name, display_order)
    VALUES (v_week_id, '30일 마스터리 테스트', 1)
    RETURNING id INTO v_habit_id;

    -- 7일치 모두 green
    FOR j IN 0..6 LOOP
      INSERT INTO habit_records (habit_id, record_date, status)
      VALUES (v_habit_id, v_week_start + j, 'green');
    END LOOP;
  END LOOP;
END $$;
```

### 예상 콘솔 출력
```javascript
[Streak Check] 30일 마스터리 테스트: 35 days total, 35 green days
✅ habit_mastery achievement recorded for 아빠
```

### 데이터베이스 검증

```sql
-- Green streak 확인
SELECT
  h.name,
  COUNT(CASE WHEN hr.status = 'green' THEN 1 END) as green_count,
  COUNT(hr.id) as total_count
FROM habits h
JOIN habit_records hr ON hr.habit_id = h.id
JOIN weeks w ON w.id = h.week_id
WHERE w.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND h.name = '30일 마스터리 테스트'
GROUP BY h.name;
```

**예상 결과:** `green_count >= 30`

```sql
-- progress_events 확인
SELECT
  event_type,
  payload->>'habit_id' as habit_id,
  payload->>'green_days' as green_days,
  occurred_at
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type = 'habit_mastery'
ORDER BY occurred_at DESC;
```

### ✅ 테스트 결과
- [ ] Green streak 계산 로직 작동
- [ ] 30일 이상 시 progress_event 생성
- [ ] green_days가 payload에 포함됨

---

## 📊 종합 검증 쿼리

### 모든 progress_events 확인

```sql
-- '아빠' 계정의 모든 진행 이벤트
SELECT
  pe.event_type,
  pe.payload,
  pe.reward_issued,
  pe.occurred_at,
  rd.name as reward_name,
  rd.description as reward_description,
  rd.icon
FROM progress_events pe
LEFT JOIN reward_definitions rd ON rd.trigger_event = pe.event_type
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
ORDER BY pe.occurred_at DESC;
```

### 모든 보상 정의 확인 (Phase 5.3)

```sql
-- 신규 4개 보상 확인
SELECT
  name,
  trigger_event,
  reward_type,
  description,
  icon,
  color,
  is_active
FROM reward_definitions
WHERE trigger_event IN (
  'streak_21',
  'first_weakness_resolved',
  'habit_mastery',
  'weekly_planner_perfect'
)
ORDER BY trigger_event;
```

**예상 결과:** 4개 행

### 중복 방지 확인

```sql
-- 같은 이벤트가 여러 번 기록되지 않았는지 확인
SELECT
  child_id,
  event_type,
  COUNT(*) as event_count,
  array_agg(occurred_at ORDER BY occurred_at) as timestamps
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND event_type IN ('first_weakness_resolved', 'weekly_planner_perfect')
GROUP BY child_id, event_type
HAVING COUNT(*) > 1;
```

**예상 결과:** 0개 행 (중복 없음)

---

## 🐛 알려진 이슈 및 해결방법

### Issue 1: Streak 계산이 안 됨

**증상:** 콘솔에 `[Streak Check] No records found` 출력

**원인:**
1. 60일 이상 오래된 데이터
2. 습관 이름이 주마다 다름
3. 데이터가 정말 없음

**해결:**
```javascript
// 브라우저 콘솔에서 수동 테스트
import { getHabitRecordsForStreak } from './src/lib/streak-calculator.js'

// habit ID 확인 (SQL Editor)
SELECT id, name FROM habits WHERE week_id = (
  SELECT id FROM weeks WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  ORDER BY week_start_date DESC LIMIT 1
);

// 콘솔에서 실행 (위 SQL로 조회한 habit ID 사용)
const records = await getHabitRecordsForStreak('여기에-실제-habit-UUID-입력')
console.log('Records:', records.length)
```

### Issue 2: progress_event는 생성되는데 reward가 안 보임

**증상:** `progress_events` 테이블에는 있는데 UI에 표시 안 됨

**원인:**
- Reward notification UI가 아직 구현되지 않음
- `rewards_ledger`에 자동 삽입이 안 됨 (수동 처리 필요)

**해결:**
```sql
-- 수동으로 rewards_ledger에 삽입
INSERT INTO rewards_ledger (
  user_id,
  child_id,
  reward_id,
  source_event_id
)
SELECT
  pe.user_id,
  pe.child_id,
  rd.id,
  pe.id
FROM progress_events pe
JOIN reward_definitions rd ON rd.trigger_event = pe.event_type
WHERE pe.child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND pe.reward_issued = false
  AND rd.is_active = true
ON CONFLICT (child_id, reward_id, source_event_id) DO NOTHING;

-- reward_issued 플래그 업데이트
UPDATE progress_events
SET reward_issued = true
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
  AND reward_issued = false;
```

### Issue 3: 같은 트리거가 여러 번 발생

**증상:** `progress_events`에 동일한 이벤트가 여러 개

**원인:**
- 중복 방지 로직 실패
- 다른 habit_id로 기록됨 (정상일 수 있음)

**해결:**
```sql
-- 중복 확인
SELECT
  event_type,
  payload,
  COUNT(*) as duplicates
FROM progress_events
WHERE child_id = '55e4812d-605e-4570-aa41-338e17339d64'
GROUP BY event_type, payload
HAVING COUNT(*) > 1;
```

---

## ✅ 최종 체크리스트

### Phase 5.3 기능 검증

- [ ] **데이터베이스**
  - [ ] 마이그레이션 적용됨 (13개 트리거 타입)
  - [ ] 4개 보상 정의 존재
  - [ ] CHECK constraints 작동

- [ ] **first_weakness_resolved**
  - [ ] UI 통합 완료 (WeaknessLogger)
  - [ ] 이벤트 생성 확인
  - [ ] 중복 방지 작동

- [ ] **weekly_planner_perfect**
  - [ ] UI 통합 완료 (WeeklyPlanEditor)
  - [ ] 100% 완료 시에만 트리거
  - [ ] progress 조회 정상

- [ ] **streak_21**
  - [ ] Cross-week 데이터 로딩 작동
  - [ ] 21일 연속 감지
  - [ ] habit_id 저장 확인

- [ ] **habit_mastery**
  - [ ] Green streak 계산 정확
  - [ ] 30일 연속 green 감지
  - [ ] Non-green 시 리셋 확인

### 코드 품질

- [ ] 린트 에러 없음
- [ ] 콘솔 에러 없음
- [ ] 비동기 실행 (UI 차단 없음)
- [ ] 에러 핸들링 적절

### 성능

- [ ] 60일 윈도우 작동
- [ ] 쿼리 속도 양호 (< 1초)
- [ ] RLS 필터링 작동
- [ ] 인덱스 활용 확인

---

## 📝 테스트 결과 기록

### 테스트 일시
- **날짜:** _______________
- **시간:** _______________
- **테스터:** '아빠' 계정

### 발견된 문제
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### 개선 제안
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### 전체 평가
- [ ] 모든 기능 정상 작동
- [ ] 일부 기능 문제 있음 (위 기록 참조)
- [ ] 주요 기능 작동 안 함 (긴급 수정 필요)

---

## 🎉 완료!

이 가이드를 따라 테스트하시고, 내일 결과를 공유해주세요!

**문제가 발견되면:**
1. 콘솔 에러 메시지 캡처
2. 해당 SQL 쿼리 결과 복사
3. 재현 단계 기록

**모든 것이 정상이면:**
- Phase 5.3 완전 검증 완료! 🚀
- 다음 단계(템플릿 UI, Edge Function 등) 진행 가능

---

**생성일:** 2025-10-27
**Phase:** 5.3 Advanced Reward Triggers
**상태:** 테스트 대기 중
