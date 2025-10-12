# Discord 알림 시스템 사용 가이드

습관 트래커 앱에서 Discord로 실시간 알림을 받을 수 있습니다!

## 📋 목차
1. [개요](#개요)
2. [알림 종류](#알림-종류)
3. [설정 방법](#설정-방법)
4. [사용 예시](#사용-예시)
5. [문제 해결](#문제-해결)

---

## 개요

Discord 알림 시스템은 습관 트래커 앱에서 중요한 이벤트가 발생할 때 자동으로 Discord 채널에 메시지를 전송합니다.

**주요 기능:**
- 🎯 습관 체크 시 즉시 알림
- 💾 주간 데이터 저장 완료 알림
- 🎉 주간 목표 달성 축하 메시지

**장점:**
- 가족 모두가 실시간으로 진행 상황 공유
- 아이의 노력에 즉각적인 피드백 제공
- Discord 히스토리로 습관 기록 보존

---

## 알림 종류

### 1. 습관 체크 알림 (🎯)

**발송 시점:** 사용자가 색상 버튼(초록/노랑/빨강)을 클릭할 때

**메시지 예시:**
```
🎯 습관 체크!
━━━━━━━━━━━━━━

지우님이 책 읽기 습관을 체크했어요!

👤 아이: 지우
📚 습관: 책 읽기
✅ 상태: 🟢 완료
📅 날짜: 2025년 10월 13일 월요일

계속 이런 식으로 하면 목표 달성이에요! 🎉
```

**색상별 표시:**
- 🟢 초록 (완료) - "목표 달성이에요!"
- 🟡 노랑 (보통) - "매일 꾸준히 하는 것이 중요해요!"
- 🔴 빨강 (안함) - "매일 꾸준히 하는 것이 중요해요!"

---

### 2. 주간 저장 알림 (💾)

**발송 시점:** 저장 버튼을 클릭하여 주간 데이터를 저장할 때

**메시지 예시:**
```
💾 주간 데이터 저장 완료
━━━━━━━━━━━━━━

지우님의 이번 주 습관 데이터가 저장되었어요!

👤 아이: 지우
📅 기간: 2025년 10월 13일 ~ 2025년 10월 19일
📊 습관 수: 5개

습관 트래커 앱에서 자동 저장되었습니다 ✨
```

---

### 3. 주간 목표 달성 알림 (🎉)

**발송 시점:** 저장 버튼 클릭 시 성공률이 **80% 이상**일 때 자동 발송

**메시지 예시:**
```
🎉 축하합니다!
━━━━━━━━━━━━━━

지우님이 이번 주 목표를 달성했어요!

👤 아이: 지우
📅 기간: 2025년 10월 13일 ~ 2025년 10월 19일
📊 성공률: 86%
✨ 완료: 30/35개

훌륭해요! 계속 이렇게 해나가요! 🌟
```

**성공률 계산:**
- 전체 체크 수 = 습관 수 × 7일
- 완료(초록) 체크 수 / 전체 체크 수 × 100

**이모지 등급:**
- 🏆 90% 이상: "완벽해요! 정말 대단해요! 🌟🌟🌟"
- 🎉 80-89%: "훌륭해요! 계속 이렇게 해나가요! 🌟"

---

## 설정 방법

### 1️⃣ Discord 웹훅 URL 생성

1. Discord 서버에서 알림을 받을 채널 선택
2. 채널 설정 → 연동 → 웹후크
3. "새 웹후크" 클릭
4. 웹후크 이름 설정 (예: "습관 트래커 알림")
5. "웹후크 URL 복사" 클릭

### 2️⃣ 로컬 개발 환경 설정

`.env` 파일에 웹훅 URL 추가:
```env
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

### 3️⃣ 배포 환경 설정

#### Netlify
1. Netlify Dashboard → Site settings
2. Environment variables 섹션
3. "Add a variable" 클릭
4. Key: `VITE_DISCORD_WEBHOOK_URL`
5. Value: 복사한 웹훅 URL

#### Supabase Edge Function
Edge Function은 이미 배포되어 있으며, 웹훅 URL은 Supabase Secrets로 관리됩니다.

```bash
npx supabase secrets set DISCORD_WEBHOOK_URL="your_webhook_url"
```

---

## 사용 예시

### 시나리오 1: 아침 습관 체크

1. 아이가 "아침 스스로 일어나기" 완료
2. 앱에서 월요일 칸의 초록 버튼 클릭
3. → Discord에 즉시 알림 전송
4. 부모가 Discord에서 확인하고 칭찬 댓글

### 시나리오 2: 주간 완료 후 저장

1. 일요일 저녁, 한 주의 습관 체크 완료
2. "저장" 버튼 클릭
3. → Discord에 2개의 알림 전송:
   - 💾 주간 저장 완료 알림
   - 🎉 주간 목표 달성 알림 (80% 이상 시)
4. 가족이 함께 축하!

### 시나리오 3: 가족 대화방에서 실시간 공유

**상황:** 부모는 직장, 아이는 집에서 공부
- 아이가 습관 체크 → Discord 알림
- 부모가 실시간으로 확인
- Discord에서 "잘했어요! 👍" 이모지 반응
- 아이의 동기 부여 상승! 📈

---

## 문제 해결

### Q1. 알림이 전송되지 않아요

**원인 1:** 웹훅 URL이 설정되지 않음
- `.env` 파일에 `VITE_DISCORD_WEBHOOK_URL` 확인
- 배포 환경의 환경 변수 확인

**원인 2:** 웹훅 URL이 잘못됨
- Discord에서 웹훅 URL 재생성
- 올바른 형식: `https://discord.com/api/webhooks/...`

**원인 3:** Edge Function 배포 누락
```bash
npx supabase functions deploy send-discord-notification
npx supabase secrets set DISCORD_WEBHOOK_URL="your_url"
```

### Q2. 일부 알림만 전송돼요

**습관 체크 알림이 안 와요:**
- 빈 색상(삭제)은 알림이 전송되지 않습니다 (의도된 동작)
- 초록/노랑/빨강만 알림 전송

**주간 완료 알림이 안 와요:**
- 성공률이 80% 미만이면 전송되지 않습니다
- 저장 버튼을 눌러야 주간 저장/완료 알림이 전송됩니다

### Q3. 알림이 너무 많아요

**해결 방법 (향후 구현 예정):**
- 설정 UI에서 알림 on/off 토글
- 알림 타입별 활성화/비활성화
- 그린 체크만 알림 전송 옵션

**임시 해결책:**
- `.env`에서 `VITE_DISCORD_WEBHOOK_URL` 주석 처리
- 또는 Discord에서 웹훅 삭제

### Q4. 콘솔에 "Discord notification skipped" 메시지

이것은 **정상**입니다:
- 웹훅 URL이 없을 때
- 알림 전송 실패 시 (네트워크 오류 등)
- **앱 동작에는 영향 없음** (조용히 실패)

---

## 기술 세부사항

### 아키텍처
```
[React 앱]
    ↓ 습관 체크/저장
[Supabase Edge Function: send-discord-notification]
    ↓ HTTP POST
[Discord Webhook API]
    ↓
[Discord 채널에 메시지 표시]
```

### 파일 구조
- `supabase/functions/send-discord-notification/index.ts` - Edge Function
- `src/lib/discord.js` - React 헬퍼 함수
- `App.jsx` - 알림 통합 로직

### API 엔드포인트
```
POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/send-discord-notification

Headers:
  Authorization: Bearer {SUPABASE_ANON_KEY}
  Content-Type: application/json

Body:
  {
    "type": "habit_check" | "week_save" | "week_complete",
    "childName": "아이 이름",
    ...
  }
```

---

## 개발자용 테스트

### curl로 직접 테스트
```bash
# 습관 체크 알림
curl -X POST 'https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/send-discord-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "habit_check",
    "childName": "테스트",
    "habitName": "책 읽기",
    "color": "green"
  }'
```

### React 개발자 콘솔에서 테스트
```javascript
import { testDiscordNotifications } from '@/lib/discord.js'

// 모든 알림 타입 테스트 (1초 간격)
testDiscordNotifications('테스트')
```

---

## 향후 개발 계획 (Phase 2)

- [ ] 설정 UI (알림 on/off 토글)
- [ ] 멘션 기능 (`@부모` 태그로 알림)
- [ ] 일일 요약 (매일 밤 자동 발송)
- [ ] 리마인더 (아직 체크 안한 습관 알림)
- [ ] Discord Bot (양방향 제어)

---

## 지원

**문제가 발생하면:**
1. Discord 웹훅 URL 확인
2. 브라우저 개발자 도구 콘솔 확인
3. Supabase Functions 로그 확인: [Dashboard](https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/functions)

**도움말:**
- Discord API 문서: https://discord.com/developers/docs/resources/webhook
- Supabase Functions 문서: https://supabase.com/docs/guides/functions

---

**만든 이:** Claude Code
**버전:** 1.0.0
**업데이트:** 2025년 10월 13일
