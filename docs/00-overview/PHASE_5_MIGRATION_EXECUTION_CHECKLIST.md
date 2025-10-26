# Phase 5 마이그레이션 실행 체크리스트

**작성일:** 2025-10-24
**목적:** 안전한 프로덕션 마이그레이션 실행 가이드

---

## 🎯 실행 개요

### 예상 소요 시간
- **준비:** 30분
- **백업:** 10분
- **실행:** 15분
- **검증:** 30분
- **총:** 약 1.5시간

### 실행 시간대 권장
- 🟢 **최적:** 주말 오전 (토요일/일요일 09:00~12:00)
- 🟡 **허용:** 평일 야간 (22:00~06:00)
- 🔴 **피함:** 평일 근무시간 (09:00~18:00)

---

## 📋 실행 전 체크리스트 (30분)

### 1. 환경 확인

```bash
# ✅ 1-1. Node.js 버전 확인
node --version
# 예상: v18.x 이상

# ✅ 1-2. Supabase CLI 설치 확인 (선택)
supabase --version

# ✅ 1-3. 환경 변수 확인
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
# 빈 값이 아닌지 확인
```

**체크:**
- [ ] Node.js 설치 확인
- [ ] 환경 변수 설정 확인
- [ ] Supabase 대시보드 접속 가능

---

### 2. 마이그레이션 검증

```bash
# ✅ 2-1. 마이그레이션 파일 존재 확인
ls -1 supabase/migrations/20251024_*.sql | wc -l
# 예상: 10

# ✅ 2-2. 검증 스크립트 실행
node scripts/verify-phase5-migrations.cjs
# 예상: "✅ 검증 성공! 마이그레이션 실행 가능합니다."
```

**체크:**
- [ ] 10개 마이그레이션 파일 존재
- [ ] 검증 스크립트 통과
- [ ] 의존성 순서 올바름
- [ ] RLS 정책 32개 확인

---

### 3. 백업 생성 및 확인

```bash
# ✅ 3-1. 데이터베이스 백업
node scripts/backup-database-phase5.cjs

# ✅ 3-2. 백업 파일 확인
ls -lh backups/pre-phase5-backup-*.json

# ✅ 3-3. 백업 파일 검증
# JSON 파일 열어서 데이터 확인
cat backups/pre-phase5-backup-*.json | jq '.tables | keys'
# 예상: ["children", "habits", "habit_records", "habit_templates", "notifications", "weeks"]
```

**체크:**
- [ ] 백업 파일 크기 > 0 KB
- [ ] 모든 중요 테이블 포함
- [ ] 백업 파일을 안전한 위치에 복사 (S3, 외장 드라이브 등)

**추가 백업 (선택):**
```bash
# Supabase 대시보드에서 수동 백업
1. Supabase 대시보드 → Database → Backups
2. "Create Backup" 클릭
3. 백업 완료 확인
```

---

### 4. 사용자 알림 (선택)

```
[ ] Discord/Slack 등에 유지보수 공지
    "안녕하세요, Phase 5 마이그레이션을 진행합니다.
     예상 시간: 30분
     서비스 중단: 없음 (읽기 전용 모드)
     진행 시간: YYYY-MM-DD HH:MM"
```

---

## 🚀 실행 단계 (15분)

### Option A: Supabase 대시보드 (추천, 🟢 안전)

```
1. Supabase 대시보드 → Database → Migrations
2. "New Migration" 클릭
3. 마이그레이션 파일 업로드 (001~010 순서대로)
   - 20251024_001_phase5_extend_children.sql
   - 20251024_002_phase5_create_goals.sql
   - 20251024_003_phase5_create_mandala_charts.sql
   - 20251024_004_phase5_create_weaknesses.sql
   - 20251024_005_phase5_create_reward_system.sql
   - 20251024_006_phase5_create_permission_system.sql
   - 20251024_007_phase5_create_remaining_tables.sql
   - 20251024_008_phase5_helper_functions.sql
   - 20251024_009_phase5_parent_rls_and_views.sql
   - 20251024_010_phase5_seed_data.sql
4. 각 파일 실행 후 성공 메시지 확인
5. 오류 발생 시 즉시 중단하고 롤백 계획 참조
```

**체크 (각 마이그레이션 후):**
- [ ] 001: children 테이블 확장 성공
- [ ] 002: goals 테이블 생성 성공
- [ ] 003: mandala_charts 테이블 생성 성공
- [ ] 004: weaknesses 테이블 생성 성공
- [ ] 005: reward_system 3테이블 생성 성공
- [ ] 006: permission_system 2테이블 생성 성공
- [ ] 007: praise/time/event_log 생성 성공
- [ ] 008: 헬퍼 함수 6개 생성 성공
- [ ] 009: 부모용 RLS + 뷰 4개 생성 성공
- [ ] 010: 시드 데이터 9개 삽입 성공

---

### Option B: SQL Editor (고급 사용자)

```sql
-- Supabase SQL Editor에서 실행

-- 1. 001_phase5_extend_children.sql 내용 붙여넣기 + 실행
-- 2. 002_phase5_create_goals.sql 내용 붙여넣기 + 실행
-- ... 010까지 순서대로 실행
```

---

### Option C: Supabase CLI (로컬 테스트용)

```bash
# ⚠️ 주의: 프로덕션에서는 Option A 권장

# 1. Supabase 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_REF

# 2. 마이그레이션 실행
supabase db push

# 3. 결과 확인
supabase db diff
```

---

## ✅ 실행 후 검증 (30분)

### 1. 테이블 생성 확인

```sql
-- Supabase SQL Editor에서 실행

-- 1-1. 테이블 수 확인
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- 예상: 기존 6개 + 신규 11개 = 17개

-- 1-2. 신규 테이블 목록
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'reward_definitions', 'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations', 'event_log'
)
ORDER BY tablename;
-- 예상: 11개 행

-- 1-3. children 테이블 확장 확인
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'children'
AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name');
-- 예상: 5개 행
```

**체크:**
- [ ] 총 테이블 수: 17개 (기존 6 + 신규 11)
- [ ] 신규 테이블 11개 존재
- [ ] children 확장 컬럼 5개 존재

---

### 2. RLS 정책 확인

```sql
-- 2-1. RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'goals', 'mandala_charts', 'weaknesses',
  'progress_events', 'rewards_ledger',
  'parent_child_links', 'share_scopes',
  'praise_messages', 'time_allocations'
)
ORDER BY tablename;
-- 예상: 모두 rowsecurity = true

-- 2-2. 정책 수 확인
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- 예상: goals=5, mandala_charts=5, weaknesses=4, 등
```

**체크:**
- [ ] RLS 활성화: 9개 테이블
- [ ] 정책 수: 32개 이상

---

### 3. 함수 및 뷰 확인

```sql
-- 3-1. 함수 확인
SELECT proname
FROM pg_proc
WHERE proname IN (
  'anonymize_old_emotion_data',
  'delete_my_emotion_data',
  'purge_old_anonymized_data',
  'is_guardian',
  'has_scope',
  'purge_old_event_logs',
  'update_age_group_from_birthday',
  'batch_update_age_groups'
)
ORDER BY proname;
-- 예상: 8개 행

-- 3-2. 뷰 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'v_emotion_summary',
  'v_weakness_summary',
  'v_goal_progress_summary',
  'v_mandala_summary'
)
ORDER BY table_name;
-- 예상: 4개 행

-- 3-3. Cron Jobs 확인
SELECT jobname, schedule
FROM cron.job
WHERE jobname IN (
  'anonymize-emotions-daily',
  'purge-anonymized-monthly',
  'purge-event-logs-weekly'
);
-- 예상: 3개 행
```

**체크:**
- [ ] 함수: 8개
- [ ] 뷰: 4개
- [ ] Cron Jobs: 3개

---

### 4. 시드 데이터 확인

```sql
-- 4-1. 보상 정의 확인
SELECT name, reward_type, trigger_event
FROM reward_definitions
ORDER BY created_at;
-- 예상: 9개 행

-- 4-2. 보상 목록
-- "첫 목표 설정", "목표 달성자", "만다라트 마스터", "약점 정복자",
-- "재도전 영웅", "3일 연속 달성", "7일 연속 달성", "2주 연속 마스터", "완벽한 주"
```

**체크:**
- [ ] 보상 정의: 9개

---

### 5. 기존 시스템 동작 확인

```bash
# 5-1. 프론트엔드 실행
npm run dev

# 5-2. 기본 기능 테스트 (브라우저)
1. 로그인 ✓
2. 자녀 목록 조회 ✓
3. 주간 데이터 로드 ✓
4. 습관 기록 저장 ✓
5. 대시보드 조회 (Comparison/Trends/Self-Awareness/Monthly) ✓

# 5-3. 콘솔 오류 확인
# 브라우저 DevTools → Console에서 오류 없는지 확인
```

**체크:**
- [ ] 로그인 성공
- [ ] 기존 데이터 조회 성공
- [ ] 습관 기록 저장 성공
- [ ] 대시보드 로딩 성공
- [ ] 콘솔 오류 없음

---

### 6. 새 기능 테스트 (간단)

```bash
# 6-1. children 테이블 확장 테스트
# Supabase SQL Editor:

-- 생일 설정 테스트
UPDATE children
SET birthday = '2015-03-15'
WHERE id = 'test-child-uuid';

-- age_group 자동 전환 확인
SELECT id, name, birthday, age_group
FROM children
WHERE id = 'test-child-uuid';
-- 예상: age_group = 'elementary_high' (10세)

# 6-2. 학습 모드 토글 테스트 (프론트엔드 준비 후)
```

**체크:**
- [ ] 생일 입력 시 age_group 자동 업데이트
- [ ] learning_mode_enabled 토글 가능

---

## 📊 실행 결과 기록

```
Phase 5 마이그레이션 실행 - $(date)

실행자: _________________
실행 환경: [ ] 프로덕션 [ ] 스테이징
실행 방법: [ ] Dashboard [ ] SQL Editor [ ] CLI

실행 시간:
  - 시작: _________________
  - 종료: _________________
  - 소요: ____분

결과:
  - 테이블 생성: [ ] 성공 [ ] 일부 실패 [ ] 전체 실패
  - RLS 정책: [ ] 성공 [ ] 일부 실패
  - 함수/뷰: [ ] 성공 [ ] 일부 실패
  - 시드 데이터: [ ] 성공 [ ] 실패
  - 기존 시스템: [ ] 정상 [ ] 오류 발생

문제 발생 시:
  - 문제 내용: _________________
  - 롤백 여부: [ ] 예 [ ] 아니오
  - 롤백 방법: _________________

다음 단계:
  [ ] D1 프론트엔드 구현 시작
  [ ] 사용자 알림 (완료)
  [ ] 모니터링 계속
```

---

## 🔄 실행 후 모니터링 (24시간)

### 모니터링 항목

```sql
-- 1. Cron Jobs 실행 로그 (매일 새벽 1시 이후 확인)
SELECT jobname, last_run, next_run, status
FROM cron.job_run_details
WHERE jobname IN (
  'anonymize-emotions-daily',
  'purge-anonymized-monthly',
  'purge-event-logs-weekly'
)
ORDER BY last_run DESC
LIMIT 10;

-- 2. event_log 확인 (감사 로그)
SELECT table_name, action, occurred_at
FROM event_log
ORDER BY occurred_at DESC
LIMIT 20;

-- 3. 오류 로그 (Supabase 대시보드)
# Logs → Database → Errors
```

**체크 (매일 1회):**
- [ ] Cron Jobs 정상 실행
- [ ] 오류 로그 없음
- [ ] 기존 시스템 정상 동작

---

## 🚨 실행 실패 시 대응

**즉시 롤백 (PHASE_5_ROLLBACK_PLAN.md 참조)**

```bash
# 1. 백업 파일 확인
ls -lh backups/pre-phase5-backup-*.json

# 2. 롤백 스크립트 실행
psql -h HOST -U USER -d DATABASE < docs/rollback.sql

# 3. 기존 시스템 복구 확인
```

---

## 📞 실행 중 문제 발생 시

**연락처:**
- Supabase Support: https://supabase.com/support
- 개발팀: [연락처]
- GitHub Issues: [프로젝트 Issues]

---

**최종 수정일:** 2025-10-24
**문서 버전:** 1.0
**검토자:** -
