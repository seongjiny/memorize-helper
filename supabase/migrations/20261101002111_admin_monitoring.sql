-- Private storage and service-only projections. No user record contents are returned.
create schema monitoring_private;
revoke all on schema monitoring_private from public, anon, authenticated;
grant usage on schema monitoring_private to service_role;

create table monitoring_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table monitoring_private.visits (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('dev', 'prod')),
  visitor_id uuid not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  excluded boolean not null default false
);
create index visits_visitor_idx on monitoring_private.visits (environment, visitor_id, last_seen_at desc);
create table monitoring_private.page_views (
  id uuid primary key,
  visit_id uuid not null references monitoring_private.visits(id) on delete cascade,
  page text not null check (page in ('home', 'memorize', 'read', 'records', 'achievements', 'updates')),
  occurred_at timestamptz not null default now()
);
create index page_views_time_idx on monitoring_private.page_views (occurred_at);
create index page_views_visit_idx on monitoring_private.page_views (visit_id);
alter table monitoring_private.admins enable row level security;
alter table monitoring_private.visits enable row level security;
alter table monitoring_private.page_views enable row level security;
revoke all on all tables in schema monitoring_private from public, anon, authenticated, service_role;

create function monitoring_private.track_view(
  p_actor uuid, p_environment text, p_visitor uuid, p_event uuid, p_page text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_visit uuid;
begin
  if p_environment not in ('dev', 'prod') or p_environment is null or p_visitor is null or p_event is null
     or (p_page is not null and p_page not in ('home', 'memorize', 'read', 'records', 'achievements', 'updates')) then
    raise invalid_parameter_value using message = 'Invalid tracking event';
  end if;
  -- Serialize events from the same browser, including simultaneous tabs.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_environment || p_visitor::text, 0));
  if exists (select 1 from monitoring_private.admins where user_id = p_actor) then
    update monitoring_private.visits set excluded = true
      where visitor_id = p_visitor and environment = p_environment;
    return jsonb_build_object('accepted', false);
  end if;
  if p_page is null or exists (
    select 1 from monitoring_private.visits
    where visitor_id = p_visitor and environment = p_environment and excluded
  ) then
    return jsonb_build_object('accepted', false);
  end if;
  if exists (select 1 from monitoring_private.page_views where id = p_event) then
    return jsonb_build_object('accepted', true);
  end if;
  if (select count(*) from monitoring_private.page_views e
      join monitoring_private.visits v on v.id = e.visit_id
      where v.environment = p_environment and v.visitor_id = p_visitor
        and e.occurred_at >= now() - interval '1 minute') >= 60 then
    return jsonb_build_object('accepted', false);
  end if;
  select id into v_visit from monitoring_private.visits
    where environment = p_environment and visitor_id = p_visitor
      and last_seen_at >= now() - interval '30 minutes'
    order by last_seen_at desc limit 1;
  if v_visit is null then
    insert into monitoring_private.visits (environment, visitor_id)
      values (p_environment, p_visitor) returning id into v_visit;
  else
    update monitoring_private.visits set last_seen_at = now() where id = v_visit;
  end if;
  insert into monitoring_private.page_views (id, visit_id, page) values (p_event, v_visit, p_page);
  return jsonb_build_object('accepted', true);
end;
$$;

create function monitoring_private.read_admin(
  p_actor uuid, p_action text, p_environment text, p_days integer,
  p_search text, p_page integer, p_user uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_start date;
  v_since timestamptz;
  v_result jsonb;
begin
  if p_actor is null or not exists (select 1 from monitoring_private.admins where user_id = p_actor) then
    raise insufficient_privilege using message = 'Administrator access required';
  end if;
  if p_action = 'check' then return jsonb_build_object('isAdmin', true); end if;
  if p_environment not in ('dev', 'prod') or p_environment is null
     or p_days not in (1, 7, 30) or p_days is null
     or p_page is null or p_page < 1 or p_page > 10000
     or p_search is null or length(p_search) > 100 then
    raise invalid_parameter_value using message = 'Invalid monitoring filters';
  end if;
  v_start := v_today - (p_days - 1);
  v_since := v_start::timestamp at time zone 'Asia/Seoul';
  if p_action = 'dashboard' then
    with events as materialized (
      select e.*, v.visitor_id from monitoring_private.page_views e
      join monitoring_private.visits v on v.id = e.visit_id
      where v.environment = p_environment and not v.excluded and e.occurred_at >= v_since
    ), daily_visits as (
      select (occurred_at at time zone 'Asia/Seoul')::date as day,
        count(distinct visit_id) as visits, count(distinct visitor_id) as visitors, count(*) as views
      from events group by 1
    ), daily_records as (
      select record_date as day, count(*) as records, count(distinct user_id) as users
      from public.memorization_records where record_date between v_start and v_today group by 1
    ), daily as (
      select d::date as day, coalesce(v.visits, 0) as visits, coalesce(v.visitors, 0) as visitors,
        coalesce(v.views, 0) as views, coalesce(r.records, 0) as records, coalesce(r.users, 0) as users
      from generate_series(v_start::timestamp, v_today::timestamp, interval '1 day') d
      left join daily_visits v on v.day = d::date left join daily_records r on r.day = d::date
    ), pages as (
      select page, count(*) as views, count(distinct visitor_id) as visitors from events group by page
    )
    select jsonb_build_object(
      'environment', p_environment, 'days', p_days, 'timezone', 'Asia/Seoul',
      'collectedSince', (select min(e.occurred_at) from monitoring_private.page_views e
        join monitoring_private.visits v on v.id = e.visit_id
        where v.environment = p_environment and not v.excluded),
      'summary', jsonb_build_object(
        'visits', (select count(distinct visit_id) from events),
        'visitors', (select count(distinct visitor_id) from events),
        'pageViews', (select count(*) from events),
        'totalUsers', (select count(*) from auth.users where deleted_at is null),
        'newUsers', (select count(*) from auth.users where deleted_at is null and created_at >= v_since),
        'activeRecordUsers', (select count(distinct user_id) from public.memorization_records where record_date between v_start and v_today),
        'totalRecords', (select count(*) from public.memorization_records),
        'periodRecords', (select count(*) from public.memorization_records where record_date between v_start and v_today)
      ),
      'daily', (select jsonb_agg(jsonb_build_object('date', day, 'visits', visits, 'visitors', visitors,
        'pageViews', views, 'recordCount', records, 'recordUsers', users) order by day) from daily),
      'pages', coalesce((select jsonb_agg(jsonb_build_object('page', page, 'pageViews', views, 'visitors', visitors)
        order by views desc, page) from pages), '[]'::jsonb)
    ) into v_result;
    return v_result;
  elsif p_action = 'users' then
    with users as (
      select u.id, coalesce(nullif(u.raw_user_meta_data->>'name', ''), nullif(u.raw_user_meta_data->>'nickname', ''),
        nullif(u.raw_user_meta_data->>'full_name', ''), '이름 없음') as name,
        u.email, u.created_at, u.last_sign_in_at, u.banned_until
      from auth.users u where u.deleted_at is null
    ), filtered as materialized (
      select * from users where p_search = '' or position(lower(p_search) in lower(name)) > 0
        or position(lower(p_search) in lower(coalesce(email, ''))) > 0
        or position(lower(p_search) in id::text) > 0
    ), paginated as (
      select * from filtered order by created_at desc, id limit 20 offset (p_page - 1) * 20
    )
    select jsonb_build_object('total', (select count(*) from filtered), 'page', p_page, 'pageSize', 20,
      'users', coalesce((select jsonb_agg(jsonb_build_object(
        'id', u.id, 'name', u.name, 'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at,
        'status', case when u.banned_until > now() then 'banned' else 'active' end,
        'recordCount', r.total, 'lastRecordDate', r.last_date
      ) order by u.created_at desc, u.id)
      from paginated u cross join lateral (
        select count(*) as total, max(record_date) as last_date from public.memorization_records where user_id = u.id
      ) r), '[]'::jsonb)) into v_result;
    return v_result;
  elsif p_action = 'user' then
    select jsonb_build_object(
      'id', u.id,
      'name', coalesce(nullif(u.raw_user_meta_data->>'name', ''), nullif(u.raw_user_meta_data->>'nickname', ''),
        nullif(u.raw_user_meta_data->>'full_name', ''), '이름 없음'),
      'email', u.email, 'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at,
      'status', case when u.banned_until > now() then 'banned' else 'active' end,
      'isAdmin', exists (select 1 from monitoring_private.admins where user_id = u.id),
      'recordCount', (select count(*) from public.memorization_records where user_id = u.id),
      'lastRecordDate', (select max(record_date) from public.memorization_records where user_id = u.id),
      'activeDays30', (select count(distinct record_date) from public.memorization_records
        where user_id = u.id and record_date between v_today - 29 and v_today),
      'recentActivity', coalesce((select jsonb_agg(jsonb_build_object('date', r.record_date, 'count', r.total) order by r.record_date desc)
        from (select record_date, count(*) as total from public.memorization_records
          where user_id = u.id group by record_date order by record_date desc limit 30) r), '[]'::jsonb)
    ) into v_result from auth.users u where u.id = p_user and u.deleted_at is null;
    if v_result is null then raise no_data_found using message = 'User not found'; end if;
    return v_result;
  end if;
  raise invalid_parameter_value using message = 'Unknown monitoring action';
end;
$$;

-- Exposed wrappers are invokers and executable only by the backend service role.
create function public.monitoring_track_view(p_actor uuid, p_environment text, p_visitor uuid, p_event uuid, p_page text)
returns jsonb language sql security invoker set search_path = '' as $$
  select monitoring_private.track_view(p_actor, p_environment, p_visitor, p_event, p_page);
$$;
create function public.monitoring_read_admin(p_actor uuid, p_action text, p_environment text,
  p_days integer default 7, p_search text default '', p_page integer default 1, p_user uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select monitoring_private.read_admin(p_actor, p_action, p_environment, p_days, p_search, p_page, p_user);
$$;
revoke all on function monitoring_private.track_view(uuid, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function monitoring_private.read_admin(uuid, text, text, integer, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.monitoring_track_view(uuid, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.monitoring_read_admin(uuid, text, text, integer, text, integer, uuid) from public, anon, authenticated;
grant execute on function monitoring_private.track_view(uuid, text, uuid, uuid, text) to service_role;
grant execute on function monitoring_private.read_admin(uuid, text, text, integer, text, integer, uuid) to service_role;
grant execute on function public.monitoring_track_view(uuid, text, uuid, uuid, text) to service_role;
grant execute on function public.monitoring_read_admin(uuid, text, text, integer, text, integer, uuid) to service_role;
