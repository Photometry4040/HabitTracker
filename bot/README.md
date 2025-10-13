# 습관 트래커 Discord Bot

Discord에서 아이들의 습관 데이터를 조회할 수 있는 봇입니다!

## 주요 기능

- `/습관조회` - 특정 아이의 주간 습관 데이터를 조회
- 시각적인 Discord 임베드로 습관 진행 상황 표시
- Supabase와 실시간 연동

## 시작하기

### 1. 필수 요구사항

- **Node.js** 18 이상
- **Discord 계정** 및 서버
- **Supabase 프로젝트** (습관 트래커 데이터베이스)

### 2. 설치

```bash
# 의존성 설치
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 아래 값을 채워주세요:

```env
# Discord 설정
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here  # 선택사항 (테스트용)

# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

#### Discord Bot 생성 방법

1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속
2. "New Application" 클릭
3. 봇 이름 입력 (예: "습관 트래커 Bot")
4. "Bot" 탭으로 이동 → "Add Bot" 클릭
5. 토큰 복사 → `.env` 파일의 `DISCORD_TOKEN`에 붙여넣기
6. "General Information" 탭 → Application ID 복사 → `DISCORD_CLIENT_ID`에 붙여넣기

#### 봇 권한 설정

"Bot" 탭에서 다음 권한을 활성화하세요:
- Send Messages
- Embed Links
- Use Slash Commands

#### 봇 초대하기

1. "OAuth2" > "URL Generator" 탭으로 이동
2. **Scopes** 선택:
   - `bot`
   - `applications.commands`
3. **Bot Permissions** 선택:
   - Send Messages
   - Embed Links
4. 생성된 URL을 복사하여 브라우저에서 열기
5. 봇을 추가할 서버 선택 후 인증

### 4. 명령어 등록

```bash
# Discord에 슬래시 커맨드 등록
npm run register
```

**참고:**
- `DISCORD_GUILD_ID`를 설정하면 **즉시** 해당 서버에만 명령어가 등록됩니다 (테스트용)
- `DISCORD_GUILD_ID`를 비우면 **전역**으로 등록되며, 반영까지 최대 1시간이 걸립니다

### 5. 봇 실행

```bash
# 프로덕션
npm start

# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

봇이 성공적으로 시작되면 다음과 같은 메시지가 출력됩니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Habit Tracker Discord Bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Logged in as: YourBot#1234
📊 Serving 1 guild(s)
🎯 Commands loaded: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Bot is ready and listening for commands!
```

## 사용법

### `/습관조회` 명령어

특정 아이의 주간 습관 데이터를 조회합니다.

#### 매개변수

- **이름** (필수): 아이 이름
- **날짜** (선택): 주의 시작일 (월요일), 형식: `YYYY-MM-DD`
  - 생략 시 이번 주 데이터를 조회합니다

#### 사용 예시

```
/습관조회 이름:지우
/습관조회 이름:지우 날짜:2025-10-13
```

#### 응답 예시

봇이 아름다운 임베드 카드를 생성하여 다음 정보를 표시합니다:

```
📊 지우님의 습관 조회

기간: 2025년 10월 13일 ~ 2025년 10월 19일

🎯 이번 주 테마: 건강한 생활 습관 만들기
🎁 목표 보상: 좋아하는 아이스크림 먹기

━━━━━━━━━━━━━━━━━━━━━━━━

1. 아침 스스로 일어나기
월 화 수 목 금 토 일
🟢 🟢 🟡 🟢 🟢 🟢 🟢
✅ 6/7일 완료 (🟡 1일) 🌟

2. 책 읽기 (10분)
월 화 수 목 금 토 일
🟢 🟢 🟢 🟢 🔴 🟢 🟢
✅ 6/7일 완료 (🔴 1일) 🌟

━━━━━━━━━━━━━━━━━━━━━━━━

📈 전체 통계
총 습관 수: 5개
체크 현황: 32/35회

🟢 완료: 28회
🟡 보통: 3회
🔴 안함: 1회

성공률: 87%
[████████░░] 87% 🎉

💬 한마디
훌륭해요! 목표를 달성했어요! 이대로만 계속하면 돼요! 🎉
```

## 프로젝트 구조

```
bot/
├── commands/           # 슬래시 명령어 모음
│   └── lookup.js       # /습관조회 명령어
├── lib/                # 유틸리티 함수
│   ├── supabase.js     # Supabase 쿼리 헬퍼
│   └── embed.js        # Discord 임베드 생성
├── index.js            # 메인 봇 진입점
├── register-commands.js # 명령어 등록 스크립트
├── package.json        # 프로젝트 설정
├── .env.example        # 환경 변수 예시
└── README.md           # 이 파일
```

## 데이터베이스 스키마

봇은 새로운 정규화된 Supabase 스키마를 사용합니다:

- **children** - 아이 정보
- **weeks** - 주간 기록
- **habits** - 습관 목록
- **habit_records** - 일일 습관 체크 기록
- **stats_weekly** (materialized view) - 주간 통계 (Agent 2가 생성)

자세한 스키마는 `supabase/migrations/` 폴더를 참고하세요.

## 기술 스택

- **Discord.js v14** - Discord API 래퍼
- **Supabase** - 백엔드 데이터베이스
- **Node.js 18+** - JavaScript 런타임
- **ESM (ES Modules)** - 최신 모듈 시스템

## 개발 가이드

### 새 명령어 추가하기

1. `commands/` 폴더에 새 파일 생성 (예: `commands/mycommand.js`)
2. 다음 구조로 작성:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('명령어이름')
  .setDescription('명령어 설명');

export async function execute(interaction) {
  await interaction.reply('응답 내용');
}
```

3. 명령어 재등록:

```bash
npm run register
```

4. 봇 재시작:

```bash
npm start
```

### 로깅

모든 중요한 이벤트는 콘솔에 로깅됩니다:

- ✅ 성공 메시지
- ⚠ 경고 메시지
- ❌ 에러 메시지
- 📨 명령어 실행 로그

### 에러 처리

봇은 다음과 같은 에러를 안전하게 처리합니다:

- Discord API 에러
- Supabase 쿼리 에러
- 잘못된 사용자 입력
- 누락된 환경 변수

## 문제 해결

### 봇이 온라인이 되지 않아요

1. `.env` 파일에 `DISCORD_TOKEN`이 올바른지 확인
2. Discord Developer Portal에서 봇 토큰이 유효한지 확인
3. 콘솔 에러 메시지 확인

### 슬래시 명령어가 보이지 않아요

1. `npm run register` 실행했는지 확인
2. `DISCORD_CLIENT_ID`가 올바른지 확인
3. 봇이 서버에 제대로 초대되었는지 확인
4. 전역 등록 시 최대 1시간 대기

### 데이터를 조회할 수 없어요

1. Supabase 환경 변수가 올바른지 확인
2. 아이 이름과 날짜가 정확한지 확인
3. 해당 주의 데이터가 저장되어 있는지 확인
4. Supabase 프로젝트가 활성 상태인지 확인

### 권한 에러가 발생해요

1. 봇이 메시지를 보낼 권한이 있는지 확인
2. 봇 역할이 충분한 권한을 가지고 있는지 확인
3. 채널 권한 설정 확인

## 향후 계획

### Phase 1 (현재 완료)
- ✅ 기본 봇 설정
- ✅ `/습관조회` 명령어
- ✅ Discord 임베드 생성
- ✅ Supabase 통합

### Phase 2 (예정)
- [ ] `/습관목록` - 모든 아이 목록 조회
- [ ] `/주간목록` - 특정 아이의 모든 주 조회
- [ ] 자동 주간 요약 (매주 일요일 밤)
- [ ] 리마인더 (아직 체크 안한 습관 알림)

### Phase 3 (미래)
- [ ] 양방향 제어 (Discord에서 습관 체크)
- [ ] 데이터 내보내기 (Excel, PDF)
- [ ] 멘션 기능 (알림 시 사용자 태그)
- [ ] 월간 리포트 생성

## 기여하기

이 프로젝트는 Claude Code에 의해 생성되었습니다. 개선 사항이 있다면 자유롭게 수정해주세요!

## 라이선스

MIT License

## 지원

문제가 발생하면 다음을 확인하세요:

1. **Discord 문서**: https://discord.js.org/
2. **Supabase 문서**: https://supabase.com/docs
3. **프로젝트 이슈 트래커**: GitHub Issues

---

**제작:** Agent 1 - Discord Bot Developer
**날짜:** 2025-10-15 (Day 2)
**버전:** 1.0.0
