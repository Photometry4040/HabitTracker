# Phase 5 롤백 계획

**작성일:** 2025-10-24
**목적:** 마이그레이션 실패 시 안전하게 이전 상태로 복구

---

## 🎯 롤백 전략 개요

Phase 5 마이그레이션은 **기존 시스템에 영향 없이** 신규 기능을 추가하는 방식이므로, 롤백 위험도가 낮습니다.

### 롤백 시나리오

| 시나리오 | 위험도 | 롤백 방법 |
|---------|--------|-----------|
| 마이그레이션 실행 전 | 🟢 없음 | 파일 삭제만 하면 됨 |
| 마이그레이션 일부 실패 | 🟡 중간 | 실패한 테이블만 DROP |
| 전체 실패 | 🟠 중간 | 전체 신규 테이블 DROP |
| 데이터 손상 | 🔴 높음 | 백업에서 복원 |

---

## 📋 롤백 전 체크리스트

### 1. 백업 확인

```bash
# 백업 파일 생성
node scripts/backup-database-phase5.cjs

# 백업 파일 확인
ls -lh backups/pre-phase5-backup-*.json
```

**확인 사항:**
- [ ] 백업 파일 크기가 0보다 큼
- [ ] children, weeks, habits, habit_records 데이터 포함
- [ ] 백업 파일을 안전한 위치에 별도 저장 (S3, 로컬 드라이브 등)

### 2. 현재 상태 기록

```sql
-- 기존 테이블 수
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';

-- RLS 활성화된 테이블 수
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- 전체 데이터 행 수
SELECT
  'children' AS table_name, COUNT(*) AS rows FROM children
UNION ALL
SELECT 'weeks', COUNT(*) FROM weeks
UNION ALL
SELECT 'habits', COUNT(*) FROM habits
UNION ALL
SELECT 'habit_records', COUNT(*) FROM habit_records;
```

**결과를 파일로 저장:**
```bash
# 결과를 텍스트 파일로 저장
echo "Phase 5 마이그레이션 전 상태 - $(date)" > backups/pre-migration-state.txt
```

---

## 🔄 롤백 시나리오별 절차

### 시나리오 A: 마이그레이션 실행 전 롤백 (🟢 저위험)

**상황:** 마이그레이션을 아직 실행하지 않음

**롤백 방법:**
1. 마이그레이션 파일 삭제 또는 Git에서 되돌리기
2. 아무 작업 불필요

```bash
# Git에서 되돌리기
git reset --hard HEAD~1

# 또는 마이그레이션 파일만 삭제
rm supabase/migrations/20251024_*.sql
```

---

### 시나리오 B: 마이그레이션 일부 실패 (🟡 중위험)

**상황:** 10개 파일 중 일부만 실행되고 중간에 실패

**증상:**
- 특정 테이블 생성 오류
- FK 제약 조건 위반
- 함수 생성 실패

**롤백 방법:**

#### 1단계: 생성된 테이블 확인

```sql
-- Phase 5로 생성된 테이블 확인
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'reward_definitions', 'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations', 'event_log'
)
ORDER BY tablename;
```

#### 2단계: 신규 테이블만 삭제

```sql
-- ⚠️ 주의: 순서 중요 (FK 의존성 역순)

-- 1. event_log (의존성 없음)
DROP TABLE IF EXISTS event_log CASCADE;

-- 2. time_allocations (의존성 없음)
DROP TABLE IF EXISTS time_allocations CASCADE;

-- 3. praise_messages (share_scopes 의존)
DROP TABLE IF EXISTS praise_messages CASCADE;

-- 4. share_scopes (parent_child_links 의존)
DROP TABLE IF EXISTS share_scopes CASCADE;

-- 5. parent_child_links (children 의존)
DROP TABLE IF EXISTS parent_child_links CASCADE;

-- 6. rewards_ledger (reward_definitions, progress_events 의존)
DROP TABLE IF EXISTS rewards_ledger CASCADE;

-- 7. progress_events (children 의존)
DROP TABLE IF EXISTS progress_events CASCADE;

-- 8. reward_definitions (의존성 없음)
DROP TABLE IF EXISTS reward_definitions CASCADE;

-- 9. weaknesses (children, habits, goals 의존)
DROP TABLE IF EXISTS weaknesses CASCADE;

-- 10. mandala_charts (children, goals 의존)
DROP TABLE IF EXISTS mandala_charts CASCADE;

-- 11. goals (children 의존)
DROP TABLE IF EXISTS goals CASCADE;

-- 12. children 테이블 확장 필드 제거 (선택)
ALTER TABLE children DROP COLUMN IF EXISTS age_group;
ALTER TABLE children DROP COLUMN IF EXISTS birthday;
ALTER TABLE children DROP COLUMN IF EXISTS learning_mode_enabled;
ALTER TABLE children DROP COLUMN IF EXISTS grade;
ALTER TABLE children DROP COLUMN IF EXISTS school_name;
```

#### 3단계: 함수 삭제

```sql
-- Phase 5 함수 삭제
DROP FUNCTION IF EXISTS anonymize_old_emotion_data() CASCADE;
DROP FUNCTION IF EXISTS delete_my_emotion_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS purge_old_anonymized_data() CASCADE;
DROP FUNCTION IF EXISTS is_guardian(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS has_scope(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS purge_old_event_logs() CASCADE;
DROP FUNCTION IF EXISTS update_age_group_from_birthday() CASCADE;
DROP FUNCTION IF EXISTS batch_update_age_groups() CASCADE;
```

#### 4단계: 뷰 삭제

```sql
DROP VIEW IF EXISTS v_emotion_summary CASCADE;
DROP VIEW IF EXISTS v_weakness_summary CASCADE;
DROP VIEW IF EXISTS v_goal_progress_summary CASCADE;
DROP VIEW IF EXISTS v_mandala_summary CASCADE;
```

#### 5단계: Cron Jobs 삭제

```sql
-- Cron Jobs 삭제 (Supabase pg_cron)
SELECT cron.unschedule('anonymize-emotions-daily');
SELECT cron.unschedule('purge-anonymized-monthly');
SELECT cron.unschedule('purge-event-logs-weekly');
```

---

### 시나리오 C: 데이터 손상 (🔴 고위험)

**상황:** 마이그레이션 후 기존 데이터가 손상됨 (매우 드뭄)

**증상:**
- children, weeks, habits, habit_records 데이터 손실
- FK 제약 조건 위반으로 데이터 조회 불가

**롤백 방법:**

#### 1단계: 긴급 백업

```bash
# 현재 상태 긴급 백업 (손상되었지만 일부 데이터 복구 가능)
node scripts/backup-database-phase5.cjs
```

#### 2단계: 모든 Phase 5 테이블 삭제 (시나리오 B와 동일)

#### 3단계: 백업에서 데이터 복원

```sql
-- 1. 백업 파일 열기
-- backups/pre-phase5-backup-YYYY-MM-DD-HH-MM-SS.json

-- 2. 각 테이블 데이터 복원 (수동 INSERT 또는 스크립트 사용)
-- 예시:
INSERT INTO children (id, user_id, name, theme, created_at, updated_at)
VALUES (
  'uuid-1',
  'user-uuid',
  'Child Name',
  'Theme',
  '2025-01-01T00:00:00Z',
  '2025-01-01T00:00:00Z'
);

-- ... 백업 파일의 모든 데이터 반복
```

**또는 복원 스크립트 사용:**

```bash
# 복원 스크립트 (추후 작성 예정)
node scripts/restore-database-phase5.cjs backups/pre-phase5-backup-*.json
```

---

## 🧪 롤백 테스트 (필수)

**프로덕션 롤백 전 테스트 환경에서 먼저 실행:**

```bash
# 1. 테스트 DB에 마이그레이션 실행
psql -h test-db -U user -d testdb -f supabase/migrations/20251024_001_*.sql

# 2. 문제 발생 시 롤백 스크립트 실행
psql -h test-db -U user -d testdb -f docs/00-overview/ROLLBACK_SCRIPT.sql

# 3. 기존 데이터 확인
SELECT * FROM children LIMIT 5;
SELECT * FROM weeks LIMIT 5;
```

---

## 📝 롤백 후 확인 사항

### 1. 기존 시스템 동작 확인

```bash
# 프론트엔드 실행
npm run dev

# 기본 기능 테스트
1. 로그인 ✓
2. 자녀 목록 조회 ✓
3. 주간 데이터 로드 ✓
4. 습관 기록 저장 ✓
5. 대시보드 조회 ✓
```

### 2. 데이터베이스 상태 확인

```sql
-- 1. 테이블 수 (Phase 5 이전과 동일)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- 예상: 6~10개 (기존 테이블만)

-- 2. 데이터 행 수 (백업과 동일)
SELECT
  'children' AS table_name, COUNT(*) AS rows FROM children
UNION ALL
SELECT 'weeks', COUNT(*) FROM weeks
UNION ALL
SELECT 'habits', COUNT(*) FROM habits
UNION ALL
SELECT 'habit_records', COUNT(*) FROM habit_records;
-- 예상: 백업 파일의 행 수와 동일

-- 3. RLS 정책 (기존 정책만 남음)
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public';
```

### 3. 애플리케이션 로그 확인

```bash
# Supabase 로그 확인
# - Edge Function 오류 없음
# - RLS 정책 위반 없음
# - FK 제약 조건 오류 없음
```

---

## 🚨 롤백 실패 시 비상 절차

**만약 롤백도 실패한다면:**

### 방법 1: Supabase 대시보드에서 복원

1. Supabase 대시보드 → Database → Backups
2. Point-in-Time Recovery (PITR) 사용
3. 마이그레이션 전 시간으로 복원

### 방법 2: 전체 프로젝트 재생성 (최후의 수단)

1. 새 Supabase 프로젝트 생성
2. 백업 파일에서 데이터 임포트
3. 환경 변수 업데이트
4. DNS 업데이트

---

## 📊 롤백 체크리스트 (실행 시 사용)

```
Phase 5 롤백 실행 - $(date)

[ ] 1. 백업 파일 확인 (존재 여부, 크기, 내용)
[ ] 2. 현재 상태 기록 (테이블 수, 행 수)
[ ] 3. 신규 테이블 삭제 (11개)
[ ] 4. 함수 삭제 (8개)
[ ] 5. 뷰 삭제 (4개)
[ ] 6. Cron Jobs 삭제 (3개)
[ ] 7. children 컬럼 제거 (5개, 선택)
[ ] 8. 기존 시스템 동작 확인
[ ] 9. 데이터베이스 상태 확인
[ ] 10. 애플리케이션 로그 확인
[ ] 11. 사용자 알림 (필요시)
[ ] 12. 롤백 완료 문서 작성

롤백 수행자: _________________
롤백 완료 시간: _________________
롤백 사유: _________________
```

---

## 🔒 롤백 후 보안 점검

```sql
-- 1. 예상치 못한 테이블 확인
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  'children', 'weeks', 'habits', 'habit_records',
  'habit_templates', 'notifications',
  'habit_tracker_old' -- 기존 아카이브
);

-- 2. RLS 비활성화 테이블 확인
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- 예상: habit_tracker_old만 (의도적)

-- 3. 권한 확인
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee NOT IN ('postgres', 'anon', 'authenticated', 'service_role');
```

---

## 📞 비상 연락처

**롤백 중 문제 발생 시:**
- Supabase Support: [https://supabase.com/support](https://supabase.com/support)
- GitHub Issues: [프로젝트 Issues 링크]
- 개발자: [연락처]

---

**최종 수정일:** 2025-10-24
**문서 버전:** 1.0
**검토자:** -
