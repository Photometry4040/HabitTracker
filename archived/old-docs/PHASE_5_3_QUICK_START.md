# Phase 5.3 빠른 테스트 가이드

## 🚀 3단계로 완료하는 Phase 5.3 테스트

### Step 1️⃣: 테스트 데이터 생성 (5초)

**파일:** `PHASE_5_3_INTEGRATED_TEST.sql`

1. Supabase SQL Editor 열기
2. `PHASE_5_3_INTEGRATED_TEST.sql` 파일 전체 복사
3. SQL Editor에 붙여넣기
4. "Run" 버튼 클릭
5. ✅ 완료! (21일 + 30일 테스트 데이터 자동 생성)

**예상 소요 시간:** 5초

**예상 결과:**
```
✅ STEP 3-1: 21일 Streak 데이터
   - habit_name: 21일 연속 테스트 습관
   - total_records: 21
   - green_count: 21

✅ STEP 3-2: 30일 Mastery 데이터
   - habit_name: 30일 마스터리 테스트
   - total_records: 35
   - green_count: 35

📊 STEP 3-4: 전체 통계 요약
   - total_weeks: 8
   - total_habits: 8
   - total_records: 56
   - green_records: 56
```

---

### Step 2️⃣: UI에서 Achievement 트리거 (3분)

#### 2-1. Streak Achievement 트리거

1. 앱 열기 → Habit Tracker 화면
2. "21일 연속 테스트 습관" 찾기
3. 오늘 날짜에 **Green** 클릭
4. 브라우저 콘솔 확인 (F12)

**예상 콘솔 출력:**
```javascript
[Streak Check] 21일 연속 테스트 습관: 21 days total, 21 green days
✅ streak_21 achievement recorded for 아빠
```

#### 2-2. Mastery Achievement 트리거

1. "30일 마스터리 테스트" 습관 찾기
2. 오늘 날짜에 **Green** 클릭
3. 콘솔 확인

**예상 콘솔 출력:**
```javascript
[Streak Check] 30일 마스터리 테스트: 35 days total, 35 green days
✅ habit_mastery achievement recorded for 아빠
```

#### 2-3. First Weakness Resolved (선택)

1. Learning Mode → Weaknesses 탭
2. "테스트용 약점" 추가
3. "해결" 버튼 클릭
4. 콘솔 확인

**예상 콘솔 출력:**
```javascript
🎉 First weakness resolved achievement unlocked!
```

#### 2-4. Weekly Planner Perfect (선택)

1. Weekly Planner 탭
2. 새 주간 계획 생성
3. 태스크 2개 추가
4. 모두 완료 표시 (100%)
5. "주간 계획 완료" 클릭
6. 콘솔 확인

**예상 콘솔 출력:**
```javascript
🎉 Weekly planner perfect achievement unlocked!
```

---

### Step 3️⃣: 결과 검증 (5초)

**파일:** `PHASE_5_3_VERIFY_RESULTS.sql`

1. Supabase SQL Editor 열기
2. `PHASE_5_3_VERIFY_RESULTS.sql` 파일 전체 복사
3. SQL Editor에 붙여넣기
4. "Run" 버튼 클릭
5. ✅ 결과 확인!

**예상 결과 (10개 섹션):**

```
📋 1. 모든 Progress Events
   - 모든 이벤트 목록 (시간순)

🎯 2. Phase 5.3 신규 이벤트
   - streak_21, habit_mastery, weekly_planner_perfect, first_weakness_resolved

📊 3. 이벤트 타입별 카운트
   - 각 이벤트 타입별 개수

🔥 4. streak_21 이벤트 상세
   - habit_id, streak_count, habit_name

💎 5. habit_mastery 이벤트 상세
   - habit_id, green_days, habit_name

✨ 6. weekly_planner_perfect 이벤트 상세
   - plan_id, completion_rate, plan_title

💪 7. first_weakness_resolved 이벤트 상세
   - weakness_id, weakness_description

⚠️ 8. 중복 이벤트 확인
   - 정상: 0개 행

🎁 9. Phase 5.3 보상 정의
   - 4개 신규 보상

🎉 10. 최종 요약
   - Total Events: 전체 이벤트 수
   - Phase 5.3 Events: 2~4개
   - streak_21: 1개
   - habit_mastery: 1개
   - weekly_planner_perfect: 0~1개
   - first_weakness_resolved: 0~1개
```

---

## 🎯 빠른 체크리스트

- [ ] Step 1: 테스트 데이터 생성 완료
- [ ] Step 2-1: streak_21 트리거 확인 (콘솔 로그)
- [ ] Step 2-2: habit_mastery 트리거 확인 (콘솔 로그)
- [ ] Step 2-3: first_weakness_resolved 트리거 (선택)
- [ ] Step 2-4: weekly_planner_perfect 트리거 (선택)
- [ ] Step 3: 검증 쿼리 실행 완료
- [ ] 최종 확인: Phase 5.3 Events = 2~4개

---

## 📁 파일 구조

```
PHASE_5_3_INTEGRATED_TEST.sql    # 1단계: 데이터 생성
PHASE_5_3_VERIFY_RESULTS.sql     # 3단계: 결과 검증
PHASE_5_3_TEST_GUIDE.md          # 상세 가이드 (참고용)
PHASE_5_3_QUICK_START.md         # 이 파일 (빠른 시작)
```

---

## ⏱️ 예상 소요 시간

- **최소 테스트** (필수만): 5분
  - Step 1: 데이터 생성 (5초)
  - Step 2-1, 2-2: UI 트리거 (3분)
  - Step 3: 검증 (5초)

- **전체 테스트** (모든 기능): 10분
  - Step 1: 데이터 생성 (5초)
  - Step 2-1~2-4: 모든 트리거 (7분)
  - Step 3: 검증 (5초)

---

## 🐛 문제 해결

### 문제 1: Step 1 실행 시 에러

**증상:**
```
ERROR: null value in column "week_end_date"
```

**해결:**
파일이 최신 버전인지 확인하세요. `week_end_date` 필드가 포함되어 있어야 합니다.

### 문제 2: 콘솔에 achievement 메시지 없음

**원인:**
- 60일 이상 오래된 데이터
- 습관 이름이 주마다 다름

**해결:**
Step 1을 다시 실행해서 최신 데이터를 생성하세요.

### 문제 3: Step 3에서 Phase 5.3 Events = 0

**원인:**
Step 2를 건너뛰었거나 UI에서 에러 발생

**해결:**
1. 브라우저 콘솔에서 에러 확인
2. Step 2를 다시 실행
3. 콘솔 로그가 나타나는지 확인

---

## 🎉 성공 기준

✅ **모든 테스트 통과:**
- Step 1: 56개 green records 생성
- Step 2: 콘솔에 achievement 메시지 2~4개
- Step 3: Phase 5.3 Events = 2~4개
- 중복 이벤트 = 0개

---

**작성일:** 2025-10-27
**Phase:** 5.3 Advanced Reward Triggers
**상태:** ✅ 테스트 준비 완료
