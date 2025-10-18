# 향상된 대시보드 기능 요구사항 (Feature Proposal)

**작성일**: 2025-10-18
**상태**: 🔄 기획 단계
**우선순위**: HIGH
**예상 구현 시간**: 4-6주

---

## 📋 개요

현재 대시보드는 **단일 아이의 4주 기반 통계**만 제공합니다. 이 제안은 **다중 아이 비교, 장기 추적, 자기 인식, 상세 분석**을 위한 종합적인 대시보드 업그레이드입니다.

---

## 🎯 핵심 기능 (5가지)

### 1️⃣ **비교 대시보드** (Comparison Dashboard)

**목적**: 등록된 모든 아이들의 습관 달성률을 한눈에 비교

#### 요구사항
- **다중 아이 비교 뷰**
  - 모든 아이들의 이름 나열
  - 각 아이별 현재 주 습관 달성률 (%)
  - 각 아이별 지난주 비교 (↑/↓/→)
  - 각 아이별 월간 평균 달성률

- **시각화**
  - 막대 그래프: 아이별 달성률 비교
  - 순위 표시 (🥇 1위, 🥈 2위, 🥉 3위)
  - 색상 코딩: 우수(🟢 80%+), 보통(🟡 50-79%), 미흡(🔴 <50%)

- **인터랙션**
  - 특정 아이 클릭 → 해당 아이 개별 대시보드로 이동
  - 주/월 단위 전환
  - 아이별 습관 내용 비교 옵션

#### 데이터 필요
```
children → weeks → habits → habit_records
↓
aggregate by child
- current_week_completion (%)
- last_week_completion (%)
- monthly_average (%)
- trend (↑↓→)
```

---

### 2️⃣ **기간별 달성률 대시보드** (Trend Dashboard)

**목적**: 각 아이의 습관 달성률 **시간 경과에 따른 변화** 추적

#### 요구사항
- **시계열 데이터 시각화**
  - X축: 날짜 (최소 8주 이상)
  - Y축: 습관 달성률 (0-100%)
  - 라인 차트: 추세선
  - 선택적 아이 다중 선택 비교 가능

- **상세 정보**
  - 주별 달성률 표: 주차별 상세 수치
  - 월별 요약: 월간 평균, 최고점, 최저점
  - 개선 추세: 지난달 대비 이번달 변화율

- **필터링**
  - 기간 선택: 4주, 8주, 12주, 3개월, 6개월, 1년
  - 특정 습관만 보기 옵션
  - 특정 요일 패턴 보기 (월-금 vs 주말)

#### 데이터 필요
```
habit_records 시계열 데이터
→ daily completion rate
→ weekly aggregation
→ monthly summary
```

---

### 3️⃣ **자기인식 대시보드** (Self-Awareness Dashboard)

**목적**: 아이가 스스로 **약점을 인식**하고 **개선 방향을 설정**하도록 도움

#### 요구사항
- **약점 분석**
  - 가장 못한 습관 (lowest achievement) 순위
  - 실패율이 높은 요일 (Monday vs Sunday)
  - 실패 패턴: 특정 시간대? 특정 요일?
  - 최근 하락세 습관 (trending down)

- **강점 분석**
  - 가장 잘한 습관 (highest achievement) 순위
  - 일관되게 잘한 요일 (consistency)
  - 최근 상승세 습관 (trending up)

- **인사이트 생성**
  ```
  📊 당신의 습관 분석:

  💪 잘하고 있어요!
  - "책 읽기": 95% 달성 (12주 연속!)
  - "양치": 88% 달성 (매일 거의 완벽!)

  😅 개선이 필요해요
  - "숙제": 45% 달성 (특히 금요일이 어려워요)
  - "운동": 60% 달성 (최근 하락 중이에요)

  🎯 다음 주 목표 제안
  - 숙제: 금요일 저녁 6시 알림 추가?
  - 운동: 친구와 함께하기?
  ```

- **대화형 피드백**
  - AI 기반 제안 (또는 부모 입력)
  - 아이가 다음주 목표 직접 설정
  - 부모가 격려 메시지 추가 가능

#### 데이터 필요
```
habit_records 통계 분석
→ 실패율 분석
→ 요일별 패턴
→ 시간대별 패턴 (if tracked)
→ 추세 분석 (up/down)
```

---

### 4️⃣ **월간 상세 대시보드** (Monthly Detail Dashboard)

**목적**: 현재 4주 제한을 없애고 **과거 모든 월의 데이터 상세 조회**

#### 요구사항
- **월 선택 기능**
  - 캘린더 피커 또는 월 탭
  - 이전 달 / 다음 달 네비게이션
  - "지난 3개월" "지난 6개월" 빠른 선택

- **월별 상세 뷰**
  - 월간 습관 요약: 월별 달성률
  - 주별 분해: 각 주의 세부 정보
  - 일별 셀 뷰: 달력 형태 히트맵
    ```
    월  화  수  목  금  토  일
    🟢  🟢  🟡  🟢  🔴  🟢  🟢  (1주)
    🟢  🟡  🟢  🟢  🟢  🟢  🟡  (2주)
    ...
    ```

- **다운로드 & 내보내기**
  - 월간 보고서 PDF 생성
  - Excel 내보내기 (부모와 공유용)
  - 인쇄 가능 형태

#### 데이터 필요
```
weeks → habits → habit_records
- 모든 과거 월의 데이터 접근
- 월별 그룹화 및 집계
```

---

### 5️⃣ **실시간 동기화 대시보드** (Real-time Sync Dashboard)

**목적**: 모든 대시보드가 **최신 데이터를 실시간으로 반영**

#### 요구사항
- **자동 새로고침**
  - 다른 기기에서 습관 업데이트 시 자동 반영
  - 부모가 수정할 때 아이 화면 실시간 업데이트
  - 폴링 또는 WebSocket 기반 (Supabase Realtime)

- **상태 표시**
  - "마지막 업데이트: 2분 전"
  - 실시간 동기 중 표시 (⟳ 아이콘)
  - 동기화 오류 알림

- **멀티 디바이스 지원**
  - 부모 모바일에서 수정 → 아이 태블릿에 즉시 반영
  - 부모 웹에서 대시보드 본 상태에서 데이터 자동 갱신
  - 부모-아이 간 알림 (새로운 달성 / 실패 등)

#### 기술 구현
```
Supabase Realtime
→ subscribe to habit_records changes
→ auto-refresh all dashboards
→ conflict resolution for multi-device edits
```

---

## 📊 데이터 모델 확장

### 필요한 추가 필드/테이블

#### 기존 테이블 확장
```sql
-- habit_records에 추가 필드 (선택사항)
ALTER TABLE habit_records ADD COLUMN time_period TEXT; -- "아침", "저녁" 등
ALTER TABLE habit_records ADD COLUMN notes TEXT; -- 아이가 작성한 메모

-- weeks에 추가 필드
ALTER TABLE weeks ADD COLUMN child_insights JSONB; -- 자기인식 분석 결과 캐시
ALTER TABLE weeks ADD COLUMN goals_next_week JSONB; -- 다음주 목표
```

#### 신규 테이블 (선택사항)
```sql
-- 대시보드 상태 저장 (필터 상태 등)
CREATE TABLE dashboard_preferences (
  id UUID PRIMARY KEY,
  user_id UUID,
  dashboard_type TEXT, -- 'comparison', 'trend', 'self-awareness', etc.
  filters JSONB, -- 저장된 필터 (기간, 아이, 습관 선택)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🎨 UI/UX 설계

### 대시보드 네비게이션 구조

```
Dashboard Hub (새로운 메인)
├── 📊 비교 대시보드
│   ├── 실시간 순위
│   ├── 주별 비교
│   └── 월별 비교
│
├── 📈 기간별 달성률 (Trend)
│   ├── 시계열 차트
│   ├── 주별 테이블
│   └── 통계 요약
│
├── 🧠 자기인식 (Self-Awareness)
│   ├── 약점 분석
│   ├── 강점 분석
│   └── AI 제안 & 목표 설정
│
├── 📅 월간 상세 (Monthly Detail)
│   ├── 월 선택
│   ├── 히트맵
│   └── PDF 내보내기
│
└── ⚙️ 설정
    ├── 실시간 동기화 활성/비활성
    ├── 대시보드 레이아웃 선택
    └── 알림 설정
```

### 모바일/태블릿 반응형 설계

- 데스크탑: 2-3열 그리드 레이아웃
- 태블릿: 2열 레이아웃
- 모바일: 1열 카드 스택

---

## 🛠️ 기술 스택

### 프론트엔드
- **차트 라이브러리**: Recharts (기존) + Recharts Advanced
- **상태 관리**: React Query (캐싱) + Context API
- **실시간**: Supabase Realtime (WebSocket)
- **날짜**: date-fns (ISO 주/월 계산)
- **데이터 처리**: Lodash, Ramda

### 백엔드
- **Edge Function**: 데이터 집계 함수
  - `aggregate_completion_by_child()`
  - `calculate_trends()`
  - `generate_insights()`
- **데이터베이스**: 집계 뷰 (PostgreSQL)
  ```sql
  CREATE VIEW v_daily_completion AS
  SELECT
    child_id,
    record_date,
    COUNT(*) as total_habits,
    COUNT(CASE WHEN status = 'green' THEN 1 END) as completed,
    ROUND(100.0 * COUNT(CASE WHEN status = 'green' THEN 1 END) / COUNT(*), 2) as completion_rate
  FROM habits h
  JOIN habit_records hr ON h.id = hr.habit_id
  GROUP BY child_id, record_date;
  ```

---

## 📈 구현 로드맵

### Phase 1: 기초 (1주)
- ✅ 데이터베이스 뷰 생성 (집계 데이터)
- ✅ Edge Function 작성 (데이터 계산)
- ✅ 비교 대시보드 기본 UI

### Phase 2: 고급 기능 (1-2주)
- ✅ 기간별 달성률 차트
- ✅ 월간 상세 히트맵
- ✅ 필터링 및 분해

### Phase 3: 자기인식 (1주)
- ✅ 패턴 분석 로직
- ✅ AI 기반 인사이트 (또는 규칙 기반)
- ✅ 목표 설정 UI

### Phase 4: 실시간 동기화 (3-4일)
- ✅ Supabase Realtime 통합
- ✅ 멀티 디바이스 테스트
- ✅ 충돌 해결

---

## 💾 데이터 성능 고려사항

### 인덱스 전략
```sql
-- 기존 인덱스 활용
- habit_id (이미 존재)
- record_date (이미 존재)

-- 추가 권장 인덱스
CREATE INDEX idx_habit_records_date_status
ON habit_records(record_date, status);

CREATE INDEX idx_habit_records_child_date
ON habit_records(child_id, record_date)
USING (
  SELECT child_id FROM habits h
  JOIN weeks w ON h.week_id = w.id
  JOIN children c ON w.child_id = c.id
);
```

### 캐싱 전략
- React Query로 집계 데이터 캐싱 (5분)
- 대시보드 선택 상태 localStorage 저장
- Supabase Realtime으로 즉시 무효화

### 쿼리 최적화
- 월 단위로 데이터 분할 (쿼리 범위 축소)
- N+1 쿼리 방지 (JOIN 최적화)
- 대량 데이터 페이지네이션

---

## 🎯 성공 기준

| 기준 | 목표 | 검증 방법 |
|------|------|---------|
| **성능** | <2초 로드 | 브라우저 DevTools |
| **정확성** | 데이터 100% 일치 | 수동 검증 테스트 |
| **반응성** | <500ms 실시간 업데이트 | Realtime 테스트 |
| **사용성** | 부모/아이 모두 직관적 | 사용자 테스트 |
| **모바일** | 모든 크기에서 최적화 | 반응형 테스트 |

---

## 📝 다음 단계

1. **설계 검토 & 승인**
   - 이 문서 검토
   - UI/UX 목업 작성
   - 우선순위 조정

2. **상세 기술 설계**
   - 데이터베이스 마이그레이션 계획
   - Edge Function 사양 작성
   - 컴포넌트 구조 설계

3. **구현 시작**
   - Phase 1부터 점진적 구현
   - 각 단계별 테스트
   - 사용자 피드백 수집

---

**문서 버전**: 1.0 (Draft)
**상태**: 🔄 검토 및 승인 대기
**담당자**: Development Team
**예상 완료**: 2025-11-15 (4-6주)
