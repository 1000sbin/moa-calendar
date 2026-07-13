# 모아 캘린더

덕질 일정 관리 데스크톱 앱. 캘린더 · 메모 · D-day · 할일 이월 · 정시 소리 알림 · 테마 커스텀.

---

## 처음 실행해보기 (개발 모드)

Node.js LTS가 설치돼 있어야 해요.

```bash
npm install
npm start
```

앱 창이 뜨면 성공이에요.

---

## 내 PC에서 직접 exe 만들기

```bash
npm run dist
```

`dist/` 폴더에 `모아 캘린더 Setup 1.0.0.exe`(설치형)가 생겨요.

---

## GitHub에 올리고 자동 빌드 + 자동 업데이트 세팅하기

한 번만 설정해두면, 앞으로는 **태그만 올리면 GitHub이 알아서 exe를 빌드해서 배포**하고, 사용자 앱도 **자동으로 업데이트**돼요.

### 1단계 — 저장소 만들기

GitHub에서 **public** 저장소를 새로 만들어요. 이름은 `moa-calendar` 로.
(자동 업데이트는 public에서 제일 간단해요.)

### 2단계 — 내 GitHub 사용자명 넣기

`package.json`에서 `GITHUB_USERNAME` 부분을 본인 GitHub 아이디로 바꿔주세요.

```json
"publish": [
  {
    "provider": "github",
    "owner": "GITHUB_USERNAME",
    "repo": "moa-calendar"
  }
]
```

저장소 이름을 다르게 지었으면 `repo` 값도 맞춰서 바꿔주세요.

### 3단계 — 코드 올리기

```bash
git init
git add .
git commit -m "첫 커밋"
git branch -M main
git remote add origin https://github.com/GITHUB_USERNAME/moa-calendar.git
git push -u origin main
```

### 4단계 — 버전 태그 올려서 자동 빌드 시작하기

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions가 자동으로 Windows에서 빌드해서 저장소의 **Releases** 탭에 exe를 올려줘요.
(저장소 → Actions 탭에서 진행 상황을 볼 수 있어요. 5~10분쯤 걸려요.)

---

## 새 버전 배포하기 (업데이트)

앱을 고쳤을 때는 이렇게만 하면 돼요.

1. `package.json`의 `"version"`을 올려요 (예: `1.0.0` → `1.0.1`).
2. 커밋하고 새 태그를 올려요.

```bash
git add .
git commit -m "1.0.1 업데이트"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

그러면:
- GitHub이 자동으로 새 exe를 빌드해서 Releases에 올리고
- **기존에 앱을 설치한 사용자**는 앱을 켤 때 "새 버전이 있어요" 알림을 받고 자동으로 업데이트돼요.

⚠️ 태그 버전(`v1.0.1`)과 `package.json`의 버전(`1.0.1`)은 꼭 같아야 해요.

---

## 알아두면 좋은 것

- **"알 수 없는 게시자" 경고**: 코드 서명을 안 하면 사용자가 처음 설치할 때 Windows가 경고를 띄워요. 개인 개발자 앱은 거의 다 그래요. "추가 정보 → 실행"을 누르면 돼요. (없애려면 유료 코드 서명 인증서 필요.)
- **데이터 저장 위치**: `C:\Users\<사용자명>\AppData\Roaming\모아 캘린더\moa-data.json`
- **닫기 버튼**: 트레이(작업표시줄 우측)로 내려가서 알림을 계속 받아요. 완전 종료는 트레이 아이콘 우클릭 → 종료.
- **첫 실행**: 예시 데이터 없이 빈 상태로 시작해요.

---

## 폴더 구조

```
moa-calendar/
├─ package.json                # 설정 + 빌드 + 배포 옵션
├─ main.js                     # Electron 메인 (창, 저장, 알림, 자동 업데이트)
├─ preload.js                  # 렌더러 ↔ 메인 연결
├─ src/index.html              # 앱 화면 전체
├─ assets/                     # 아이콘
├─ .github/workflows/build.yml # 자동 빌드/배포 (GitHub Actions)
└─ LICENSE
```
