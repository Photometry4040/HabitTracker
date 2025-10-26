# Phase 5 마이그레이션 실행 가이드

## 📋 개요

Phase 5는 **학습 모드 (Learning Mode)** 기능을 추가하는 마이그레이션입니다.

- **테이블**: 11개 신규 테이블 생성
- **함수**: 8개 헬퍼 함수 생성
- **뷰**: 4개 부모용 뷰 생성
- **시드 데이터**: 9개 보상 정의 추가

## 🚀 실행 방법

### 방법 1: Supabase Dashboard (권장)

**가장 간단하고 안전한 방법입니다.**

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql/new
   ```

2. **통합 SQL 파일 열기**
   ```bash
   cat phase5_combined.sql
   ```

3. **SQL 복사 및 실행**
   - 파일 전체 내용을 복사하여 SQL Editor에 붙여넣기
   - "Run" 버튼 클릭하여 실행

4. **검증**
   - 아래 "검증 쿼리" 섹션의 SQL을 실행하여 확인

### 방법 2: 개별 파일 실행

각 마이그레이션 파일을 순서대로 실행:

```bash
# 파일 위치
/tmp/phase5_migrations/

# 실행 순서
20251024_001_phase5_extend_children.sql       # children 테이블 확장
20251024_002_phase5_create_goals.sql          # 목표 테이블
20251024_003_phase5_create_mandala_charts.sql # 만다라트 테이블
20251024_004_phase5_create_weaknesses.sql     # 약점 테이블
20251024_005_phase5_create_reward_system.sql  # 보상 시스템
20251024_006_phase5_create_permission_system.sql # 권한 시스템
20251024_007_phase5_create_remaining_tables.sql  # 기타 테이블
20251024_008_phase5_helper_functions.sql      # 헬퍼 함수
20251024_009_phase5_parent_rls_and_views.sql  # RLS 및 뷰
20251024_010_phase5_seed_data.sql             # 시드 데이터
```

## ✅ 검증 쿼리

마이그레이션 실행 후 아래 쿼리로 검증하세요:

```sql
-- ============================================================================
-- Phase 5 마이그레이션 검증
-- ============================================================================

-- 1. 테이블 개수 확인 (11개 예상)
SELECT COUNT(*) as table_count,
       '11 expected' as expected
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'reward_definitions', 'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations', 'event_log'
);

-- 2. 함수 개수 확인 (8개 예상)
SELECT COUNT(*) as function_count,
       '8 expected' as expected
FROM pg_proc
WHERE proname IN (
  'update_age_group_from_birthday', 'batch_update_age_groups',
  'anonymize_old_emotion_data', 'delete_my_emotion_data',
  'purge_old_anonymized_data', 'is_guardian', 'has_scope',
  'purge_old_event_logs'
);

-- 3. 뷰 개수 확인 (4개 예상)
SELECT COUNT(*) as view_count,
       '4 expected' as expected
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'v_emotion_summary', 'v_weakness_summary',
  'v_goal_progress_summary', 'v_mandala_summary'
);

-- 4. Cron Jobs 확인 (3개 예상)
SELECT COUNT(*) as cron_count,
       '3 expected' as expected
FROM cron.job
WHERE jobname IN (
  'anonymize-emotions-daily',
  'purge-anonymized-monthly',
  'purge-event-logs-weekly'
);

-- 5. 시드 데이터 확인 (9개 보상 예상)
SELECT COUNT(*) as reward_count,
       '9 expected' as expected
FROM reward_definitions;

-- 6. children 테이블 컬럼 확인 (5개 신규 컬럼)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'children'
AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name')
ORDER BY column_name;
```

## 📊 예상 결과

| 항목 | 예상 값 |
|------|---------|
| table_count | 11 |
| function_count | 8 |
| view_count | 4 |
| cron_count | 3 |
| reward_count | 9 |
| children 신규 컬럼 | 5개 행 |

## 🔧 트러블슈팅

### 에러: "relation already exists"

이미 실행된 테이블이 있습니다. 무시하고 계속 진행하세요. (모든 DDL은 `IF NOT EXISTS` 사용)

### 에러: "extension pg_cron not found"

Supabase Dashboard에서 pg_cron extension을 활성화하세요:
1. Database → Extensions
2. pg_cron 검색 후 Enable

### 에러: "permission denied"

RLS 정책 문제일 수 있습니다. Supabase Dashboard의 SQL Editor에서 실행하세요. (postgres role 권한)

## 📝 마이그레이션 내용 요약

### 001: children 테이블 확장
- `age_group` (나이대 자동 분류)
- `birthday` (생일)
- `learning_mode_enabled` (학습 모드 ON/OFF)
- `grade` (학년)
- `school_name` (학교명)

### 002-004: 학습 데이터 테이블
- `goals` (목표 설정)
- `mandala_charts` (만다라트 차트)
- `weaknesses` (약점 기록)

### 005: 보상 시스템
- `reward_definitions` (보상 정의)
- `progress_events` (진행 이벤트)
- `rewards_ledger` (보상 지급 기록)

### 006: 권한 시스템
- `parent_child_links` (부모-자녀 연결)
- `share_scopes` (공유 권한)

### 007: 기타 테이블
- `praise_messages` (칭찬 메시지)
- `time_allocations` (시간 배분)
- `event_log` (이벤트 로그)

### 008: 헬퍼 함수
- 나이대 자동 업데이트 함수
- 데이터 익명화 함수
- 권한 확인 함수

### 009: RLS 및 뷰
- 모든 신규 테이블에 RLS 정책 적용
- 부모용 요약 뷰 4개 생성

### 010: 시드 데이터
- 9개 기본 보상 정의 추가

## 📚 다음 단계

Phase 5 마이그레이션 완료 후:

1. **프론트엔드 개발**
   - 학습 모드 UI 구현
   - 보상 알림 시스템
   - 부모 대시보드

2. **테스트**
   - 권한 시스템 테스트
   - 보상 자동 지급 테스트
   - RLS 정책 검증

3. **문서화**
   - API 문서 업데이트
   - 사용자 가이드 작성

---

**생성일**: 2025-10-26
**버전**: Phase 5
**파일 위치**: `phase5_combined.sql` (58KB, 1572 lines)
