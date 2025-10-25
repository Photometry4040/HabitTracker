# Phase 5 마이그레이션 사전 준비 가이드 (사용자 실행용)

**작성일:** 2025-10-25
**목적:** 사용자가 직접 실행할 안전한 마이그레이션 준비 단계

---

## ✅ 이미 완료된 작업 (자동화)

다음 작업은 이미 완료되어 Git에 커밋되었습니다:

### D0: 데이터베이스 스키마 설계
- ✅ 10개 마이그레이션 파일 생성 (1,500+ 줄 SQL)
  - `001_phase5_extend_children.sql` ~ `010_phase5_seed_data.sql`
- ✅ TypeScript 타입 정의 (`src/types/phase5.ts`)
- ✅ 검증 스크립트 생성 및 테스트 통과
  - `scripts/verify-phase5-migrations.cjs` (✅ 13개 통과, ⚠️ 1개 경고)
- ✅ 백업 스크립트 생성 (`scripts/backup-database-phase5.cjs`)
- ✅ 롤백 계획서 작성 (`PHASE_5_ROLLBACK_PLAN.md`)
- ✅ 실행 체크리스트 작성 (`PHASE_5_MIGRATION_EXECUTION_CHECKLIST.md`)

**검증 결과:**
```
✅ 통과: 13개
  ✅ 1. 001_phase5_extend_children.sql 존재
  ✅ 2. 002_phase5_create_goals.sql 존재
  ... (10개 파일 모두 확인)
  ✅ 의존성 순서 올바름
  ✅ 11개 테이블 중복 없음

⚠️ 경고: 1개 (의도적 설계)
  ⚠️ RLS 미활성화 테이블: reward_definitions, event_log
  (이유: 전역 참조 테이블, 사용자별 데이터 아님)

💾 테이블 목록:
  children (확장), event_log, goals, mandala_charts, parent_child_links,
  praise_messages, progress_events, reward_definitions, rewards_ledger,
  share_scopes, time_allocations, weaknesses

📊 RLS 정책: 32개 이상
```

---

## 🔧 사용자가 실행할 작업

### 1️⃣ 환경 변수 설정 확인 (2분)

**목적:** 백업 스크립트 실행을 위한 Supabase 연결 확인

```bash
# .env 파일 생성 (아직 없다면)
cat > .env << 'EOF'
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# 예시:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**확인 방법:**
1. Supabase 대시보드 → Settings → API
2. `Project URL`을 `VITE_SUPABASE_URL`에 복사
3. `anon public`을 `VITE_SUPABASE_ANON_KEY`에 복사

---

### 2️⃣ 데이터베이스 백업 실행 (5분)

**목적:** 마이그레이션 전 현재 데이터 안전 백업

```bash
# 백업 스크립트 실행
node scripts/backup-database-phase5.cjs

# 예상 출력:
# 🔄 Phase 5 마이그레이션 전 데이터베이스 백업 시작...
#
# 📦 children 백업 중...
#   ✅ 3개 행 백업 완료
# 📦 weeks 백업 중...
#   ✅ 10개 행 백업 완료
# 📦 habits 백업 중...
#   ✅ 70개 행 백업 완료
# 📦 habit_records 백업 중...
#   ✅ 300개 행 백업 완료
# ... (총 6개 테이블)
#
# ============================================================
# 📊 백업 결과 요약
#
#   children: 3개 행
#   weeks: 10개 행
#   habits: 70개 행
#   habit_records: 300개 행
#   habit_templates: 5개 행
#   notifications: 2개 행
#
#   총 390개 행 백업 완료
#
# 💾 백업 파일: backups/pre-phase5-backup-2025-10-25T12-30-45-123Z.json
#   파일 크기: 125.43 KB
# ============================================================
#
# ✅ 백업 성공!
```

**백업 파일 확인:**
```bash
# 백업 파일 존재 확인
ls -lh backups/pre-phase5-backup-*.json

# 백업 파일 내용 미리보기 (처음 50줄)
cat backups/pre-phase5-backup-*.json | head -50

# JSON 구조 확인 (jq 설치 시)
cat backups/pre-phase5-backup-*.json | jq '.tables | keys'
# 예상: ["children", "habit_records", "habit_templates", "habits", "notifications", "weeks"]
```

**중요:** 백업 파일을 안전한 위치에 복사해두세요 (외장 드라이브, 클라우드 등)

---

### 3️⃣ 마이그레이션 실행 결정 (사용자 판단)

이제 다음 중 하나를 선택하세요:

#### Option A: 바로 프로덕션 마이그레이션 실행 (권장 ✅)
- 조건: 백업 파일 확인 완료, 롤백 계획 숙지
- 방법: `PHASE_5_MIGRATION_EXECUTION_CHECKLIST.md` 참조
- 위험도: 🟡 중간 (철저한 준비 완료 상태)
- 소요 시간: 15분 (실행) + 30분 (검증) = 45분

#### Option B: 로컬/스테이징 환경에서 먼저 테스트
- 조건: Supabase 테스트 프로젝트 보유
- 방법: 테스트 DB에 마이그레이션 먼저 실행
- 위험도: 🟢 저위험 (프로덕션 영향 없음)
- 소요 시간: 1시간 (테스트) + 45분 (프로덕션 실행) = 1.75시간

#### Option C: 프론트엔드 개발 먼저 시작 (D1-D7)
- 조건: DB 마이그레이션 나중에 실행
- 방법: `src/types/phase5.ts`를 참고하여 UI 먼저 개발
- 위험도: 🟢 저위험 (DB 변경 없음)
- 소요 시간: D1-D7 각 6-10시간

---

## 📋 마이그레이션 실행 체크리스트 (Option A 선택 시)

### 사전 준비 (30분)

```bash
# ✅ 1. Node.js 버전 확인
node --version
# 예상: v18.x 이상

# ✅ 2. 환경 변수 확인
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
# 빈 값이 아닌지 확인

# ✅ 3. 마이그레이션 파일 존재 확인
ls -1 supabase/migrations/20251024_*.sql | wc -l
# 예상: 10

# ✅ 4. 검증 스크립트 실행
node scripts/verify-phase5-migrations.cjs
# 예상: "✅ 검증 성공! 마이그레이션 실행 가능합니다."

# ✅ 5. 백업 파일 확인
ls -lh backups/pre-phase5-backup-*.json
# 파일 크기 > 0 KB 확인
```

**체크:**
- [ ] Node.js 설치 확인
- [ ] 환경 변수 설정 확인
- [ ] Supabase 대시보드 접속 가능
- [ ] 10개 마이그레이션 파일 존재
- [ ] 검증 스크립트 통과
- [ ] 백업 파일 생성 및 안전한 위치에 복사

---

### 실행 방법 (15분)

**Supabase 대시보드 사용 (추천 🟢 안전):**

1. Supabase 대시보드 → Database → Migrations
2. "New Migration" 클릭
3. 마이그레이션 파일 업로드 (001~010 순서대로)
   - `20251024_001_phase5_extend_children.sql`
   - `20251024_002_phase5_create_goals.sql`
   - `20251024_003_phase5_create_mandala_charts.sql`
   - `20251024_004_phase5_create_weaknesses.sql`
   - `20251024_005_phase5_create_reward_system.sql`
   - `20251024_006_phase5_create_permission_system.sql`
   - `20251024_007_phase5_create_remaining_tables.sql`
   - `20251024_008_phase5_helper_functions.sql`
   - `20251024_009_phase5_parent_rls_and_views.sql`
   - `20251024_010_phase5_seed_data.sql`
4. 각 파일 실행 후 성공 메시지 확인
5. 오류 발생 시 즉시 중단하고 롤백 계획 참조

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

### 실행 후 검증 (30분)

**1. 테이블 생성 확인 (SQL Editor):**
```sql
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

**2. RLS 정책 확인:**
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

**3. 기존 시스템 동작 확인:**
```bash
# 프론트엔드 실행
npm run dev

# 브라우저에서 테스트:
# 1. 로그인 ✓
# 2. 자녀 목록 조회 ✓
# 3. 주간 데이터 로드 ✓
# 4. 습관 기록 저장 ✓
# 5. 대시보드 조회 (Comparison/Trends/Self-Awareness/Monthly) ✓
# 6. 콘솔 오류 확인 (DevTools → Console)
```

**체크:**
- [ ] 총 테이블 수: 17개 (기존 6 + 신규 11)
- [ ] 신규 테이블 11개 존재
- [ ] children 확장 컬럼 5개 존재
- [ ] RLS 활성화: 9개 테이블
- [ ] 정책 수: 32개 이상
- [ ] 로그인 성공
- [ ] 기존 데이터 조회 성공
- [ ] 습관 기록 저장 성공
- [ ] 대시보드 로딩 성공
- [ ] 콘솔 오류 없음

---

## 🚨 문제 발생 시 대응

### 즉시 롤백 (PHASE_5_ROLLBACK_PLAN.md 참조)

**롤백 절차:**
1. 백업 파일 확인: `ls -lh backups/pre-phase5-backup-*.json`
2. Supabase SQL Editor에서 신규 테이블 삭제 (역순):
```sql
-- event_log → time_allocations → praise_messages → share_scopes
-- → parent_child_links → rewards_ledger → progress_events
-- → reward_definitions → weaknesses → mandala_charts → goals

DROP TABLE IF EXISTS event_log CASCADE;
DROP TABLE IF EXISTS time_allocations CASCADE;
DROP TABLE IF EXISTS praise_messages CASCADE;
-- ... (PHASE_5_ROLLBACK_PLAN.md의 전체 순서 참조)

-- children 확장 필드 제거 (선택)
ALTER TABLE children DROP COLUMN IF EXISTS age_group;
ALTER TABLE children DROP COLUMN IF EXISTS birthday;
-- ...
```
3. 기존 시스템 복구 확인 (`npm run dev` 실행)

---

## 📞 지원 및 문의

**문제 발생 시:**
- Supabase Support: https://supabase.com/support
- GitHub Issues: [프로젝트 Issues]
- 개발팀: [연락처]

---

## 다음 단계 (마이그레이션 성공 후)

### D1-D7 프론트엔드 구현 (44-58시간)

- **D1:** Age Group & Learning Mode UI (6-8h)
- **D2:** Goal Setting UI (6-8h)
- **D3:** Weakness Management UI (6-8h)
- **D4:** Mandala Chart 9-cell UI (8-10h)
- **D5:** Reward System UI (6-8h)
- **D6:** Permission & Praise UI (6-8h)
- **D7:** Integration Testing (6-8h)

**참고 문서:**
- `docs/00-overview/PHASE_5_LEARNING_MODE_ERD_V2.md` - 전체 설계
- `src/types/phase5.ts` - TypeScript 타입 정의
- `PHASE_5_MIGRATION_EXECUTION_CHECKLIST.md` - 상세 실행 가이드

---

**최종 수정일:** 2025-10-25
**문서 버전:** 1.0
**검토자:** Claude Code Assistant
