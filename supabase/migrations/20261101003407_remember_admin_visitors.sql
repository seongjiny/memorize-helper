-- Remember administrators even when their first request is already authenticated.
create or replace function monitoring_private.track_view(
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
    if not found then
      insert into monitoring_private.visits (environment, visitor_id, excluded)
        values (p_environment, p_visitor, true);
    end if;
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
