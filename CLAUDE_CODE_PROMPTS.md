# Claude Code 프롬프트 모음

**목적:** 로컬 PC에서 Claude Code를 실행할 때 사용할 프롬프트 모음

---

## 🚀 Phase 5 마이그레이션 실행 프롬프트

### 프롬프트 1: 초기 설정 및 검증

```
Phase 5 Learning Mode 마이그레이션을 로컬에서 실행하려고 합니다.

다음 단계를 순서대로 진행해주세요:

1. 현재 브랜치가 'claude/design-weekly-planner-erd-011CURPxNjbftZoQeMTKNVky'인지 확인
2. .env 파일이 있는지 확인하고, 없으면 .env.example을 복사해서 생성
3. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY가 설정되어 있는지 확인
4. dotenv 패키지가 설치되어 있는지 확인하고, 없으면 설치
5. scripts/verify-phase5-migrations.cjs 스크립트 실행해서 마이그레이션 파일 검증
6. 검증 결과 요약해주세요

참고 문서: LOCAL_SETUP_GUIDE.md
```

---

### 프롬프트 2: 백업 실행

```
Phase 5 마이그레이션 전 데이터베이스 백업을 실행하려고 합니다.

다음을 진행해주세요:

1. scripts/backup-database-phase5.cjs 스크립트 실행
2. 백업 결과 요약 (총 행 수, 파일 크기, 파일 경로)
3. 백업 파일이 제대로 생성되었는지 확인 (ls -lh backups/)
4. 백업 성공 여부 확인

문제가 발생하면 원인을 분석하고 해결 방법을 제시해주세요.
```

---

### 프롬프트 3: 마이그레이션 SQL 파일 내용 확인

```
Phase 5 마이그레이션 파일 중 [파일번호]번 파일의 내용을 확인하고 설명해주세요.

파일 경로: supabase/migrations/20251024_00[번호]_phase5_*.sql

다음 정보를 포함해서 설명해주세요:
1. 이 마이그레이션이 하는 일 (요약)
2. 생성/수정되는 테이블 또는 컬럼
3. 중요한 제약 조건 (CHECK, FOREIGN KEY 등)
4. RLS 정책 (있다면)
5. 주의사항

예시: "001번 파일을 확인하고 설명해주세요"
```

---

### 프롬프트 4: 마이그레이션 실행 후 검증

```
Phase 5 마이그레이션을 Supabase 대시보드에서 실행했습니다.

다음 검증 SQL을 실행하고 결과를 분석해주세요:

1. 전체 테이블 수 확인:
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

2. 신규 테이블 목록:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

3. children 테이블 확장 컬럼 확인:
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'children'
AND column_name IN ('age_group', 'birthday', 'learning_mode_enabled', 'grade', 'school_name');

4. RLS 활성화 확인:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

5. RLS 정책 수:
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

결과를 분석하고 마이그레이션이 성공적으로 완료되었는지 판단해주세요.
예상 결과: 테이블 17개, children 확장 컬럼 5개, RLS 정책 32개 이상
```

---

### 프롬프트 5: 기존 시스템 동작 확인

```
Phase 5 마이그레이션 후 기존 시스템이 정상 동작하는지 확인하려고 합니다.

다음을 진행해주세요:

1. npm run dev 실행해서 개발 서버 시작
2. 브라우저 콘솔에서 오류 메시지 확인
3. 다음 기능 테스트:
   - 로그인 가능 여부
   - 자녀 목록 조회
   - 주간 데이터 로드
   - 습관 기록 저장
   - 대시보드 조회 (4개 탭)

4. 문제가 발견되면 원인 분석 및 해결 방법 제시

참고: 기존 기능에 영향이 없어야 합니다 (Phase 5는 추가 기능만)
```

---

## 🛠️ Phase 5 프론트엔드 개발 프롬프트

### 프롬프트 6: D1 - Age Group & Learning Mode UI

```
Phase 5 D1: Age Group & Learning Mode UI를 개발하려고 합니다.

다음을 구현해주세요:

1. 자녀 등록/수정 폼에 다음 필드 추가:
   - 생년월일 (birthday) - Date picker
   - 학년 (grade) - 1-12 Select
   - 학교명 (school_name) - Text input
   - 학습 모드 활성화 (learning_mode_enabled) - Checkbox

2. age_group은 생년월일 기준으로 자동 계산되어야 함:
   - 6-9세: elementary_low
   - 10-12세: elementary_high
   - 13-15세: middle
   - 16-18세: high
   - 19세 이상: adult

3. 학습 모드가 비활성화된 경우 기존 UI 유지
4. 학습 모드가 활성화된 경우 새 메뉴 표시 (Goal/Weakness/Mandala)

참고:
- src/types/phase5.ts에 타입 정의 있음
- children 테이블 스키마는 001_phase5_extend_children.sql 참조
- 기존 ChildSelector.jsx 컴포넌트 확장

예상 소요 시간: 6-8시간
```

---

### 프롬프트 7: D2 - Goal Setting UI

```
Phase 5 D2: Goal Setting UI를 개발하려고 합니다.

다음을 구현해주세요:

1. Goal 목록 페이지:
   - 전체 목표 목록 (계층 구조로 표시)
   - ICE 스코어 기준 정렬
   - 완료율 표시 (progress bar)

2. Goal 생성/수정 폼:
   - 제목 (title)
   - 설명 (description)
   - 목표 유형 (metric_type): boolean/count/time/percentage
   - 목표값 (target_value), 단위 (unit)
   - ICE 점수 입력 (Impact/Confidence/Ease, 각 0-5)
   - 부모 목표 선택 (parent_goal_id) - 최대 depth 5

3. Goal 상세 페이지:
   - 진행률 차트
   - 하위 목표 목록
   - 연결된 Mandala 차트 표시

4. 데이터 CRUD:
   - Supabase goals 테이블 연동
   - RLS 정책 고려 (user_id 필터링)

참고:
- src/types/phase5.ts의 Goal 인터페이스
- 002_phase5_create_goals.sql 테이블 스키마
- Recharts로 진행률 시각화

예상 소요 시간: 6-8시간
```

---

### 프롬프트 8: D3 - Weakness Management UI

```
Phase 5 D3: Weakness Management UI를 개발하려고 합니다.

다음을 구현해주세요:

1. Weakness 목록 페이지:
   - 전체 약점 목록 (상태별 필터: detected/in_progress/resolved/archived)
   - 원인 유형별 그룹핑 (concept/procedure/attention 등)
   - 재도전 예정일 표시

2. Weakness 등록/수정 폼:
   - 제목 (title)
   - 원인 유형 (cause_type) - 7가지 선택
   - 감정 (emotion) - 7가지 선택 (joy/neutral/frustration 등)
   - 감정 노트 (emotion_note) - 30일 후 자동 익명화 안내
   - 실패 맥락 (failure_context) - JSONB
   - 재도전 일정 (retry_scheduled_at)

3. Weakness 상세 페이지:
   - 진행 상태 타임라인
   - 연결된 목표 표시
   - 정서 코칭 제안 (emotion 기반)

4. 개인정보 보호:
   - 30일 후 자동 익명화 안내 문구 표시
   - "내 감정 데이터 즉시 삭제" 버튼

참고:
- src/types/phase5.ts의 Weakness 인터페이스
- 004_phase5_create_weaknesses.sql 테이블 스키마
- 008_phase5_helper_functions.sql의 anonymize 함수

예상 소요 시간: 6-8시간
```

---

### 프롬프트 9: D4 - Mandala Chart UI

```
Phase 5 D4: Mandala Chart (9칸) UI를 개발하려고 합니다.

다음을 구현해주세요:

1. Mandala Chart 메인 페이지:
   - 3x3 그리드 레이아웃 (중앙 1칸 + 주변 8칸)
   - 각 칸에 목표 제목, 완료율 표시
   - 클릭 시 상세 보기

2. Mandala Chart 생성 폼:
   - 중심 목표 입력 (center_goal)
   - 8개 하위 목표 입력 (nodes JSONB)
   - 각 노드: title, completion_rate, expanded (boolean)

3. Mandala Chart 상세 페이지:
   - 전체 완료율 표시 (overall_completion_rate)
   - 각 노드별 진행 상황
   - 연결된 Goal 표시

4. 27칸 확장 (선택):
   - expansion_enabled = true일 때
   - 각 노드를 클릭하면 하위 3x3 그리드 표시
   - MVP 5.1에서는 27칸까지만 (81칸 비활성)

5. 시각화:
   - 색상 코딩 (완료율 기준)
   - 애니메이션 효과
   - 반응형 디자인 (모바일 대응)

참고:
- src/types/phase5.ts의 MandalaChart, MandalaNode 인터페이스
- 003_phase5_create_mandala_charts.sql 테이블 스키마
- chart_level: 'basic' (9칸) 또는 'expanded_27' (27칸)

예상 소요 시간: 8-10시간
```

---

### 프롬프트 10: D5 - Reward System UI

```
Phase 5 D5: Reward System UI를 개발하려고 합니다.

다음을 구현해주세요:

1. 보상 목록 페이지:
   - 획득한 보상 목록 (rewards_ledger)
   - 보상 유형별 필터 (badge/sticker/achievement/theme/level_up)
   - 새 보상 표시 (is_new = true)
   - 획득 날짜 표시

2. 보상 상세 페이지:
   - 보상 이미지/아이콘
   - 획득 조건 설명
   - 획득한 이벤트 정보 (source_event_id)

3. 진행 이벤트 로그:
   - progress_events 테이블 연동
   - 이벤트 타임라인 표시
   - 보상 발급 여부 표시 (reward_issued)

4. 자동 보상 발급 로직:
   - 특정 이벤트 발생 시 보상 자동 지급
   - trigger_event 매칭 (goal_completed, streak_3 등)
   - 중복 지급 방지 (UNIQUE INDEX)

참고:
- src/types/phase5.ts의 RewardDefinition, ProgressEvent, RewardLedger
- 005_phase5_create_reward_system.sql 3개 테이블 스키마
- 010_phase5_seed_data.sql의 초기 보상 정의 9개

예상 소요 시간: 6-8시간
```

---

### 프롬프트 11: D6 - Permission & Praise UI

```
Phase 5 D6: Permission & Praise UI를 개발하려고 합니다.

다음을 구현해주세요:

1. 부모-자녀 연결 관리 (부모용):
   - 자녀 초대 링크 생성
   - 연결 상태 관리 (active/inactive/pending)
   - 역할 표시 (parent/mentor/guardian)

2. 권한 설정 (부모용):
   - share_scopes 테이블 연동
   - 권한 항목별 토글:
     - read_goals: 목표 조회
     - read_weaknesses_summary: 약점 요약 조회
     - read_mandala: 만다라트 조회
     - read_habits: 습관 기록 조회
     - send_praise: 칭찬 메시지 전송
   - 권한 활성/비활성 (is_active)

3. 칭찬 메시지 (부모 → 자녀):
   - 칭찬 메시지 작성 폼
   - 연결된 목표/약점 선택 (선택사항)
   - 칭찬 유형 선택 (effort/achievement/improvement/attitude)
   - 전송 후 자녀에게 알림

4. 칭찬 수신함 (자녀용):
   - 받은 칭찬 목록
   - 읽음/안읽음 표시
   - 칭찬 유형별 통계

5. 부모용 요약 뷰:
   - v_emotion_summary, v_weakness_summary 등
   - 개인정보 제외된 요약 데이터만 표시

참고:
- src/types/phase5.ts의 ParentChildLink, ShareScope, PraiseMessage
- 006_phase5_create_permission_system.sql 2개 테이블
- 007_phase5_create_remaining_tables.sql의 praise_messages
- 009_phase5_parent_rls_and_views.sql의 부모용 뷰 4개

예상 소요 시간: 6-8시간
```

---

### 프롬프트 12: D7 - Integration Testing

```
Phase 5 D7: Integration Testing을 수행하려고 합니다.

다음을 테스트하고 결과를 보고해주세요:

1. 기능 통합 테스트:
   - 자녀 등록 → 생년월일 입력 → age_group 자동 설정 확인
   - 학습 모드 활성화 → Goal 생성 → Mandala에 연결
   - Weakness 등록 → 재도전 → 성공 → 보상 발급
   - 부모 초대 → 권한 설정 → 칭찬 메시지 전송

2. 데이터 흐름 테스트:
   - Goal 완료 → ProgressEvent 생성 → Reward 자동 발급
   - Weakness 해결 → ProgressEvent 생성 → Reward 발급
   - Streak 달성 → Reward 발급

3. 보안 테스트:
   - RLS 정책 동작 확인 (다른 사용자 데이터 접근 불가)
   - 부모 권한 확인 (has_scope 함수)
   - 감정 데이터 익명화 (30일 후 자동)

4. 성능 테스트:
   - 대용량 데이터 조회 (100개 이상 Goal)
   - Mandala 27칸 렌더링 성능
   - 대시보드 로딩 시간

5. 크로스 브라우저 테스트:
   - Chrome, Firefox, Safari
   - 모바일 Safari, Chrome

6. 회귀 테스트:
   - 기존 Habit Tracker 기능 동작 확인
   - Phase 1-4 기능 영향 없음 확인

7. 버그 발견 시:
   - 버그 설명
   - 재현 방법
   - 예상 동작 vs 실제 동작
   - 수정 방법 제안

예상 소요 시간: 6-8시간
```

---

## 🐛 문제 해결 프롬프트

### 프롬프트 13: 오류 분석 및 해결

```
다음 오류가 발생했습니다:

[여기에 오류 메시지 붙여넣기]

다음을 분석하고 해결해주세요:

1. 오류의 원인 분석
2. 관련 파일 및 코드 확인
3. 해결 방법 제시 (단계별)
4. 테스트 방법
5. 향후 예방 방법

참고 문서:
- PHASE_5_ROLLBACK_PLAN.md (롤백이 필요한 경우)
- LOCAL_SETUP_GUIDE.md
```

---

### 프롬프트 14: 롤백 실행

```
Phase 5 마이그레이션을 롤백해야 합니다.

다음을 진행해주세요:

1. 현재 상태 확인 (어디까지 실행되었는지)
2. PHASE_5_ROLLBACK_PLAN.md 참조하여 롤백 SQL 생성
3. 롤백 SQL 실행 (Supabase SQL Editor)
4. 롤백 완료 확인:
   - 신규 테이블 삭제 확인
   - 기존 데이터 무결성 확인
   - 기존 앱 동작 확인
5. 백업 파일에서 복원 필요 시 방법 안내

이유: [여기에 롤백 이유 작성]
```

---

## 📊 상태 확인 프롬프트

### 프롬프트 15: 현재 상태 점검

```
Phase 5 Learning Mode의 현재 진행 상태를 점검하고 보고해주세요.

다음을 포함해주세요:

1. Git 상태:
   - 현재 브랜치
   - 최근 커밋
   - 변경된 파일

2. 마이그레이션 상태:
   - 실행 완료된 마이그레이션 (001-010 중)
   - 테이블 생성 상태
   - RLS 정책 활성화 상태

3. 프론트엔드 개발 상태:
   - D1-D7 중 완료된 단계
   - 현재 작업 중인 단계
   - 남은 작업

4. 다음 단계 추천

참고: PHASE_5_STATUS.md, TODO 리스트
```

---

**최종 수정일:** 2025-10-25
**문서 버전:** 1.0
