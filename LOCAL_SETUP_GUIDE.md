# Phase 5 로컬 환경 설정 가이드

**작성일:** 2025-10-25
**목적:** 로컬 PC에서 Phase 5 마이그레이션을 안전하게 실행하기 위한 단계별 가이드

---

## 📋 사전 준비 상태 확인

### ✅ 이미 GitHub에 준비된 것들

다음 파일들이 이미 Git에 커밋되어 있습니다:

**마이그레이션 파일 (10개):**
- `supabase/migrations/20251024_001_phase5_extend_children.sql`
- `supabase/migrations/20251024_002_phase5_create_goals.sql`
- `supabase/migrations/20251024_003_phase5_create_mandala_charts.sql`
- `supabase/migrations/20251024_004_phase5_create_weaknesses.sql`
- `supabase/migrations/20251024_005_phase5_create_reward_system.sql`
- `supabase/migrations/20251024_006_phase5_create_permission_system.sql`
- `supabase/migrations/20251024_007_phase5_create_remaining_tables.sql`
- `supabase/migrations/20251024_008_phase5_helper_functions.sql`
- `supabase/migrations/20251024_009_phase5_parent_rls_and_views.sql`
- `supabase/migrations/20251024_010_phase5_seed_data.sql`

**스크립트 (2개):**
- `scripts/verify-phase5-migrations.cjs` - 마이그레이션 검증
- `scripts/backup-database-phase5.cjs` - 데이터베이스 백업

**문서 (6개):**
- `docs/00-overview/PHASE_5_LEARNING_MODE_ERD_V2.md` - ERD 설계
- `docs/00-overview/PHASE_5_DECISION_GUIDE.md` - 의사결정 가이드
- `docs/00-overview/PHASE_5_ROLLBACK_PLAN.md` - 롤백 계획
- `docs/00-overview/PHASE_5_MIGRATION_EXECUTION_CHECKLIST.md` - 실행 체크리스트
- `docs/00-overview/PHASE_5_PRE_MIGRATION_USER_GUIDE.md` - 사전 마이그레이션 가이드
- `PHASE_5_STATUS.md` - 현재 상태 요약

**타입 정의:**
- `src/types/phase5.ts` - TypeScript 타입 정의 (17개 인터페이스)

---

## 🖥️ 로컬 PC에서 할 작업 (단계별)

### 1단계: Git Pull 받기 (1분)

```bash
# 최신 코드 받기
git checkout claude/design-weekly-planner-erd-011CURPxNjbftZoQeMTKNVky
git pull origin claude/design-weekly-planner-erd-011CURPxNjbftZoQeMTKNVky

# 또는 main 브랜치에 머지되었다면
git checkout main
git pull origin main
```

### 2단계: 환경 변수 설정 (2분)

```bash
# .env.example을 복사해서 .env 생성
cp .env.example .env

# .env 파일 편집 (편집기 선택)
nano .env
# 또는
code .env  # VSCode 사용 시
```

**`.env` 파일에 입력할 내용:**

```env
# Supabase 정보 (필수)
VITE_SUPABASE_URL=https://여기에실제URL.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.실제키입력...

# 나머지는 백업에 불필요 (비워두어도 됨)
SUPABASE_ACCESS_TOKEN=
GITHUB_TOKEN=
VITE_DISCORD_WEBHOOK_URL=
```

**Supabase 정보 찾는 방법:**
1. Netlify 대시보드 → Site configuration → Environment variables에서 복사
2. 또는 Supabase 대시보드 → Settings → API에서 직접 가져오기

**확인:**
```bash
# 환경 변수가 제대로 로드되는지 확인
node -e "require('dotenv').config(); console.log('URL:', process.env.VITE_SUPABASE_URL ? '✅ 설정됨' : '❌ 누락');"
```

### 3단계: 의존성 설치 확인 (1분)

```bash
# dotenv가 설치되어 있는지 확인
npm list dotenv

# 없으면 설치
npm install --save-dev dotenv
```

### 4단계: 마이그레이션 파일 검증 (1분)

```bash
# 검증 스크립트 실행
node scripts/verify-phase5-migrations.cjs
```

**예상 출력:**
```
🔍 Phase 5 마이그레이션 검증 시작...

📂 1. 파일 존재 여부 확인
  ✅ 001_phase5_extend_children.sql 존재
  ✅ 002_phase5_create_goals.sql 존재
  ... (총 10개)

🔍 2. SQL 문법 기본 검증
  ✅ 10개 파일 검증 완료

🔗 3. 의존성 순서 확인
  ✅ 의존성 체크 성공

📋 4. 테이블 이름 중복 체크
  ✅ 11개 테이블 확인 (중복: 0)

🔒 5. RLS 정책 확인
  ✅ RLS 활성화: 9개
  ✅ 정책 수: 32개

============================================================
✅ 검증 성공! 마이그레이션 실행 가능합니다.
```

### 5단계: 데이터베이스 백업 (5분)

```bash
# 백업 스크립트 실행
node scripts/backup-database-phase5.cjs
```

**예상 출력:**
```
🔄 Phase 5 마이그레이션 전 데이터베이스 백업 시작...

📦 children 백업 중...
  ✅ 3개 행 백업 완료
📦 weeks 백업 중...
  ✅ 10개 행 백업 완료
📦 habits 백업 중...
  ✅ 70개 행 백업 완료
📦 habit_records 백업 중...
  ✅ 300개 행 백업 완료
📦 habit_templates 백업 중...
  ✅ 5개 행 백업 완료
📦 notifications 백업 중...
  ✅ 2개 행 백업 완료

============================================================
📊 백업 결과 요약

  총 390개 행 백업 완료

💾 백업 파일: backups/pre-phase5-backup-2025-10-25T12-30-45-123Z.json
  파일 크기: 125.43 KB
============================================================

✅ 백업 성공!
```

**백업 파일 확인:**
```bash
# 백업 파일 존재 확인
ls -lh backups/pre-phase5-backup-*.json

# 백업 파일 안전한 곳에 복사 (중요!)
cp backups/pre-phase5-backup-*.json ~/Desktop/
# 또는 외장 드라이브, 클라우드 등
```

### 6단계: Supabase 대시보드에서 마이그레이션 실행 (15분)

**방법 1: Supabase 대시보드 UI 사용 (추천 🟢 안전)**

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 → **SQL Editor**
   - "New query" 클릭

3. **마이그레이션 파일 실행 (001부터 010까지 순서대로)**

   **001번 실행:**
   ```sql
   -- supabase/migrations/20251024_001_phase5_extend_children.sql 파일 내용 복사
   -- SQL Editor에 붙여넣기
   -- "Run" 버튼 클릭
   ```

   **예상 출력:**
   ```
   Success. No rows returned
   ```

   **002번 실행:**
   ```sql
   -- supabase/migrations/20251024_002_phase5_create_goals.sql 파일 내용 복사
   -- SQL Editor에 붙여넣기
   -- "Run" 버튼 클릭
   ```

   **이런 식으로 010번까지 반복 실행**

4. **각 파일 실행 후 확인 사항**
   - ✅ "Success" 메시지 확인
   - ❌ 오류 발생 시 즉시 중단하고 롤백 (아래 참조)

**방법 2: Supabase CLI 사용 (고급 사용자)**

```bash
# Supabase CLI 설치 (없다면)
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

### 7단계: 마이그레이션 검증 (30분)

**7-1. 테이블 생성 확인 (SQL Editor에서 실행)**

```sql
-- 1. 전체 테이블 수 확인
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- 예상: 17개 (기존 6 + 신규 11)

-- 2. 신규 테이블 목록 확인
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- 예상: children, event_log, goals, habit_records, habit_templates,
--       habits, mandala_charts, notifications, parent_child_links,
--       praise_messages, progress_events, reward_definitions,
--       rewards_ledger, share_scopes, time_allocations, weaknesses, weeks

-- 3. children 테이블 확장 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'children'
AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name');
-- 예상: 5개 행
```

**7-2. RLS 정책 확인**

```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- 예상: goals, mandala_charts, weaknesses 등 9개 테이블이 rowsecurity = true

-- 정책 수 확인
SELECT COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public';
-- 예상: 32개 이상
```

**7-3. 기존 시스템 동작 확인 (로컬 앱 실행)**

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

**테스트 체크리스트:**
- [ ] 로그인 성공
- [ ] 자녀 목록 조회 성공
- [ ] 주간 데이터 로드 성공
- [ ] 습관 기록 저장 성공
- [ ] 대시보드 조회 성공 (Comparison/Trends/Self-Awareness/Monthly)
- [ ] 브라우저 콘솔 오류 없음

---

## 🚨 문제 발생 시 롤백 방법

### 즉시 롤백 (Supabase SQL Editor)

```sql
-- 신규 테이블 삭제 (역순으로!)
DROP TABLE IF EXISTS event_log CASCADE;
DROP TABLE IF EXISTS time_allocations CASCADE;
DROP TABLE IF EXISTS praise_messages CASCADE;
DROP TABLE IF EXISTS share_scopes CASCADE;
DROP TABLE IF EXISTS parent_child_links CASCADE;
DROP TABLE IF EXISTS rewards_ledger CASCADE;
DROP TABLE IF EXISTS progress_events CASCADE;
DROP TABLE IF EXISTS reward_definitions CASCADE;
DROP TABLE IF EXISTS weaknesses CASCADE;
DROP TABLE IF EXISTS mandala_charts CASCADE;
DROP TABLE IF EXISTS goals CASCADE;

-- children 확장 필드 제거 (선택)
ALTER TABLE children DROP COLUMN IF EXISTS age_group CASCADE;
ALTER TABLE children DROP COLUMN IF EXISTS birthday CASCADE;
ALTER TABLE children DROP COLUMN IF EXISTS learning_mode_enabled CASCADE;
ALTER TABLE children DROP COLUMN IF EXISTS grade CASCADE;
ALTER TABLE children DROP COLUMN IF EXISTS school_name CASCADE;

-- 헬퍼 함수 삭제
DROP FUNCTION IF EXISTS anonymize_old_emotion_data() CASCADE;
DROP FUNCTION IF EXISTS delete_my_emotion_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS purge_old_anonymized_data() CASCADE;
DROP FUNCTION IF EXISTS is_guardian(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS has_scope(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS purge_old_event_logs() CASCADE;
DROP FUNCTION IF EXISTS update_age_group_from_birthday() CASCADE;
DROP FUNCTION IF EXISTS batch_update_age_groups() CASCADE;

-- Cron Jobs 삭제
SELECT cron.unschedule('anonymize-emotions-daily');
SELECT cron.unschedule('purge-anonymized-monthly');
SELECT cron.unschedule('purge-event-logs-weekly');

-- 부모용 뷰 삭제
DROP VIEW IF EXISTS v_emotion_summary CASCADE;
DROP VIEW IF EXISTS v_weakness_summary CASCADE;
DROP VIEW IF EXISTS v_goal_progress_summary CASCADE;
DROP VIEW IF EXISTS v_mandala_summary CASCADE;
```

**상세 롤백 계획:** `docs/00-overview/PHASE_5_ROLLBACK_PLAN.md` 참조

---

## 📚 참고 문서 (로컬에 있음)

### 필수 문서
- `PHASE_5_STATUS.md` - 전체 상태 요약 ⭐
- `docs/00-overview/PHASE_5_PRE_MIGRATION_USER_GUIDE.md` - 사전 가이드
- `docs/00-overview/PHASE_5_LEARNING_MODE_ERD_V2.md` - ERD 설계
- `docs/00-overview/PHASE_5_ROLLBACK_PLAN.md` - 롤백 계획

### 개발 참고
- `src/types/phase5.ts` - TypeScript 타입 정의
- `docs/00-overview/PHASE_5_MIGRATION_EXECUTION_CHECKLIST.md` - 상세 체크리스트

---

## ✅ 완료 체크리스트

**사전 준비:**
- [ ] Git pull 완료
- [ ] .env 파일 생성 및 설정
- [ ] dotenv 설치 확인
- [ ] 검증 스크립트 실행 (✅ 통과)
- [ ] 백업 스크립트 실행 (✅ 성공)
- [ ] 백업 파일 안전한 곳에 복사

**마이그레이션 실행:**
- [ ] 001: children 확장 실행 완료
- [ ] 002: goals 테이블 생성 완료
- [ ] 003: mandala_charts 테이블 생성 완료
- [ ] 004: weaknesses 테이블 생성 완료
- [ ] 005: reward_system 3테이블 생성 완료
- [ ] 006: permission_system 2테이블 생성 완료
- [ ] 007: praise/time/event_log 생성 완료
- [ ] 008: 헬퍼 함수 생성 완료
- [ ] 009: 부모 RLS + 뷰 생성 완료
- [ ] 010: 시드 데이터 삽입 완료

**검증:**
- [ ] 테이블 17개 확인
- [ ] RLS 정책 32개 확인
- [ ] 기존 앱 동작 확인 (로그인/데이터 조회/저장)
- [ ] 콘솔 오류 없음

---

**최종 수정일:** 2025-10-25
**문서 버전:** 1.0
