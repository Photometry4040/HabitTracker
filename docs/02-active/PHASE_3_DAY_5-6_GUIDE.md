# Phase 3 Day 5-6: 구 스키마 완전 제거 가이드

**작성일**: 2025-10-18
**예상 시간**: 2시간
**상태**: 📋 **실행 대기 중**

---

## 🎯 목표

구 스키마 (habit_tracker) 테이블을 안전하게 제거

---

## ✅ 사전 준비 완료

### 1. 백업 생성 완료 ✅

```bash
$ node scripts/backup-old-schema.js

🎉 Backup completed successfully!

📁 Backup Details:
   - Filename: habit_tracker_backup_2025-10-18T09-40-06-279Z.json
   - Location: backups/
   - Records: 34
   - Verified: ✅
```

**백업 위치**: `backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json`

**백업 내용**:
- 34개 레코드
- 6명의 아이
- 208개 습관
- 70.62 KB
- 무결성 검증 완료

### 2. SQL 마이그레이션 파일 생성 완료 ✅

**파일**: `supabase/migrations/014_rename_old_schema.sql`

---

## 📋 실행 단계

### Step 1: Supabase Dashboard에서 SQL 실행

**접속 URL**: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql

**실행할 SQL**:
```sql
-- Phase 3 Day 5-6: Rename habit_tracker to habit_tracker_old

BEGIN;

-- Step 1: Rename table
ALTER TABLE habit_tracker RENAME TO habit_tracker_old;

-- Step 2: Add archive metadata
COMMENT ON TABLE habit_tracker_old IS 'Archived OLD SCHEMA (Phase 3 Day 5-6). READ-ONLY. Backup: 2025-10-18';

-- Step 3: Create monitoring view
CREATE OR REPLACE VIEW v_old_schema_status AS
SELECT
  'habit_tracker_old' as table_name,
  COUNT(*) as record_count,
  MIN(week_start_date) as earliest_week,
  MAX(week_start_date) as latest_week,
  COUNT(DISTINCT child_name) as unique_children,
  NOW() as checked_at
FROM habit_tracker_old;

COMMENT ON VIEW v_old_schema_status IS 'Monitoring view for archived table';

COMMIT;
```

### Step 2: 검증

**실행할 SQL**:
```sql
-- Check renamed table
SELECT * FROM v_old_schema_status;

-- Expected result:
-- table_name: habit_tracker_old
-- record_count: 34
-- unique_children: 6
```

### Step 3: 웹앱 테스트

**테스트 시나리오**:
1. ✅ 웹앱 접속 (http://localhost:5173)
2. ✅ 새 주차 생성
3. ✅ 습관 색상 변경
4. ✅ 주차 데이터 로드
5. ✅ 에러 없음 확인

**예상 결과**:
- 웹앱 정상 작동 (NEW SCHEMA만 사용)
- habit_tracker 테이블 참조 없음
- 모든 기능 정상

---

## ⏱️ 1주일 모니터링 기간

### 모니터링 항목

**일일 체크 (매일 1회)**:
```sql
-- 1. NEW SCHEMA 정상 작동 확인
SELECT COUNT(*) FROM weeks;
SELECT COUNT(*) FROM habits;
SELECT COUNT(*) FROM habit_records;

-- 2. OLD SCHEMA 변경 없음 확인
SELECT * FROM v_old_schema_status;
-- record_count should remain 34

-- 3. 최근 작업 확인
SELECT
  operation,
  status,
  response_data->>'schema_version' as schema_version,
  created_at
FROM idempotency_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
-- All should show 'new_only'
```

**예상 결과**:
- NEW SCHEMA: 정상 증가
- OLD SCHEMA: 34개 유지 (변경 없음)
- schema_version: 'new_only'

### 모니터링 일정

| 일자 | 작업 | 상태 |
|------|------|------|
| Day 1 (2025-10-18) | 테이블 이름 변경 | 🔄 실행 대기 |
| Day 2 (2025-10-19) | 모니터링 | ⏳ 대기 |
| Day 3 (2025-10-20) | 모니터링 | ⏳ 대기 |
| Day 4 (2025-10-21) | 모니터링 | ⏳ 대기 |
| Day 5 (2025-10-22) | 모니터링 | ⏳ 대기 |
| Day 6 (2025-10-23) | 모니터링 | ⏳ 대기 |
| Day 7 (2025-10-24) | 모니터링 | ⏳ 대기 |
| Day 8 (2025-10-25) | 최종 결정 | ⏳ 대기 |

---

## 🔄 롤백 (필요시)

**문제 발생 시 (1주일 이내)**:
```sql
-- Rollback: Rename back to original
ALTER TABLE habit_tracker_old RENAME TO habit_tracker;
DROP VIEW v_old_schema_status;
```

**예상 시간**: < 1분
**리스크**: 없음 (데이터 변경 없음)

---

## 🗑️ 완전 삭제 (1주일 후, 선택사항)

### 조건
- ✅ 1주일 모니터링 완료
- ✅ 웹앱 정상 작동 확인
- ✅ 사용자 피드백 없음
- ✅ NEW SCHEMA 안정적

### 삭제 SQL

**⚠️ 주의: 이 작업은 되돌릴 수 없습니다!**

```sql
-- Final deletion (IRREVERSIBLE!)
BEGIN;

-- Step 1: Final backup check
SELECT 'Backup file: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json' as backup_location;

-- Step 2: Drop view
DROP VIEW IF EXISTS v_old_schema_status;

-- Step 3: Drop table
DROP TABLE IF EXISTS habit_tracker_old CASCADE;

-- Step 4: Vacuum
VACUUM FULL;
ANALYZE;

COMMIT;
```

### 삭제 후 검증

```sql
-- Verify deletion
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'habit_tracker_old';
-- Should return 0 rows

-- Verify NEW SCHEMA still works
SELECT COUNT(*) FROM weeks;
SELECT COUNT(*) FROM habits;
-- Should return normal counts
```

---

## 📊 예상 결과

### 테이블 상태

**Before (현재)**:
- `habit_tracker` - 34 records, READ-ONLY
- `weeks` - 25 records, ACTIVE

**After (Step 1 실행 후)**:
- `habit_tracker_old` - 34 records, ARCHIVED
- `weeks` - 25 records, ACTIVE

**After (완전 삭제 후)**:
- `weeks` - 25+ records, ACTIVE (계속 증가)

### 디스크 공간

**절약 예상**:
- habit_tracker_old: ~70 KB
- 인덱스: ~10 KB
- **총**: ~80 KB

---

## ✅ 체크리스트

### 실행 전
- [x] 백업 생성 완료
- [x] 백업 무결성 검증
- [x] SQL 마이그레이션 파일 생성
- [ ] Supabase Dashboard 접속 준비

### 실행 중
- [ ] SQL 실행 (ALTER TABLE)
- [ ] 모니터링 뷰 생성
- [ ] 검증 SQL 실행
- [ ] 웹앱 테스트

### 실행 후
- [ ] 1주일 모니터링 시작
- [ ] 일일 체크 실행
- [ ] 이슈 없음 확인
- [ ] 완전 삭제 결정

---

## 🎯 성공 기준

### 필수
- [x] 백업 파일 생성 및 검증
- [ ] 테이블 이름 변경 성공
- [ ] 웹앱 정상 작동 (에러 없음)
- [ ] 1주일 모니터링 완료

### 선택
- [ ] 완전 삭제 실행
- [ ] 디스크 공간 정리
- [ ] VACUUM 실행

---

## 📚 참고 문서

- [PHASE_3_COMPLETE.md](PHASE_3_COMPLETE.md) - Phase 3 전체 계획
- [PHASE_3_DAY_3-4_COMPLETE.md](PHASE_3_DAY_3-4_COMPLETE.md) - READ-ONLY 전환
- [DB_MIGRATION_PLAN_V2.md](../00-overview/DB_MIGRATION_PLAN_V2.md) - 마이그레이션 전략

---

## 🚨 주의사항

### 중요!
1. **백업 확인**: 반드시 백업 파일 존재 확인
2. **롤백 가능**: 1주일 이내 언제든지 롤백 가능
3. **완전 삭제**: 1주일 후에만 고려
4. **되돌릴 수 없음**: 완전 삭제는 IRREVERSIBLE!

### 연락처
- **문제 발생 시**: 즉시 롤백 실행
- **질문/이슈**: GitHub Issues

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-18
**상태**: 📋 **실행 대기 중**

**다음 단계**: Supabase Dashboard에서 SQL 실행
