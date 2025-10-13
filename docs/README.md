# 📚 프로젝트 문서 색인

**업데이트**: 2025-10-13
**구조**: 체계적 정리 완료 + API 문서 추가

---

## 📂 폴더 구조

```
docs/
├── 00-overview/          # 전체 개요 및 기술 명세
├── 01-architecture/      # 아키텍처 설계 문서
├── 02-active/            # 현재 진행 중인 작업
├── 03-deployment/        # 배포 및 운영 가이드
├── 04-completed/         # 완료된 작업 아카이브
│   ├── phase0/          # Phase 0 (스키마 생성)
│   ├── phase1/          # Phase 1 (읽기 전환)
│   ├── issues/          # 해결된 이슈들
│   └── setup/           # 설정 완료 문서
├── 05-reviews/           # 주간 리뷰 및 계획
├── 06-future/            # 미래 개발 계획
├── api/                  # 🆕 API 문서 (Agent 개발)
│   ├── README.md        # API 문서 색인
│   ├── templates-api.md # Template CRUD API
│   ├── statistics-api.md # Statistics API
│   └── discord-api.md   # Discord Bot API
├── AGENT_PROGRESS.md     # 🆕 Agent 개발 진행 상황
└── GIT_BRANCH_STATUS.md  # 🆕 Git 브랜치 상태 보고
```

---

## 🎯 현재 작업

### Phase 2: 쓰기 작업 전환
**상태**: Day 2 완료, Day 3~5 대기 중

**핵심 문서**:
1. **[PHASE_2_PLAN.md](02-active/PHASE_2_PLAN.md)** ⭐
   - Phase 2 전체 계획 (Day 1~5)
   - 상세 구현 가이드
   - 테스트 시나리오

2. **[PHASE_2_DAY_2_COMPLETE.md](02-active/PHASE_2_DAY_2_COMPLETE.md)** ✅
   - Day 2 완료 보고서
   - 코드 변경사항
   - 다음 단계

3. **[PHASE_2_DAY_2_TEST_GUIDE.md](02-active/PHASE_2_DAY_2_TEST_GUIDE.md)** 📋
   - 웹앱 테스트 가이드
   - 4개 테스트 시나리오
   - 문제 해결 방법

4. **[BACKFILL_STATUS.md](02-active/BACKFILL_STATUS.md)** 📊
   - 백필 진행 상황 (75%)
   - 데이터 마이그레이션 현황

5. **[MANUAL_DEPLOYMENT_REQUIRED.md](02-active/MANUAL_DEPLOYMENT_REQUIRED.md)** ⚠️
   - 수동 배포 필요 사항
   - Migration 013 완료 ✅

### 🤖 Parallel Agent Development (NEW)
**상태**: Day 2 진행 중
**기간**: 2025-10-14 ~ 2025-10-18 (5일)

**핵심 문서**:
1. **[AGENT_PROGRESS.md](AGENT_PROGRESS.md)** 📊 - 전체 진행 상황 추적
2. **[GIT_BRANCH_STATUS.md](GIT_BRANCH_STATUS.md)** 🌿 - Git 브랜치 상태 보고
3. **[api/README.md](api/README.md)** 📚 - API 문서 색인

**개발 중인 기능**:
- 🤖 Agent 1: Discord Bot (MVP)
- 📊 Agent 2: Statistics & Analytics
- 🎨 Agent 3: Template System
- 📝 Agent 4: Documentation & Testing

---

## 📖 주요 문서 가이드

### 프로젝트 이해하기
1. **[TECH_SPEC.md](00-overview/TECH_SPEC.md)** - 프로젝트 전체 기술 명세
2. **[DB_MIGRATION_PLAN_V2.md](00-overview/DB_MIGRATION_PLAN_V2.md)** - 마이그레이션 전략
3. **[PHASE_2_ARCHITECTURE.md](01-architecture/PHASE_2_ARCHITECTURE.md)** - Phase 2 아키텍처

### 개발 시작하기
1. **루트 [README.md](../README.md)** - 프로젝트 설정 및 실행 방법
2. **[CLAUDE.md](../CLAUDE.md)** - Claude Code 작업 지침
3. **[MCP_SETUP_GUIDE.md](04-completed/setup/MCP_SETUP_GUIDE.md)** - MCP 서버 설정

### 배포하기
1. **[DEPLOY_MIGRATION_013.md](03-deployment/DEPLOY_MIGRATION_013.md)** - Migration 013 배포
2. **[DAY_1_2_DEPLOYMENT_GUIDE.md](03-deployment/DAY_1_2_DEPLOYMENT_GUIDE.md)** - Day 1-2 배포 가이드
3. **[MIGRATION_USER_SETUP.md](03-deployment/MIGRATION_USER_SETUP.md)** - 사용자 설정

---

## 📊 Phase별 진행 상황

### Phase 0: 스키마 생성 및 백필 ✅ 완료
**기간**: ~1주 (목표 2주)
**문서**: [docs/04-completed/phase0/](04-completed/phase0/)

- [x] 새 스키마 생성 (children, weeks, habits, habit_records)
- [x] 백필 자동화 스크립트
- [x] 백필 75% 완료 (18/24 weeks)
- [x] 회고: [PHASE0_RETROSPECTIVE.md](04-completed/phase0/PHASE0_RETROSPECTIVE.md)

### Phase 1: 읽기 작업 전환 ✅ 완료
**기간**: 1일 (목표 4주)
**문서**: [docs/04-completed/phase1/](04-completed/phase1/)

- [x] database-new.js 생성 (신 스키마 읽기)
- [x] App.jsx 읽기 함수 전환
- [x] Edge Function 배포
- [x] 완료 보고서: [PHASE1_DAY1_COMPLETE.md](04-completed/phase1/PHASE1_DAY1_COMPLETE.md)

### Phase 2: 쓰기 작업 전환 🔄 진행 중 (Day 2 완료)
**기간**: Day 2/5 완료 (목표 3주)
**문서**: [docs/02-active/](02-active/)

- [x] **Day 1**: 읽기 작업 신 스키마 전환
- [x] **Day 2**: 쓰기 작업 Edge Function 전환 ← **현재 위치**
  - [x] saveData() Edge Function 전환
  - [x] updateHabitColor() Edge Function 전환
  - [x] Migration 013 배포 (idempotency_log)
- [ ] **Day 3**: 웹앱 테스트 및 버그 수정
- [ ] **Day 4**: RLS 활성화
- [ ] **Day 5**: 최종 검증 및 문서화

### Phase 3: 추가 기능 🔄 진행 중 (Agent 병렬 개발)
**예상 기간**: 5일 (2025-10-14 ~ 2025-10-18)
**계획**: Parallel Agent Development

**진행 상황**:
- [x] Agent 1 Day 1: Discord Bot 초기 설정 ✅
- [x] Agent 2 Day 1-2: Statistics Library 완성 ✅
- [x] Agent 3 Day 1: Template CRUD 완성 ✅
- [x] Agent 4 Day 1: Test & Doc 구조 ✅
- [ ] Agent 1 Day 2: Slash Commands 구현 (진행 중)
- [ ] Agent 4 Day 2: API 문서 작성 (진행 중)

**상세 진행 상황**: [AGENT_PROGRESS.md](AGENT_PROGRESS.md)

---

## 🔍 문서 검색 팁

### 특정 주제 찾기
- **데이터베이스 스키마**: [DB_MIGRATION_PLAN_V2.md](00-overview/DB_MIGRATION_PLAN_V2.md)
- **Edge Function**: [PHASE_2_PLAN.md](02-active/PHASE_2_PLAN.md)
- **React Query**: [REACT_QUERY_CONVENTIONS.md](01-architecture/REACT_QUERY_CONVENTIONS.md)
- **Realtime**: [REALTIME_STRATEGY.md](01-architecture/REALTIME_STRATEGY.md)
- **배포**: [docs/03-deployment/](03-deployment/)
- **이슈 해결**: [docs/04-completed/issues/](04-completed/issues/)

### 🆕 Agent 개발 관련
- **전체 진행 상황**: [AGENT_PROGRESS.md](AGENT_PROGRESS.md)
- **Git 브랜치 상태**: [GIT_BRANCH_STATUS.md](GIT_BRANCH_STATUS.md)
- **Templates API**: [api/templates-api.md](api/templates-api.md)
- **Statistics API**: [api/statistics-api.md](api/statistics-api.md)
- **Discord Bot API**: [api/discord-api.md](api/discord-api.md)

### 작업 이력 보기
- **Phase 0**: [docs/04-completed/phase0/](04-completed/phase0/)
- **Phase 1**: [docs/04-completed/phase1/](04-completed/phase1/)
- **Week 1 리뷰**: [WEEK1_REVIEW.md](05-reviews/WEEK1_REVIEW.md)
- **Week 2 계획**: [WEEK2_PLAN.md](05-reviews/WEEK2_PLAN.md)

---

## 🛠️ 유용한 스크립트

### 데이터베이스 확인
```bash
# 전체 상태 확인
node scripts/check-database-status.js

# Idempotency 로그 확인
node scripts/check-idempotency-logs.js

# Drift 검증
node scripts/validate-zero-drift.js
```

### 백필 관련
```bash
# 백필 상태 확인
node scripts/verify-backfill.js

# Children/Weeks 백필
node scripts/backfill-children-weeks.js

# Habits/Records 백필
node scripts/backfill-habits-records.js
```

---

## 📝 문서 업데이트 규칙

1. **현재 작업 문서**: `docs/02-active/`에 유지
2. **완료된 작업**: `docs/04-completed/` 해당 Phase로 이동
3. **새 Phase 시작**: `docs/02-active/`에 새 문서 생성
4. **주간 리뷰**: `docs/05-reviews/`에 추가

---

## 🤝 기여 가이드

1. 새 문서 작성 시 이 README 업데이트
2. 문서 이동 시 링크 업데이트
3. 완료된 Phase는 아카이브로 이동
4. Git 커밋에 문서 변경사항 포함

---

**마지막 업데이트**: 2025-10-12
**담당자**: Development Team
**문의**: 프로젝트 관련 문의는 Issue 생성
