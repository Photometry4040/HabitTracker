# Phase 5 마이그레이션 실행 안내

## 📋 준비 완료!

Phase 5 마이그레이션을 위한 모든 준비가 완료되었습니다.

### 생성된 파일

1. **phase5_combined.sql** (59KB, 1,580 lines)
   - 모든 Phase 5 마이그레이션을 하나로 통합한 SQL 파일
   - Supabase Dashboard에서 한 번에 실행 가능

2. **PHASE5_MIGRATION_GUIDE.md** (5.7KB)
   - 상세한 실행 가이드
   - 검증 쿼리 포함
   - 트러블슈팅 안내

## 🚀 실행 방법 (권장)

### 1단계: Supabase Dashboard 접속

```
https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql/new
```

### 2단계: SQL 파일 복사

**macOS:**
```bash
cat phase5_combined.sql | pbcopy
```

**Windows:**
```bash
Get-Content phase5_combined.sql | Set-Clipboard
```

**Linux:**
```bash
cat phase5_combined.sql | xclip -selection clipboard
```

### 3단계: SQL Editor에서 실행

1. Supabase Dashboard의 SQL Editor 열기
2. 복사한 SQL 붙여넣기
3. "Run" 버튼 클릭
4. 실행 완료 대기 (약 30초~1분)

### 4단계: 검증

아래 검증 쿼리를 실행하여 마이그레이션이 성공했는지 확인:

```sql
-- 1. 테이블 개수 확인 (11개 예상)
SELECT COUNT(*) as table_count FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'reward_definitions', 'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations', 'event_log'
);

-- 2. 함수 개수 확인 (8개 예상)
SELECT COUNT(*) as function_count FROM pg_proc
WHERE proname IN (
  'update_age_group_from_birthday', 'batch_update_age_groups',
  'anonymize_old_emotion_data', 'delete_my_emotion_data',
  'purge_old_anonymized_data', 'is_guardian', 'has_scope',
  'purge_old_event_logs'
);

-- 3. 뷰 개수 확인 (4개 예상)
SELECT COUNT(*) as view_count FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'v_emotion_summary', 'v_weakness_summary',
  'v_goal_progress_summary', 'v_mandala_summary'
);

-- 4. 시드 데이터 확인 (9개 보상 예상)
SELECT COUNT(*) as reward_count FROM reward_definitions;
```

### 예상 결과

| 항목 | 예상 값 |
|------|---------|
| table_count | 11 |
| function_count | 8 |
| view_count | 4 |
| reward_count | 9 |

## 📊 마이그레이션 내용

### 새로 추가되는 테이블 (11개)

1. **goals** - 학습 목표 관리 (계층 구조, ICE 우선순위)
2. **mandala_charts** - 만다라트 차트 (9칸/27칸)
3. **weaknesses** - 약점 관리 및 정서 코칭
4. **reward_definitions** - 보상 정의
5. **progress_events** - 진행 이벤트 로그
6. **rewards_ledger** - 보상 지급 원장
7. **parent_child_links** - 부모-자녀 관계
8. **share_scopes** - 권한 스코프
9. **praise_messages** - 칭찬 메시지
10. **time_allocations** - 뇌 과학 기반 시간 최적화
11. **event_log** - 감사 로그 (90일 보존)

### 확장되는 테이블

- **children** 테이블에 5개 컬럼 추가:
  - `age_group` (나이대 자동 분류)
  - `birthday` (생일)
  - `learning_mode_enabled` (학습 모드 토글)
  - `grade` (학년)
  - `school_name` (학교명)

### 새로운 함수 (8개)

1. `update_age_group_from_birthday()` - 나이대 자동 업데이트
2. `batch_update_age_groups()` - 배치 나이대 업데이트
3. `anonymize_old_emotion_data()` - 30일 후 감정 데이터 익명화
4. `delete_my_emotion_data()` - 즉시 감정 데이터 삭제
5. `purge_old_anonymized_data()` - 180일 후 익명화 데이터 삭제
6. `is_guardian()` - 보호자 여부 확인
7. `has_scope()` - 권한 스코프 확인
8. `purge_old_event_logs()` - 90일 후 로그 삭제

### 새로운 뷰 (4개)

1. `v_emotion_summary` - 감정 패턴 요약 (부모용)
2. `v_weakness_summary` - 약점 원인별 요약 (부모용)
3. `v_goal_progress_summary` - 목표 진행률 요약
4. `v_mandala_summary` - 만다라트 완성도 요약

### Cron Jobs (3개)

1. **anonymize-emotions-daily** - 매일 새벽 1시
2. **purge-anonymized-monthly** - 매월 1일 새벽 2시
3. **purge-event-logs-weekly** - 매주 일요일 새벽 3시

## 🔧 트러블슈팅

### pg_cron extension 에러

```sql
-- Supabase Dashboard → Database → Extensions에서 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### "relation already exists" 에러

- 정상입니다. `IF NOT EXISTS` 구문으로 무시하고 계속 진행됩니다.

### 권한 에러

- Supabase Dashboard의 SQL Editor에서 실행하세요 (postgres role 권한 사용)

## 📝 마이그레이션 후 작업

1. **프론트엔드 개발**
   - 학습 모드 UI 구현
   - 보상 알림 시스템
   - 부모 대시보드
   - 만다라트 차트 UI

2. **테스트**
   - 권한 시스템 동작 확인
   - 보상 자동 지급 테스트
   - RLS 정책 검증
   - Cron Jobs 동작 확인

3. **문서화**
   - API 문서 업데이트
   - 사용자 가이드 작성
   - ERD 다이어그램 업데이트

## 📚 참고 자료

- **상세 가이드**: `PHASE5_MIGRATION_GUIDE.md`
- **SQL 파일**: `phase5_combined.sql`
- **개별 마이그레이션**: `supabase/migrations/20251024_*.sql`

---

**생성일**: 2025-10-26
**버전**: Phase 5
**프로젝트**: Habit Tracker for Kids - Learning Mode
