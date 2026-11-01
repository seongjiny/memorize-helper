-- Run against the connected project; every fixture is rolled back.
begin;
do $$
declare
  actor uuid := (select user_id from monitoring_private.admins order by created_at limit 1);
  visitor uuid := gen_random_uuid();
  event uuid := gen_random_uuid();
  result jsonb;
  n integer;
begin
  assert actor is not null, 'A configured administrator is required';
  assert not has_schema_privilege('anon', 'monitoring_private', 'usage');
  assert not has_schema_privilege('authenticated', 'monitoring_private', 'usage');
  assert not has_function_privilege('anon', 'public.monitoring_read_admin(uuid,text,text,integer,text,integer,uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.monitoring_read_admin(uuid,text,text,integer,text,integer,uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.monitoring_track_view(uuid,text,uuid,uuid,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.monitoring_track_view(uuid,text,uuid,uuid,text)', 'execute');
  begin
    perform public.monitoring_read_admin(gen_random_uuid(), 'check', 'dev');
    raise exception 'Non-admin was permitted';
  exception when insufficient_privilege then null; end;
  perform public.monitoring_track_view(null, 'dev', visitor, event, 'home');
  perform public.monitoring_track_view(null, 'dev', visitor, event, 'home');
  perform public.monitoring_track_view(null, 'dev', visitor, gen_random_uuid(), 'read');
  select count(*) into n from monitoring_private.visits where visitor_id = visitor;
  assert n = 1, 'Concurrent browser activity shares a visit';
  select count(*) into n from monitoring_private.page_views e join monitoring_private.visits v on v.id=e.visit_id where v.visitor_id=visitor;
  assert n = 2, 'Retries must be idempotent';
  update monitoring_private.visits set last_seen_at = now() - interval '31 minutes' where visitor_id=visitor;
  perform public.monitoring_track_view(null, 'dev', visitor, gen_random_uuid(), 'memorize');
  select count(*) into n from monitoring_private.visits where visitor_id=visitor and environment='dev';
  assert n = 2, 'Inactivity starts another visit';
  perform public.monitoring_track_view(null, 'prod', visitor, gen_random_uuid(), 'home');
  select count(*) into n from monitoring_private.visits where visitor_id=visitor and environment='prod';
  assert n = 1, 'Environments are independent';
  perform public.monitoring_track_view(actor, 'dev', visitor, gen_random_uuid(), null);
  assert not exists (select 1 from monitoring_private.visits where visitor_id=visitor and environment='dev' and not excluded), 'Admin anonymous history is excluded';
  select count(*) into n from monitoring_private.page_views;
  perform public.monitoring_track_view(null, 'dev', visitor, gen_random_uuid(), 'home');
  assert n = (select count(*) from monitoring_private.page_views), 'Same admin browser stays excluded after logout';
  result := public.monitoring_read_admin(actor, 'dashboard', 'dev', 30);
  assert jsonb_array_length(result->'daily') = 30;
  assert result->>'timezone' = 'Asia/Seoul';
  assert result->'daily'->29->>'date' = ((now() at time zone 'Asia/Seoul')::date)::text;
  result := public.monitoring_read_admin(actor, 'users', 'dev', 7, actor::text);
  assert (result->>'total')::int = 1;
  assert not (result->'users'->0 ? 'raw_user_meta_data');
  result := public.monitoring_read_admin(actor, 'user', 'dev', 7, '', 1, actor);
  assert result->>'id' = actor::text;
  assert not (result ? 'encrypted_password') and not (result ? 'script_id') and not (result ? 'book');
  begin
    perform public.monitoring_read_admin(actor, 'user', 'dev', 7, '', 1, gen_random_uuid());
    raise exception 'Missing user was found';
  exception when no_data_found then null; end;
end;
$$;
rollback;
