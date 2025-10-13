# 템플릿 시스템 사용 가이드

> **Agent 3: Template System Developer**
> **작성일**: 2025년 10월 13일
> **버전**: 1.0

---

## 개요

템플릿 시스템을 사용하면 자주 사용하는 습관 세트를 저장하고 빠르게 재사용할 수 있습니다.

예를 들어:
- **학기 중 루틴**: 학교에 다니는 동안 사용하는 습관
- **방학 루틴**: 방학 동안 사용하는 습관
- **주말 루틴**: 주말에만 사용하는 습관

---

## 주요 기능

### 1. 템플릿 저장

**현재 작업 중인 습관을 템플릿으로 저장하기:**

1. 습관 추적 화면에서 원하는 습관을 모두 설정
2. 우측 상단 **"템플릿"** 버튼 클릭
3. **"현재 습관 저장"** 버튼 클릭
4. 템플릿 이름과 설명 입력
   - 예: 이름 = "학기 중 루틴", 설명 = "평일 학교 일정"
5. 필요시 **"기본 템플릿으로 설정"** 체크
6. **"저장"** 버튼 클릭

### 2. 템플릿 조회

**저장된 템플릿 목록 보기:**

1. 우측 상단 **"템플릿"** 버튼 클릭
2. 저장된 템플릿 카드 확인
   - 템플릿 이름
   - 설명
   - 습관 개수
   - 습관 목록 미리보기

### 3. 템플릿으로 주차 생성

**템플릿을 사용하여 새 주차 빠르게 만들기:**

1. 템플릿 목록에서 사용할 템플릿 선택
2. **"사용"** 버튼 (녹색, 달력 아이콘) 클릭
3. 주차 시작일 선택 (자동으로 월요일로 조정됨)
4. 생성될 습관 목록 확인
5. **"주차 생성"** 버튼 클릭
6. 생성된 주차로 자동 이동

### 4. 템플릿 수정

**기존 템플릿 정보 수정하기:**

1. 템플릿 카드에서 **연필 아이콘** (수정) 버튼 클릭
2. 템플릿 이름, 설명, 기본 템플릿 설정 변경
3. **"저장"** 버튼 클릭

> **참고**: 습관 내용을 수정하려면 템플릿을 삭제하고 새로 만드는 것을 권장합니다.

### 5. 템플릿 삭제

**불필요한 템플릿 삭제하기:**

1. 템플릿 카드에서 **휴지통 아이콘** (삭제) 버튼 클릭
2. 확인 대화상자에서 **"확인"** 클릭

---

## 실전 사용 예시

### 예시 1: 학기 중 / 방학 루틴 분리

**상황**: 학기 중에는 학교 일정이 있고, 방학에는 집에서 공부하는 일정이 다름

**해결책**:

1. 학기 중 습관 세트 만들기
   - 아침 일찍 일어나기
   - 학교 준비 스스로 하기
   - 숙제 먼저 하기
   - 등...
2. "학기 중 루틴" 템플릿으로 저장
3. 방학 습관 세트 만들기
   - 아침 여유롭게 일어나기
   - 책 읽기
   - 운동하기
   - 등...
4. "방학 루틴" 템플릿으로 저장
5. 필요할 때마다 해당 템플릿 사용

### 예시 2: 형제자매 간 템플릿 공유

**상황**: 두 자녀가 비슷한 습관을 사용하지만 일부만 다름

**해결책**:

1. 첫째 아이 습관 세트 만들기
2. "초등학생 루틴" 템플릿으로 저장
3. 둘째 아이 주차 만들 때:
   - "초등학생 루틴" 템플릿 사용
   - 생성 후 일부 습관만 수정
4. 수정된 버전을 "둘째 루틴"으로 다시 저장

### 예시 3: 주간 테마 변경

**상황**: 매주 다른 테마로 습관 트래킹

**해결책**:

1. 여러 테마별 템플릿 저장
   - "건강 집중 주간"
   - "공부 집중 주간"
   - "놀이 집중 주간"
2. 매주 월요일에 원하는 테마 템플릿 선택
3. 빠르게 새 주차 생성

---

## 기술 사양

### 데이터 구조

**habit_templates 테이블:**

```sql
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  child_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  habits JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**habits JSONB 구조:**

```json
[
  {
    "name": "아침 (6-9시) 스스로 일어나기",
    "time_period": "아침 (6-9시)",
    "display_order": 0
  },
  {
    "name": "오전 (9-12시) 집중해서 공부/놀이",
    "time_period": "오전 (9-12시)",
    "display_order": 1
  }
]
```

### API 함수

**CRUD 함수 (src/lib/templates.js):**

- `createTemplate(templateData)` - 템플릿 생성
- `loadTemplates(filters)` - 템플릿 목록 조회
- `loadTemplate(templateId)` - 단일 템플릿 조회
- `updateTemplate(templateId, updates)` - 템플릿 수정
- `deleteTemplate(templateId)` - 템플릿 삭제
- `createWeekFromTemplate(templateId, childName, weekStartDate)` - 템플릿으로 주차 생성

**React Query 훅 (src/hooks/useTemplate.js):**

- `useTemplates(filters)` - 템플릿 목록 쿼리
- `useTemplate(templateId)` - 단일 템플릿 쿼리
- `useCreateTemplate()` - 템플릿 생성 뮤테이션
- `useUpdateTemplate()` - 템플릿 수정 뮤테이션
- `useDeleteTemplate()` - 템플릿 삭제 뮤테이션
- `useCreateWeekFromTemplate()` - 주차 생성 뮤테이션

---

## 보안 및 권한

### Row Level Security (RLS)

템플릿은 사용자별로 완전히 격리됩니다:

```sql
-- 사용자는 자신의 템플릿만 조회/수정/삭제 가능
CREATE POLICY habit_templates_select_policy ON habit_templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY habit_templates_insert_policy ON habit_templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY habit_templates_update_policy ON habit_templates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY habit_templates_delete_policy ON habit_templates
FOR DELETE USING (auth.uid() = user_id);
```

---

## 문제 해결

### Q1. 템플릿 버튼이 보이지 않아요

**A**: 다음을 확인하세요:
- 로그인 상태 확인
- 아이가 선택되어 있는지 확인
- 브라우저 새로고침 (Ctrl/Cmd + R)

### Q2. 템플릿 저장 시 "템플릿 생성 실패" 오류

**A**: 가능한 원인:
- 템플릿 이름이 비어있음 → 이름 입력 필수
- 네트워크 연결 문제 → 인터넷 연결 확인
- Supabase 권한 문제 → 관리자에게 문의

### Q3. 템플릿으로 주차 생성이 안 돼요

**A**: 체크리스트:
- 주차 시작일이 올바른 형식인지 확인 (YYYY-MM-DD)
- 이미 동일한 주차가 존재하는지 확인
- 브라우저 콘솔에서 에러 메시지 확인 (F12)

### Q4. 템플릿 목록이 로딩되지 않아요

**A**: 조치 방법:
1. 브라우저 새로고침
2. 로그아웃 후 다시 로그인
3. 브라우저 캐시 삭제
4. 여전히 안 되면 관리자에게 문의

---

## 모범 사례

### 1. 명확한 템플릿 이름

❌ 나쁜 예: "템플릿1", "새 템플릿", "테스트"
✅ 좋은 예: "평일 학교 루틴", "주말 여유 루틴", "시험 기간 집중"

### 2. 상세한 설명 작성

템플릿 설명에 다음 정보 포함:
- 언제 사용하는 템플릿인지
- 어떤 특징이 있는지
- 주의사항

예:
```
이름: 시험 기간 집중 루틴
설명: 시험 2주 전부터 사용. 공부 시간 늘리고 놀이 시간 줄임
```

### 3. 정기적인 템플릿 정리

- 더 이상 사용하지 않는 템플릿은 삭제
- 비슷한 템플릿은 통합
- 분기별로 템플릿 검토

### 4. 기본 템플릿 설정

가장 자주 사용하는 템플릿을 "기본 템플릿"으로 설정하면 빠르게 접근 가능

---

## 향후 개선 사항

### Phase 2 (계획 중)

- [ ] 템플릿 검색 기능
- [ ] 템플릿 태그 시스템
- [ ] 템플릿 공유 기능 (가족 간)
- [ ] 템플릿 사용 통계
- [ ] 템플릿 복사 기능

### Phase 3 (미래)

- [ ] 템플릿 추천 시스템 (AI)
- [ ] 커뮤니티 템플릿 마켓플레이스
- [ ] 템플릿 버전 관리
- [ ] 템플릿 즐겨찾기

---

## 참고 자료

- [TEMPLATE_SYSTEM_SPEC.md](TEMPLATE_SYSTEM_SPEC.md) - 개발 명세서
- [PARALLEL_DEV_PLAN.md](PARALLEL_DEV_PLAN.md) - 병렬 개발 계획
- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase CRUD Guide](https://supabase.com/docs/guides/database/tables)

---

**마지막 업데이트**: 2025년 10월 13일
**문서 버전**: 1.0
**담당**: Agent 3 - Template System Developer
