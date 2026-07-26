# 카카오 로그인과 Supabase 설정

이 프로젝트는 브라우저에서 Supabase Auth의 Kakao OAuth 로그인을 사용합니다.

## 현재 구현 범위

- `src/lib/supabase.ts`: Supabase 클라이언트 생성
- `src/components/KakaoLoginPanel.vue`: 로그인, 로그아웃, 현재 사용자 표시
- `src/views/KakaoCallbackView.vue`: 로그인 결과와 세션 확인
- `src/router/index.ts`: `/oauth/kakao/callback` 라우트

로그인 기능만 구현되어 있으며 암송 기록이나 묵상 메모를 Supabase에 저장하는 테이블은 아직 없습니다.

## 1. 로컬 환경변수

프로젝트 루트의 `.env.example`을 참고해 `.env`에 다음 값을 설정합니다.

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- URL과 anon key는 Supabase 프로젝트의 API 설정에서 확인합니다.
- `.env`는 Git에 커밋하지 않습니다.
- 브라우저 앱에는 Supabase `service_role` key를 절대 넣지 않습니다.
- 값을 바꾼 뒤에는 Vite 개발 서버를 다시 시작합니다.

## 2. Kakao Developers 설정

1. Kakao Developers에서 애플리케이션을 생성합니다.
2. 카카오 로그인을 활성화합니다.
3. REST API key의 Kakao Login Client Secret을 활성화하고 값을 확인합니다.
4. 필요한 동의 항목을 설정합니다.
   - `profile_nickname`
   - `profile_image`
   - `account_email`(선택)
5. REST API key의 Redirect URI에 Supabase가 표시하는 Callback URL을 등록합니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

여기에는 프런트엔드의 `/oauth/kakao/callback` 주소를 등록하지 않습니다. Kakao는 먼저 Supabase Auth로 돌아옵니다.

## 3. Supabase Kakao Provider 설정

Supabase Dashboard의 **Authentication > Sign In / Providers > Kakao**에서 다음을 설정합니다.

1. Kakao Provider를 활성화합니다.
2. Client ID에 Kakao REST API key를 입력합니다.
3. Client Secret에 Kakao Login Client Secret을 입력합니다.
4. Kakao에서 이메일 동의를 사용하지 않는다면 `Allow users without an email`을 활성화합니다.

Supabase Kakao Auth는 기본 프로필 정보로 `profile_nickname`과 `profile_image`를 사용합니다. 이메일이 필요하지 않거나 Kakao 앱에서 `account_email` 권한을 사용할 수 없다면 `Allow users without an email`을 활성화합니다.

## 4. Supabase Redirect URL 설정

Supabase Dashboard의 **Authentication > URL Configuration**에서 앱의 콜백 주소를 Redirect URLs에 추가합니다.

로컬 개발 예시:

```text
http://localhost:5173/oauth/kakao/callback
```

배포 환경 예시:

```text
https://your-domain.example/oauth/kakao/callback
```

Vite가 다른 포트로 실행되면 터미널에 표시된 실제 origin을 사용합니다. 프로덕션에서는 가능한 한 정확한 URL을 등록하고 넓은 와일드카드는 피합니다.

URL의 역할은 다음과 같습니다.

```text
브라우저
  → Kakao
  → https://<project-ref>.supabase.co/auth/v1/callback
  → https://<app-origin>/oauth/kakao/callback
```

## 5. 로그인 확인

1. `npm run dev`를 실행합니다.
2. 브라우저에 표시된 카카오 로그인 버튼을 누릅니다.
3. 카카오 동의 화면을 완료합니다.
4. `/oauth/kakao/callback` 화면에서 로그인 성공 여부를 확인합니다.
5. 홈으로 돌아가 사용자 이름이 표시되는지 확인합니다.
6. 로그아웃 후 사용자 표시가 사라지는지 확인합니다.

설정별 대표 오류:

- `KOE004`: Kakao Login이 활성화되지 않음
- `KOE006`: Kakao Developers의 Redirect URI가 Supabase Callback URL과 다름
- 로그인 후 앱으로 돌아오지 않음: Supabase Redirect URLs에 앱 콜백 주소가 없음
- 이메일 없는 사용자가 실패함: 동의 항목 또는 Supabase의 `Allow users without an email` 설정 확인

## 다음 구현

로그인이 확인된 뒤 암송 기록을 저장하려면 다음 작업이 필요합니다.

1. 사용자별 암송 기록 테이블 설계
2. `auth.uid()` 기준 Row Level Security 정책 작성
3. 기록 생성, 조회, 수정 UI 연결
4. 로그아웃 또는 다른 사용자 로그인 시 화면 상태 초기화

테이블과 RLS 정책은 저장할 데이터 범위가 정해진 뒤 별도 작업으로 추가합니다.

## 공식 문서

- [Supabase: Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Kakao Login prerequisites](https://developers.kakao.com/docs/latest/en/kakaologin/prerequisite)
