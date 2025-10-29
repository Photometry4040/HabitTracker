# Phase 5.4: 81칸 Mandala 확장 - Migration Guide

**작성일**: 2025-10-29
**상태**: 🔄 Migration Required
**목표**: JSONB 기반 Mandala → 정규화된 `mandala_nodes` 테이블 + 81칸 지원

---

## 📋 개요

Phase 5.4는 만다라트 차트를 81칸까지 확장할 수 있도록 데이터베이스 구조를 개선합니다.

### 주요 변경사항

1. **새 테이블**: `mandala_nodes` (정규화된 노드 테이블)
2. **3단계 계층**: Level 1 (9칸) → Level 2 (27칸) → Level 3 (81칸)
3. **재귀 쿼리**: 계층 구조 조회를 위한 헬퍼 함수 3개
4. **데이터 마이그레이션**: 기존 JSONB 데이터 → 새 테이블

---

## 🎯 마이그레이션 단계

### Step 1: 데이터베이스 마이그레이션 실행

Supabase SQL Editor에서 다음 2개 파일을 **순서대로** 실행하세요:

#### 1.1. mandala_nodes 테이블 생성

**파일**: `supabase/migrations/20251029_001_phase5_4_mandala_nodes_table.sql`

```sql
-- Supabase SQL Editor에서 전체 파일 내용 복사 후 실행
```

**생성되는 항목**:
- ✅ `mandala_nodes` 테이블 (UUID PK, 계층 구조)
- ✅ 4개 인덱스 (차트별, 부모별, 목표별, 사용자별)
- ✅ RLS 정책 4개 (SELECT, INSERT, UPDATE, DELETE)
- ✅ 헬퍼 함수 3개:
  - `get_node_hierarchy(node_id)` - 노드의 상위 계층 경로
  - `get_child_nodes(node_id)` - 직속 자식 노드
  - `get_all_descendants(node_id)` - 모든 하위 노드 (재귀)
- ✅ `mandala_charts` 테이블 업데이트:
  - `chart_level` CHECK: `'expanded_81'` 추가
  - `max_level` 컬럼 추가 (1-3)

#### 1.2. JSONB 데이터 마이그레이션

**파일**: `supabase/migrations/20251029_002_phase5_4_migrate_jsonb_to_nodes.sql`

```sql
-- Supabase SQL Editor에서 전체 파일 내용 복사 후 실행
```

**실행 내용**:
- ✅ 기존 `mandala_charts.nodes` (JSONB) → `mandala_nodes` 테이블로 복사
- ✅ 모든 노드 level 1로 설정 (기존은 9칸 구조)
- ✅ `parent_node_id` = NULL (중앙 목표 주변 노드)
- ✅ `goal_id` UUID 유효성 검사
- ✅ 마이그레이션 결과 통계 출력

**예상 출력**:
```
========================================
Starting JSONB to mandala_nodes migration...
========================================
✅ Chart 123e4567-... migrated: 8 nodes
✅ Chart 987fcdeb-... migrated: 6 nodes
========================================
Migration Summary:
Total charts processed: 2
Successful: 2
Failed: 0
Total nodes migrated: 14
========================================
```

---

### Step 2: 마이그레이션 검증

Supabase SQL Editor에서 다음 쿼리로 결과 확인:

```sql
-- 1. mandala_nodes 테이블 생성 확인
SELECT COUNT(*) as total_nodes,
       COUNT(DISTINCT mandala_chart_id) as total_charts
FROM mandala_nodes
WHERE is_active = true;

-- 2. 레벨별 노드 수 확인
SELECT level, COUNT(*) as node_count
FROM mandala_nodes
WHERE is_active = true
GROUP BY level
ORDER BY level;
-- 예상 결과: level 1만 존재 (기존 노드들)

-- 3. JSONB vs 테이블 노드 수 비교
SELECT
  mc.id as chart_id,
  mc.center_goal,
  jsonb_array_length(mc.nodes) as jsonb_count,
  COUNT(mn.id) as table_count,
  jsonb_array_length(mc.nodes) = COUNT(mn.id) as match
FROM mandala_charts mc
LEFT JOIN mandala_nodes mn ON mn.mandala_chart_id = mc.id AND mn.level = 1
WHERE mc.nodes IS NOT NULL
GROUP BY mc.id, mc.center_goal, mc.nodes;
-- 예상: match 컬럼이 모두 true

-- 4. 헬퍼 함수 테스트 (특정 노드 ID로)
SELECT * FROM get_child_nodes('your-node-id-here');
SELECT * FROM get_all_descendants('your-node-id-here');

-- 5. RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'mandala_nodes';
-- 예상: 4개 정책 (SELECT, INSERT, UPDATE, DELETE)
```

---

### Step 3: 프론트엔드 확인

마이그레이션 후 애플리케이션 동작 확인:

1. **Learning Mode 진입**
   - 아이 선택 → Learning Mode 버튼 클릭
   - Mandala 탭 클릭

2. **기존 차트 조회**
   - 기존 만다라트 차트 목록이 정상적으로 표시되는지 확인
   - 각 차트의 노드가 올바르게 표시되는지 확인

3. **새 차트 생성**
   - "새 만다라트" 버튼으로 차트 생성
   - 노드 추가/수정/삭제 테스트

4. **브라우저 콘솔 확인**
   - 에러 메시지가 없는지 확인
   - ✅ "Node created:", "Node updated:" 등의 로그 확인

---

## 🔄 롤백 절차 (문제 발생 시)

마이그레이션 중 문제가 발생하면 다음 순서로 롤백:

### Option 1: 테이블만 삭제 (데이터 보존)

```sql
-- mandala_nodes 테이블 삭제 (JSONB 데이터는 보존됨)
DROP TABLE IF EXISTS mandala_nodes CASCADE;

-- mandala_charts 테이블 원복
ALTER TABLE mandala_charts
DROP COLUMN IF EXISTS max_level;

ALTER TABLE mandala_charts
DROP CONSTRAINT IF EXISTS mandala_charts_chart_level_check;

ALTER TABLE mandala_charts
ADD CONSTRAINT mandala_charts_chart_level_check
CHECK (chart_level IN ('basic', 'expanded_27'));

-- 헬퍼 함수 삭제
DROP FUNCTION IF EXISTS get_node_hierarchy(UUID);
DROP FUNCTION IF EXISTS get_child_nodes(UUID);
DROP FUNCTION IF EXISTS get_all_descendants(UUID);
DROP FUNCTION IF EXISTS migrate_mandala_jsonb_to_nodes();
```

### Option 2: 전체 재설정 (신중히!)

```sql
-- ⚠️ WARNING: 모든 만다라트 데이터가 삭제됩니다!
DROP TABLE IF EXISTS mandala_nodes CASCADE;
-- 이후 Option 1의 mandala_charts 원복 쿼리 실행
```

---

## 📊 데이터 구조 비교

### Before (JSONB)
```json
{
  "nodes": [
    {
      "position": 1,
      "title": "수학 공부",
      "color": "#10B981",
      "emoji": "📚",
      "goal_id": "uuid",
      "completed": false,
      "completion_rate": 50,
      "expanded": false
    }
  ]
}
```

### After (Normalized Table)
```sql
-- mandala_nodes 테이블
| id   | mandala_chart_id | parent_node_id | level | position | title      | color    | emoji | goal_id | completed | completion_rate | expanded |
|------|------------------|----------------|-------|----------|------------|----------|-------|---------|-----------|-----------------|----------|
| uuid | chart-uuid       | NULL           | 1     | 1        | 수학 공부  | #10B981  | 📚    | g-uuid  | false     | 50              | false    |
```

---

## 🎨 새로운 기능 (마이그레이션 후 사용 가능)

### 1. 노드 확장 (Expand)

기존 노드를 클릭하여 8개의 하위 노드로 확장 가능:

```javascript
import { expandNode } from '@/lib/mandala-nodes.js'

// Level 1 노드를 Level 2로 확장 (8개 자식 생성)
await expandNode(nodeId, [
  { title: '세부목표 1', color: '#3B82F6' },
  { title: '세부목표 2', color: '#10B981' },
  // ... 8개까지
])
```

### 2. 계층 구조 조회

특정 노드의 전체 계층 경로 조회:

```javascript
import { getMandalaNodes, getChildNodes } from '@/lib/mandala-nodes.js'

// 차트의 모든 노드 (계층 구조)
const { nodes, levelCounts } = await getMandalaNodes(chartId, maxLevel = 3)
// nodes: 트리 구조 (children 배열 포함)
// levelCounts: { level1: 8, level2: 16, level3: 0 }

// 특정 노드의 직속 자식들
const children = await getChildNodes(parentNodeId)
```

### 3. 진행률 자동 계산

하위 노드의 진행률이 부모 노드에 자동 반영:

```javascript
import { recalculateChartCompletion } from '@/lib/mandala-nodes.js'

// 전체 차트 진행률 재계산 (bottom-up)
const stats = await recalculateChartCompletion(chartId)
// { overall: 75, level1Avg: 75, level2Avg: 80, level3Avg: 70 }
```

---

## 🐛 트러블슈팅

### 문제 1: "function get_child_nodes does not exist"

**원인**: 헬퍼 함수가 생성되지 않았습니다.

**해결**:
```sql
-- 20251029_001_phase5_4_mandala_nodes_table.sql 파일을 다시 실행
```

### 문제 2: "duplicate key value violates unique constraint"

**원인**: 같은 position에 중복 노드가 생성됨.

**해결**:
```sql
-- 중복 노드 확인
SELECT mandala_chart_id, parent_node_id, level, position, COUNT(*)
FROM mandala_nodes
GROUP BY mandala_chart_id, parent_node_id, level, position
HAVING COUNT(*) > 1;

-- 중복 노드 삭제 (최신 것만 남기고)
DELETE FROM mandala_nodes
WHERE id NOT IN (
  SELECT DISTINCT ON (mandala_chart_id, parent_node_id, level, position) id
  FROM mandala_nodes
  ORDER BY mandala_chart_id, parent_node_id, level, position, created_at DESC
);
```

### 문제 3: 프론트엔드에서 노드가 표시되지 않음

**원인**: 아직 구 API 함수를 사용 중입니다.

**해결**: 컴포넌트에서 새 API 임포트 확인
```javascript
// ❌ OLD (JSONB 기반)
import { getMandalaChart } from '@/lib/learning-mode.js'

// ✅ NEW (mandala_nodes 테이블 기반)
import { getMandalaNodes } from '@/lib/mandala-nodes.js'
```

---

## ✅ 마이그레이션 체크리스트

- [ ] **Step 1.1**: `20251029_001` SQL 파일 실행 완료
- [ ] **Step 1.2**: `20251029_002` SQL 파일 실행 완료
- [ ] **Step 2**: 검증 쿼리 5개 실행 → 모두 정상
- [ ] **Step 3**: 프론트엔드 동작 확인 → 에러 없음
- [ ] **백업**: 기존 JSONB 데이터 백업 (선택 사항)

---

## 📚 관련 파일

- **Migration Files**:
  - `supabase/migrations/20251029_001_phase5_4_mandala_nodes_table.sql`
  - `supabase/migrations/20251029_002_phase5_4_migrate_jsonb_to_nodes.sql`

- **API Files**:
  - `src/lib/mandala-nodes.js` (NEW - 81칸 지원)
  - `src/lib/learning-mode.js` (기존 JSONB 함수 - 하위 호환)

- **Component Files** (업데이트 예정):
  - `src/components/Mandala/MandalaChart.jsx`

---

## 🎓 Next Steps (마이그레이션 후)

1. **UI 컴포넌트 업데이트**: MandalaChart.jsx에 81칸 확장 UI 추가
2. **Expand 버튼**: Level 1/2 노드에 "확장" 버튼 추가
3. **계층 뷰**: 3단계 계층 구조를 시각적으로 표현
4. **테스트**: 실제 사용자 데이터로 81칸까지 확장 테스트

---

**Status**: ✅ **Migration Guide Complete**
**Next**: UI Component Update for 81칸 Expansion

---

**Last Updated**: 2025-10-29
**Author**: Claude Code
