-- Run only in an isolated PostgreSQL test database as its owner.
-- psql -v ON_ERROR_STOP=1 -v migration_file=/path/to/migration.sql -f this_file.sql
create role anon nologin;
create role authenticated nologin;

\i :migration_file
\i :migration_file

do $$
begin
  if (select count(*) from public.update_notes) <> 2 then
    raise exception 'Migration re-run duplicated releases';
  end if;
  if not exists (
    select 1 from public.update_notes
    where id = '2026-10-11-reading-calendar-achievements'
      and app_version = '0.2.0'
      and jsonb_array_length(items) = 3
  ) then
    raise exception 'Current release seed is missing or incomplete';
  end if;
end $$;

insert into public.update_notes (id, app_version, title, items, published, published_at) values
('test-draft', '0.2.0', 'Draft', '[{"icon":"","title":"Draft","description":"Private"}]', false, now()),
('test-scheduled', '0.2.0', 'Scheduled', '[{"icon":"","title":"Future","description":"Not yet public"}]', true, now() + interval '1 day');

create function public.test_update_note_access() returns void
language plpgsql security invoker as $$
begin
  if exists (select 1 from public.update_notes where id in ('test-draft', 'test-scheduled')) then
    raise exception 'Draft or scheduled release leaked';
  end if;
  if not exists (select 1 from public.update_notes where id = '2026-10-11-reading-calendar-achievements') then
    raise exception 'Published release is not readable';
  end if;
  begin
    insert into public.update_notes (id, app_version, title, items)
    values ('test-forbidden-write', '0.2.0', 'Forbidden', '[{"icon":"","title":"No","description":"No"}]');
    raise exception 'INSERT unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.update_notes set title = 'Tampered' where id = '2026-10-11-reading-calendar-achievements';
    raise exception 'UPDATE unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.update_notes where id = '2026-10-11-reading-calendar-achievements';
    raise exception 'DELETE unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

set role anon;
select public.test_update_note_access();
reset role;
set role authenticated;
select public.test_update_note_access();
reset role;

drop function public.test_update_note_access();
delete from public.update_notes where id in ('test-draft', 'test-scheduled');
select 'Migration, publication RLS, and read-only privileges passed' as result;
