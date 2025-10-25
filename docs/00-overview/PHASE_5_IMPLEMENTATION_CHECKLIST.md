# Phase 5 MVP 5.1 구현 체크리스트

**작성일:** 2025-10-24
**목적:** D0~D7 단계별 작업 목록 및 완료 조건

---

## 📅 D0: 스키마 준비 (6~8시간)

### 작업 목록
- [ ] 17개 테이블 DDL 스크립트 작성
  - [ ] `children` 확장
  - [ ] `goals`
  - [ ] `mandala_charts`
  - [ ] `weaknesses`
  - [ ] `time_allocations`
  - [ ] `reward_definitions`
  - [ ] `progress_events`
  - [ ] `rewards_ledger`
  - [ ] `parent_child_links`
  - [ ] `share_scopes`
  - [ ] `praise_messages`
  - [ ] `event_log`
- [ ] RLS 정책 SQL 작성 (전체 테이블)
- [ ] 헬퍼 함수 작성
  - [ ] `anonymize_old_emotion_data()`
  - [ ] `delete_my_emotion_data(p_child_id)`
  - [ ] `purge_old_anonymized_data()`
  - [ ] `is_guardian(p_user_id, p_child_id)`
  - [ ] `has_scope(p_user_id, p_child_id, p_scope)`
- [ ] 테스트 시드 데이터 생성
- [ ] Supabase 마이그레이션 실행

### 완료 조건
- ✅ 모든 테이블 생성 확인
- ✅ RLS 활성화 확인 (`SELECT tablename, rowsecurity FROM pg_tables`)
- ✅ 인덱스 생성 확인
- ✅ 시드 데이터 3개 이상 (초등/중고/성인)

---

## 📅 D1: 나이대 & 학습 모드 (6~8시간)

### 작업 목록
- [ ] `children` 테이블 확장 적용
- [ ] 나이대 자동 전환 함수
  ```sql
  CREATE OR REPLACE FUNCTION update_age_group_from_birthday()
  RETURNS TRIGGER AS $$
  BEGIN
    -- 나이 계산 및 age_group 업데이트 로직
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- [ ] 학습 모드 토글 UI (대시보드)
  - [ ] Switch 컴포넌트
  - [ ] 학습 모드 ON일 때 메뉴 표시
- [ ] 백엔드 API 연결
  - [ ] `updateLearningMode(childId, enabled)`

### 완료 조건
- ✅ 생일 입력 시 `age_group` 자동 업데이트
- ✅ 토글 ON/OFF 동작 확인
- ✅ 학습 모드 메뉴 표시/숨김

---

## 📅 D2: 목표 설정 (6~8시간)

### 작업 목록
- [ ] `goals` 테이블 백엔드 CRUD
  - [ ] `createGoal(data)`
  - [ ] `updateGoal(id, data)`
  - [ ] `deleteGoal(id)`
  - [ ] `loadGoals(childId)`
- [ ] 목표 설정 UI
  - [ ] 목표 입력 폼 (title, metric_type, target_value, due_date)
  - [ ] ICE 점수 입력 (고등학생/성인만)
  - [ ] 목표 계층 구조 표시
- [ ] 목표-습관 연결 UI

### 완료 조건
- ✅ 목표 생성/수정/삭제 동작
- ✅ ICE 점수 자동 계산 확인
- ✅ 계층 구조 (parent_goal_id) 동작
- ✅ 목표 목록 정렬 (ICE 점수순)

---

## 📅 D3: 약점 관리 (6~8시간)

### 작업 목록
- [ ] `weaknesses` 테이블 백엔드 CRUD
  - [ ] `createWeakness(data)`
  - [ ] `updateWeakness(id, data)`
  - [ ] `markResolved(id)`
  - [ ] `loadWeaknesses(childId)`
- [ ] 약점 기록 폼 UI
  - [ ] 원인 선택 (cause_type)
  - [ ] 감정 선택 (emotion)
  - [ ] 메모 입력 (weakness_note)
  - [ ] If-Then 계획 (improvement_plan)
- [ ] 재시도 예약 기능
  - [ ] "48시간 후 재시도" 버튼
  - [ ] 캘린더에서 재시도 일정 표시

### 완료 조건
- ✅ 약점 기록 생성 동작
- ✅ 감정 선택 및 저장 확인
- ✅ 재시도 예약 시간 저장
- ✅ 알림 큐 연결 (선택)

---

## 📅 D4: 만다라트 차트 (8~10시간)

### 작업 목록
- [ ] `mandala_charts` 테이블 백엔드 CRUD
  - [ ] `createMandala(data)`
  - [ ] `updateMandala(id, data)`
  - [ ] `updateNode(chartId, position, nodeData)`
  - [ ] `loadMandala(childId)`
- [ ] 만다라트 UI (9칸 기본)
  - [ ] 3x3 격자 레이아웃
  - [ ] 중앙 목표 입력
  - [ ] 8개 세부 목표 입력
  - [ ] 색상/이모지 선택
- [ ] 1단 확장 플래그 (비활성)
  - [ ] `expansion_enabled = false` 강제
  - [ ] 27칸 UI는 주석 처리
- [ ] 진행률 계산
  - [ ] `overall_completion_rate` 자동 업데이트

### 완료 조건
- ✅ 9칸 만다라트 생성 동작
- ✅ 노드 클릭 → 수정 모달
- ✅ 색상/이모지 저장 확인
- ✅ 진행률 계산 정확도
- ✅ 81칸 확장 차단 확인

---

## 📅 D5: 보상 시스템 (6~8시간)

### 작업 목록
- [ ] 3개 테이블 백엔드 CRUD
  - [ ] `reward_definitions` (시드 데이터)
  - [ ] `progress_events` 자동 생성
  - [ ] `rewards_ledger` 자동 지급
- [ ] 이벤트 감지 로직
  - [ ] 목표 완료 → `goal_completed` 이벤트
  - [ ] 약점 해결 → `weakness_resolved` 이벤트
  - [ ] 재시도 성공 → `retry_success` 이벤트
  - [ ] 연속 3/7/14일 → `streak_*` 이벤트
- [ ] 보상 지급 로직
  - [ ] 이벤트 발생 시 자동으로 `rewards_ledger` INSERT
  - [ ] 중복 방지 (UNIQUE 제약)
- [ ] 보상 알림 UI
  - [ ] 배지 획득 팝업 (애니메이션)
  - [ ] 보상 목록 페이지

### 완료 조건
- ✅ 목표 달성 시 배지 자동 지급
- ✅ 중복 지급 차단 확인
- ✅ 보상 목록 표시
- ✅ `is_new` 플래그 동작

---

## 📅 D6: 권한 관리 & 칭찬 (6~8시간)

### 작업 목록
- [ ] `parent_child_links` 테이블 CRUD
  - [ ] `createLink(parentUserId, childId, role)`
  - [ ] `deactivateLink(linkId)`
- [ ] `share_scopes` 테이블 CRUD
  - [ ] `grantScope(linkId, childId, scope)`
  - [ ] `revokeScope(scopeId)`
- [ ] 부모 읽기 전용 뷰
  - [ ] 목표 조회 (자녀의 목표 목록)
  - [ ] 약점 요약 조회 (`v_emotion_summary` 뷰)
  - [ ] 만다라트 조회
- [ ] 칭찬 메시지 기능
  - [ ] `praise_messages` CRUD
  - [ ] 템플릿 선택 UI
  - [ ] 자녀에게 알림 전송

### 완료 조건
- ✅ 부모 계정으로 자녀 목표 읽기
- ✅ 감정 원본 접근 차단 (요약만)
- ✅ 칭찬 메시지 전송 동작
- ✅ RLS 정책 동작 확인

---

## 📅 D7: 통합 테스트 (6~8시간)

### 작업 목록
- [ ] 시나리오 테스트 (3종)
  - [ ] 초등학생 시나리오 (10분)
  - [ ] 중고등학생 시나리오 (10분)
  - [ ] 부모 시나리오 (10분)
- [ ] RLS 침투 테스트
  - [ ] 비소유자 접근 차단
  - [ ] 스코프 오남용 차단
- [ ] 감정 익명화 배치 시뮬레이션
  - [ ] `SELECT anonymize_old_emotion_data()` 실행
  - [ ] 30일 전 데이터 익명화 확인
- [ ] 이벤트-보상 일관성
  - [ ] 동일 이벤트 중복 지급 0건
- [ ] 성능 테스트
  - [ ] 만다라트 100개 로딩 시간 < 2초
  - [ ] 목표 목록 정렬 < 500ms
- [ ] 버그 수정

### 완료 조건
- ✅ 시나리오 통과율 ≥ 80% (24/30)
- ✅ RLS 침투 시도 100% 차단
- ✅ 익명화 배치 정상 동작
- ✅ 성능 기준 충족
- ✅ 치명적 버그 0건

---

## 📊 완료 기준

| 항목 | 기준 |
|------|------|
| 테이블 생성 | 17개 모두 확인 |
| RLS 활성화 | 17개 모두 확인 |
| UI 동작 | 시나리오 3종 ≥ 80% |
| RLS 보안 | 침투 시도 100% 차단 |
| 감정 익명화 | 30일 전 데이터 자동 처리 |
| 보상 중복 | 0건 |
| 성능 | 주요 쿼리 < 2초 |

---

## 🚀 배포 준비

### 프로덕션 체크리스트
- [ ] Supabase 마이그레이션 스크립트 검증
- [ ] 환경 변수 설정 (Netlify/Vercel)
- [ ] Cron Job 설정 (익명화 배치)
- [ ] 백업 스크립트 준비
- [ ] 롤백 계획 수립
- [ ] 모니터링 대시보드 설정

---

**최종 수정일:** 2025-10-24
**사용법:** 각 Day의 체크박스를 완료하면서 진행
