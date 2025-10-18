# Phase 3 Day 5-6: 구 스키마 제거 준비 완료

**완료일**: 2025-10-18
**소요 시간**: ~1시간
**상태**: ✅ **준비 완료** (수동 실행 대기)

---

## 🎯 목표 달성

✅ 백업 스크립트 개발 및 실행
✅ SQL 마이그레이션 파일 생성
✅ 실행 가이드 문서 작성
🔄 수동 SQL 실행 대기 중

---

## 📊 주요 성과

### 1. 백업 생성 완료 ✅

**실행 결과**:
```bash
$ node scripts/backup-old-schema.js

🎉 Backup completed successfully!

📁 Backup Details:
   - Filename: habit_tracker_backup_2025-10-18T09-40-06-279Z.json
   - Location: backups/
   - Records: 34
   - Verified: ✅
```

**백업 통계**:
- **총 레코드**: 34개
- **고유 아이**: 6명
- **날짜 범위**: 2025-07-22 ~ 2025-09-01
- **총 습관**: 208개
- **파일 크기**: 70.62 KB
- **무결성 검증**: ✅ 통과

**백업 메타데이터**:
```json
{
  "backup_date": "2025-10-18T09:40:06.279Z",
  "table_name": "habit_tracker",
  "record_count": 34,
  "metadata": {
    "phase": "Phase 3 Day 5-6",
    "purpose": "Backup before renaming to habit_tracker_old",
    "note": "Final backup before removing OLD SCHEMA"
  }
}
```

### 2. SQL 마이그레이션 파일 생성 ✅

**파일**: `supabase/migrations/014_rename_old_schema.sql`

**주요 내용**:
1. 테이블 이름 변경: `habit_tracker` → `habit_tracker_old`
2. 아카이브 메타데이터 추가
3. 모니터링 뷰 생성 (`v_old_schema_status`)
4. 롤백 가이드 포함

**SQL 주요 부분**:
```sql
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
```

### 3. 실행 가이드 작성 ✅

**파일**: `docs/02-active/PHASE_3_DAY_5-6_GUIDE.md`

**가이드 내용**:
- ✅ Step-by-step 실행 방법
- ✅ 1주일 모니터링 계획
- ✅ 롤백 절차
- ✅ 완전 삭제 방법 (1주일 후)
- ✅ 체크리스트

---

## 📁 생성된 파일

### 백업
- `backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json` - 백업 데이터
- `backups/BACKUP_INDEX.md` - 백업 인덱스

### 스크립트
- `scripts/backup-old-schema.js` - 백업 자동화 스크립트 (신규)

### SQL
- `supabase/migrations/014_rename_old_schema.sql` - 테이블 이름 변경 마이그레이션

### 문서
- `docs/02-active/PHASE_3_DAY_5-6_GUIDE.md` - 실행 가이드 (신규)
- `docs/02-active/PHASE_3_DAY_5-6_COMPLETE.md` - 이 문서

---

## 🔍 백업 스크립트 주요 기능

### 자동화된 백업 프로세스
1. **데이터 추출**: habit_tracker 전체 레코드
2. **메타데이터 생성**: 통계 및 검증 정보
3. **JSON 저장**: 타임스탬프가 포함된 파일명
4. **무결성 검증**: 샘플 레코드 비교
5. **인덱스 업데이트**: 백업 이력 관리

### 백업 검증

**검증 항목**:
- ✅ 레코드 개수 일치
- ✅ 배열 길이 일치
- ✅ 샘플 레코드 ID 일치
- ✅ 파일 쓰기 성공

**검증 결과**:
```
✅ Backup integrity verified
✅ Sample record verified (ID: 164)
```

---

## 📋 다음 단계 (수동 실행)

### Step 1: Supabase Dashboard에서 SQL 실행

**URL**: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql

**실행할 SQL**: `supabase/migrations/014_rename_old_schema.sql` 내용 복사

### Step 2: 검증

```sql
SELECT * FROM v_old_schema_status;
```

**예상 결과**:
- table_name: `habit_tracker_old`
- record_count: 34
- unique_children: 6

### Step 3: 웹앱 테스트

1. http://localhost:5173 접속
2. 새 주차 생성
3. 습관 색상 변경
4. 에러 없음 확인

### Step 4: 1주일 모니터링

**일일 체크 (매일 1회)**:
```sql
-- NEW SCHEMA 정상 확인
SELECT COUNT(*) FROM weeks;

-- OLD SCHEMA 변경 없음 확인
SELECT * FROM v_old_schema_status;
-- record_count should remain 34
```

---

## ⏱️ 1주일 모니터링 일정

| 일자 | 작업 | 상태 |
|------|------|------|
| 2025-10-18 | 백업 및 준비 완료 | ✅ |
| 2025-10-18 | SQL 실행 | 🔄 대기 |
| 2025-10-19 | Day 1 모니터링 | ⏳ |
| 2025-10-20 | Day 2 모니터링 | ⏳ |
| 2025-10-21 | Day 3 모니터링 | ⏳ |
| 2025-10-22 | Day 4 모니터링 | ⏳ |
| 2025-10-23 | Day 5 모니터링 | ⏳ |
| 2025-10-24 | Day 6 모니터링 | ⏳ |
| 2025-10-25 | 최종 결정 | ⏳ |

---

## 🔄 롤백 절차

**문제 발생 시 (1주일 이내)**:
```sql
-- Simple rollback
ALTER TABLE habit_tracker_old RENAME TO habit_tracker;
DROP VIEW v_old_schema_status;
```

**소요 시간**: < 1분
**데이터 손실**: 없음

---

## 🗑️ 완전 삭제 (1주일 후, 선택사항)

### 조건
- ✅ 1주일 모니터링 완료
- ✅ 웹앱 정상 작동
- ✅ 사용자 이슈 없음
- ✅ NEW SCHEMA 안정적

### 삭제 SQL

⚠️ **주의: 되돌릴 수 없습니다!**

```sql
BEGIN;

-- Step 1: Drop view
DROP VIEW IF EXISTS v_old_schema_status;

-- Step 2: Drop table
DROP TABLE IF EXISTS habit_tracker_old CASCADE;

-- Step 3: Cleanup
VACUUM FULL;
ANALYZE;

COMMIT;
```

---

## 📊 예상 결과

### 디스크 공간 절약
- habit_tracker_old: ~70 KB
- 인덱스: ~10 KB
- **총 절약**: ~80 KB

### 시스템 상태

**Before**:
- habit_tracker: 34 records (READ-ONLY)
- weeks: 25 records (ACTIVE)

**After (이름 변경)**:
- habit_tracker_old: 34 records (ARCHIVED)
- weeks: 25 records (ACTIVE)

**After (완전 삭제)**:
- weeks: 25+ records (ACTIVE, 계속 증가)

---

## ✅ 체크리스트

### 준비 완료
- [x] 백업 스크립트 개발
- [x] 백업 실행 및 검증
- [x] SQL 마이그레이션 파일 생성
- [x] 실행 가이드 작성
- [x] 롤백 절차 문서화

### 수동 실행 필요
- [ ] Supabase Dashboard에서 SQL 실행
- [ ] 검증 SQL 실행
- [ ] 웹앱 테스트
- [ ] 1주일 모니터링 시작

### 1주일 후
- [ ] 모니터링 결과 검토
- [ ] 완전 삭제 결정
- [ ] VACUUM 실행 (선택)

---

## 🎉 결론

**Phase 3 Day 5-6 준비가 완료되었습니다!**

### 주요 성과
1. ✅ **백업 완료** - 34개 레코드, 무결성 검증
2. ✅ **SQL 준비** - 테이블 이름 변경 마이그레이션
3. ✅ **가이드 작성** - Step-by-step 실행 방법
4. ✅ **롤백 계획** - 안전한 복구 절차

### 시스템 상태
- **안전함**: 백업 생성 및 검증 완료
- **준비됨**: SQL 마이그레이션 파일 준비
- **문서화됨**: 상세한 가이드 제공

### 다음 단계
- 🔄 Supabase Dashboard에서 수동 SQL 실행
- ⏱️ 1주일 모니터링 기간
- 🗑️ 완전 삭제 (선택사항)

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-18
**상태**: ✅ **준비 완료!**

**참고**: 실제 테이블 이름 변경은 Supabase Dashboard에서 수동으로 실행하세요.
