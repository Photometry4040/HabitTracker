# MCP (Model Context Protocol) 설정 가이드

> **프로젝트**: 아이들을 위한 습관 추적기
> **작성일**: 2025년 10월 11일
> **버전**: 1.0
> **목적**: 업그레이드 작업의 효율성을 위한 MCP 서버 설치 및 설정

---

## 📋 목차
1. [MCP 개요](#mcp-개요)
2. [필수 MCP 서버](#필수-mcp-서버)
3. [선택 MCP 서버](#선택-mcp-서버)
4. [설치 가이드](#설치-가이드)
5. [환경 변수 설정](#환경-변수-설정)
6. [연결 테스트](#연결-테스트)
7. [문제 해결](#문제-해결)

---

## MCP 개요

### 🤖 MCP란?

**Model Context Protocol (MCP)**는 Claude Code가 외부 도구 및 서비스와 통신할 수 있게 해주는 프로토콜입니다. MCP 서버를 통해 Claude는 다음 작업을 수행할 수 있습니다:

- GitHub 저장소 관리 (PR, Issue)
- Supabase 데이터베이스 조회
- 대규모 코드베이스 검색
- 프로젝트 관리 도구 연동

### 🎯 이 프로젝트에서 MCP가 필요한 이유

1. **DB 스키마 관리**: Supabase MCP를 통해 실시간 스키마 조회 및 마이그레이션 검증
2. **코드 탐색**: Context7 MCP로 대규모 코드베이스에서 패턴 검색
3. **작업 관리**: GitHub MCP로 이슈 트래킹 및 PR 관리 자동화

---

## 필수 MCP 서버

### 1. 🔵 GitHub MCP

#### 목적
- PR (Pull Request) 생성 및 관리
- Issue 트래킹
- 코드 리뷰 자동화
- 커밋 히스토리 조회

#### 주요 기능
- `create_pull_request`: PR 생성
- `list_issues`: 이슈 목록 조회
- `create_issue`: 이슈 생성
- `get_file_contents`: 파일 내용 조회
- `search_code`: 코드 검색

#### 사용 예시
```
Claude에 요청: "Phase 1 작업에 대한 GitHub Issue를 생성해줘"
→ GitHub MCP가 자동으로 Issue 생성
```

---

### 2. 🟢 Supabase MCP

#### 목적
- 데이터베이스 스키마 조회
- 테이블 구조 분석
- 마이그레이션 검증
- 쿼리 실행 및 결과 확인

#### 주요 기능
- `list_tables`: 테이블 목록 조회
- `describe_table`: 테이블 구조 조회
- `execute_query`: SQL 쿼리 실행
- `get_rls_policies`: RLS 정책 조회

#### 사용 예시
```
Claude에 요청: "habit_tracker 테이블의 현재 스키마를 조회해줘"
→ Supabase MCP가 테이블 구조 반환
```

---

### 3. 🟣 Context7 MCP

#### 목적
- 대규모 코드베이스 검색
- 패턴 매칭
- 의존성 분석
- 리팩토링 대상 파악

#### 주요 기능
- `search_codebase`: 전체 코드베이스 검색
- `find_references`: 함수/변수 참조 찾기
- `analyze_dependencies`: 의존성 분석

#### 사용 예시
```
Claude에 요청: "loadChildData 함수가 어디서 사용되는지 찾아줘"
→ Context7 MCP가 모든 호출 위치 반환
```

---

## 선택 MCP 서버

### 4. 🔶 Linear MCP (선택)

#### 목적
- 프로젝트 관리
- 스프린트 계획
- 작업 진행 상황 추적

#### 주요 기능
- `create_issue`: Linear 이슈 생성
- `update_issue`: 이슈 상태 업데이트
- `list_projects`: 프로젝트 목록 조회

---

### 5. 🟡 Vibe Check MCP (선택)

#### 목적
- 코드 품질 분석
- 아키텍처 패턴 검증
- 기술 부채 측정

#### 주요 기능
- `analyze_code_quality`: 코드 품질 점수
- `detect_anti_patterns`: 안티패턴 탐지
- `suggest_improvements`: 개선 제안

---

## 설치 가이드

### 📦 전제 조건

- Node.js 18+ 설치
- npm 또는 yarn 설치
- Claude Code 설치
- 인터넷 연결

---

### 🔧 1. GitHub MCP 설치

#### Step 1: GitHub Personal Access Token 발급

1. GitHub 로그인 → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. 권한 선택:
   - ✅ `repo` (전체)
   - ✅ `read:org`
   - ✅ `read:user`
   - ✅ `write:discussion`
4. "Generate token" 클릭
5. 토큰 복사 (⚠️ 한 번만 표시됨!)

#### Step 2: MCP 서버 설치

```bash
# NPM 글로벌 설치
npm install -g @modelcontextprotocol/server-github

# 또는 프로젝트 로컬 설치
cd ~/path/to/your/project
npm install @modelcontextprotocol/server-github
```

#### Step 3: Claude Code 설정 파일 수정

**macOS/Linux**: `~/.config/claude/config.json`
**Windows**: `%APPDATA%\claude\config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

#### Step 4: 환경 변수 설정 (대안)

`.env` 파일에 추가:
```env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```

---

### 🔧 2. Supabase MCP 설치

#### Step 1: Supabase Service Role Key 발급

1. Supabase 대시보드 로그인
2. 프로젝트 선택
3. Settings → API
4. Project API keys → `service_role` 키 복사 (⚠️ 보안 주의!)

#### Step 2: MCP 서버 설치

```bash
npm install -g @modelcontextprotocol/server-supabase
```

#### Step 3: Claude Code 설정

```json
{
  "mcpServers": {
    "github": { ... },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

⚠️ **보안 경고**: `service_role` 키는 모든 권한을 가지므로 절대 공개하지 마세요!

#### Step 4: 환경 변수 설정 (대안)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 🔧 3. Context7 MCP 설치

#### Step 1: MCP 서버 설치

```bash
npm install -g @modelcontextprotocol/server-context7
```

#### Step 2: Claude Code 설정

```json
{
  "mcpServers": {
    "github": { ... },
    "supabase": { ... },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-context7"
      ],
      "env": {
        "PROJECT_ROOT": "/Users/jueunlee/project/Habit Tracker Template for Kids with Visual Goals"
      }
    }
  }
}
```

#### Step 3: 인덱스 생성 (선택사항, 대규모 프로젝트용)

```bash
cd ~/path/to/your/project
npx @modelcontextprotocol/server-context7 index
```

---

### 🔧 4. Linear MCP 설치 (선택)

#### Step 1: Linear API Key 발급

1. Linear 로그인
2. Settings → API
3. "Create new API key" 클릭
4. 키 복사

#### Step 2: MCP 서버 설치

```bash
npm install -g @modelcontextprotocol/server-linear
```

#### Step 3: Claude Code 설정

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_key_here"
      }
    }
  }
}
```

---

## 환경 변수 설정

### 📄 `.env.mcp` 파일 생성

프로젝트 루트에 `.env.mcp` 파일 생성:

```env
# GitHub MCP
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase MCP
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Context7 MCP
PROJECT_ROOT=/Users/jueunlee/project/Habit Tracker Template for Kids with Visual Goals

# Linear MCP (선택)
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Vibe Check MCP (선택)
VIBE_CHECK_API_KEY=vibe_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 🔐 `.gitignore`에 추가

```bash
# .gitignore에 추가
.env.mcp
```

---

## 연결 테스트

### ✅ 1. GitHub MCP 테스트

**Claude Code에 요청:**
```
GitHub MCP를 사용하여 이 저장소의 최근 5개 커밋을 조회해줘.
```

**예상 결과:**
```
✅ GitHub MCP 연결 성공!

최근 커밋:
1. 40178cb - "✨ Add comprehensive app icons and PWA support"
2. a2a6d20 - "🔧 인쇄 기능 제거 및 코드 정리"
3. d05450d - "Optimize mobile responsiveness and UI for habit tracking app (#1)"
...
```

---

### ✅ 2. Supabase MCP 테스트

**Claude Code에 요청:**
```
Supabase MCP를 사용하여 habit_tracker 테이블의 컬럼 목록을 조회해줘.
```

**예상 결과:**
```
✅ Supabase MCP 연결 성공!

habit_tracker 테이블 컬럼:
- id (bigserial, PRIMARY KEY)
- child_name (text, NOT NULL)
- week_period (text)
- week_start_date (date)
- theme (text)
- habits (jsonb)
- reflection (jsonb)
- reward (text)
- user_id (uuid)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
```

---

### ✅ 3. Context7 MCP 테스트

**Claude Code에 요청:**
```
Context7 MCP를 사용하여 "loadChildData" 함수가 사용되는 모든 위치를 찾아줘.
```

**예상 결과:**
```
✅ Context7 MCP 연결 성공!

"loadChildData" 함수 사용 위치:
1. src/lib/database.js:58 (함수 정의)
2. App.jsx:119 (호출)
3. App.jsx:300 (호출)
```

---

## 문제 해결

### ❌ 문제 1: MCP 서버가 시작되지 않음

**증상:**
```
Error: Cannot find module '@modelcontextprotocol/server-github'
```

**해결:**
```bash
# 모듈 재설치
npm install -g @modelcontextprotocol/server-github

# 또는 프로젝트 로컬 설치
npm install @modelcontextprotocol/server-github
```

---

### ❌ 문제 2: 환경 변수를 찾을 수 없음

**증상:**
```
Error: GITHUB_PERSONAL_ACCESS_TOKEN is not set
```

**해결:**
1. `~/.config/claude/config.json` 파일 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. Claude Code 재시작

---

### ❌ 문제 3: Supabase 인증 실패

**증상:**
```
Error: Invalid API key
```

**해결:**
1. Supabase 대시보드에서 Service Role Key 재발급
2. **주의**: `anon` 키가 아닌 `service_role` 키를 사용해야 함
3. 키에 공백이나 줄바꿈이 없는지 확인

---

### ❌ 문제 4: Context7 인덱싱 오류

**증상:**
```
Error: Failed to index codebase
```

**해결:**
```bash
# node_modules 제외하고 인덱싱
cd ~/path/to/your/project
npx @modelcontextprotocol/server-context7 index --ignore node_modules
```

---

## 최종 설정 파일 예시

### `~/.config/claude/config.json` (전체)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-context7"],
      "env": {
        "PROJECT_ROOT": "${PROJECT_ROOT}"
      }
    }
  }
}
```

---

## MCP 사용 예시

### 📌 예시 1: DB 스키마 분석

**요청:**
```
Supabase MCP를 사용하여 다음을 분석해줘:
1. 현재 모든 테이블 목록
2. habit_tracker 테이블의 인덱스
3. RLS 정책 현황
```

**Claude의 응답:**
```
✅ Supabase MCP를 통해 분석했습니다.

1. 테이블 목록:
   - habit_tracker

2. habit_tracker 인덱스:
   - idx_habit_tracker_child_name
   - idx_habit_tracker_updated_at
   - idx_habit_tracker_user_id

3. RLS 정책:
   - "Allow all operations" (모든 작업 허용) ⚠️ 보안 취약
```

---

### 📌 예시 2: 코드 리팩토링 계획

**요청:**
```
Context7 MCP를 사용하여 App.jsx에서 useState를 사용하는 모든 위치를 찾고,
React Query로 전환할 수 있는 상태를 식별해줘.
```

**Claude의 응답:**
```
✅ Context7 MCP 분석 결과:

서버 상태 (React Query 전환 대상):
- useState([selectedChild, setSelectedChild]) - App.jsx:19
- useState([habits, setHabits]) - App.jsx:25
- useState([historicalData, setHistoricalData]) - Dashboard.jsx:22

UI 상태 (useState 유지):
- useState([showChildSelector, setShowChildSelector]) - App.jsx:20
- useState([showPassword, setShowPassword]) - Auth.jsx:15
```

---

### 📌 예시 3: Issue 생성 자동화

**요청:**
```
GitHub MCP를 사용하여 "Phase 1: DB 재설계" 작업에 대한 Issue를 생성해줘.

내용:
- 제목: [Phase 1] 데이터베이스 스키마 재설계
- 라벨: enhancement, database
- Assignee: 나
- 본문: TECH_SPEC.md의 Phase 1 내용 요약
```

**Claude의 응답:**
```
✅ GitHub Issue 생성 완료!

Issue #12: [Phase 1] 데이터베이스 스키마 재설계
URL: https://github.com/Photometry4040/HabitTracker/issues/12

본문:
## 목표
- JSONB 기반 단일 테이블 → 정규화된 관계형 구조
- 통계 쿼리 성능 향상
...
```

---

## 권장 워크플로우

### 🔄 업그레이드 작업 시 MCP 활용 순서

1. **분석 단계** (Context7 + Supabase MCP)
   ```
   - 현재 코드베이스 구조 파악
   - DB 스키마 조회
   - 기술 부채 식별
   ```

2. **계획 단계** (GitHub MCP)
   ```
   - Issue 생성 (작업 단위별)
   - Milestone 설정
   - 담당자 할당
   ```

3. **개발 단계** (Context7 MCP)
   ```
   - 코드 검색 및 참조 추적
   - 의존성 분석
   - 리팩토링 대상 파악
   ```

4. **마이그레이션 단계** (Supabase MCP)
   ```
   - 스키마 변경 검증
   - 데이터 정합성 체크
   - 쿼리 성능 측정
   ```

5. **배포 단계** (GitHub MCP)
   ```
   - PR 생성
   - 코드 리뷰 요청
   - 머지 및 배포
   ```

---

## 📚 참고 자료

### 공식 문서
- [MCP 개요](https://modelcontextprotocol.io/)
- [GitHub MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [Supabase MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)

### 커뮤니티
- [MCP Discord](https://discord.gg/mcp)
- [GitHub Discussions](https://github.com/modelcontextprotocol/servers/discussions)

---

## 다음 단계

MCP 설정 완료 후:

1. ✅ [TECH_SPEC.md](TECH_SPEC.md) 검토
2. ✅ [DB_MIGRATION_PLAN.md](DB_MIGRATION_PLAN.md) 검토
3. ➡️ [PHASE_1_TODO.md](PHASE_1_TODO.md) 작업 시작

---

**마지막 업데이트**: 2025년 10월 11일
**문서 버전**: 1.0
**설정 완료 체크리스트**: [ ] GitHub [ ] Supabase [ ] Context7
