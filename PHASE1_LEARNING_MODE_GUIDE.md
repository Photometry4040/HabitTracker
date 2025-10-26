# Phase 1: 학습 모드 기본 기능 가이드

## 🎉 완성된 기능

Phase 1의 3가지 핵심 기능이 완성되었습니다:

1. ✅ **학습 모드 토글** - 아이별 학습 모드 활성화/비활성화
2. ✅ **목표 설정 UI** - 목표 생성/수정/삭제/완료 관리
3. ✅ **보상 알림 시스템** - 실시간 보상 토스트 알림

---

## 📁 생성된 파일

### 1. 데이터베이스 헬퍼 (src/lib/)

**`learning-mode.js`** (580 lines)
- 학습 모드 토글 (`toggleLearningMode`)
- 아이 학습 설정 조회/업데이트
- 목표 CRUD (`createGoal`, `getGoals`, `updateGoal`, `deleteGoal`, `completeGoal`)
- 진행 이벤트 생성 (`createProgressEvent`)
- 보상 조회 (`getChildRewards`, `getNewRewards`, `markRewardsAsViewed`)

### 2. UI 컴포넌트

**`src/components/ui/switch.jsx`**
- 토글 스위치 UI 컴포넌트

**`src/components/Goals/GoalsManager.jsx`** (540 lines)
- 목표 목록 표시
- 목표 생성/수정 폼
- 목표 완료/삭제 기능

**`src/components/Rewards/RewardToast.jsx`**
- 보상 알림 토스트 UI
- 자동 닫기 (10초)
- 페이드 인/아웃 애니메이션

**`src/components/Rewards/RewardNotificationProvider.jsx`**
- 보상 자동 폴링 (30초마다)
- 알림 큐 관리
- 보상 확인 처리

### 3. 수정된 컴포넌트

**`src/components/ChildSelector.jsx`**
- 학습 모드 토글 스위치 추가
- 학습 모드 활성화 배지 표시
- 아이별 학습 모드 상태 관리

---

## 🚀 사용 방법

### 1. 학습 모드 활성화

```jsx
// 아이 선택 화면에서
// 1. 아이 카드에서 "학습 모드" 토글 스위치 찾기
// 2. 토글 ON → 학습 모드 활성화
// 3. 아이 이름 옆에 "학습" 배지 표시됨
```

### 2. 목표 설정

```jsx
import { GoalsManager } from '@/components/Goals/GoalsManager.jsx'

// App.jsx 또는 학습 모드 화면에서 사용
<GoalsManager childName={selectedChild} />
```

**기능:**
- 새 목표 만들기 (제목, 설명, 측정 방식, 목표 값, 기간)
- 목표 수정
- 목표 완료 (달성 버튼 클릭)
- 목표 삭제

**측정 방식 종류:**
- `boolean`: 달성/미달성
- `count`: 횟수 (예: 문제 50개 풀기)
- `time`: 시간 (예: 공부 120분)
- `percentage`: 퍼센트 (예: 80% 달성)

### 3. 보상 알림 설정

```jsx
import { RewardNotificationProvider } from '@/components/Rewards/RewardNotificationProvider.jsx'

// App.jsx에서 래핑
<RewardNotificationProvider childName={selectedChild}>
  <YourApp />
</RewardNotificationProvider>
```

**자동 동작:**
- 30초마다 새 보상 확인
- 새 보상 발견 시 오른쪽 하단에 토스트 알림
- 10초 후 자동 닫힘
- 여러 보상이 있을 경우 순차적으로 표시

---

## 🧪 테스트 시나리오

### 시나리오 1: 학습 모드 활성화

```bash
# 1. 아이 선택 화면 열기
# 2. 아이 카드에서 "학습 모드" 토글 ON
# 3. 확인사항:
#    - 토글이 보라색으로 변경됨
#    - 아이 이름 옆에 "학습" 배지 표시
#    - children 테이블의 learning_mode_enabled = true
```

### 시나리오 2: 목표 생성 및 완료

```bash
# 1. GoalsManager 컴포넌트 렌더링
# 2. "새 목표" 버튼 클릭
# 3. 폼 작성:
#    - 제목: "수학 문제 50개 풀기"
#    - 측정 방식: "횟수 측정"
#    - 목표 값: 50
#    - 단위: "문제"
# 4. "목표 생성" 버튼 클릭
# 5. 목표 목록에 표시됨
# 6. "달성 완료" 버튼 (체크 아이콘) 클릭
# 7. "🎉 목표 달성을 축하합니다!" 알림
# 8. goals 테이블에서 status = 'completed', completed_at 설정됨
```

### 시나리오 3: 보상 알림 테스트

```bash
# 1. rewards_ledger에 테스트 보상 수동 삽입:
INSERT INTO rewards_ledger (
  user_id, child_id, reward_id, source_event_id,
  is_new, earned_at
)
SELECT
  c.user_id,
  c.id,
  rd.id,
  (SELECT id FROM progress_events LIMIT 1),  -- 임시 이벤트
  true,
  NOW()
FROM children c
CROSS JOIN reward_definitions rd
WHERE c.name = '테스트아이' AND rd.name = '첫 목표 설정'
LIMIT 1;

# 2. 앱 실행 후 30초 이내 오른쪽 하단에 토스트 알림 표시
# 3. 확인사항:
#    - 보상 아이콘, 이름, 설명 표시
#    - 10초 후 자동 닫힘
#    - rewards_ledger.is_new = false, viewed_at 설정됨
```

---

## 📊 데이터베이스 검증

### 학습 모드 상태 확인

```sql
SELECT
  name,
  learning_mode_enabled,
  age_group,
  grade,
  school_name
FROM children
WHERE user_id = auth.uid();
```

### 목표 조회

```sql
SELECT
  g.title,
  g.metric_type,
  g.target_value,
  g.unit,
  g.status,
  g.completed_at,
  c.name as child_name
FROM goals g
JOIN children c ON g.child_id = c.id
WHERE g.user_id = auth.uid()
ORDER BY g.created_at DESC;
```

### 보상 조회

```sql
SELECT
  rl.earned_at,
  rl.is_new,
  rl.viewed_at,
  rd.name as reward_name,
  rd.reward_type,
  rd.icon,
  c.name as child_name
FROM rewards_ledger rl
JOIN reward_definitions rd ON rl.reward_id = rd.id
JOIN children c ON rl.child_id = c.id
WHERE rl.user_id = auth.uid()
ORDER BY rl.earned_at DESC;
```

---

## 🔧 통합 완료 (App.jsx)

✅ **Phase 1 기능이 App.jsx에 완전히 통합되었습니다!**

### 통합 내용

1. **목표 관리 버튼 추가**
   - 위치: 상단 헤더 (템플릿/목표 관리/대시보드/저장 버튼)
   - 버튼 클릭 → `showGoals` 상태 토글
   - "목표 관리" ↔ "습관 추적" 전환

2. **조건부 렌더링**
   ```jsx
   {showTemplateManager ? (
     <TemplateManager ... />
   ) : showGoals ? (
     <GoalsManager childName={selectedChild} />  // 👈 목표 관리 화면
   ) : showDashboard ? (
     <DashboardHub />
   ) : (
     // 습관 추적 화면
   )}
   ```

3. **보상 알림 Provider 래핑**
   ```jsx
   return (
     <RewardNotificationProvider childName={selectedChild}>
       {/* 전체 앱 컨텐츠 */}
     </RewardNotificationProvider>
   )
   ```

### 사용 방법

1. **아이 선택** → 아이 선택 화면에서 학습 모드 토글 ON
2. **목표 관리 버튼** → 상단 파란색 "목표 관리" 버튼 클릭
3. **목표 생성** → "새 목표" 버튼으로 목표 추가
4. **목표 완료** → 체크 아이콘 클릭 → 보상 획득
5. **보상 알림** → 30초 이내 오른쪽 하단에 토스트 알림 표시

---

## 🎯 다음 단계 (Phase 2)

Phase 1 완성 후 다음 기능을 개발합니다:

1. **만다라트 차트** (9칸 기본 뷰)
   - `src/components/Mandala/MandalaChart.jsx`
   - 9칸 그리드 UI
   - 중앙 목표 + 8개 하위 목표

2. **약점 기록 UI**
   - `src/components/Weaknesses/WeaknessLogger.jsx`
   - 실패 시 감정/원인 기록
   - 재시도 예약 기능

3. **부모 대시보드**
   - `src/components/Dashboard/ParentDashboard.jsx`
   - 감정 요약 뷰 (`v_emotion_summary`)
   - 약점 요약 뷰 (`v_weakness_summary`)
   - 목표 진행률 뷰 (`v_goal_progress_summary`)

---

## 🐛 트러블슈팅

### 학습 모드 토글이 작동하지 않음

```bash
# 1. children 테이블에 learning_mode_enabled 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'children' AND column_name = 'learning_mode_enabled';

# 2. RLS 정책 확인
SELECT * FROM children WHERE user_id = auth.uid();  -- 조회 가능한지 확인
```

### 목표가 저장되지 않음

```bash
# 1. goals 테이블 RLS 정책 확인
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'goals';
# rowsecurity = true 여야 함

# 2. goals_insert_own 정책 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'goals' AND cmd = 'INSERT';
```

### 보상 알림이 표시되지 않음

```bash
# 1. rewards_ledger에 is_new = true인 보상이 있는지 확인
SELECT COUNT(*) FROM rewards_ledger
WHERE child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
AND is_new = true;

# 2. RLS 정책 확인
SELECT * FROM rewards_ledger WHERE user_id = auth.uid();
```

---

## 📚 참고 자료

- **Phase 5 마이그레이션**: `PHASE5_MIGRATION_GUIDE.md`
- **실행 가이드**: `EXECUTE_PHASE5.md`
- **데이터베이스 헬퍼**: `src/lib/learning-mode.js`
- **UI 컴포넌트**: `src/components/Goals/`, `src/components/Rewards/`

---

**생성일**: 2025-10-26
**버전**: Phase 1 (기본 인프라)
**다음 단계**: Phase 2 (핵심 기능 - 만다라트, 약점 관리, 부모 대시보드)
