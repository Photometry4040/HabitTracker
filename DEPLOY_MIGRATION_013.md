# Migration 013 배포 가이드

**목적**: idempotency_log 테이블 생성 (Edge Function에 필요)
**예상 시간**: 5분
**영향**: 없음 (새 테이블만 생성)

---

## 🚀 배포 절차

### 1. Supabase SQL Editor 열기
👉 **링크**: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql

### 2. 마이그레이션 파일 복사
- 파일 열기: `supabase/migrations/013_create_dual_write_triggers.sql`
- **전체 내용 복사** (325줄)

### 3. SQL Editor에 붙여넣기 & 실행
1. 복사한 내용을 SQL Editor에 붙여넣기
2. 우측 하단 **"Run"** 버튼 클릭
3. 성공 메시지 확인:
   ```
   Success. No rows returned
   ```

### 4. 배포 확인
다음 쿼리를 새 쿼리 탭에서 실행:

```sql
-- 테이블 존재 확인
SELECT COUNT(*) FROM idempotency_log;
```

**기대 결과**: `0` (빈 테이블이 정상)

```sql
-- 테이블 구조 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'idempotency_log'
ORDER BY ordinal_position;
```

**기대 결과**: 8개 컬럼 표시
- id (uuid)
- key (text)
- operation (text)
- request_data (jsonb)
- response_data (jsonb)
- status (text)
- created_at (timestamp with time zone)
- expires_at (timestamp with time zone)

### 5. 로컬에서 최종 확인
터미널에서 실행:

```bash
node scripts/check-database-status.js
```

**기대 결과**:
```
📝 Checking idempotency_log...
  Total logs: 0
  ✅ Table exists and is ready
```

---

## ✅ 배포 완료 체크리스트

- [ ] SQL Editor에서 migration 013 실행 완료
- [ ] "Success. No rows returned" 메시지 확인
- [ ] `SELECT COUNT(*) FROM idempotency_log` 실행 성공
- [ ] 8개 컬럼 구조 확인 완료
- [ ] `node scripts/check-database-status.js` 실행 성공

---

## ⚠️ 문제 발생 시

### Error: "relation already exists"
**원인**: 이미 배포되어 있음
**해결**: 배포 확인 단계(4번)로 이동

### Error: "permission denied"
**원인**: SQL Editor 권한 없음
**해결**: Supabase 프로젝트 Owner 권한 필요

### Error: "syntax error"
**원인**: 복사 중 일부 누락
**해결**: 파일 전체 내용 다시 복사

---

## 🎯 배포 후 다음 단계

배포가 완료되면 **Phase 2 Day 2 테스트**를 진행합니다:
- 가이드 문서: `PHASE_2_DAY_2_TEST_GUIDE.md`
- 웹앱 테스트: http://localhost:5173/
- Drift 검증: `node scripts/validate-zero-drift.js`

---

**작성일**: 2025-10-12
**필요한 권한**: Supabase Project Owner
**예상 다운타임**: 없음
