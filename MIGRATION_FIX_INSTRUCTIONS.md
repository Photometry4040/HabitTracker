# 🔧 Phase 5.4 Migration Fix Instructions

**문제**: `position`은 PostgreSQL 예약어이므로 컬럼명으로 사용 불가
**해결**: `position` → `node_position`으로 변경

---

## ✅ 수정된 마이그레이션 파일

기존 파일 대신 **FIXED 버전**을 사용하세요:

### 1. 첫 번째 마이그레이션 (테이블 생성)
**파일**: `supabase/migrations/20251029_001_phase5_4_mandala_nodes_table_fixed.sql`

**변경사항**:
- ✅ `position INTEGER` → `node_position INTEGER`
- ✅ 함수 RETURNS TABLE에 quoted identifiers 추가: `"node_position"`
- ✅ UNIQUE 제약조건 업데이트

### 2. 두 번째 마이그레이션 (데이터 마이그레이션)
**파일**: `supabase/migrations/20251029_002_phase5_4_migrate_jsonb_to_nodes_fixed.sql`

**변경사항**:
- ✅ INSERT 문에서 `node_position` 사용
- ✅ 검증 쿼리 업데이트

---

## 📋 Supabase에서 실행할 순서

### Step 1: 기존 실패한 객체 정리 (필요시)

만약 첫 번째 마이그레이션을 이미 실행했다면, 먼저 정리:

```sql
-- 실패한 함수 삭제
DROP FUNCTION IF EXISTS get_node_hierarchy(UUID);
DROP FUNCTION IF EXISTS get_child_nodes(UUID);
DROP FUNCTION IF EXISTS get_all_descendants(UUID);
DROP FUNCTION IF EXISTS migrate_mandala_jsonb_to_nodes();

-- 테이블 삭제 (만약 생성되었다면)
DROP TABLE IF EXISTS mandala_nodes CASCADE;

-- mandala_charts 테이블 원복
ALTER TABLE mandala_charts DROP COLUMN IF EXISTS max_level;
ALTER TABLE mandala_charts
DROP CONSTRAINT IF EXISTS mandala_charts_chart_level_check;
ALTER TABLE mandala_charts
ADD CONSTRAINT mandala_charts_chart_level_check
CHECK (chart_level IN ('basic', 'expanded_27'));
```

### Step 2: FIXED 마이그레이션 실행

**2.1. 테이블 생성**
```sql
-- Supabase SQL Editor에서 전체 파일 복사 후 실행
-- 파일: supabase/migrations/20251029_001_phase5_4_mandala_nodes_table_fixed.sql
```

**예상 출력**:
```
CREATE TABLE
CREATE INDEX (x4)
ALTER TABLE
CREATE POLICY (x4)
CREATE TRIGGER
CREATE FUNCTION (x3)
ALTER TABLE (x2)
COMMENT (x5)
```

**2.2. 데이터 마이그레이션**
```sql
-- Supabase SQL Editor에서 전체 파일 복사 후 실행
-- 파일: supabase/migrations/20251029_002_phase5_4_migrate_jsonb_to_nodes_fixed.sql
```

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

### Step 3: 검증

```sql
-- 1. 테이블 생성 확인
SELECT COUNT(*) FROM mandala_nodes;

-- 2. 컬럼명 확인 (node_position이어야 함)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mandala_nodes'
  AND column_name LIKE '%position%';
-- 예상: node_position | integer

-- 3. 마이그레이션 결과 확인
SELECT
  mc.id,
  mc.center_goal,
  jsonb_array_length(mc.nodes) as jsonb_count,
  COUNT(mn.id) as table_count,
  jsonb_array_length(mc.nodes) = COUNT(mn.id) as match
FROM mandala_charts mc
LEFT JOIN mandala_nodes mn ON mn.mandala_chart_id = mc.id
WHERE mc.nodes IS NOT NULL
GROUP BY mc.id, mc.center_goal, mc.nodes;
-- 예상: match 컬럼이 모두 true
```

---

## ⚠️ API 함수 업데이트 필요

`src/lib/mandala-nodes.js` 파일에서 `position` → `node_position` 변경이 필요하지만,
**현재는 마이그레이션만 완료하면 됩니다.**

API 함수는 나중에 UI 컴포넌트를 업데이트할 때 함께 수정하겠습니다.

---

## 🎯 마이그레이션 후 확인사항

✅ 체크리스트:
- [ ] mandala_nodes 테이블 생성 확인
- [ ] 3개 헬퍼 함수 생성 확인
- [ ] 기존 JSONB 데이터 마이그레이션 완료
- [ ] 검증 쿼리 결과 `match = true`
- [ ] RLS 정책 4개 생성 확인

---

## 📚 관련 파일

**수정된 마이그레이션 파일 (사용)**:
- ✅ `20251029_001_phase5_4_mandala_nodes_table_fixed.sql`
- ✅ `20251029_002_phase5_4_migrate_jsonb_to_nodes_fixed.sql`

**구 마이그레이션 파일 (사용 안 함)**:
- ❌ `20251029_001_phase5_4_mandala_nodes_table.sql`
- ❌ `20251029_002_phase5_4_migrate_jsonb_to_nodes.sql`

---

**작성일**: 2025-10-29
**문제**: PostgreSQL reserved keyword `position`
**해결**: 컬럼명 `node_position`으로 변경
