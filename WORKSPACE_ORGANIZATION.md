# Workspace Organization

**작성일**: 2025-10-12
**목적**: 산재된 31개 문서를 체계적으로 정리하여 현재 상태 파악

---

## 📂 문서 분류

### 1️⃣ **최우선 참고 문서** (현재 작업 중)
| 파일명 | 설명 | 상태 |
|--------|------|------|
| **PHASE_2_PLAN.md** | Phase 2 상세 계획 (5일) | ✅ Active |
| **PHASE_2_DAY_2_TEST_GUIDE.md** | Day 2 테스트 가이드 | ✅ Active |
| **CLAUDE.md** | Claude Code 작업 지침 | ✅ Active |

---

### 2️⃣ **설계 및 아키텍처 문서**
| 파일명 | 설명 | 우선순위 |
|--------|------|----------|
| **TECH_SPEC.md** | 전체 프로젝트 기술 명세 | 🔴 High |
| **DB_MIGRATION_PLAN_V2.md** | DB 마이그레이션 계획 (v2) | 🔴 High |
| **PHASE_2_ARCHITECTURE.md** | Phase 2 아키텍처 | 🟡 Medium |
| **REACT_QUERY_CONVENTIONS.md** | React Query 컨벤션 | 🟢 Low |
| **REALTIME_STRATEGY.md** | Realtime 전략 | 🟢 Low |

**Action**:
- DB_MIGRATION_PLAN.md (v1) 삭제 → v2만 사용
- TECH_SPEC.md는 전체 로드맵, 실제 작업은 PHASE_2_PLAN.md 기준

---

### 3️⃣ **Phase별 작업 문서**
| Phase | 파일명 | 상태 |
|-------|--------|------|
| Phase 0 | PHASE_0_TODO.md | ✅ 완료 |
| Phase 0 | PHASE_0_PROGRESS.md | ✅ 완료 |
| Phase 0 | PHASE0_RETROSPECTIVE.md | ✅ 완료 |
| Phase 0 | CHILDREN_TABLE_DDL_SUMMARY.md | ✅ 완료 |
| Phase 1 | PHASE_1_TODO.md | ✅ 완료 |
| Phase 1 | PHASE1_DAY1_COMPLETE.md | ✅ 완료 |
| Phase 1 | PHASE_1_완료_보고서.md | ✅ 완료 |
| Phase 2 | PHASE_2_PLAN.md | 🔄 진행 중 (Day 2) |
| Phase 2 | PHASE_2_SUMMARY.md | 📖 참고용 |
| Phase 2 | PHASE_2_INDEX.md | 📖 참고용 |
| Phase 2 | PHASE_2_DAY_2_TEST_GUIDE.md | 🔄 진행 중 |

**Action**:
- Phase 0/1 완료 문서는 `docs/archive/` 폴더로 이동
- Phase 2 진행 중 문서만 루트에 유지

---

### 4️⃣ **배포 및 설정 문서**
| 파일명 | 설명 | 중요도 |
|--------|------|--------|
| **MANUAL_DEPLOYMENT_REQUIRED.md** | 수동 배포 필요 사항 | 🔴 High |
| **DAY_1_2_DEPLOYMENT_GUIDE.md** | Day 1-2 배포 가이드 | 🔴 High |
| **MIGRATION_USER_SETUP.md** | 마이그레이션 사용자 설정 | 🟡 Medium |
| **MCP_SETUP_GUIDE.md** | MCP 설정 가이드 | 🟢 Low |
| **MCP_SETUP_COMPLETE.md** | MCP 설정 완료 | ✅ 완료 |

**Action**:
- MCP_SETUP_COMPLETE.md는 `docs/completed/`로 이동
- MANUAL_DEPLOYMENT_REQUIRED.md가 가장 중요 (Migration 013 배포 필요)

---

### 5️⃣ **진행 상황 및 이슈 문서**
| 파일명 | 설명 | 상태 |
|--------|------|------|
| **BACKFILL_STATUS.md** | 백필 진행 상황 (75%) | 🔄 진행 중 |
| **데이터_로딩_문제_해결_가이드.md** | 데이터 로딩 문제 | ✅ 해결됨 |
| **데이터_로딩_문제_해결_완료.md** | 문제 해결 완료 | ✅ 완료 |
| **WEEK1_REVIEW.md** | Week 1 리뷰 | 📖 참고용 |
| **WEEK2_PLAN.md** | Week 2 계획 | 📖 참고용 |

**Action**:
- 데이터_로딩_* 문서는 `docs/archive/issues/`로 이동
- BACKFILL_STATUS.md는 중요 (현재 75%)

---

### 6️⃣ **미래 계획 문서**
| 파일명 | 설명 | 우선순위 |
|--------|------|----------|
| **HOOKS_ROADMAP.md** | 훅 로드맵 | 🟢 Low |
| **ORCHESTRATION_PLAN.md** | 오케스트레이션 계획 | 🟢 Low |

**Action**:
- `docs/future/` 폴더로 이동

---

### 7️⃣ **기타 문서**
| 파일명 | 설명 |
|--------|------|
| README.md | 프로젝트 README |
| habit_tracker_template.md | 템플릿 |

---

## 🗂️ 제안: 새로운 폴더 구조

```
/
├── README.md                          # 프로젝트 개요
├── CLAUDE.md                          # Claude 작업 지침
│
├── docs/
│   ├── 00-overview/
│   │   ├── TECH_SPEC.md               # 전체 기술 명세
│   │   └── DB_MIGRATION_PLAN_V2.md    # 마이그레이션 계획
│   │
│   ├── 01-architecture/
│   │   ├── PHASE_2_ARCHITECTURE.md
│   │   ├── REACT_QUERY_CONVENTIONS.md
│   │   └── REALTIME_STRATEGY.md
│   │
│   ├── 02-active/                     # 현재 진행 중
│   │   ├── PHASE_2_PLAN.md            # ⭐ 현재 작업
│   │   ├── PHASE_2_SUMMARY.md
│   │   ├── PHASE_2_INDEX.md
│   │   ├── PHASE_2_DAY_2_TEST_GUIDE.md
│   │   ├── BACKFILL_STATUS.md
│   │   └── MANUAL_DEPLOYMENT_REQUIRED.md
│   │
│   ├── 03-deployment/
│   │   ├── DAY_1_2_DEPLOYMENT_GUIDE.md
│   │   └── MIGRATION_USER_SETUP.md
│   │
│   ├── 04-completed/                  # 완료된 작업
│   │   ├── phase0/
│   │   │   ├── PHASE_0_TODO.md
│   │   │   ├── PHASE_0_PROGRESS.md
│   │   │   ├── PHASE0_RETROSPECTIVE.md
│   │   │   └── CHILDREN_TABLE_DDL_SUMMARY.md
│   │   ├── phase1/
│   │   │   ├── PHASE_1_TODO.md
│   │   │   ├── PHASE1_DAY1_COMPLETE.md
│   │   │   └── PHASE_1_완료_보고서.md
│   │   ├── issues/
│   │   │   ├── 데이터_로딩_문제_해결_가이드.md
│   │   │   └── 데이터_로딩_문제_해결_완료.md
│   │   └── setup/
│   │       └── MCP_SETUP_COMPLETE.md
│   │
│   ├── 05-reviews/
│   │   ├── WEEK1_REVIEW.md
│   │   └── WEEK2_PLAN.md
│   │
│   └── 06-future/
│       ├── HOOKS_ROADMAP.md
│       └── ORCHESTRATION_PLAN.md
│
├── scripts/                           # 스크립트는 그대로
└── supabase/                          # Supabase 파일은 그대로
```

---

## ⚠️ 현재 상태 요약

### ✅ 완료된 작업
1. **Phase 0**: 새 스키마 생성 완료
2. **Phase 1 Day 1**: 읽기 작업 새 스키마 전환 완료
3. **백필**: 75% 완료 (18/24 weeks 변환됨)
4. **Edge Function**: 배포 완료

### 🔄 진행 중인 작업
1. **Phase 2 Day 2**: 쓰기 작업 Edge Function 전환
   - saveData() ✅ 완료
   - updateHabitColor() ✅ 완료
   - ⚠️ **Blocker**: Migration 013 (idempotency_log) 배포 필요

### ⏸️ 대기 중인 작업
1. Migration 013 배포 (수동 배포 필요)
2. Phase 2 Day 2 테스트
3. Phase 2 Day 3-5 (RLS 활성화, 최종 검증)

---

## 🎯 즉시 해야 할 액션

### Priority 1: Migration 013 배포
**파일**: [MANUAL_DEPLOYMENT_REQUIRED.md](MANUAL_DEPLOYMENT_REQUIRED.md)
**문서**: [PHASE_2_DAY_2_TEST_GUIDE.md](PHASE_2_DAY_2_TEST_GUIDE.md)

1. Supabase SQL Editor 열기
2. `supabase/migrations/013_create_dual_write_triggers.sql` 실행
3. idempotency_log 테이블 생성 확인

### Priority 2: 워크스페이스 정리
**이 작업**: 문서들을 `docs/` 폴더 구조로 이동

### Priority 3: Phase 2 Day 2 테스트
**가이드**: [PHASE_2_DAY_2_TEST_GUIDE.md](PHASE_2_DAY_2_TEST_GUIDE.md)

---

## 📊 TECH_SPEC.md vs 실제 진행 차이

| 항목 | TECH_SPEC.md | 실제 진행 | 차이점 |
|------|--------------|----------|--------|
| Phase 0 기간 | 2주 (10일) | ~1주 완료 | ✅ 더 빠름 |
| Phase 1 방식 | 이중쓰기 먼저 | 읽기 전환 먼저 | ⚠️ 순서 변경 |
| Phase 2 내용 | 점진적 읽기 전환 | 쓰기 전환 진행 중 | ⚠️ 정의 다름 |
| 템플릿 기능 | Phase 1 Week 4 | 아직 시작 안함 | ❌ 누락 |

**결론**: TECH_SPEC.md는 "전체 로드맵"이고, PHASE_2_PLAN.md가 "실제 작업 계획"입니다.

---

**다음 단계**: 사용자에게 워크스페이스 정리를 진행할지 물어보기
