# Memorize Helper

성경 본문을 가려 암송하고 날짜별 암송 범위를 기록하는 Vue 앱입니다. 로그인 없이 본문을 읽고 연습할 수 있으며, 카카오 로그인 후 개인 기록을 저장할 수 있습니다.

## 주요 기능

- 자료 목록과 저장된 장절 범위 기준 진행률
- 단락·장별 본문, 줄별 및 전체 가리기/열기
- 읽기/암송 모드 전환과 읽기 URL 공유
- 홈 월간 달력과 현재·최장 연속 기록
- 기록 기반 성취 4종
- 글자 크기 8단계, 다크 모드, 소제목 가리기
- 최근 기록의 마지막 절로 자동 이동
- 카카오 로그인·로그아웃과 로그인 시작 화면으로 복귀
- 날짜별 암송 기록 추가·수정·삭제, 주간·월간 조회
- DB 기반 업데이트 안내·이력과 안내별 다시 보지 않기
- 메뉴 하단의 앱 버전 표시

줄을 가리면 첫 번째 공백 구분 토큰만 남습니다. 현재 본문은 절 번호로 시작하므로 번호를 제외한 본문이 가려집니다. 개인 설정은 브라우저 `localStorage`에 저장합니다.

현재는 사용자당 하루 한 기록을 저장합니다. 기존 기록은 수정으로 처리하며, 같은 날짜에 새 기록을 추가하면 충돌 안내를 표시합니다. 다른 자료 화면에서 기존 기록을 수정해도 원래 자료가 유지됩니다. 자료 변경은 암송 기록 화면에서 합니다.

## 기술 스택

- Vue 3
- Vue Router
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth

## 시작하기

필요한 Node.js 버전은 `package.json`의 `engines` 기준으로 `^20.19.0` 또는 `>=22.12.0`입니다.

```sh
npm install
npm run dev
```

개발 서버가 실행되면 터미널에 표시되는 로컬 주소로 접속합니다.

카카오 로그인을 사용하려면 Supabase 프로젝트를 만들고 `.env`에 프로젝트 URL과 anon key를 추가합니다.

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Kakao Developers와 Supabase에 등록하는 콜백 주소는 서로 다릅니다. 전체 설정 순서와 테스트 방법은 [카카오 로그인과 Supabase 설정](docs/kakao-supabase-auth.md)을 참고하세요.

## 문서

- [카카오 로그인과 Supabase 설정](docs/kakao-supabase-auth.md)
- [기능과 데이터 기준](docs/features.md)
- [다음 기능 기획: 어드민·읽기·시험·성취·메인 달력](docs/planning/README.md)
- [암송 기록 테이블과 보안 정책](docs/supabase-memorization-records.md)
- [업데이트 노트 테이블·초기 데이터·보안 정책](docs/supabase-update-notes.md)
- [커밋 규칙](docs/commit-convention.md)
- [Git 브랜치 전략](docs/git-branch-strategy.md)

## 명령어

```sh
npm run dev
```

개발 서버를 실행합니다.

```sh
npm run build
```

타입 체크와 프로덕션 빌드를 실행합니다.

```sh
npm run preview
```

빌드 결과를 로컬에서 미리 봅니다.

```sh
npm run lint
```

ESLint를 실행하고 자동 수정 가능한 항목을 고칩니다.

```sh
npm run format
```

`src/` 아래 파일을 Prettier로 정리합니다.

## 회귀 테스트

```sh
npx playwright install chromium
npm test
```

테스트는 별도 로컬 서버와 가짜 인증·API 응답을 사용합니다. 실제 카카오 계정과 운영 DB는 사용하지 않습니다. 이미 설치된 Chromium을 사용하려면 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`에 실행 경로를 지정합니다.

## 배포 버전 확인

메뉴를 열면 하단에 앱 버전(예: `v0.2.0`)이 표시됩니다. 배포한 브랜치의 `package.json` 버전과
비교해 배포 반영 여부를 확인할 수 있습니다. 버전은 빌드 시 포함되므로 푸시 후 배포가
완료되고 페이지를 새로고침해야 새 값이 보입니다.

버전은 `package.json`을 기준으로 합니다. 다음 릴리스에서는 `npm version patch --no-git-tag-version`
등으로 `package.json`과 잠금 파일을 함께 갱신하고 커밋합니다.

## 프로젝트 구조

```text
src/
  App.vue                  공통 상단 바와 라우터 뷰
  main.ts                  앱 진입점
  router/index.ts          라우트 정의
  views/HomeView.vue       암송 자료 목록 화면
  views/ScriptView.vue     암송 본문 화면
  views/RecordsView.vue    주간·월간 기록 및 편집
  data/database.ts         암송 자료 인덱스
  composables/             세션·기록·본문 제어·개인 설정
  types/script.ts          암송 자료 타입

public/scripts/            암송 자료 JSON 파일
docs/                      프로젝트 문서
tests/                     브라우저 동작 및 본문 데이터 회귀 테스트
```

## 암송 자료 추가하기

암송 자료는 `public/scripts/`에 JSON 파일로 두고, `src/data/database.ts`의 `scriptIndex`에 항목을 추가해 연결합니다.

JSON 파일 형식:

```json
{
  "id": "example-script",
  "title": "Example Script",
  "description": "Short description",
  "meta": ["Reference", "Version"],
  "blocks": [
    {
      "id": 1,
      "label": "Section title (Matthew 5:1–2)",
      "lines": ["1. First verse to memorize.", "2. Second verse to memorize."]
    }
  ]
}
```

인덱스 항목 예시:

```ts
{
  id: 'example-script',
  title: 'Example Script',
  description: 'Short description',
  meta: ['Reference', 'Version'],
  source: '/scripts/example-script.json',
}
```

`id`는 라우트 주소(`/script/:id`)에 사용되므로 다른 자료와 겹치지 않아야 합니다. `source`는 `public/` 기준 경로가 아니라 브라우저에서 접근하는 절대 경로로 작성합니다.

## 현재 포함된 자료

- 산상수훈: 마태복음 5–7장, 개역개정, 111절
- The Sermon on the Mount: Matthew 5–7, ESV, 111절
- 로마서 8장: 개역개정, 39절

## 참고

각 본문 줄은 번호가 붙은 한 절로 구성하고, 소제목은 `label`에 둡니다. 현재 장절 추출은 `Matthew`, `마`, `롬`과 줄 앞의 `숫자.`를 인식합니다. 다른 성경책이나 일반 문장을 추가할 때는 암송 기록·진행률 지원 범위를 별도로 확장해야 합니다. 판본과의 문장 전체 대조 검수는 별도 과정입니다.
