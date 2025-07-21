# 🎯 아이들을 위한 습관 추적기 (Habit Tracker for Kids)

아이들이 재미있게 습관을 형성할 수 있도록 만든 시각적 습관 추적 웹 애플리케이션입니다.

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

### 4. 브라우저에서 확인
```
http://localhost:5173
```

## 🛠️ 기술 스택

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: Local Storage

## 📁 프로젝트 구조

```
HabitTracker/
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

- **자동 저장**: 브라우저 로컬 스토리지에 데이터 자동 저장
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **직관적인 UI**: 아이들이 쉽게 사용할 수 있는 인터페이스
- **시각적 피드백**: 색상과 이모지를 통한 명확한 피드백

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

**아이들과 함께 즐거운 습관 형성을 시작해보세요!** 🎉 