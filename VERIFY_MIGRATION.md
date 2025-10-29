# 🔍 Migration Verification & Troubleshooting

현재 상태:
- ✅ `mandala_nodes` 테이블 생성 완료
- ⚠️ 데이터 마이그레이션 미완료 (chart에 3개 노드 있으나 테이블에 0개)

---

## 1️⃣ 먼저 확인: 마이그레이션 함수 실행 여부

```sql
-- 1. mandala_charts 테이블의 실제 데이터 확인
SELECT
  id,
  center_goal,
  nodes,
  jsonb_array_length(nodes) as node_count
FROM mandala_charts
WHERE id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1';
```

**예상 결과**: `nodes` JSONB 배열에 3개 객체가 있어야 함

---

## 2️⃣ 마이그레이션 함수 수동 실행

마이그레이션 스크립트의 `DO $$` 블록이 실행되지 않았을 수 있습니다.
함수를 직접 호출해보세요:

```sql
-- 마이그레이션 함수 직접 실행
SELECT * FROM migrate_mandala_jsonb_to_nodes();
```

**예상 출력**:
```
chart_id                              | nodes_migrated | success | error_message
9b7b16cc-cd8a-49e8-9590-d510e95a4ce1  | 3             | true    | NULL
```

만약 `success = false`가 나오면 `error_message` 컬럼을 확인하세요.

---

## 3️⃣ 수동 마이그레이션 (대안)

함수가 실패한다면, 직접 INSERT로 마이그레이션:

```sql
-- 특정 차트의 노드를 수동으로 마이그레이션
DO $$
DECLARE
  chart_rec RECORD;
  node_rec RECORD;
BEGIN
  -- 차트 정보 가져오기
  SELECT id, user_id, nodes
  INTO chart_rec
  FROM mandala_charts
  WHERE id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1';

  -- 각 노드 삽입
  FOR node_rec IN
    SELECT
      (value->>'position')::integer as pos,
      value->>'title' as title,
      COALESCE(value->>'color', '#3B82F6') as color,
      value->>'emoji' as emoji,
      (value->>'goal_id')::uuid as goal_id,
      COALESCE((value->>'completed')::boolean, false) as completed,
      COALESCE((value->>'completion_rate')::numeric, 0) as comp_rate
    FROM jsonb_array_elements(chart_rec.nodes)
  LOOP
    INSERT INTO mandala_nodes (
      user_id,
      mandala_chart_id,
      parent_node_id,
      level,
      node_position,
      title,
      color,
      emoji,
      goal_id,
      completed,
      completion_rate,
      expanded
    ) VALUES (
      chart_rec.user_id,
      chart_rec.id,
      NULL,
      1,
      node_rec.pos,
      node_rec.title,
      node_rec.color,
      node_rec.emoji,
      node_rec.goal_id,
      node_rec.completed,
      node_rec.comp_rate,
      false
    );

    RAISE NOTICE 'Inserted node: position=%, title=%', node_rec.pos, node_rec.title;
  END LOOP;
END $$;
```

---

## 4️⃣ 마이그레이션 후 재확인

```sql
-- 1. mandala_nodes 테이블 확인
SELECT
  id,
  mandala_chart_id,
  level,
  node_position,
  title,
  color,
  emoji,
  completed,
  completion_rate
FROM mandala_nodes
WHERE mandala_chart_id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1'
ORDER BY node_position;
```

**예상**: 3개 행 반환 (position 1, 2, 3 등)

```sql
-- 2. 검증 쿼리 재실행
SELECT
  mc.id,
  mc.center_goal,
  jsonb_array_length(mc.nodes) as jsonb_count,
  COUNT(mn.id) as table_count,
  jsonb_array_length(mc.nodes) = COUNT(mn.id) as match
FROM mandala_charts mc
LEFT JOIN mandala_nodes mn ON mn.mandala_chart_id = mc.id
WHERE mc.id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1'
GROUP BY mc.id, mc.center_goal, mc.nodes;
```

**예상**: `match = true`

---

## 5️⃣ 문제 해결 체크리스트

### A. JSONB 데이터 구조 확인

```sql
-- nodes 배열의 첫 번째 요소 상세 확인
SELECT
  center_goal,
  jsonb_array_length(nodes) as count,
  nodes->0 as first_node
FROM mandala_charts
WHERE id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1';
```

**확인사항**:
- `position` 키가 존재하는가?
- `title` 키가 존재하는가?
- 값이 문자열로 저장되어 있는가? (숫자여야 함)

### B. User ID 확인

```sql
-- 현재 로그인한 사용자 확인
SELECT auth.uid() as current_user;

-- 차트의 user_id 확인
SELECT user_id, center_goal
FROM mandala_charts
WHERE id = '9b7b16cc-cd8a-49e8-9590-d510e95a4ce1';
```

**문제**: RLS 정책 때문에 다른 사용자의 데이터를 마이그레이션할 수 없음

**해결**: RLS를 일시적으로 비활성화하고 마이그레이션:

```sql
-- RLS 일시 비활성화 (관리자만 가능)
ALTER TABLE mandala_nodes DISABLE ROW LEVEL SECURITY;

-- 마이그레이션 실행
SELECT * FROM migrate_mandala_jsonb_to_nodes();

-- RLS 재활성화
ALTER TABLE mandala_nodes ENABLE ROW LEVEL SECURITY;
```

### C. 함수 실행 권한 확인

```sql
-- 함수 존재 확인
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'migrate_mandala_jsonb_to_nodes';
```

**예상**: 함수 정의가 반환되어야 함

---

## 6️⃣ 가장 간단한 해결 방법

위 방법들이 복잡하다면, **Step 3의 수동 마이그레이션**을 사용하세요.

1. 차트 ID를 확인 (`9b7b16cc-cd8a-49e8-9590-d510e95a4ce1`)
2. 위의 "3️⃣ 수동 마이그레이션" SQL 코드 복사
3. Supabase SQL Editor에 붙여넣기
4. 실행

---

## 📊 현재 상태 요약

```
Chart ID: 9b7b16cc-cd8a-49e8-9590-d510e95a4ce1
Center Goal: 코딩실력향상
JSONB Nodes: 3개
Table Nodes: 0개 ❌
Status: 마이그레이션 필요
```

**권장 조치**: 위의 2️⃣ 또는 3️⃣ 방법으로 마이그레이션 실행

---

**작성일**: 2025-10-29
**목적**: 마이그레이션 실패 원인 진단 및 해결
