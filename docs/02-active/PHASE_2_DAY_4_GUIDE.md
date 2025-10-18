# Phase 2 Day 4: RLS Activation Guide

**날짜**: 2025-10-18
**작업 시간**: ~2시간
**목표**: 6개 테이블에 Row Level Security 활성화

---

## 📋 준비사항

### 1. 사전 확인
- [x] Day 1-3 완료 (읽기/쓰기 작업 전환)
- [x] Dual-write 시스템 작동 확인
- [x] 웹앱 정상 작동 확인

### 2. 현재 RLS 상태 확인
```bash
node scripts/check-rls-current-status.js
```

**예상 결과**: 모든 테이블 RLS DISABLED

---

## 🔒 RLS 활성화 절차

### Option A: Supabase Dashboard에서 SQL 실행 (추천)

**1. Supabase SQL Editor 열기**
- URL: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql

**2. 다음 SQL 실행**:
```sql
-- Phase 2 Day 4: Enable RLS on all tables

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

**3. 검증 SQL 실행**:
```sql
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
ORDER BY tablename;
```

**예상 결과**:
| tablename | rls_enabled |
|-----------|-------------|
| children | t |
| habits | t |
| habit_records | t |
| habit_templates | t |
| notifications | t |
| weeks | t |

**4. 정책 확인**:
```sql
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records', 'habit_templates', 'notifications')
GROUP BY tablename
ORDER BY tablename;
```

**예상 결과**:
| tablename | policy_count |
|-----------|--------------|
| children | 4 |
| habits | 4 |
| habit_records | 4 |
| habit_templates | 4 |
| notifications | 4 |
| weeks | 4 |

---

### Option B: Node.js 스크립트 실행 (SERVICE_ROLE_KEY 필요)

**주의**: 이 옵션은 SERVICE_ROLE_KEY가 필요합니다.

```bash
# .env 파일에 SERVICE_ROLE_KEY 추가 (임시)
# VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 스크립트 실행
node scripts/enable-rls.js

# 완료 후 .env에서 SERVICE_ROLE_KEY 삭제!
```

---

## ✅ RLS 활성화 후 검증

### 1. 웹앱 테스트 (필수)

**브라우저에서 테스트**:
1. http://localhost:5173 접속
2. 로그인
3. 아이 선택
4. 주차 데이터 로드 확인
5. 습관 색상 변경 테스트
6. 새 주차 생성 테스트

**예상 결과**:
- ✅ 로그인한 사용자의 데이터만 표시
- ✅ 모든 기능 정상 작동
- ✅ 콘솔에 에러 없음

### 2. Edge Function 테스트

Edge Function은 SERVICE_ROLE_KEY를 사용하므로 RLS를 우회합니다.

```bash
# Idempotency 로그 확인
node scripts/check-idempotency-logs.js
```

**예상 결과**:
- ✅ 최근 작업 로그 정상 표시
- ✅ Edge Function 정상 작동

### 3. 데이터 격리 테스트

**시나리오**: 다른 사용자가 데이터를 볼 수 없는지 확인

**방법**:
1. 브라우저 시크릿 모드로 다른 계정 로그인
2. 첫 번째 사용자의 데이터가 보이지 않는지 확인

**예상 결과**:
- ✅ 사용자 A는 자신의 데이터만 조회
- ✅ 사용자 B는 자신의 데이터만 조회
- ❌ 사용자 A가 사용자 B의 데이터 조회 불가

---

## 📊 성능 테스트

### 1. 기본 쿼리 성능

```bash
# RLS 활성화 전 벤치마크 (이미 수행했다면 스킵)
node scripts/measure-performance-baseline.js

# RLS 활성화 후 성능 측정
node scripts/test-rls-performance.js
```

**예상 결과**:
- 쿼리 시간 차이: < 50ms
- 성능 저하: < 10%

### 2. 웹앱 응답 시간

**측정 항목**:
- 주차 데이터 로드 시간
- 습관 색상 변경 응답 시간
- 새 주차 생성 시간

**허용 기준**:
- 모든 작업 < 2초
- 습관 색상 변경 < 500ms (Optimistic UI)

---

## 🐛 문제 해결

### 문제 1: 웹앱에서 데이터가 안 보임

**증상**: "해당 주간에 저장된 데이터가 없습니다"

**원인**:
- 사용자가 로그인하지 않음
- user_id가 null인 레코드 존재

**해결**:
```bash
# 로그인 상태 확인
# 브라우저 콘솔에서:
# supabase.auth.getUser()

# user_id 확인
node scripts/check-users.js
```

### 문제 2: Edge Function 에러

**증상**: 500 Internal Server Error

**원인**: Edge Function이 SERVICE_ROLE_KEY를 사용하지 않음

**해결**:
- Edge Function 환경 변수 확인
- `SUPABASE_SERVICE_ROLE_KEY` 설정 확인

### 문제 3: 성능 저하

**증상**: 쿼리가 너무 느림 (> 2초)

**원인**: 인덱스 부족

**해결**:
```sql
-- 인덱스 확인
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('children', 'weeks', 'habits', 'habit_records')
ORDER BY tablename, indexname;
```

---

## 🔄 롤백 절차 (필요 시)

RLS 활성화 후 문제가 발생하면 다음 SQL로 롤백:

```sql
-- RLS 비활성화 (모든 테이블)
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE weeks DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

---

## ✅ 완료 체크리스트

### RLS 활성화
- [ ] SQL 실행 완료
- [ ] 6개 테이블 모두 RLS enabled
- [ ] 각 테이블 4개 정책 확인

### 검증
- [ ] 웹앱 로그인 성공
- [ ] 데이터 로드 성공
- [ ] 습관 색상 변경 성공
- [ ] 새 주차 생성 성공
- [ ] Edge Function 정상 작동

### 성능
- [ ] 쿼리 응답 시간 < 2초
- [ ] 성능 저하 < 10%
- [ ] 콘솔에 에러 없음

### 문서화
- [ ] PHASE_2_DAY_4_COMPLETE.md 작성
- [ ] 문제점 및 해결책 기록
- [ ] 다음 단계 계획 수립

---

## 🎯 성공 기준

1. ✅ **보안**: RLS 활성화로 사용자 데이터 격리
2. ✅ **기능**: 모든 웹앱 기능 정상 작동
3. ✅ **성능**: 성능 저하 < 10%
4. ✅ **안정성**: Edge Function 정상 작동

---

## 📚 참고 문서

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PHASE_2_PLAN.md](PHASE_2_PLAN.md) - Day 4 계획
- [PHASE_2_DAY_3_COMPLETE.md](PHASE_2_DAY_3_COMPLETE.md) - 이전 작업

---

## 🚀 다음 단계 (Day 5)

- [ ] 최종 Drift 검증 (0% 목표)
- [ ] 전체 시스템 통합 테스트
- [ ] Phase 2 완료 보고서 작성
- [ ] 문서 업데이트

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-18
