# 실시간 채팅 전략: MAU 기반 점진적 도입

> **핵심 원칙**: 사용자 규모에 따라 비용 효율적인 솔루션 선택
> **목표**: 초기 무료 → 필요 시 유료 전환으로 비용 최적화

---

## 📊 MAU 기반 전략 요약

| MAU 구간 | 솔루션 | 월 비용 | 비고 |
|---------|--------|---------|------|
| **< 5,000** | Supabase Realtime (무료) | **$0** | 무료 티어로 충분 |
| **5,000 ~ 20,000** | LaunchDarkly Free + Supabase | **$0 ~ $150** | Feature Flag 무료 티어 활용 |
| **20,000+** | Stream Chat 또는 Sendbird | **$600+** | 전문 채팅 솔루션 필요 |

**현재 상태**: MAU < 100 (추정)
**권장 시작**: Supabase Realtime (무료)

---

## Phase별 도입 전략

### Phase 0-1: 채팅 없음 (현재)
- 습관 트래커 핵심 기능에 집중
- 채팅 불필요 (단일 사용자 앱)

### Phase 2: Supabase Realtime 도입 (MAU < 5k)
**시기**: Phase 2 완료 후 (템플릿 공유 기능 추가 시)
**사용 사례**:
- 템플릿 댓글
- 실시간 알림 (새 템플릿 등록 시)

**구현**:
```javascript
// src/lib/realtime.js
import { supabase } from './database';

export function subscribeToTemplateComments(templateId, callback) {
  const channel = supabase
    .channel(`template:${templateId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'template_comments',
        filter: `template_id=eq.${templateId}`
      },
      callback
    )
    .subscribe();

  return channel;
}

// 사용 예시
const channel = subscribeToTemplateComments('template-id', (payload) => {
  console.log('새 댓글:', payload.new);
});

// 정리
channel.unsubscribe();
```

**비용**: $0 (무료 티어)
**제한사항**:
- 동시 접속: 200명
- 메시지/초: 100개
- 채널: 100개

---

## 솔루션별 상세 분석

### 1. Supabase Realtime (무료 ~ $25/월)

#### 장점
- ✅ 무료 티어로 시작 가능
- ✅ PostgreSQL과 네이티브 통합
- ✅ 추가 인프라 불필요
- ✅ RLS 정책 재사용 가능

#### 단점
- ❌ 동시 접속 200명 제한 (무료 티어)
- ❌ 메시지 히스토리 관리 직접 구현 필요
- ❌ 읽음 표시, 타이핑 인디케이터 등 직접 구현

#### 비용 구조
| 플랜 | MAU | 동시 접속 | 월 비용 |
|------|-----|----------|---------|
| Free | < 5k | 200 | **$0** |
| Pro | 5k ~ 50k | 500 | **$25** |
| Team | 50k ~ 500k | 5,000 | **$599** |

#### 적합한 경우
- MAU < 5,000
- 간단한 실시간 기능 (댓글, 알림)
- 채팅이 핵심 기능이 아님

---

### 2. Stream Chat ($99 ~ $499/월)

#### 장점
- ✅ 완전한 채팅 UI 컴포넌트 제공
- ✅ 메시지 히스토리, 검색 내장
- ✅ 읽음 표시, 타이핑 인디케이터 기본 제공
- ✅ 모바일 푸시 알림 지원

#### 단점
- ❌ 비용이 높음 (최소 $99/월)
- ❌ 추가 SDK 학습 곡선
- ❌ Supabase 인증과 별도 통합 필요

#### 비용 구조
| 플랜 | MAU | 월 비용 | 비고 |
|------|-----|---------|------|
| Maker | Trial | **$0** | 30일 무료 체험 |
| Growth | 25k | **$99** | 기본 기능 |
| Enterprise | 무제한 | **$499+** | 커스텀 |

#### 적합한 경우
- MAU > 20,000
- 채팅이 핵심 기능
- UI 커스터마이징보다 빠른 출시 우선

---

### 3. Sendbird ($399 ~ $599/월)

#### 장점
- ✅ Stream Chat과 유사한 완전한 솔루션
- ✅ 한국 기업 (한국어 지원 우수)
- ✅ 모더레이션 도구 강력

#### 단점
- ❌ 비용이 매우 높음 (최소 $399/월)
- ❌ Stream Chat보다 비싼 편

#### 비용 구조
| 플랜 | MAU | 월 비용 |
|------|-----|---------|
| Starter | 5k | **$399** |
| Pro | 50k | **$599** |
| Enterprise | 무제한 | 협의 |

#### 적합한 경우
- MAU > 50,000
- 한국어 지원 필수
- 엔터프라이즈 고객 대상

---

### 4. Socket.io + Node.js (자체 구축)

#### 장점
- ✅ 완전한 커스터마이징 가능
- ✅ 서버 비용만 지불 (Vercel, Railway 등)
- ✅ Supabase 인증과 자유롭게 통합

#### 단점
- ❌ 개발 시간 많이 소요 (2~3주)
- ❌ 메시지 히스토리, 읽음 표시 등 직접 구현
- ❌ 확장성 관리 직접 필요

#### 비용 구조 (예: Railway)
| 항목 | 비용 |
|------|------|
| Hobby 플랜 | $5/월 (512MB RAM) |
| Pro 플랜 | $20/월 (2GB RAM) |
| **총 예상 비용** | **$20 ~ $50/월** |

#### 적합한 경우
- 개발 리소스 충분
- 특수한 요구사항 (게임, 협업 도구 등)
- 장기적으로 비용 절감 목표

---

## 권장 로드맵

### 🎯 Phase 2 (MAU < 1k): Supabase Realtime

**구현 범위**:
- 템플릿 댓글 기능
- 실시간 알림 (새 템플릿 등록)

**예상 비용**: $0/월 (무료 티어)

**구현 시간**: 1주

**코드 예시**:
```javascript
// src/components/TemplateComments.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/database';
import { subscribeToTemplateComments } from '../lib/realtime';

function TemplateComments({ templateId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // 초기 댓글 로드
    loadComments();

    // 실시간 구독
    const channel = subscribeToTemplateComments(templateId, (payload) => {
      setComments(prev => [...prev, payload.new]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [templateId]);

  async function loadComments() {
    const { data } = await supabase
      .from('template_comments')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    setComments(data || []);
  }

  async function addComment(text) {
    await supabase
      .from('template_comments')
      .insert({
        template_id: templateId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        text
      });
  }

  return (
    <div>
      <h3>댓글 ({comments.length})</h3>
      {comments.map(comment => (
        <div key={comment.id}>
          <p>{comment.text}</p>
          <small>{new Date(comment.created_at).toLocaleString()}</small>
        </div>
      ))}
      <button onClick={() => addComment('테스트 댓글')}>
        댓글 추가
      </button>
    </div>
  );
}
```

---

### 🎯 Phase 3 (MAU 1k ~ 5k): Supabase Realtime 유지

**구현 범위**:
- 위 기능 유지
- 성능 모니터링

**예상 비용**: $0/월 (여전히 무료 티어)

**모니터링**:
```javascript
// scripts/monitor-realtime.js
import { supabase } from './database';

async function checkRealtimeUsage() {
  // Supabase Dashboard에서 확인
  // Settings > Usage > Realtime
  console.log('동시 접속: ?/200');
  console.log('메시지/초: ?/100');
  console.log('채널: ?/100');
}

checkRealtimeUsage();
```

---

### 🎯 Phase 4 (MAU 5k ~ 20k): Supabase Pro 업그레이드

**시기**: MAU가 5,000 근접 시

**변경사항**:
- Supabase Pro 플랜으로 업그레이드 ($25/월)
- 동시 접속: 200 → 500
- 채널: 100 → 500

**예상 비용**: $25/월

**마이그레이션**: 없음 (자동 확장)

---

### 🎯 Phase 5 (MAU 20k+): Stream Chat 또는 Sendbird

**시기**: MAU가 20,000 초과 시

**선택 기준**:

#### Stream Chat 선택 시
- 글로벌 사용자 대상
- UI 커스터마이징 필요
- 비용: $99 ~ $499/월

#### Sendbird 선택 시
- 한국 사용자 대상
- 강력한 모더레이션 필요
- 비용: $399 ~ $599/월

**마이그레이션 계획**:
```javascript
// scripts/migrate-to-stream-chat.js
import { StreamChat } from 'stream-chat';
import { supabase } from './database';

async function migrateToStreamChat() {
  const client = StreamChat.getInstance('api-key');

  // 1. 기존 댓글 마이그레이션
  const { data: comments } = await supabase
    .from('template_comments')
    .select('*');

  for (const comment of comments) {
    const channel = client.channel('messaging', comment.template_id);
    await channel.sendMessage({
      text: comment.text,
      user_id: comment.user_id,
      created_at: comment.created_at
    });
  }

  console.log(`${comments.length}개 댓글 마이그레이션 완료`);
}

migrateToStreamChat();
```

**예상 소요 시간**: 2주
**예상 비용**: $99 ~ $599/월

---

## 의사결정 플로우차트

```
현재 MAU는?
  │
  ├─ < 5,000 ──────────────────► Supabase Realtime (무료)
  │                                비용: $0/월
  │
  ├─ 5,000 ~ 20,000 ────────────► Supabase Pro
  │                                비용: $25/월
  │
  └─ > 20,000 ──────────────────► Stream Chat 또는 Sendbird
                                   비용: $99 ~ $599/월

채팅이 핵심 기능인가?
  │
  ├─ Yes ──────────────────────► Stream Chat/Sendbird
  │                                (MAU와 관계없이 초기부터)
  │
  └─ No ───────────────────────► Supabase Realtime으로 시작
                                   (MAU에 따라 업그레이드)
```

---

## 데이터베이스 스키마 (댓글 기능)

### 필요한 테이블
```sql
-- 템플릿 댓글
CREATE TABLE template_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_template_comments_template_id ON template_comments(template_id);
CREATE INDEX idx_template_comments_created_at ON template_comments(template_id, created_at);

-- RLS 정책
ALTER TABLE template_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_template_comments_select ON template_comments
  FOR SELECT USING (true);  -- 누구나 읽기 가능

CREATE POLICY policy_template_comments_insert ON template_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);  -- 본인만 작성

CREATE POLICY policy_template_comments_update ON template_comments
  FOR UPDATE USING (auth.uid() = user_id);  -- 본인만 수정

CREATE POLICY policy_template_comments_delete ON template_comments
  FOR DELETE USING (auth.uid() = user_id);  -- 본인만 삭제
```

---

## 비용 시뮬레이션

### 시나리오 1: 느린 성장 (18개월)
```
Month 1-12:  MAU < 5,000   → Supabase Free    → $0/월
Month 13-18: MAU 5k-10k    → Supabase Pro     → $25/월

총 비용 (18개월): $150
```

### 시나리오 2: 빠른 성장 (12개월)
```
Month 1-3:   MAU < 5,000   → Supabase Free    → $0/월
Month 4-6:   MAU 5k-10k    → Supabase Pro     → $25/월
Month 7-12:  MAU 20k+      → Stream Chat      → $99/월

총 비용 (12개월): $669
```

### 시나리오 3: 폭발적 성장 (6개월)
```
Month 1-2:   MAU < 5,000   → Supabase Free    → $0/월
Month 3-4:   MAU 10k-20k   → Supabase Pro     → $25/월
Month 5-6:   MAU 50k+      → Sendbird Pro     → $599/월

총 비용 (6개월): $1,248
```

**현실적 예상**: 시나리오 1 (느린 성장)
**18개월 총 비용**: **$150**

---

## 구현 우선순위

### Phase 2 (필수)
- [x] Supabase Realtime 설정
- [x] 템플릿 댓글 기능
- [x] 실시간 알림

### Phase 3 (선택)
- [ ] 읽음 표시
- [ ] 타이핑 인디케이터
- [ ] 메시지 검색

### Phase 4 (MAU > 5k 시)
- [ ] Supabase Pro 업그레이드
- [ ] 성능 모니터링 대시보드

### Phase 5 (MAU > 20k 시)
- [ ] Stream Chat/Sendbird 평가
- [ ] 마이그레이션 계획 수립
- [ ] 단계별 전환

---

## FAQ

### Q1: 처음부터 Stream Chat을 쓰면 안 되나요?
**A**: 가능하지만 권장하지 않음. MAU < 5k일 때 $99/월은 과도한 비용. Supabase Realtime 무료 티어로 충분합니다.

### Q2: Supabase Realtime의 200 동시 접속 제한이 부족하지 않나요?
**A**: MAU 5,000 기준, 동시 접속률은 보통 1~5% (50~250명). 200명 제한은 초기에는 충분합니다.

### Q3: Socket.io 자체 구축은 어떤가요?
**A**: 개발 리소스가 충분하고 장기적 비용 절감이 목표라면 고려 가능. 하지만 초기 개발 시간 (2~3주)과 유지보수 비용을 고려하면 초기에는 비추천.

### Q4: 댓글이 아닌 1:1 채팅도 지원하나요?
**A**: 1:1 채팅은 Phase 3 이후 고려. 현재는 공개 템플릿 댓글만 지원. 1:1 채팅이 필요하면 Stream Chat/Sendbird 도입 권장.

### Q5: 모바일 푸시 알림은?
**A**: Supabase Realtime은 웹 알림만 지원. 모바일 푸시가 필요하면 Firebase Cloud Messaging (FCM) 별도 연동 또는 Stream Chat/Sendbird 사용.

---

## 참고 자료

### Supabase Realtime
- [공식 문서](https://supabase.com/docs/guides/realtime)
- [가격 정보](https://supabase.com/pricing)
- [PostgreSQL 변경 감지](https://supabase.com/docs/guides/realtime/postgres-changes)

### Stream Chat
- [공식 문서](https://getstream.io/chat/docs/)
- [React 가이드](https://getstream.io/chat/docs/sdk/react/)
- [가격 정보](https://getstream.io/chat/pricing/)

### Sendbird
- [공식 문서](https://sendbird.com/docs)
- [React 가이드](https://sendbird.com/docs/chat/v3/javascript/quickstart/send-first-message)
- [가격 정보](https://sendbird.com/pricing)

---

**마지막 업데이트**: 2025-10-11
**작성자**: Claude Code
**검토자**: GPT-5, Gemini
