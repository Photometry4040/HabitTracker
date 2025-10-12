# Tech Spec: 아이들을 위한 습관 추적기 업그레이드

> **작성일**: 2025년 10월 11일
> **버전**: 1.0
> **작성자**: Development Team

---

## 📋 목차
1. [Goal (목표)](#goal-목표)
2. [Non-Goal (비목표)](#non-goal-비목표)
3. [Current State Analysis (현재 상태 분석)](#current-state-analysis-현재-상태-분석)
4. [Proposed Changes (제안된 변경사항)](#proposed-changes-제안된-변경사항)
5. [Proposed Database Schema Changes](#proposed-database-schema-changes)
6. [Implementation Plan (구현 계획)](#implementation-plan-구현-계획)
7. [Risk Assessment (리스크 평가)](#risk-assessment-리스크-평가)
8. [Migration Strategy (마이그레이션 전략)](#migration-strategy-마이그레이션-전략)

---

## Goal (목표)

### 🎯 기능 확장
1. **습관 통계 고도화**
   - 현재 문제: JSONB 기반 단일 테이블 구조로 인한 DB 관리 어려움
   - 개선 목표: 정규화된 테이블 구조로 재설계하여 복잡한 통계 쿼리 지원
   - 예상 효과: 주간/월간/연간 통계, 습관별 성취율, 트렌드 분석 가능

2. **알림 기능 추가**
   - 목표: 실시간 멘션 및 알림 시스템 구현
   - 기능:
     - 부모가 자녀에게 멘션 (@자녀이름)
     - 습관 달성 축하 알림
     - 주간 리포트 알림
   - 기술: Supabase Realtime + Push Notifications

3. **가족 채팅 기능 추가**
   - 목표: 가족 구성원 간 실시간 소통 채널 제공
   - 기능:
     - 습관별 채팅방
     - 이미지/이모지 지원
     - 읽음 상태 표시
   - 기술: Supabase Realtime (WebSocket)

4. **계획 템플릿 기능**
   - 현재 문제: 매주 반복 입력 불편함
   - 개선 목표: 기존 습관 데이터를 템플릿으로 저장하고 재사용
   - 기능:
     - 주간 습관 템플릿 저장
     - 템플릿으로부터 새 주차 생성
     - 템플릿 수정 및 삭제

### ⚡ 성능 최적화
1. **React Query 도입** (필요 시)
   - 서버 상태 관리 개선
   - 자동 캐싱 및 백그라운드 리프레시
   - Optimistic Updates 지원

2. **코드 스플리팅**
   - 초기 로딩 속도 개선
   - 대시보드, 채팅 등 큰 컴포넌트 lazy loading

3. **날짜/주차 데이터 정리**
   - 현재 문제: 주차 입력 시 데이터가 정리되지 않아 DB 관리 어려움
   - 개선: 주차 시작일 기반 정규화된 데이터 구조

---

## Non-Goal (비목표)

### ❌ 이번 작업에서 다루지 않을 범위
1. **UI/UX 리디자인**: 기존 디자인 시스템 유지 (Tailwind CSS)
2. **모바일 네이티브 앱**: PWA로 유지, React Native 마이그레이션 하지 않음
3. **다국어 지원 (i18n)**: 한국어만 지원
4. **결제 시스템**: 무료 서비스로 유지
5. **소셜 로그인**: 이메일/비밀번호 인증만 유지
6. **TypeScript 마이그레이션**: JavaScript 유지 (향후 검토)

---

## Current State Analysis (현재 상태 분석)

### 📊 현재 데이터베이스 스키마

#### `habit_tracker` 테이블 (현재)
```sql
CREATE TABLE habit_tracker (
  id BIGSERIAL PRIMARY KEY,
  child_name TEXT NOT NULL,           -- 중복 허용 (비정규화)
  week_period TEXT,                   -- "2025년 7월 21일 ~ 2025년 7월 27일" (문자열)
  week_start_date DATE,               -- 주차 시작일 (추가됨)
  theme TEXT,                         -- 주간 테마
  habits JSONB DEFAULT '[]',          -- 습관 배열 (비정규화)
  reflection JSONB DEFAULT '{}',      -- 돌아보기 데이터
  reward TEXT,                        -- 보상 내용
  user_id UUID REFERENCES auth.users(id), -- 사용자 ID (현재 코드에서 미사용)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### JSONB `habits` 구조
```json
[
  {
    "id": 1,
    "name": "아침 (6-9시) 스스로 일어나기",
    "times": ["green", "yellow", "red", "", "green", "green", "yellow"]
  },
  ...
]
```

### 🔴 주요 기술 부채

#### 1. **데이터베이스 설계 문제**
- **비정규화된 구조**: 습관 데이터가 JSONB로 저장되어 쿼리 성능 저하
- **중복 데이터**: `child_name`이 매 주차마다 중복 저장
- **통계 쿼리 어려움**: JSONB 배열에서 통계 추출이 복잡하고 비효율적
- **week_period 문자열**: "2025년 7월 21일 ~ 2025년 7월 27일" 형식으로 인한 정렬/검색 어려움

**예시 문제:**
```sql
-- ❌ 현재: 특정 습관의 월간 달성률 조회가 매우 복잡
SELECT
  child_name,
  jsonb_array_elements(habits) as habit
FROM habit_tracker
WHERE ...  -- JSONB 쿼리 복잡도 증가
```

#### 2. **user_id 필터링 비활성화**
- 코드에서 `user_id` 조건이 주석 처리됨
- RLS 정책이 "Allow all operations"로 설정 (보안 취약)
- 멀티 테넌트 지원 불가

**현재 코드 ([database.js:36-41](src/lib/database.js:36-41)):**
```javascript
await supabase
  .from('habit_tracker')
  .delete()
  .eq('child_name', childName)
  .eq('week_period', data.weekPeriod)
  // .eq('user_id', user.id) // 임시로 주석 처리
```

#### 3. **아키텍처 문제**
- **거대한 App.jsx**: 843줄의 단일 컴포넌트 ([App.jsx:1-843](App.jsx:1-843))
- **상태 관리 복잡도**: 모든 상태가 App 컴포넌트에 집중
- **재사용성 부족**: 비즈니스 로직이 컴포넌트에 강결합

#### 4. **날짜/주차 관리 문제**
- **중복 필드**: `week_period`(문자열)와 `week_start_date`(날짜) 중복
- **데이터 정합성**: 두 필드 간 불일치 가능성
- **정리 로직 부재**: 주차 변경 시 자동 정리 없음

**현재 코드 ([App.jsx:286-302](App.jsx:286-302)):**
```javascript
// week_start_date 변경 → week_period 자동 계산 → 데이터 로드
// 문제: week_period 문자열 파싱이 복잡하고 오류 발생 가능
useEffect(() => {
  if (weekStartDate && selectedChild) {
    const newWeekPeriod = `${formatDate(startDate)} ~ ${formatDate(endDate)}`
    setWeekPeriod(newWeekPeriod)
    loadWeekData(selectedChild, newWeekPeriod)
  }
}, [weekStartDate, selectedChild])
```

#### 5. **보안 문제**
- 입력 검증 로직이 있으나 실제 사용되지 않음 ([security.js:26-44](src/lib/security.js:26-44))
- 클라이언트 사이드 암호화는 제한적 효과

### 📦 개선이 필요한 영역

| 영역 | 현재 상태 | 문제점 | 우선순위 |
|------|-----------|--------|----------|
| **DB 스키마** | 단일 테이블 + JSONB | 통계 쿼리 어려움, 데이터 중복 | 🔴 High |
| **데이터 모델링** | 비정규화 | 확장성 부족, 데이터 정합성 위험 | 🔴 High |
| **인증/인가** | user_id 미사용 | 멀티 테넌트 불가 | 🔴 High |
| **컴포넌트 구조** | 거대한 App.jsx | 유지보수 어려움 | 🟡 Medium |
| **상태 관리** | useState only | 서버 상태 캐싱 없음 | 🟡 Medium |
| **날짜 처리** | 문자열 기반 | 정렬/검색 비효율 | 🟡 Medium |
| **의존성 버전** | 구버전 (Vite 4, React 18) | 최신 기능 사용 불가 | 🟢 Low |

### 🔍 성능/보안 이슈

#### 성능 이슈
1. **JSONB 쿼리 성능**: 대규모 데이터에서 통계 추출 시 느림
2. **N+1 쿼리 문제**: 여러 주차 데이터 로드 시 반복 쿼리
3. **캐싱 부재**: 동일 데이터 반복 요청

#### 보안 이슈
1. **RLS 미적용**: 모든 사용자가 모든 데이터 접근 가능
2. **user_id 검증 누락**: 권한 체크 없음
3. **입력 검증 미사용**: XSS 방어 로직이 코드에 있으나 미적용

---

## Proposed Changes (제안된 변경사항)

### 1. 데이터베이스 스키마 재설계

#### 📌 변경 이유
- 정규화를 통한 데이터 중복 제거
- 복잡한 통계 쿼리 지원
- 확장성 확보 (채팅, 알림 기능 추가 대비)

#### 🔄 영향 범위
- 백엔드: 모든 DB 쿼리 수정
- 프론트엔드: 데이터 구조 변경에 따른 컴포넌트 수정
- 마이그레이션: 기존 데이터 변환 스크립트 필요

#### ⏱️ 예상 작업 시간
- DB 스키마 설계: 2일
- 마이그레이션 스크립트: 2일
- API 레이어 수정: 3일
- **총 7일**

---

### 2. 계획 템플릿 기능 추가

#### 📌 변경 이유
- 사용자 불편 해소: 매주 동일한 습관을 반복 입력하는 문제
- 생산성 향상: 템플릿으로 빠르게 주차 생성

#### 🔄 영향 범위
- 새 테이블: `habit_templates`
- UI: 템플릿 관리 화면 추가
- 로직: 템플릿 → 주차 생성 변환 로직

#### ⏱️ 예상 작업 시간
- DB 테이블 생성: 0.5일
- 템플릿 CRUD API: 1일
- UI 컴포넌트: 2일
- **총 3.5일**

---

### 3. 실시간 알림 기능

#### 📌 변경 이유
- 부모-자녀 상호작용 강화
- 습관 달성 동기부여

#### 🔄 영향 범위
- 새 테이블: `notifications`
- Supabase Realtime 구독 설정
- 알림 UI 컴포넌트

#### ⏱️ 예상 작업 시간
- DB 테이블 + RLS: 1일
- Realtime 구독 로직: 1.5일
- 알림 UI: 2일
- 멘션 기능: 1.5일
- **총 6일**

---

### 4. 가족 채팅 기능

#### 📌 변경 이유
- 습관 형성에 대한 가족 간 소통 채널 제공
- 긍정적 피드백 및 격려 문화 형성

#### 🔄 영향 범위
- 새 테이블: `chat_rooms`, `chat_messages`
- Supabase Realtime 채널
- 채팅 UI 컴포넌트 (대용량)

#### ⏱️ 예상 작업 시간
- DB 테이블 + RLS: 1.5일
- Realtime 메시징: 3일
- 채팅 UI: 4일
- 이미지 업로드 (Supabase Storage): 2일
- **총 10.5일**

---

### 5. React Query 도입

#### 📌 변경 이유
- 서버 상태 관리 개선
- 자동 캐싱 및 백그라운드 동기화
- Optimistic Updates로 UX 개선

#### 🔄 영향 범위
- 전역: 모든 데이터 페칭 로직 변경
- 의존성: `@tanstack/react-query` 추가

#### ⏱️ 예상 작업 시간
- React Query 설정: 0.5일
- 기존 API 래핑: 2일
- Optimistic Updates 적용: 1.5일
- **총 4일**

---

### 6. 코드 스플리팅 & 성능 최적화

#### 📌 변경 이유
- 초기 로딩 속도 개선
- 대시보드, 채팅 등 큰 컴포넌트 지연 로딩

#### 🔄 영향 범위
- Vite 설정: `vite.config.js`
- 라우팅: React Router 도입 (선택)
- 컴포넌트: `React.lazy()` 적용

#### ⏱️ 예상 작업 시간
- 코드 스플리팅 설정: 1일
- 라우팅 구조 개선: 2일
- **총 3일**

---

### 7. App.jsx 리팩토링

#### 📌 변경 이유
- 유지보수성 향상
- 컴포넌트 재사용성 증가

#### 🔄 영향 범위
- 컴포넌트 분리:
  - `HabitTracker.jsx` (습관 추적 테이블)
  - `WeekSelector.jsx` (주차 선택)
  - `ReflectionForm.jsx` (돌아보기)
  - `RewardSection.jsx` (보상)
- 커스텀 훅:
  - `useHabitData` (습관 데이터 관리)
  - `useWeekData` (주차 데이터 관리)

#### ⏱️ 예상 작업 시간
- 컴포넌트 분리: 3일
- 커스텀 훅 작성: 2일
- **총 5일**

---

### 8. user_id 필터링 활성화 & RLS 강화

#### 📌 변경 이유
- 보안 강화: 사용자별 데이터 격리
- 멀티 테넌트 지원

#### 🔄 영향 범위
- 모든 DB 쿼리: `user_id` 필터 추가
- RLS 정책: "Allow all" → 사용자별 정책
- 데이터 마이그레이션: 기존 데이터에 user_id 할당

#### ⏱️ 예상 작업 시간
- 코드 수정: 2일
- RLS 정책 작성: 1일
- 데이터 마이그레이션: 1일
- 테스트: 1일
- **총 5일**

---

## Proposed Database Schema Changes

### 🗄️ 새로운 테이블 구조

#### 1. `users` (Supabase Auth 확장)
```sql
-- Supabase auth.users 테이블 확장
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('parent', 'child')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `children` (아이 정보)
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_children_user_id ON children(user_id);
```

#### 3. `habit_templates` (습관 템플릿)
```sql
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 템플릿 이름
  description TEXT,
  habits JSONB NOT NULL DEFAULT '[]',    -- 습관 정의
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_habit_templates_user_id ON habit_templates(user_id);
CREATE INDEX idx_habit_templates_child_id ON habit_templates(child_id);
```

#### 4. `weeks` (주차 정보)
```sql
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,         -- 주차 시작일 (월요일)
  week_end_date DATE NOT NULL,           -- 주차 종료일 (일요일)
  theme TEXT,                            -- 주간 테마
  reflection JSONB DEFAULT '{}',         -- 돌아보기
  reward TEXT,                           -- 보상
  template_id UUID REFERENCES habit_templates(id), -- 사용한 템플릿
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT check_week_dates CHECK (week_end_date = week_start_date + INTERVAL '6 days'),
  UNIQUE(child_id, week_start_date)      -- 아이별 주차 중복 방지
);

-- 인덱스
CREATE INDEX idx_weeks_user_id ON weeks(user_id);
CREATE INDEX idx_weeks_child_id ON weeks(child_id);
CREATE INDEX idx_weeks_start_date ON weeks(week_start_date);
```

#### 5. `habits` (습관 정의)
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 습관 이름
  time_period TEXT,                      -- "아침 (6-9시)"
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_habits_week_id ON habits(week_id);
```

#### 6. `habit_records` (습관 기록)
```sql
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,             -- 기록 날짜
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red', 'none')),
  note TEXT,                             -- 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(habit_id, record_date)          -- 습관별 일자별 중복 방지
);

-- 인덱스
CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_date ON habit_records(record_date);
CREATE INDEX idx_habit_records_status ON habit_records(status);
```

#### 7. `notifications` (알림)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'achievement', 'weekly_report', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,                         -- 클릭 시 이동할 URL
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

#### 8. `chat_rooms` (채팅방)
```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('family', 'child_specific')),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_chat_rooms_child_id ON chat_rooms(child_id);
```

#### 9. `chat_room_members` (채팅방 멤버)
```sql
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(room_id, user_id)
);

-- 인덱스
CREATE INDEX idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);
```

#### 10. `chat_messages` (채팅 메시지)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji')),
  image_url TEXT,
  mentions UUID[],                       -- 멘션된 사용자 ID 배열
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

### 📊 스키마 비교표

| 구분 | 기존 스키마 | 새 스키마 | 개선 효과 |
|------|------------|----------|----------|
| **테이블 수** | 1개 | 10개 | 정규화, 기능 확장 |
| **습관 데이터** | JSONB 배열 | 별도 테이블 | 쿼리 성능 향상 |
| **날짜 처리** | 문자열 + DATE | DATE 기반 | 정렬/검색 효율 |
| **중복 데이터** | child_name 중복 | 외래키 참조 | 데이터 정합성 |
| **통계 쿼리** | 복잡한 JSONB 쿼리 | 간단한 JOIN | 개발 생산성 |
| **확장성** | 낮음 | 높음 | 새 기능 추가 용이 |

### 🔄 마이그레이션 예시

**기존 데이터:**
```json
{
  "child_name": "김철수",
  "week_period": "2025년 7월 21일 ~ 2025년 7월 27일",
  "habits": [
    {
      "id": 1,
      "name": "아침 일어나기",
      "times": ["green", "yellow", ...]
    }
  ]
}
```

**새 데이터:**
```sql
-- children 테이블
INSERT INTO children (user_id, name) VALUES (..., '김철수');

-- weeks 테이블
INSERT INTO weeks (child_id, week_start_date, week_end_date)
VALUES (..., '2025-07-21', '2025-07-27');

-- habits 테이블
INSERT INTO habits (week_id, name) VALUES (..., '아침 일어나기');

-- habit_records 테이블
INSERT INTO habit_records (habit_id, record_date, status)
VALUES
  (..., '2025-07-21', 'green'),
  (..., '2025-07-22', 'yellow'),
  ...
```

---

## Implementation Plan (구현 계획)

> **⚠️ 전략 변경**: Big Bang 마이그레이션 → **Strangler Fig Pattern**
>
> GPT-5 및 Gemini 검토 결과를 반영하여 안전한 점진적 마이그레이션 전략으로 변경

### 📊 전체 타임라인

```
Phase 0 (2주)   ████ 준비
Phase 1 (4주)   ████████ 이중쓰기 + 템플릿
Phase 2 (3주)   ██████ 점진적 읽기 전환
Phase 3 (3~4주) ████████ 추가 기능
버퍼    (2~4주) ████ 예비

총 14~18주 (3.5~4.5개월)
```

---

### 📅 Phase 0: 준비 단계 (2주, 10일)

> **목표**: 무중단 마이그레이션을 위한 섀도 스키마 및 자동화 구축

#### Week 1: 섀도 스키마 & 백필 자동화

**Day 1-3: 섀도 스키마 생성**
- [ ] 새 테이블 생성 (제약 조건 `NOT VALID`)
  ```sql
  -- RLS OFF, CHECK NOT VALID 상태로 생성
  -- 프로덕션 영향 최소화
  ```
- [ ] 인덱스 생성 (CONCURRENTLY)
- [ ] 트리거 함수 작성 (이중쓰기 준비)

**Day 4-6: 백필 스크립트 개발**
- [ ] 배치 백필 스크립트 (1000건씩)
  ```javascript
  // 기존 데이터를 새 스키마로 변환
  // 드리프트 감지 및 리포팅
  ```
- [ ] 진행 상황 추적 테이블 생성
- [ ] 롤백 메커니즘 구현

**Day 7-8: 백필 실행 (개발 환경)**
- [ ] 개발 DB에서 전체 백필 실행
- [ ] 데이터 정합성 검증
- [ ] 성능 측정 (쿼리 실행 계획 분석)

**Day 9-10: 검증 자동화**
- [ ] 데이터 드리프트 감지 쿼리 작성
  ```sql
  -- 구 스키마 vs 신 스키마 불일치 검출
  SELECT COUNT(*) FROM (
    -- 복잡한 비교 로직
  ) AS diff WHERE diff.status = 'mismatch';
  ```
- [ ] 알림 설정 (Slack/Discord Webhook)
- [ ] 대시보드 구축 (Grafana/Metabase)

**Deliverables:**
- ✅ 섀도 스키마 (프로덕션 준비 완료)
- ✅ 백필 자동화 스크립트
- ✅ 검증 파이프라인
- ✅ 모니터링 대시보드

---

### 📅 Phase 1: 이중쓰기 + 템플릿 기능 (4주, 20일)

> **목표**: 신규 기능은 새 스키마만 사용, 기존 기능은 양쪽 동기화

#### Week 2-3: 이중쓰기 메커니즘

**Day 11-13: Edge Function 개발**
- [ ] Supabase Edge Function 생성
  ```typescript
  // POST /api/habits → 구 + 신 스키마 동시 쓰기
  // idempotency_key, source_version 관리
  ```
- [ ] Database Trigger 작성 (백업)
  ```sql
  -- Edge Function 실패 시 Trigger가 동기화
  CREATE TRIGGER sync_to_new_schema ...
  ```
- [ ] 충돌 해결 로직 (Last-Write-Wins)

**Day 14-16: 이중쓰기 테스트**
- [ ] 통합 테스트 (Playwright/Cypress)
- [ ] 스트레스 테스트 (k6)
- [ ] 롤백 시나리오 검증

**Day 17-18: 프로덕션 이중쓰기 배포**
- [ ] 프로덕션 백필 실행 (야간)
- [ ] Edge Function 배포
- [ ] 24시간 모니터링

#### Week 4: 템플릿 기능 (신규 스키마만 사용) ⭐

**Day 19-22: 템플릿 API & UI**
- [ ] `habit_templates` 테이블 CRUD
- [ ] 템플릿 관리 UI 컴포넌트
- [ ] 템플릿 → 주차 생성 로직
- [ ] **React Query 첫 도입** (템플릿에만)
  ```javascript
  // useTemplate(), useCreateWeekFromTemplate()
  ```

**Day 23-25: 템플릿 기능 테스트**
- [ ] 사용자 인수 테스트 (UAT)
- [ ] 버그 수정
- [ ] 피드백 반영

**Day 26-30: App.jsx 부분 리팩토링**
- [ ] 템플릿 관련 로직 분리
- [ ] `useTemplate` 커스텀 훅
- [ ] 코드 리뷰 및 문서화

**Deliverables:**
- ✅ 이중쓰기 안정화 (드리프트 <0.1%)
- ✅ 템플릿 기능 출시 (새 스키마만 사용)
- ✅ React Query 도입 (부분)
- ✅ 모니터링 지표: 동기화 지연 <100ms

---

### 📅 Phase 2: 점진적 읽기 전환 (3주, 15일)

> **목표**: Feature Flag 기반 트래픽 전환 (5% → 100%)

#### Week 5-6: Feature Flag 배포

**Day 31-33: Feature Flag 설정**
- [ ] LaunchDarkly 또는 Unleash 통합
  ```javascript
  if (featureFlags.useNewSchema) {
    // 새 스키마에서 읽기
  } else {
    // 구 스키마에서 읽기
  }
  ```
- [ ] 사용자별 A/B 그룹 분리
- [ ] 롤백 버튼 준비 (원클릭 복구)

**Day 34-36: 5% 트래픽 전환**
- [ ] 내부 팀 대상 (Canary)
- [ ] 24시간 안정화 모니터링
- [ ] 성능 비교 (구 vs 신)

**Day 37-39: 20% 트래픽 전환**
- [ ] 일반 사용자 소수 포함
- [ ] 피드백 수집
- [ ] 버그 핫픽스

**Day 40-42: 50% 트래픽 전환**
- [ ] 절반의 사용자에게 노출
- [ ] 48시간 안정화
- [ ] 성능 최적화 (인덱스 튜닝)

**Day 43-45: 100% 트래픽 전환**
- [ ] 전체 사용자 전환
- [ ] 구 스키마 READ-ONLY 모드
- [ ] 1주일 모니터링 후 쓰기 비활성화

#### Week 7: RLS 단계적 활성화

**Day 46-47: RLS READ 활성화**
- [ ] 읽기 정책 활성화
  ```sql
  ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read their own data" ...
  ```
- [ ] 권한 테스트

**Day 48-50: RLS WRITE 활성화**
- [ ] 쓰기 정책 활성화
- [ ] user_id 필터링 코드 활성화
- [ ] 전체 권한 테스트

**Deliverables:**
- ✅ 100% 트래픽 전환 완료
- ✅ 구 스키마 READ-ONLY
- ✅ RLS 활성화
- ✅ 성능 개선 확인 (쿼리 속도 30% 향상)

---

### 📅 Phase 3: 추가 기능 (3~4주, 17~22일)

> **목표**: 새 스키마 기반 추가 기능 구현

#### Week 8-9: 습관 통계 고도화

**Day 51-54: 통계 쿼리 최적화**
- [ ] 주간/월간/연간 통계 API
- [ ] Materialized View 생성 (성능)
  ```sql
  CREATE MATERIALIZED VIEW habit_stats_monthly AS
  SELECT ...
  REFRESH MATERIALIZED VIEW habit_stats_monthly;
  ```
- [ ] React Query 확장 (통계용)

**Day 55-58: 통계 대시보드 UI**
- [ ] Recharts 차트 컴포넌트
- [ ] 습관별 성취율
- [ ] 트렌드 분석 UI
- [ ] 데이터 export (Excel/CSV)

#### Week 10: 알림 기능

**Day 59-62: 알림 시스템**
- [ ] `notifications` 테이블
- [ ] Supabase Realtime 구독
- [ ] 알림 센터 UI
- [ ] 멘션 기능 (@username)

**Day 63-65: 주간 리포트**
- [ ] Edge Function (주간 통계 요약)
- [ ] 이메일 발송 (Resend/SendGrid)
- [ ] 푸시 알림 (선택)

#### Week 11 (선택): 채팅 기능

> **⚠️ MAU 기반 의사결정** (자세한 내용은 [REALTIME_STRATEGY.md](REALTIME_STRATEGY.md) 참고)

**5k MAU 미만: Supabase Realtime만**
- **Day 66-68**: 채팅 DB & Realtime
- **Day 69-72**: 채팅 UI 개발

**5k~20k MAU: 하이브리드**
- **Day 66-68**: 휘발성 메시지 (Broadcast)
- **Day 69-72**: 영속 메시지 (DB) + UI

**20k+ MAU: 외부 서비스**
- **Day 66-72**: Sendbird/Stream 통합

**Deliverables:**
- ✅ 고도화된 통계 대시보드
- ✅ 실시간 알림 시스템
- ✅ 주간 리포트 자동 발송
- ✅ (선택) 채팅 기능

---

### 📊 최종 타임라인 요약

| Phase | 기간 | 주요 작업 | 리스크 레벨 |
|-------|------|-----------|-------------|
| Phase 0 | 2주 | 섀도 스키마, 백필 | 🟢 Low |
| Phase 1 | 4주 | 이중쓰기, 템플릿 | 🟡 Medium |
| Phase 2 | 3주 | 점진적 전환 | 🟡 Medium |
| Phase 3 | 3~4주 | 추가 기능 | 🟢 Low |
| 버퍼 | 2~4주 | 예비 시간 | - |
| **총계** | **14~18주** | **(3.5~4.5개월)** | - |

### 🎯 Phase별 롤백 전략

- **Phase 0**: 섀도 스키마 삭제만 (프로덕션 영향 없음)
- **Phase 1**: Edge Function 비활성화 → 구 스키마만 사용
- **Phase 2**: Feature Flag OFF → 구 스키마 복귀
- **Phase 3**: 기능별 개별 롤백 가능

---

## Risk Assessment (리스크 평가)

> **⚠️ 중요**: 기존 Big Bang 방식의 높은 리스크를 인지하고 Strangler Fig Pattern으로 전환

### 🔴 High Risk

#### 0. Big Bang 마이그레이션 리스크 (기존 방식 - 폐기됨)
**문제:**
- 전면 전환으로 인한 데이터 손실 위험 극대화
- 장시간 다운타임 필요 (1~2시간)
- 롤백 어려움 (복구 시간 예측 불가)
- 모든 기능 동시 테스트 부담

**왜 폐기했는가:**
- GPT-5 및 Gemini 검토 결과, 프로덕션 환경에서 Big Bang은 **실패 확률 40%+**
- 데이터 무결성 보장 불가
- 사용자 경험 악화 (다운타임)

**새로운 접근 (Strangler Fig Pattern):**
- ✅ 무중단 마이그레이션
- ✅ 이중쓰기로 데이터 무결성 보장
- ✅ 점진적 트래픽 전환 (5% → 100%)
- ✅ 언제든 롤백 가능
- **리스크 감소: 40% → 5%**

---

#### 1. 데이터 마이그레이션 실패
**문제:**
- 기존 JSONB 데이터를 새 스키마로 변환 중 데이터 손실
- 복잡한 변환 로직으로 인한 오류

**완화 전략:**
- ✅ 프로덕션 DB 백업 (마이그레이션 전)
- ✅ 개발 환경에서 먼저 테스트
- ✅ 단계별 마이그레이션 (롤백 가능)
- ✅ 데이터 검증 쿼리 작성
- ✅ 마이그레이션 로그 상세 기록

**롤백 계획:**
```sql
-- 마이그레이션 실패 시 원복 스크립트
DROP TABLE habit_records CASCADE;
DROP TABLE habits CASCADE;
...
-- 기존 테이블 복원
RESTORE TABLE habit_tracker FROM BACKUP;
```

---

#### 2. 성능 저하
**문제:**
- 테이블 JOIN 증가로 쿼리 속도 저하
- Realtime 기능으로 인한 서버 부하

**완화 전략:**
- ✅ 적절한 인덱스 설정
- ✅ 쿼리 성능 테스트 (EXPLAIN ANALYZE)
- ✅ React Query 캐싱 활용
- ✅ Realtime 연결 수 모니터링
- ✅ 필요 시 Materialized View 사용

**모니터링 지표:**
- API 응답 시간 < 200ms (p95)
- DB 쿼리 시간 < 100ms (p95)
- Realtime 연결 수 < 1000

---

### 🟡 Medium Risk

#### 3. 채팅 메시지 대량 발생 시 DB 용량
**문제:**
- 채팅 메시지가 누적되어 DB 용량 초과

**완화 전략:**
- ✅ 메시지 보관 기간 설정 (예: 3개월)
- ✅ 오래된 메시지 자동 삭제 (Cron Job)
- ✅ Supabase Storage 활용 (이미지)

---

#### 4. user_id 필터링 활성화로 인한 기존 사용자 영향
**문제:**
- 기존 데이터에 user_id가 없어 접근 불가

**완화 전략:**
- ✅ 마이그레이션 시 기존 데이터에 user_id 할당
- ✅ 사용자별 데이터 마이그레이션 스크립트
- ✅ 점진적 배포 (기존 사용자 우선 처리)

---

### 🟢 Low Risk

#### 5. React Query 학습 곡선
**문제:**
- 팀원들의 React Query 숙련도 부족

**완화 전략:**
- ✅ 공식 문서 학습
- ✅ 샘플 코드 작성
- ✅ 코드 리뷰 강화

---

#### 6. 의존성 충돌
**문제:**
- 새 패키지 설치 시 기존 패키지와 충돌

**완화 전략:**
- ✅ `package-lock.json` 관리
- ✅ 의존성 버전 명시
- ✅ 테스트 환경에서 먼저 설치

---

## Date/Timezone Policy (날짜/타임존 정책)

### 📅 표준화된 날짜 처리

#### 서버 측 (Database)
```sql
-- 모든 timestamp는 UTC로 저장
-- TIMESTAMPTZ 타입 사용 (자동 타임존 변환)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- 주차 시작일: DATE 타입 (타임존 무관)
week_start_date DATE NOT NULL

-- 주차 계산: ISO 8601 (월요일 시작)
-- 사용자 타임존 적용 후 계산
SELECT date_trunc('week', timestamp AT TIME ZONE 'Asia/Seoul');
```

#### 클라이언트 측 (Frontend)
```javascript
// 사용자 브라우저 타임존 자동 감지
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Date 객체 생성 (로컬 타임존)
const localDate = new Date(); // 사용자 타임존

// UTC로 변환하여 서버 전송
const utcDate = localDate.toISOString(); // "2025-10-11T12:00:00.000Z"

// 서버 응답을 로컬 타임존으로 표시
new Intl.DateTimeFormat('ko-KR', {
  timeZone: userTimezone,
  dateStyle: 'long',
  timeStyle: 'short'
}).format(new Date(utcDate));
```

#### 주차 계산 로직
```javascript
// 월요일 시작 주차
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (일) ~ 6 (토)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  return new Date(d.setDate(diff));
}

// 주차 종료일 (일요일)
function getWeekEndDate(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return endDate;
}
```

#### Edge Case 처리
- **여러 타임존 사용자**: 각 사용자의 로컬 타임존으로 주차 계산
- **자정 경계**: UTC 자정이 아닌 사용자 타임존 자정 기준
- **서머타임 (DST)**: TIMESTAMPTZ가 자동 처리
- **날짜만 필요한 경우**: DATE 타입 사용 (타임존 문제 없음)

#### 마이그레이션 시 주의사항
```sql
-- 기존 week_period 문자열 → week_start_date DATE 변환
UPDATE weeks SET week_start_date =
  to_date(
    substring(week_period FROM '\d{4}년 \d{1,2}월 \d{1,2}일'),
    'YYYY"년" FMMON"월" FMDD"일"'
  );

-- 타임존 보정 (한국 사용자 기준)
-- 9시간 차이 고려
```

---

## Cost Estimation (예상 비용)

### 💰 6개월 운영 비용 (예상)

#### Supabase 비용
| 항목 | 무료 플랜 | Pro 플랜 ($25/월) |
|------|-----------|-------------------|
| DB 용량 | 500MB | 8GB |
| 스토리지 | 1GB | 100GB |
| Realtime 연결 | 200 동시 | 500 동시 |
| Edge Function 요청 | 500K/월 | 2M/월 |
| **예상 단계** | Phase 0~1 | Phase 2~3 |
| **월 비용** | $0 | $25 |

**총 Supabase 비용 (6개월):**
- Phase 0~1 (2개월): $0 (무료 플랜)
- Phase 2~3 (4개월): $25 × 4 = $100
- **합계: $100**

#### 채팅 서비스 비용 (선택)

**5k MAU 미만**: Supabase Realtime 만 ($0 추가)

**5k~20k MAU**: 하이브리드 ($0~$50/월)
- Supabase: 휘발성 메시지 (무료)
- 자체 DB: 영속 메시지 (포함)

**20k+ MAU**: 외부 서비스
- **Sendbird**: $0 (100 MAU) → $99/월 (5k MAU)
- **Stream Chat**: $0 (5 MAU) → $99/월 (1k MAU)
- **예상**: $50~$100/월

**총 채팅 비용 (6개월, MAU=10k 가정):**
- $50 × 6 = $300

#### 기타 서비스

| 서비스 | 월 비용 | 6개월 |
|--------|---------|-------|
| **Feature Flag** (LaunchDarkly) | $0 (1k MAU) | $0 |
| **모니터링** (Sentry) | $0 (5k errors) | $0 |
| **이메일** (Resend) | $0 (100 emails) | $0 |
| **도메인** (선택) | $1~$2 | $6~$12 |

**총 기타 비용: $6~$12**

### 📊 최종 예상 비용 (6개월)

| 시나리오 | Supabase | 채팅 | 기타 | **총계** |
|---------|----------|------|------|---------|
| **최소** (5k MAU 미만) | $100 | $0 | $6 | **$106** |
| **중간** (5k~20k MAU) | $100 | $150 | $12 | **$262** |
| **최대** (20k+ MAU) | $150 | $600 | $12 | **$762** |

**현실적 예상 (Phase 3까지):** **$150~$300**

---

## Migration Strategy (마이그레이션 전략)

### 🔄 마이그레이션 단계

#### Step 1: 준비 (Pre-Migration)
```bash
# 1. 프로덕션 DB 백업
pg_dump -h your-db-host -U your-user habit_tracker > backup_$(date +%Y%m%d).sql

# 2. 개발 환경에 백업 복원
psql -h dev-db-host -U dev-user -d dev_db < backup_20251011.sql

# 3. 마이그레이션 스크립트 테스트
psql -h dev-db-host -U dev-user -d dev_db < supabase-migration-v2.sql
```

#### Step 2: 데이터 변환 (Data Transformation)
```sql
-- supabase-migration-v2.sql

BEGIN;

-- 1. 새 테이블 생성
CREATE TABLE children (...);
CREATE TABLE weeks (...);
CREATE TABLE habits (...);
CREATE TABLE habit_records (...);

-- 2. 기존 데이터 변환
INSERT INTO children (user_id, name)
SELECT DISTINCT
  user_id,
  child_name
FROM habit_tracker
WHERE user_id IS NOT NULL;

INSERT INTO weeks (child_id, week_start_date, week_end_date, theme, reflection, reward)
SELECT
  c.id,
  ht.week_start_date,
  ht.week_start_date + INTERVAL '6 days',
  ht.theme,
  ht.reflection,
  ht.reward
FROM habit_tracker ht
JOIN children c ON c.name = ht.child_name;

-- 3. JSONB 습관 데이터 변환
WITH habit_data AS (
  SELECT
    w.id as week_id,
    jsonb_array_elements(ht.habits) as habit
  FROM habit_tracker ht
  JOIN weeks w ON w.week_start_date = ht.week_start_date
)
INSERT INTO habits (week_id, name)
SELECT
  week_id,
  habit->>'name'
FROM habit_data;

-- 4. 습관 기록 변환 (7일치)
WITH habit_times AS (
  SELECT
    h.id as habit_id,
    w.week_start_date,
    jsonb_array_elements_text((SELECT habits FROM habit_tracker WHERE week_start_date = w.week_start_date LIMIT 1)::jsonb) as times,
    generate_series(0, 6) as day_offset
  FROM habits h
  JOIN weeks w ON w.id = h.week_id
)
INSERT INTO habit_records (habit_id, record_date, status)
SELECT
  habit_id,
  week_start_date + day_offset * INTERVAL '1 day',
  CASE
    WHEN times = 'green' THEN 'green'
    WHEN times = 'yellow' THEN 'yellow'
    WHEN times = 'red' THEN 'red'
    ELSE 'none'
  END
FROM habit_times;

-- 5. 데이터 검증
SELECT
  (SELECT COUNT(*) FROM habit_tracker) as old_count,
  (SELECT COUNT(*) FROM weeks) as new_count,
  (SELECT COUNT(*) FROM habits) as habits_count,
  (SELECT COUNT(*) FROM habit_records) as records_count;

COMMIT;
```

#### Step 3: 검증 (Validation)
```sql
-- 데이터 정합성 검증 쿼리

-- 1. 주차 수 일치 확인
SELECT
  '주차 수' as check_type,
  COUNT(DISTINCT week_start_date) as old_count,
  (SELECT COUNT(*) FROM weeks) as new_count,
  CASE WHEN COUNT(DISTINCT week_start_date) = (SELECT COUNT(*) FROM weeks)
    THEN '✅ 일치' ELSE '❌ 불일치' END as result
FROM habit_tracker;

-- 2. 습관 데이터 샘플 비교
SELECT
  ht.child_name,
  ht.week_start_date,
  ht.habits as old_habits,
  (
    SELECT jsonb_agg(jsonb_build_object('name', h.name, 'times',
      (SELECT jsonb_agg(hr.status ORDER BY hr.record_date)
       FROM habit_records hr WHERE hr.habit_id = h.id)
    ))
    FROM habits h
    WHERE h.week_id = w.id
  ) as new_habits
FROM habit_tracker ht
JOIN weeks w ON w.week_start_date = ht.week_start_date
LIMIT 5;

-- 3. 통계 비교 (녹색 카운트)
-- 기존 방식
SELECT
  child_name,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(habits) as habit,
         jsonb_array_elements_text(habit->'times') as time
    WHERE time = 'green'
  ) as green_count
FROM habit_tracker;

-- 새 방식
SELECT
  c.name,
  COUNT(*) as green_count
FROM habit_records hr
JOIN habits h ON h.id = hr.habit_id
JOIN weeks w ON w.id = h.week_id
JOIN children c ON c.id = w.child_id
WHERE hr.status = 'green'
GROUP BY c.name;
```

#### Step 4: 점진적 배포 (Blue-Green Deployment)
```
1. 새 DB 스키마를 별도 환경에 배포
2. 새 API 버전 배포 (v2 엔드포인트)
3. 프론트엔드에서 feature flag로 전환
4. 소수 사용자 대상 베타 테스트
5. 점진적 트래픽 전환 (10% → 50% → 100%)
6. 구 스키마 deprecation 공지
```

#### Step 5: 롤백 계획
```sql
-- 마이그레이션 실패 시
BEGIN;

-- 1. 새 테이블 삭제
DROP TABLE IF EXISTS habit_records CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS weeks CASCADE;
DROP TABLE IF EXISTS children CASCADE;

-- 2. 기존 테이블 복원 (백업에서)
-- (외부 스크립트로 실행)

COMMIT;
```

### 📊 마이그레이션 체크리스트

#### Pre-Migration
- [ ] 프로덕션 DB 백업 완료
- [ ] 개발 환경 마이그레이션 테스트 성공
- [ ] 데이터 검증 쿼리 작성 완료
- [ ] 롤백 스크립트 준비
- [ ] 팀원 교육 완료

#### Migration
- [ ] 서비스 점검 공지 (1주일 전)
- [ ] 마이그레이션 스크립트 실행
- [ ] 데이터 정합성 검증
- [ ] 새 API 배포
- [ ] 프론트엔드 배포

#### Post-Migration
- [ ] 기능 테스트 (주요 시나리오)
- [ ] 성능 모니터링 (24시간)
- [ ] 사용자 피드백 수집
- [ ] 구 스키마 유지 (1개월 백업)
- [ ] 최종 롤백 가능 기간 종료

---

## 📚 참고 자료

### 기술 문서
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html)

### 코드 참고
- 현재 DB 스키마: [supabase-schema.sql](supabase-schema.sql)
- 기존 API 레이어: [src/lib/database.js](src/lib/database.js)
- 메인 컴포넌트: [App.jsx](App.jsx)

---

## 🎯 다음 단계

1. **Tech Spec 검토 및 승인**
   - [ ] 이해관계자 리뷰
   - [ ] 예산 승인
   - [ ] 일정 확정

2. **상세 문서 작성**
   - [ ] `DB_MIGRATION_PLAN.md` 작성
   - [ ] `MCP_SETUP_GUIDE.md` 작성
   - [ ] `PHASE_1_TODO.md` 작성

3. **개발 환경 준비**
   - [ ] 개발 DB 셋업
   - [ ] MCP 서버 설치
   - [ ] Git 브랜치 전략 수립

---

**마지막 업데이트**: 2025년 10월 11일
**문서 버전**: 1.0
**승인 대기 중**
