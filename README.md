# 🎯 아이들을 위한 습관 추적기 (Habit Tracker for Kids)

**업데이트**: 2025-10-29
**상태**: ✅ **Production Ready (98%)** - Phase 5.3 완료, 번들 최적화 완료

아이들이 재미있게 습관을 형성하고 학습 목표를 관리할 수 있도록 만든 시각적 습관 추적 웹 애플리케이션입니다.

> **📚 개발 문서**: 자세한 기술 문서 및 마이그레이션 정보는 [docs/README.md](docs/README.md)를 참고하세요.

## ✨ 주요 기능

### 🎨 **색상 코드 시스템**
- **녹색** 😊 = 목표 달성!
- **노랑** 🤔 = 조금 아쉽지만 잘했어! (부분 달성)
- **빨강** 😔 = 괜찮아, 내일 다시 해보자! (미달성)

### 📊 **습관 추적 기능**
- 시간대별 습관 관리
- 주간 점수 자동 계산
- 습관 추가/삭제 기능
- 실시간 데이터 저장

### 📝 **돌아보기 시스템**
- 주간 성과 분석
- 개선점 파악
- 다음 주 목표 설정

### 🏆 **보상 시스템**
- 목표 달성 시 보상 설정
- 동기부여를 위한 보상 아이디어

### 📊 **데이터 관리**
- Supabase를 통한 안전한 클라우드 저장
- 수동 저장 방식으로 데이터 보안 강화
- 아이별 개별 데이터 관리

### 📱 **앱 아이콘 및 PWA 지원**
- 모든 플랫폼용 앱 아이콘 제공
- iOS/Android 홈스크린 추가 지원
- PWA(Progressive Web App) 기능
- 브라우저 탭 파비콘 최적화

### 🎓 **Learning Mode (Phase 5)** ✅ COMPLETE!
- **목표 관리**: 계층 구조 지원, ICE 우선순위 점수
- **만다라트 차트**: 9칸/27칸 시각화, 색상/이모지 커스터마이징
- **약점 추적**: 재시도 시스템, 패턴 분석, 배지 보상
- **주간 계획표**: 7일 일정 관리, 우선순위 시스템, 진행률 추적
- **보상 시스템**: 13가지 Achievement 자동 감지
  - streak_21 (21일 연속), habit_mastery (30일 완벽)
  - first_weakness_resolved, weekly_planner_perfect
- **Goal-Mandala 연동**: 양방향 동기화, 자동 진행률 업데이트
- **모바일 최적화**: 40px 터치 타겟, 반응형 레이아웃

### ⚡ **성능 최적화** ✨ NEW!
- **번들 사이즈**: 897KB → 383KB (57% 감소)
- **코드 스플리팅**: Dashboard와 Learning Mode 필요시 로드
- **초기 로딩 속도**: 514KB 절감 (Gzip: 144KB 절감)

### 🎯 **사용성 개선** ✨ NEW!
- **요일별 일괄 체크**: 하루의 모든 습관을 한 번에 체크
- **Lazy Loading**: 페이지 로드 속도 개선
- **Suspense Fallback**: 부드러운 로딩 경험

## 🚀 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/Photometry4040/HabitTracker.git
cd HabitTracker
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. Supabase 설정 (데이터베이스 연동)

#### 4-1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
2. 프로젝트 설정에서 API 키 확인

#### 4-2. 환경 변수 설정
```bash
# .env 파일 생성
cp env.example .env
```

`.env` 파일에 Supabase 정보 입력:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4-3. 데이터베이스 스키마 설정
Supabase 대시보드의 SQL Editor에서 다음 순서로 실행:

1. `supabase-schema.sql` - 기본 테이블 생성
2. `supabase-security-policy.sql` - 보안 정책 설정

### 4-4. 인증 설정
1. Supabase 대시보드에서 Authentication > Settings
2. Site URL 설정: `http://localhost:5173` (개발용)
3. Redirect URLs 설정: `http://localhost:5173/**`
4. 이메일 템플릿 커스터마이징 (선택사항)

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 브라우저에서 확인
```
http://localhost:5173
```

### 7. 앱 아이콘 확인
개발 서버 실행 후 다음을 확인하세요:
- **브라우저 탭**: 파비콘 표시 확인
- **북마크**: 아이콘 표시 확인
- **모바일**: "홈 화면에 추가" 시 아이콘 확인

## 🛠️ 기술 스택

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Security**: Row Level Security (RLS), Input Validation, Session Management
- **Storage**: Cloud Database + Local Storage (백업)
- **PWA**: Web App Manifest, Service Workers
- **Icons**: Multi-platform app icons (iOS, Android, Desktop)

## 📁 프로젝트 구조

```
HabitTracker/
├── public/               # 정적 파일들
│   ├── favicon.ico       # 기본 파비콘
│   ├── favicon-16x16.png # 16x16 파비콘
│   ├── favicon-32x32.png # 32x32 파비콘
│   ├── apple-touch-icon.png # iOS 홈스크린 아이콘
│   ├── android-chrome-192x192.png # Android 아이콘
│   ├── android-chrome-512x512.png # Android 고해상도 아이콘
│   ├── mask-icon.svg     # Safari 핀 탭 아이콘
│   ├── site.webmanifest  # PWA 매니페스트
│   └── robots.txt        # SEO 설정
├── src/
│   ├── components/
│   │   └── ui/           # UI 컴포넌트들
│   ├── lib/
│   │   └── utils.js      # 유틸리티 함수
│   └── main.jsx          # 앱 진입점
├── App.jsx               # 메인 앱 컴포넌트
├── App.css               # 스타일시트
├── index.html            # HTML 템플릿
├── package.json          # 프로젝트 설정
├── vite.config.js        # Vite 설정
├── tailwind.config.js    # Tailwind CSS 설정
└── README.md             # 프로젝트 설명
```

## 🎯 사용 방법

1. **기본 정보 입력**: 아이 이름, 주간 기간, 테마 설정
2. **습관 설정**: 시간대별 습관 목표 입력
3. **일일 평가**: 각 습관에 대해 색상으로 평가
4. **주간 돌아보기**: 성과 분석 및 개선점 파악
5. **보상 설정**: 목표 달성 시 받을 보상 정하기

## 💡 특징

- **🔐 보안 인증**: Supabase Auth를 통한 안전한 로그인 시스템
- **🛡️ 데이터 보호**: Row Level Security (RLS)로 사용자별 데이터 격리
- **☁️ 클라우드 저장**: Supabase를 통한 안전한 데이터 저장
- **👶 아이별 관리**: 여러 아이의 데이터를 개별적으로 관리
- **⚡ 실시간 동기화**: 여러 기기에서 실시간 데이터 동기화
- **💾 수동 저장**: 사용자가 직접 저장 버튼을 눌러 데이터 저장
- **📱 반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **🎨 직관적인 UI**: 아이들이 쉽게 사용할 수 있는 인터페이스
- **🎯 시각적 피드백**: 색상과 이모지를 통한 명확한 피드백
- **🔒 세션 관리**: 자동 로그아웃 및 활동 시간 추적
- **📱 PWA 지원**: 홈스크린 추가, 오프라인 기능 지원
- **🎨 멀티플랫폼 아이콘**: iOS, Android, 데스크톱 최적화된 앱 아이콘

## 🎨 앱 아이콘 가이드

### 📱 지원되는 아이콘
- **favicon.ico**: 브라우저 탭, 북마크 (16x16, 32x32)
- **favicon-16x16.png**: 모던 브라우저용 (16x16)
- **favicon-32x32.png**: 모던 브라우저용 (32x32)
- **apple-touch-icon.png**: iOS 홈스크린 (180x180)
- **android-chrome-192x192.png**: Android 홈스크린 (192x192)
- **android-chrome-512x512.png**: Android 고해상도 (512x512)
- **mask-icon.svg**: Safari 핀 탭 (단색 SVG)

### 🎨 디자인 특징
- **테마**: 습관 추적을 상징하는 달력 아이콘
- **색상**: 앱 메인 컬러 보라색 (#7C3AED) 활용
- **스타일**: 아이들이 좋아할 만한 친근한 디자인
- **호환성**: 모든 플랫폼에서 최적화된 표시

### 🔧 커스터마이징
아이콘을 변경하려면 `public` 폴더의 해당 파일을 교체하세요:
```bash
# 예시: 새로운 파비콘으로 교체
cp your-new-favicon.ico public/favicon.ico
cp your-new-icon-192.png public/android-chrome-192x192.png
```

## 🚀 배포 가이드

### Netlify 배포

#### 1. Netlify 프로젝트 생성
1. [Netlify](https://netlify.com)에 가입
2. "New site from Git" 선택
3. GitHub 저장소 연결: `https://github.com/Photometry4040/HabitTracker.git`
4. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

#### 2. 환경 변수 설정 (중요!)
**Netlify 대시보드에서 설정:**
1. Site settings > Environment variables
2. 다음 변수 추가:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

#### 3. Supabase 인증 설정
1. Supabase 대시보드 > Authentication > Settings
2. Site URL 추가: `https://your-site.netlify.app`
3. Redirect URLs 추가: `https://your-site.netlify.app/**`

### GitHub Pages 배포

#### 1. GitHub Actions 설정
`.github/workflows/deploy.yml` 파일 생성:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

#### 2. GitHub Secrets 설정
1. 저장소 Settings > Secrets and variables > Actions
2. 다음 secrets 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🔧 문제 해결 가이드

### 환경 변수 문제 해결

#### ❌ 문제: 환경 변수가 제대로 로드되지 않음
**증상:**
```
VITE_SUPABASE_URL: your_production_supabase_url
VITE_SUPABASE_ANON_KEY: your_production_supabase_anon_key
```

#### ✅ 해결 방법:

**1. netlify.toml 파일 확인**
```toml
# ❌ 잘못된 설정 (제거해야 함)
[context.production.environment]
  VITE_SUPABASE_URL = "your_production_supabase_url"
  VITE_SUPABASE_ANON_KEY = "your_production_supabase_anon_key"
```

**2. 올바른 netlify.toml 설정**
```toml
# ✅ 올바른 설정
# 환경 변수는 Netlify 대시보드에서 설정하세요
# 이 파일에서는 환경변수를 설정하지 않습니다
```

**3. 우선순위 확인**
- **1순위**: Netlify 대시보드 환경 변수
- **2순위**: netlify.toml 파일 환경 변수
- **주의**: netlify.toml의 잘못된 설정이 대시보드 설정을 덮어쓸 수 있음

#### 🔍 디버깅 방법:

**1. Console에서 환경 변수 확인**
```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**2. Netlify 배포 로그 확인**
- Netlify 대시보드 > Deploys > 최신 배포 > Build log
- 환경 변수 로드 과정 확인

**3. 로컬 vs 배포 환경 비교**
```bash
# 로컬에서 확인
npm run dev
# 브라우저 Console에서 환경 변수 출력

# 배포 후 확인
# Netlify URL에서 Console 확인
```

### 배포 후 확인 사항

#### ✅ 정상 동작 확인:
1. **환경 변수 로드**: Console에서 올바른 URL과 Key 확인
2. **Supabase 연결**: 로그인/회원가입 기능 정상 동작
3. **데이터 저장**: 습관 데이터 저장 및 불러오기 정상
4. **인증 리다이렉트**: 로그인 후 올바른 페이지로 이동

#### 🚨 문제 발생 시:
1. **환경 변수 재설정**: Netlify 대시보드에서 환경 변수 재입력
2. **캐시 클리어**: 브라우저 캐시 및 Netlify 캐시 클리어
3. **재배포**: 강제 재배포 실행

## 📝 개발 노하우

### 1. 환경 변수 관리
- **로컬 개발**: `.env` 파일 사용
- **배포 환경**: 플랫폼별 환경 변수 설정
- **보안**: 민감한 정보는 절대 코드에 하드코딩하지 않기

### 2. 배포 전 체크리스트
- [ ] 환경 변수 올바르게 설정됨
- [ ] Supabase 인증 설정 완료
- [ ] 빌드 에러 없음 (`npm run build`)
- [ ] 로컬에서 정상 동작 확인

### 3. 문제 해결 순서
1. **로컬 테스트**: `npm run dev`로 로컬 동작 확인
2. **환경 변수 확인**: Console에서 환경 변수 출력 확인
3. **배포 로그 확인**: 플랫폼별 배포 로그 분석
4. **캐시 클리어**: 브라우저 및 배포 플랫폼 캐시 클리어

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

---

## 📚 문서 구조

이 프로젝트는 체계적인 문서 구조를 갖추고 있습니다:

- **[README.md](README.md)** (이 파일) - 사용자용 프로젝트 소개 및 설치 가이드
- **[CLAUDE.md](CLAUDE.md)** - Claude Code 작업 지침
- **[docs/README.md](docs/README.md)** - 개발 문서 색인 (필독!)
  - `docs/00-overview/` - 전체 기술 명세 및 아키텍처
  - `docs/01-architecture/` - 설계 문서
  - `docs/02-active/` - 현재 진행 중인 작업 (Phase 2)
  - `docs/03-deployment/` - 배포 가이드
  - `docs/04-completed/` - 완료된 작업 아카이브
  - `docs/05-reviews/` - 주간 리뷰 및 계획
  - `docs/06-future/` - 미래 개발 계획

### 개발자를 위한 빠른 링크
- 🎯 **현재 작업**: [docs/02-active/PHASE_2_PLAN.md](docs/02-active/PHASE_2_PLAN.md)
- 📖 **기술 명세**: [docs/00-overview/TECH_SPEC.md](docs/00-overview/TECH_SPEC.md)
- 🚀 **배포 가이드**: [docs/03-deployment/](docs/03-deployment/)

---

**아이들과 함께 즐거운 습관 형성을 시작해보세요!** 🎉 