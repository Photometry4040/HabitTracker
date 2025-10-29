-- ========================================
-- OLD SCHEMA 삭제 스크립트
-- 작성일: 2025-10-25
-- 안전성: ✅ 7일간 모니터링 완료 (record_count = 34 유지)
-- 백업: backups/habit_tracker_backup_2025-10-18T09-40-06-279Z.json
-- ========================================

-- 1️⃣ 모니터링 뷰 삭제
DROP VIEW IF EXISTS v_old_schema_status;

-- 2️⃣ OLD SCHEMA 테이블 삭제
DROP TABLE IF EXISTS habit_tracker_old;

-- 3️⃣ 삭제 확인 쿼리
-- 다음 쿼리 결과가 빈 결과면 삭제 성공
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE '%old%' OR tablename = 'habit_tracker_old');

-- 4️⃣ 현재 활성 테이블 목록 확인 (참고용)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- 예상: children, habits, habit_records, habit_templates,
--       idempotency_log, notifications, weeks 등

-- ========================================
-- ✅ 실행 후 기대 결과:
-- - v_old_schema_status: 뷰 삭제됨
-- - habit_tracker_old: 테이블 삭제됨
-- - 3번 쿼리: 빈 결과 (0 rows)
-- - 4번 쿼리: 활성 테이블만 표시
-- ========================================
