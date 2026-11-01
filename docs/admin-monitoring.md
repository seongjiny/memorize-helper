# 운영 모니터링

v0.3.0부터 기존 앱의 `/admin`에서 조회 전용 운영 화면을 제공합니다.
구절·콘텐츠 편집, 계정 정지·삭제, 관리자 권한 변경 UI는 포함하지 않습니다.

## 화면

- `/admin`: 오늘/최근 7일/최근 30일 방문·방문자·페이지 조회, 회원·암송 기록 요약,
  날짜별 방문 그래프와 수치, 화면별 이용 현황.
- `/admin/users`: 닉네임·이메일·회원 ID 검색, 페이지당 20명,
  가입일·최근 로그인·기록 횟수·계정 상태.
- `/admin/users/:userId`: 최소 프로필, 마지막 로그인·기록일, 최근 30일 기록 일수,
  최근 기록일 최대 30개. 개인별 구절 내용은 반환하지 않습니다.

카카오 로그인 후 관리자 계정에만 메뉴의 **운영 모니터링** 링크가 표시됩니다.
직접 주소를 입력해도 서버 검증을 통과해야 데이터를 조회할 수 있습니다.
조회 실패와 수집 데이터 없음은 구분하고, 계정 전환 시 이전 데이터를 지웁니다.

## 집계 기준

- 방문: 같은 브라우저에서 마지막 화면 조회 후 30분 안의 조회는 한 세션으로 묶습니다.
  동시 탭 요청은 DB 잠금으로 직렬화합니다. 자정을 넘긴 세션은 활동한 날짜마다 해당 날짜의
  방문에 포함하므로 일별 합계와 기간 전체의 중복 제거 방문 수는 다를 수 있습니다.
- 방문자: 로컬 저장소의 무작위 브라우저 식별자로 중복을 제거한 추정치입니다.
  기기 변경·저장소 삭제 시 중복 집계될 수 있습니다.
- 페이지 조회: 홈, 암송, 읽기, 기록, 성취, 업데이트의 전환·새로고침을 집계합니다.
  자료 변경·읽기/암송 전환은 새 조회이며, 기록 화면의 날짜 쿼리만 바뀌면 집계하지 않습니다.
- 관리자 화면·로그인 콜백은 수집하지 않습니다. 관리자 확인 시 해당 환경에서 같은 브라우저의
  이전 익명 방문도 제외하며, 같은 브라우저는 로그아웃 후에도 제외합니다.
- 날짜 경계는 **Asia/Seoul**입니다. 방문 데이터만 `dev`/`prod`로 구분합니다.
  회원·암송 데이터는 공용 DB 기준이며, 암송 활동은 `record_date` 기준입니다.
- 통계는 수집 시작 시점부터 제공합니다. 과거 방문·로그인 횟수를 추정해서 채우지 않습니다.
- 전체 URL, 구절 ID/내용, IP, 사용자별 탐색 이력은 저장하지 않습니다. 저장 필드는
  무작위 식별자, 환경, 시각, 정해진 화면 종류입니다. Do Not Track 설정을 존중합니다.
- Origin 검증과 브라우저당 분당 60건 제한을 적용하지만 봇을 완전히 식별하는 통계는 아닙니다.

## 서버와 DB

`supabase/migrations/20261101002111_admin_monitoring.sql`에 스키마와 집계 함수를 보관합니다.
파일 버전은 연결된 프로젝트에 적용된 마이그레이션 이력과 일치합니다.
후속 `*_remember_admin_visitors.sql`은 익명 방문 이력이 없는 관리자 브라우저도 제외 상태로 보관합니다.

- `monitoring_private.admins`, `visits`, `page_views`: 비공개 스키마, RLS 활성화,
  일반 역할의 접근·쓰기 권한 없음. RLS 정책 없음 안내는 의도된 기본 차단입니다.
- 공개 `monitoring_*` RPC는 `SECURITY INVOKER`이며 `service_role`만 실행할 수 있습니다.
  권한이 필요한 구현은 비공개 스키마에 두고 빈 `search_path`를 사용합니다.
- `monitoring-admin`: JWT 검증 활성화, 매 요청 `getUser(token)`과 DB 관리자 등록 검증.
  클라이언트가 전달한 역할·사용자 ID로 권한을 판단하지 않습니다. 응답은 캐시하지 않습니다.
- `track-visit`: 비로그인 수집을 위해 플랫폼 JWT 검증을 끄고, 로그인 토큰이 있는 경우에는
  사용자 검증을 수행합니다. 환경은 요청 본문이 아닌 허용 Origin에서 결정합니다.
  중복 이벤트 UUID는 한 번만 저장하며 서버 시각을 사용합니다.
- 서비스 권한 키는 Edge 런타임의 예약 환경변수에서만 사용하며 브라우저·저장소에 넣지 않습니다.
  수집 장애가 읽기·기록 저장을 막지 않습니다. 기존 암송 기록 RLS는 변경하지 않습니다.

최초 관리자 지정·해제는 제한된 SQL 운영 절차로만 수행합니다.
Auth 계정이 정확히 한 명인지 먼저 확인한 뒤 등록합니다.

```sql
insert into monitoring_private.admins(user_id)
select id from auth.users
where lower(email) = lower('verified-owner@example.com') and deleted_at is null
on conflict do nothing;
```

등록을 삭제하면 이후 관리 요청은 즉시 거절됩니다.

## 배포와 검증

1. 마이그레이션 적용 → 두 Edge Function과 `_shared` 배포 → 확인된 관리자 등록 → 프런트 배포.
2. JWT 설정은 `supabase/config.toml`에 있습니다. 공개 개발/운영 호스트를 자동 구분합니다.
   로컬에서는 수집하지 않고 테스트 서버만 `VITE_MONITORING_ENV=dev`를 지정합니다.
3. 브라우저 테스트: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`.
4. 서버 테스트: `npm exec --yes --package=deno -- deno test supabase/functions/_shared/monitoring_test.ts`.
5. 서버 타입 검사: `npm exec --yes --package=deno -- deno check supabase/functions/monitoring-admin/index.ts supabase/functions/track-visit/index.ts`.
6. 빌드·린트: `npm run build` 및 `npx eslint .`.

`tests/sql/admin-monitoring.sql`은 실제 DB에서 권한·중복·세션 분리·관리자 제외·집계 결과를
검증하며 테스트 데이터를 롤백합니다. 서버 테스트는 인증·입력 검증·응답 제한을,
브라우저 테스트는 접근 거절·검색·페이지 이동·오류 재시도·계정 전환·모바일·방문 수집을 검증합니다.
