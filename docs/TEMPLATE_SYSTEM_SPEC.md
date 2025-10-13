# 템플릿 시스템 개발 명세서 (Agent 3)

> **담당**: Agent 3 - Template System Developer
> **작성일**: 2025년 10월 13일
> **예상 기간**: 4일
> **관련 문서**: [TECH_SPEC.md](00-overview/TECH_SPEC.md), [PARALLEL_DEV_PLAN.md](PARALLEL_DEV_PLAN.md)

---

## 목표

습관 템플릿 저장 및 재사용으로 주차 생성 간소화

---

## 소유 파일

**Exclusive (독점 수정 권한):**
- `src/components/TemplateManager.jsx` - 템플릿 관리 UI (신규)
- `src/lib/templates.js` - 템플릿 CRUD (신규)
- `src/hooks/useTemplate.js` - React Query 훅 (신규)
- `docs/TEMPLATE_SYSTEM_SPEC.md` (이 파일)

**Shared (협의 필요):**
- `src/App.jsx` - 템플릿 UI 통합 (섹션 주석으로 구분)
- `src/lib/database-new.js` - 템플릿 관련 함수 추가 (필요 시)

---

## 기술 스택

- **Database**: Supabase (habit_templates 테이블)
- **State Management**: React Query
- **UI**: React Hooks, Tailwind CSS
- **Validation**: Zod (선택)

---

## 데이터 모델

### `habit_templates` 테이블 (기존)

```sql
CREATE TABLE habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 템플릿 이름 (예: "평일 루틴", "주말 루틴")
  description TEXT,                      -- 설명
  habits JSONB NOT NULL DEFAULT '[]',    -- 습관 배열
  is_default BOOLEAN DEFAULT false,      -- 기본 템플릿 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

---

## 핵심 기능

### 1. 템플릿 생성

**UI:**
- 현재 주차 데이터를 템플릿으로 저장
- 템플릿 이름 및 설명 입력
- 기본 템플릿 설정 옵션

**API:**
```javascript
// src/lib/templates.js
export async function createTemplate(templateData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('인증되지 않은 사용자');

  const { data, error } = await supabase
    .from('habit_templates')
    .insert({
      user_id: user.id,
      child_id: templateData.child_id,
      name: templateData.name,
      description: templateData.description,
      habits: templateData.habits,
      is_default: templateData.is_default || false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

### 2. 템플릿 조회

**UI:**
- 템플릿 목록 카드 형태로 표시
- 필터: 전체 / 아이별 / 기본 템플릿만
- 검색 기능

**API:**
```javascript
// src/lib/templates.js
export async function loadTemplates(filters = {}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('인증되지 않은 사용자');

  let query = supabase
    .from('habit_templates')
    .select('*, children(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filters.child_id) {
    query = query.eq('child_id', filters.child_id);
  }

  if (filters.is_default) {
    query = query.eq('is_default', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

---

### 3. 템플릿 수정

**UI:**
- 템플릿 이름/설명 수정
- 습관 목록 수정 (추가/삭제/순서 변경)

**API:**
```javascript
// src/lib/templates.js
export async function updateTemplate(templateId, updates) {
  const { data, error } = await supabase
    .from('habit_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

### 4. 템플릿 삭제

**UI:**
- 삭제 확인 모달
- 기본 템플릿은 삭제 불가 경고

**API:**
```javascript
// src/lib/templates.js
export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('habit_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
  return true;
}
```

---

### 5. 템플릿으로 주차 생성

**UI:**
- 템플릿 선택 → 주차 시작일 입력 → 생성
- 미리보기: 생성될 습관 목록 표시

**API:**
```javascript
// src/lib/templates.js
export async function createWeekFromTemplate(templateId, weekStartDate) {
  // 1. 템플릿 조회
  const { data: template, error: templateError } = await supabase
    .from('habit_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // 2. 주차 생성 (dual-write Edge Function 호출)
  const weekData = {
    childName: template.children.name,
    weekStartDate: weekStartDate,
    theme: template.description || '',
    habits: template.habits
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/dual-write-habit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `template_${templateId}_${weekStartDate}`
    },
    body: JSON.stringify({
      action: 'create_week',
      data: weekData
    })
  });

  if (!response.ok) throw new Error('주차 생성 실패');
  return await response.json();
}
```

---

## React Query 통합

### Custom Hook: `useTemplate`

```javascript
// src/hooks/useTemplate.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadTemplates, createTemplate, updateTemplate, deleteTemplate, createWeekFromTemplate } from '@/lib/templates';

export function useTemplates(filters = {}) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => loadTemplates(filters),
    staleTime: 5 * 60 * 1000 // 5분
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => updateTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });
}

export function useCreateWeekFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, weekStartDate }) => createWeekFromTemplate(templateId, weekStartDate)
  });
}
```

---

## UI 컴포넌트

### TemplateManager.jsx

```javascript
// src/components/TemplateManager.jsx
import { useState } from 'react';
import { useTemplates, useCreateTemplate, useDeleteTemplate } from '@/hooks/useTemplate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TemplateManager({ childName }) {
  const { data: templates, isLoading } = useTemplates({ child_name: childName });
  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">습관 템플릿</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          새 템플릿 만들기
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map(template => (
          <Card key={template.id} className="p-4">
            <h3 className="font-bold">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {template.habits.length}개 습관
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => handleUseTemplate(template.id)}>
                사용
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleEdit(template.id)}>
                수정
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(template.id)}>
                삭제
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <CreateTemplateModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
```

---

## 개발 일정

### Day 1: 데이터베이스
- [ ] `habit_templates` 테이블 확인
- [ ] RLS 정책 검토
- [ ] 샘플 데이터 생성

### Day 2: CRUD API
- [ ] `src/lib/templates.js` 작성
  - [ ] createTemplate()
  - [ ] loadTemplates()
  - [ ] updateTemplate()
  - [ ] deleteTemplate()
- [ ] 단위 테스트

### Day 3: React Query & UI
- [ ] `src/hooks/useTemplate.js` 작성
- [ ] `src/components/TemplateManager.jsx` 작성
- [ ] 템플릿 목록 카드 UI
- [ ] 생성/수정/삭제 모달

### Day 4: 템플릿 적용
- [ ] createWeekFromTemplate() 구현
- [ ] 주차 생성 플로우 통합
- [ ] 미리보기 기능
- [ ] 통합 테스트

---

## 의존성

**새로 추가할 패키지:**
```json
{
  "dependencies": {
    "@tanstack/react-query": "5.0.0"
  }
}
```

**설치 명령:**
```bash
npm install @tanstack/react-query@5.0.0 --save-exact
```

---

## 참고 자료

- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase CRUD Operations](https://supabase.com/docs/reference/javascript/insert)

---

**마지막 업데이트**: 2025년 10월 13일
**시작 예정일**: 2025년 10월 14일
**완료 목표일**: 2025년 10월 17일
