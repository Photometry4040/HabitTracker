# Phase 3 Day 3-4: 구 스키마 READ-ONLY 전환 계획

**일시**: 2025-10-18
**상태**: 📋 **계획 수립 완료**

---

## 🎯 목표

구 스키마(habit_tracker)를 READ-ONLY로 전환하여 신 스키마 단독 운영 준비

---

## 📋 작업 계획

### Step 1: Edge Function 수정 ✅

**변경 내용**:
- 구 스키마 쓰기 로직 제거 (Lines 194-249)
- 신 스키마 쓰기만 유지
- Idempotency 로깅은 유지

**수정 파일**:
- `supabase/functions/dual-write-habit/index.ts`

**Before (Dual-Write)**:
```typescript
// Step 1: Write to OLD SCHEMA
await supabase.from('habit_tracker').insert(...)

// Step 2: Write to NEW SCHEMA
await supabase.from('weeks').insert(...)
```

**After (New Schema Only)**:
```typescript
// Write to NEW SCHEMA only
await supabase.from('weeks').insert(...)
// OLD SCHEMA is now READ-ONLY
```

### Step 2: 함수명 변경

**이유**: "dual-write"라는 이름이 더 이상 적절하지 않음

**변경**:
- Edge Function: `dual-write-habit` → `habit-operations` (선택사항)
- 또는 기존 함수 유지하되 내부 로직만 변경

**결정**: 기존 함수명 유지 (하위 호환성)

### Step 3: 웹앱 코드 변경 필요 없음

**이유**:
- 웹앱은 이미 신 스키마에서 읽기 (`database-new.js`)
- Edge Function 호출은 그대로 유지
- 사용자는 변경 사항을 인지하지 못함

### Step 4: 48시간 모니터링

**모니터링 항목**:
- [ ] Edge Function 에러율 < 0.1%
- [ ] 웹앱 정상 동작 확인
- [ ] habit_tracker 테이블 쓰기 없음 확인
- [ ] weeks 테이블 정상 삽입 확인

---

## ⚠️ 리스크 분석

### 리스크 1: Edge Function 배포 실패
**확률**: 낮음
**영향**: 일시적으로 습관 저장 불가
**대응**:
```bash
# 롤백
git revert HEAD
supabase functions deploy dual-write-habit
```

### 리스크 2: 구 스키마 의존성
**확률**: 매우 낮음 (웹앱은 이미 신 스키마 사용 중)
**영향**: 없음
**대응**: 없음 (웹앱 코드 확인 완료)

---

## 🧪 테스트 계획

### 로컬 테스트
```bash
# 1. Edge Function 로컬 테스트
supabase functions serve dual-write-habit

# 2. 웹앱 통합 테스트
npm run dev
# - 새 주차 생성
# - 습관 색상 변경
# - 주차 로드
```

### 프로덕션 배포
```bash
# 1. Edge Function 배포
supabase functions deploy dual-write-habit

# 2. 검증
node scripts/check-latest-save.js

# 3. OLD SCHEMA 쓰기 확인
node scripts/verify-old-schema-readonly.js
```

---

## 📊 성공 기준

### 필수 조건
- [x] Edge Function 배포 성공
- [ ] 웹앱에서 새 주차 생성 성공
- [ ] habit_tracker에 새 레코드 **없음** (READ-ONLY 확인)
- [ ] weeks에 새 레코드 **있음**
- [ ] 에러율 < 0.1%

### 선택 조건
- [ ] 응답 시간 개선 (구 스키마 쓰기 제거로 더 빠름)
- [ ] 로그 분석 (idempotency_log 확인)

---

## 🔄 롤백 계획

### 문제 발생 시
```bash
# 1. Git revert
git revert HEAD

# 2. Edge Function 재배포
supabase functions deploy dual-write-habit

# 3. 확인
node scripts/check-latest-save.js
```

**예상 롤백 시간**: < 5분

---

## 📁 생성할 스크립트

### `scripts/verify-old-schema-readonly.js`
```javascript
// 목적: habit_tracker에 최근 쓰기가 없는지 확인
// 출력: 최근 1시간 내 생성된 레코드 개수 (0 예상)
```

---

## 🎯 다음 단계 (Day 5-6)

48시간 모니터링 후:
- [ ] 구 스키마 완전 제거
- [ ] Edge Function 단순화
- [ ] 코드 정리 및 최적화

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-18
**상태**: 📋 계획 수립 완료
