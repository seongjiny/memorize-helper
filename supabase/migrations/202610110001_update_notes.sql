begin;

create table if not exists public.update_notes (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  app_version text not null check (app_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  title text not null check (length(btrim(title)) > 0),
  introduction text not null default '',
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.update_notes enable row level security;
revoke all on table public.update_notes from anon, authenticated;
grant select on table public.update_notes to anon, authenticated;

drop policy if exists "Public can read published update notes" on public.update_notes;
create policy "Public can read published update notes"
on public.update_notes for select to anon, authenticated
using (published and published_at <= now());

create index if not exists update_notes_publication_idx
on public.update_notes (published_at desc, id desc) where published;

-- Preserve the original update ID so its existing dismissal setting continues to work.
insert into public.update_notes
  (id, app_version, title, introduction, items, published, published_at)
values (
  '2026-08-11-memorization-experience',
  '0.1.0',
  '암송과 기록이 더 편해졌어요',
  '본문을 이어서 암송하고 날짜별 기록을 남기는 흐름을 다듬고, 모바일과 다크 모드에서도 편하게 사용할 수 있도록 화면을 정리했습니다.',
  '[
    {"icon":"＋","title":"빈 날짜에도 바로 기록","description":"주간·월간 화면에서 오늘이나 지난 빈 날짜를 눌러 암송 기록을 추가할 수 있습니다. 미래 날짜는 선택되지 않으며, 오늘 기록이 있으면 기존 장절이 채워진 수정 화면이 바로 열립니다."},
    {"icon":"↓","title":"마지막 기록부터 이어서 암송","description":"설정에서 ‘마지막 기록에서 시작’을 켜면 최근에 기록한 마지막 절로 자동 이동합니다. 여러 장에 걸친 본문에는 장 구분 제목도 표시되어 현재 위치를 쉽게 알 수 있습니다."},
    {"icon":"◐","title":"다크 모드와 본문 설정","description":"다크 모드를 추가하고 모든 주요 화면의 색상 대비를 조정했습니다. 설정에서 소제목을 가릴 수 있으며, 글자 크기는 메뉴 첫 화면에서 이전처럼 바로 조절할 수 있습니다."},
    {"icon":"☰","title":"짧아진 메뉴와 모바일 화면","description":"자주 쓰는 암송 기능만 첫 메뉴에 남기고 나머지는 설정으로 정리했습니다. 상단의 ‘암송 도우미’를 누르면 언제든 홈으로 이동하며, 작은 모바일 화면에서도 메뉴가 간결하게 보입니다."}
  ]'::jsonb,
  true,
  '2026-08-11T00:00:00Z'
), (
  '2026-10-11-reading-calendar-achievements',
  '0.2.0',
  '읽고, 기록하고, 성취를 확인해 보세요',
  '본문을 편하게 읽는 모드와 나의 기록 달력, 기록으로 쌓이는 성취를 추가했습니다.',
  '[
    {"icon":"☷","title":"본문을 펼쳐 읽는 읽기 모드","description":"본문 상단에서 읽기와 암송을 전환할 수 있어요. 읽기에서는 모든 절이 보이고, 줄을 눌러도 본문이 가려지지 않습니다. 읽기만으로 암송 기록이 저장되지는 않아요."},
    {"icon":"▦","title":"홈에서 확인하는 기록 달력","description":"기록한 날과 현재·최장 연속 기록을 홈에서 확인하세요. 날짜를 선택하면 해당 날짜의 기록을 보거나 추가할 수 있습니다. 기록 날짜는 기기의 로컬 시간을 기준으로 합니다."},
    {"icon":"✓","title":"기록으로 쌓이는 작은 성취","description":"첫 기록, 3일 이어가기, 10일의 발자국, 한 자료의 모든 절을 확인해 보세요. 과거 기록도 포함하며 기록을 수정하거나 삭제하면 성취가 다시 계산됩니다. 자료 완성은 저장 범위 기준이며 암송 실력 인증이 아닙니다."}
  ]'::jsonb,
  true,
  now()
)
on conflict (id) do nothing;

commit;
