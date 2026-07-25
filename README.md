# Memorize Helper

성경 본문이나 긴 문장을 암송할 때 사용할 수 있는 작은 Vue 앱입니다. 본문을 단락과 줄 단위로 보여주고, 각 줄을 누르면 첫 단어를 제외한 나머지 단어를 가리거나 다시 표시할 수 있습니다.

## 주요 기능

- 암송 자료 목록 보기
- 암송 자료 상세 화면에서 단락별 본문 보기
- 줄 단위로 단어 가리기/보이기 전환
- 글자 크기 단계 조절
- 선택한 글자 크기 `localStorage` 저장

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

## 프로젝트 구조

```text
src/
  App.vue                  공통 상단 바와 라우터 뷰
  main.ts                  앱 진입점
  router/index.ts          라우트 정의
  views/HomeView.vue       암송 자료 목록 화면
  views/ScriptView.vue     암송 본문 화면
  data/database.ts         암송 자료 인덱스
  composables/useFontScale.ts
  types/script.ts          암송 자료 타입

public/scripts/            암송 자료 JSON 파일
docs/                      프로젝트 문서
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
      "label": "Section title",
      "lines": [
        "First line to memorize.",
        "Second line to memorize."
      ]
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

- Sermon on the Mount
- Sermon on the Mount ESV
- Romans 8

## 참고

현재 본문 데이터와 일부 UI 문구에 인코딩이 깨진 문자열이 포함되어 있습니다. README는 현재 앱 구조와 개발 방법을 정리하는 데 초점을 맞췄고, 본문 데이터 정리는 별도 작업으로 다루는 것이 좋습니다.
