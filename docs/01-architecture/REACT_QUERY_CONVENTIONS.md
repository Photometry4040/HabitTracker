# React Query 컨벤션: 점진적 도입 가이드

> **핵심 원칙**: 템플릿 기능부터 시작하여 점진적으로 확장
> **목표**: 기존 코드 영향 최소화, 새 기능만 React Query 사용

---

## 📋 목차
1. [도입 전략](#도입-전략)
2. [QueryKey 표준](#querykey-표준)
3. [파일 구조](#파일-구조)
4. [기본 패턴](#기본-패턴)
5. [고급 패턴](#고급-패턴)
6. [마이그레이션 가이드](#마이그레이션-가이드)

---

## 도입 전략

### ❌ 하지 말아야 할 것
- **전체 앱 리팩토링**: App.jsx의 기존 상태 관리를 React Query로 전환 (너무 위험)
- **Big Bang 전환**: 모든 API 호출을 한 번에 변경
- **기존 코드 수정**: 작동 중인 습관 트래커 로직 건드리기

### ✅ 해야 할 것
- **템플릿 기능만**: 새로 추가되는 템플릿 기능에만 React Query 사용
- **점진적 확장**: 성공 후 다른 기능으로 확대
- **병행 운영**: 기존 useState + 새 React Query 공존

---

## Phase별 도입 계획

### Phase 1 (4주): 템플릿 기능만
```
✅ 템플릿 목록 조회
✅ 템플릿 상세 조회
✅ 템플릿 생성/수정/삭제
✅ 템플릿 댓글 (Realtime)
```

### Phase 2 (3주): 읽기 전환 (선택)
```
⚠️  주의: 기존 습관 트래커 읽기 전환
   - Feature Flag로 5% 트래픽부터 시작
   - loadChildData() → useQuery로 교체
```

### Phase 3 (3-4주): 쓰기 전환 (선택)
```
⚠️  주의: 기존 습관 트래커 쓰기 전환
   - saveChildData() → useMutation으로 교체
   - 낙관적 업데이트 (Optimistic Updates)
```

**초기 권장**: Phase 1만 구현 (템플릿 기능)

---

## QueryKey 표준

### 1. QueryKey 구조

#### 기본 형식
```javascript
['entity', 'action', ...filters]
```

#### 예시
```javascript
// 단일 항목
['template', 'detail', templateId]

// 목록
['templates', 'list', { userId, isPublic }]

// 무한 스크롤
['templates', 'infinite', { category }]

// 통계
['statistics', 'weekly', { childId, weekStart }]
```

---

### 2. Entity별 QueryKey 정의

#### Templates (템플릿)
```javascript
// src/lib/queryKeys.js

export const templateKeys = {
  // 전체 무효화 시 사용
  all: ['templates'],

  // 목록 (필터 있음)
  lists: () => [...templateKeys.all, 'list'],
  list: (filters) => [...templateKeys.lists(), filters],

  // 상세 (단일 항목)
  details: () => [...templateKeys.all, 'detail'],
  detail: (id) => [...templateKeys.details(), id],

  // 내 템플릿만
  mine: (userId) => [...templateKeys.all, 'mine', userId],

  // 공개 템플릿만
  public: (filters) => [...templateKeys.all, 'public', filters],
};

// 사용 예시
templateKeys.all           // ['templates']
templateKeys.lists()       // ['templates', 'list']
templateKeys.list({ isPublic: true })  // ['templates', 'list', { isPublic: true }]
templateKeys.detail('abc') // ['templates', 'detail', 'abc']
```

#### Template Comments (템플릿 댓글)
```javascript
export const commentKeys = {
  all: ['comments'],

  lists: () => [...commentKeys.all, 'list'],
  byTemplate: (templateId) => [...commentKeys.lists(), { templateId }],

  detail: (id) => [...commentKeys.all, 'detail', id],
};
```

#### Children (아이 정보)
```javascript
export const childKeys = {
  all: ['children'],

  lists: () => [...childKeys.all, 'list'],
  list: (userId) => [...childKeys.lists(), { userId }],

  detail: (id) => [...childKeys.all, 'detail', id],
};
```

#### Weeks (주차 정보)
```javascript
export const weekKeys = {
  all: ['weeks'],

  lists: () => [...weekKeys.all, 'list'],
  byChild: (childId) => [...weekKeys.lists(), { childId }],
  byChildAndDate: (childId, weekStart) => [
    ...weekKeys.lists(),
    { childId, weekStart }
  ],

  detail: (id) => [...weekKeys.all, 'detail', id],

  // 통계 포함
  withStats: (weekId) => [...weekKeys.detail(weekId), 'stats'],
};
```

#### Statistics (통계)
```javascript
export const statisticsKeys = {
  all: ['statistics'],

  weekly: (childId, weekStart) => [
    ...statisticsKeys.all,
    'weekly',
    { childId, weekStart }
  ],

  monthly: (childId, month) => [
    ...statisticsKeys.all,
    'monthly',
    { childId, month }
  ],
};
```

---

### 3. QueryKey 헬퍼 함수

**파일**: `src/lib/queryKeys.js` (통합)

```javascript
// src/lib/queryKeys.js

// 1. Templates
export const templateKeys = {
  all: ['templates'],
  lists: () => [...templateKeys.all, 'list'],
  list: (filters) => [...templateKeys.lists(), filters],
  details: () => [...templateKeys.all, 'detail'],
  detail: (id) => [...templateKeys.details(), id],
  mine: (userId) => [...templateKeys.all, 'mine', userId],
  public: (filters) => [...templateKeys.all, 'public', filters],
};

// 2. Comments
export const commentKeys = {
  all: ['comments'],
  lists: () => [...commentKeys.all, 'list'],
  byTemplate: (templateId) => [...commentKeys.lists(), { templateId }],
  detail: (id) => [...commentKeys.all, 'detail', id],
};

// 3. Children
export const childKeys = {
  all: ['children'],
  lists: () => [...childKeys.all, 'list'],
  list: (userId) => [...childKeys.lists(), { userId }],
  detail: (id) => [...childKeys.all, 'detail', id],
};

// 4. Weeks
export const weekKeys = {
  all: ['weeks'],
  lists: () => [...weekKeys.all, 'list'],
  byChild: (childId) => [...weekKeys.lists(), { childId }],
  byChildAndDate: (childId, weekStart) => [
    ...weekKeys.lists(),
    { childId, weekStart }
  ],
  detail: (id) => [...weekKeys.all, 'detail', id],
  withStats: (weekId) => [...weekKeys.detail(weekId), 'stats'],
};

// 5. Habits
export const habitKeys = {
  all: ['habits'],
  lists: () => [...habitKeys.all, 'list'],
  byWeek: (weekId) => [...habitKeys.lists(), { weekId }],
  detail: (id) => [...habitKeys.all, 'detail', id],
};

// 6. Completions
export const completionKeys = {
  all: ['completions'],
  lists: () => [...completionKeys.all, 'list'],
  byHabit: (habitId) => [...completionKeys.lists(), { habitId }],
  byWeek: (weekId) => [...completionKeys.lists(), { weekId }],
};

// 7. Statistics
export const statisticsKeys = {
  all: ['statistics'],
  weekly: (childId, weekStart) => [
    ...statisticsKeys.all,
    'weekly',
    { childId, weekStart }
  ],
  monthly: (childId, month) => [
    ...statisticsKeys.all,
    'monthly',
    { childId, month }
  ],
};
```

---

## 파일 구조

### 권장 구조
```
src/
├── lib/
│   ├── queryKeys.js         # QueryKey 정의
│   ├── queryClient.js       # QueryClient 설정
│   └── database.js          # 기존 Supabase 클라이언트
│
├── hooks/
│   ├── templates/
│   │   ├── useTemplates.js       # 템플릿 목록
│   │   ├── useTemplate.js        # 템플릿 상세
│   │   ├── useCreateTemplate.js  # 템플릿 생성
│   │   ├── useUpdateTemplate.js  # 템플릿 수정
│   │   └── useDeleteTemplate.js  # 템플릿 삭제
│   │
│   ├── comments/
│   │   ├── useComments.js        # 댓글 목록
│   │   └── useAddComment.js      # 댓글 추가
│   │
│   └── (기존 습관 트래커는 여기 없음 - useState 유지)
│
└── components/
    ├── templates/
    │   ├── TemplateList.jsx
    │   ├── TemplateDetail.jsx
    │   └── TemplateForm.jsx
    │
    └── (기존 컴포넌트는 수정 안 함)
```

---

## 기본 패턴

### 1. QueryClient 설정

**파일**: `src/lib/queryClient.js`

```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 설정
      staleTime: 1000 * 60 * 5,  // 5분 (데이터가 "오래됨"으로 간주되는 시간)
      cacheTime: 1000 * 60 * 30, // 30분 (캐시 보관 시간)
      retry: 1,                   // 실패 시 1회 재시도
      refetchOnWindowFocus: false, // 창 포커스 시 자동 재조회 비활성화

      // 에러 처리
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // 기본 설정
      retry: 0,  // Mutation은 재시도 안 함

      // 에러 처리
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
```

**App.jsx에 추가**:
```javascript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 기존 코드 */}

      {/* 개발 환경에서만 DevTools 표시 */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

---

### 2. 조회 (useQuery)

#### 템플릿 목록 조회
**파일**: `src/hooks/templates/useTemplates.js`

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

export function useTemplates(filters = {}) {
  return useQuery({
    queryKey: templateKeys.list(filters),

    queryFn: async () => {
      let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },

    // 옵션
    staleTime: 1000 * 60 * 5,  // 5분
    enabled: true,              // 즉시 실행
  });
}

// 사용 예시
function TemplateList() {
  const { data: templates, isLoading, error } = useTemplates({ isPublic: true });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <ul>
      {templates.map(template => (
        <li key={template.id}>{template.name}</li>
      ))}
    </ul>
  );
}
```

---

#### 템플릿 상세 조회
**파일**: `src/hooks/templates/useTemplate.js`

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

export function useTemplate(templateId) {
  return useQuery({
    queryKey: templateKeys.detail(templateId),

    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          template_habits (
            id,
            text,
            color,
            sort_order
          )
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },

    // templateId가 없으면 실행 안 함
    enabled: !!templateId,
  });
}

// 사용 예시
function TemplateDetail({ templateId }) {
  const { data: template, isLoading, error } = useTemplate(templateId);

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <div>
      <h2>{template.name}</h2>
      <p>{template.description}</p>
      <ul>
        {template.template_habits.map(habit => (
          <li key={habit.id}>{habit.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

### 3. 생성 (useMutation)

#### 템플릿 생성
**파일**: `src/hooks/templates/useCreateTemplate.js`

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTemplate) => {
      const { data, error } = await supabase
        .from('templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (newTemplate) => {
      // 템플릿 목록 무효화 (자동 재조회)
      queryClient.invalidateQueries({
        queryKey: templateKeys.lists()
      });

      // 새 템플릿을 캐시에 직접 추가 (선택)
      queryClient.setQueryData(
        templateKeys.detail(newTemplate.id),
        newTemplate
      );
    },

    onError: (error) => {
      console.error('템플릿 생성 실패:', error);
      alert('템플릿 생성에 실패했습니다.');
    },
  });
}

// 사용 예시
function TemplateForm() {
  const createTemplate = useCreateTemplate();

  const handleSubmit = (e) => {
    e.preventDefault();

    createTemplate.mutate({
      name: '아침 루틴',
      description: '아침에 할 습관들',
      is_public: false,
      user_id: 'user-id',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createTemplate.isLoading}>
        {createTemplate.isLoading ? '생성 중...' : '템플릿 생성'}
      </button>

      {createTemplate.isError && (
        <div>오류: {createTemplate.error.message}</div>
      )}
    </form>
  );
}
```

---

### 4. 수정 (useMutation)

#### 템플릿 수정
**파일**: `src/hooks/templates/useUpdateTemplate.js`

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (updatedTemplate) => {
      // 해당 템플릿 상세 캐시 업데이트
      queryClient.setQueryData(
        templateKeys.detail(updatedTemplate.id),
        updatedTemplate
      );

      // 템플릿 목록 무효화
      queryClient.invalidateQueries({
        queryKey: templateKeys.lists()
      });
    },
  });
}

// 사용 예시
function TemplateEditForm({ templateId }) {
  const { data: template } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();

  const handleSubmit = (e) => {
    e.preventDefault();

    updateTemplate.mutate({
      id: templateId,
      updates: {
        name: '수정된 이름',
        description: '수정된 설명',
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드 */}
      <button type="submit" disabled={updateTemplate.isLoading}>
        수정
      </button>
    </form>
  );
}
```

---

### 5. 삭제 (useMutation)

#### 템플릿 삭제
**파일**: `src/hooks/templates/useDeleteTemplate.js`

```javascript
import { useMutation, useQueryClient } from '@antml/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },

    onSuccess: (deletedId) => {
      // 템플릿 목록 무효화
      queryClient.invalidateQueries({
        queryKey: templateKeys.lists()
      });

      // 해당 템플릿 상세 캐시 제거
      queryClient.removeQueries({
        queryKey: templateKeys.detail(deletedId)
      });
    },
  });
}

// 사용 예시
function TemplateDeleteButton({ templateId }) {
  const deleteTemplate = useDeleteTemplate();

  const handleDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteTemplate.mutate(templateId);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteTemplate.isLoading}>
      {deleteTemplate.isLoading ? '삭제 중...' : '삭제'}
    </button>
  );
}
```

---

## 고급 패턴

### 1. 낙관적 업데이트 (Optimistic Updates)

**예시**: 댓글 추가 시 즉시 UI 업데이트

```javascript
// src/hooks/comments/useAddComment.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { commentKeys } from '../../lib/queryKeys';

export function useAddComment(templateId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newComment) => {
      const { data, error } = await supabase
        .from('template_comments')
        .insert(newComment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // 낙관적 업데이트
    onMutate: async (newComment) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: commentKeys.byTemplate(templateId)
      });

      // 이전 데이터 백업
      const previousComments = queryClient.getQueryData(
        commentKeys.byTemplate(templateId)
      );

      // 낙관적으로 즉시 업데이트
      queryClient.setQueryData(
        commentKeys.byTemplate(templateId),
        (old) => [...(old || []), {
          ...newComment,
          id: 'temp-id',  // 임시 ID
          created_at: new Date().toISOString(),
        }]
      );

      // 롤백용 컨텍스트 반환
      return { previousComments };
    },

    // 에러 시 롤백
    onError: (err, newComment, context) => {
      queryClient.setQueryData(
        commentKeys.byTemplate(templateId),
        context.previousComments
      );
    },

    // 성공 시 실제 데이터로 교체
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byTemplate(templateId)
      });
    },
  });
}
```

---

### 2. 무한 스크롤 (Infinite Queries)

**예시**: 공개 템플릿 무한 스크롤

```javascript
// src/hooks/templates/useInfiniteTemplates.js
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/database';
import { templateKeys } from '../../lib/queryKeys';

const PAGE_SIZE = 20;

export function useInfiniteTemplates(filters = {}) {
  return useInfiniteQuery({
    queryKey: [...templateKeys.public(filters), 'infinite'],

    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;
      return data;
    },

    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });
}

// 사용 예시
function InfiniteTemplateList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTemplates();

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map(template => (
            <div key={template.id}>{template.name}</div>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

---

### 3. Dependent Queries (종속 쿼리)

**예시**: 템플릿 상세 → 댓글 조회

```javascript
function TemplateDetailPage({ templateId }) {
  // 1. 먼저 템플릿 조회
  const { data: template, isLoading: templateLoading } = useTemplate(templateId);

  // 2. 템플릿 조회 성공 후 댓글 조회
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: commentKeys.byTemplate(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_comments')
        .select('*')
        .eq('template_id', templateId);

      if (error) throw error;
      return data;
    },
    enabled: !!template,  // 템플릿이 로드된 후에만 실행
  });

  if (templateLoading) return <div>템플릿 로딩 중...</div>;

  return (
    <div>
      <h2>{template.name}</h2>

      {commentsLoading ? (
        <div>댓글 로딩 중...</div>
      ) : (
        <ul>
          {comments.map(comment => (
            <li key={comment.id}>{comment.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### 4. Parallel Queries (병렬 쿼리)

**예시**: 템플릿 + 사용자 정보 동시 조회

```javascript
function TemplateDashboard() {
  // 동시에 여러 쿼리 실행
  const templatesQuery = useTemplates({ isPublic: true });
  const myTemplatesQuery = useTemplates({ userId: 'user-id' });
  const statisticsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  // 하나라도 로딩 중이면
  if (
    templatesQuery.isLoading ||
    myTemplatesQuery.isLoading ||
    statisticsQuery.isLoading
  ) {
    return <div>로딩 중...</div>;
  }

  return (
    <div>
      <section>
        <h2>공개 템플릿</h2>
        {templatesQuery.data.map(t => <div key={t.id}>{t.name}</div>)}
      </section>

      <section>
        <h2>내 템플릿</h2>
        {myTemplatesQuery.data.map(t => <div key={t.id}>{t.name}</div>)}
      </section>

      <section>
        <h2>통계</h2>
        <p>총 템플릿: {statisticsQuery.data.totalTemplates}</p>
      </section>
    </div>
  );
}
```

---

## 마이그레이션 가이드

### Phase 1: 템플릿 기능만 (권장)

#### Before (useState)
```javascript
// ❌ 사용 안 함 (템플릿은 새 기능이므로 기존 코드 없음)
```

#### After (React Query)
```javascript
// ✅ 템플릿 기능만 React Query 사용
function TemplateList() {
  const { data: templates } = useTemplates({ isPublic: true });

  return (
    <ul>
      {templates?.map(t => <li key={t.id}>{t.name}</li>)}
    </ul>
  );
}
```

---

### Phase 2: 습관 트래커 읽기 전환 (선택)

#### Before (useState)
```javascript
// App.jsx (기존 코드)
const [currentData, setCurrentData] = useState({
  childName: '',
  weekStartDate: '',
  theme: '',
  habits: []
});

useEffect(() => {
  async function fetchData() {
    const data = await loadChildData(childName, weekStartDate);
    setCurrentData(data);
  }
  fetchData();
}, [childName, weekStartDate]);
```

#### After (React Query)
```javascript
// src/hooks/weeks/useWeekData.js
export function useWeekData(childName, weekStartDate) {
  return useQuery({
    queryKey: weekKeys.byChildAndDate(childName, weekStartDate),
    queryFn: () => loadChildData(childName, weekStartDate),
    enabled: !!childName && !!weekStartDate,
  });
}

// App.jsx (리팩토링 후)
const { data: currentData } = useWeekData(childName, weekStartDate);
```

**⚠️ 주의**: 기존 코드 수정 필요 (Phase 2에서만 진행)

---

### Phase 3: 습관 트래커 쓰기 전환 (선택)

#### Before (직접 호출)
```javascript
const handleSave = async () => {
  await saveChildData(childName, weekStartDate, currentData);
  alert('저장 완료!');
};
```

#### After (useMutation)
```javascript
// src/hooks/weeks/useSaveWeekData.js
export function useSaveWeekData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childName, weekStartDate, data }) =>
      saveChildData(childName, weekStartDate, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weekKeys.byChildAndDate(
          variables.childName,
          variables.weekStartDate
        )
      });
    },
  });
}

// App.jsx
const saveWeekData = useSaveWeekData();

const handleSave = () => {
  saveWeekData.mutate({
    childName,
    weekStartDate,
    data: currentData,
  });
};
```

**⚠️ 주의**: Phase 3에서만 진행 (템플릿 성공 후)

---

## 체크리스트

### Phase 1: 템플릿 기능 (필수)
- [ ] `@tanstack/react-query` 설치
- [ ] `@tanstack/react-query-devtools` 설치 (개발용)
- [ ] `src/lib/queryClient.js` 생성
- [ ] `src/lib/queryKeys.js` 생성
- [ ] `App.jsx`에 `QueryClientProvider` 추가
- [ ] 템플릿 hooks 작성 (useTemplates, useTemplate, etc.)
- [ ] 템플릿 컴포넌트 작성 (TemplateList, TemplateDetail, etc.)
- [ ] DevTools로 캐시 상태 확인

### Phase 2: 읽기 전환 (선택)
- [ ] Feature Flag 설정 (5% 트래픽)
- [ ] `useWeekData` hook 작성
- [ ] App.jsx에서 useState → useQuery 전환
- [ ] 기존 기능 정상 작동 확인
- [ ] Feature Flag 100%로 전환

### Phase 3: 쓰기 전환 (선택)
- [ ] `useSaveWeekData` hook 작성
- [ ] 낙관적 업데이트 구현
- [ ] 에러 처리 개선
- [ ] 자동 재시도 설정

---

## 참고 자료

### 공식 문서
- [React Query 공식 문서](https://tanstack.com/query/latest/docs/react/overview)
- [QueryKey 가이드](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Mutations 가이드](https://tanstack.com/query/latest/docs/react/guides/mutations)

### 예제 코드
- [GitHub: TanStack Query 예제](https://github.com/TanStack/query/tree/main/examples)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

---

**마지막 업데이트**: 2025-10-11
**작성자**: Claude Code
**검토자**: GPT-5, Gemini
