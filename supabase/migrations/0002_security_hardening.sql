create table if not exists public.security_rate_limits (
  key_hash text primary key,
  request_count integer not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null
);

alter table public.security_rate_limits enable row level security;

create index if not exists security_rate_limits_expires_at_idx
  on public.security_rate_limits (expires_at);

create or replace function public.consume_security_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_expires_at timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  insert into public.security_rate_limits as limits (
    key_hash,
    request_count,
    window_started_at,
    expires_at
  ) values (
    p_key_hash,
    1,
    now(),
    now() + make_interval(secs => p_window_seconds)
  )
  on conflict (key_hash) do update set
    request_count = case when limits.expires_at <= now() then 1 else limits.request_count + 1 end,
    window_started_at = case when limits.expires_at <= now() then now() else limits.window_started_at end,
    expires_at = case when limits.expires_at <= now() then now() + make_interval(secs => p_window_seconds) else limits.expires_at end
  returning request_count, expires_at into v_count, v_expires_at;

  allowed := v_count <= p_limit;
  retry_after_seconds := greatest(1, ceil(extract(epoch from (v_expires_at - now())))::integer);
  return next;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer) to service_role;

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  agreement_id uuid,
  actor_role text check (actor_role in ('author', 'signer')),
  actor_source text check (actor_source in ('human', 'agent')),
  user_id uuid,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_agreement_id_created_at_idx
  on public.security_events (agreement_id, created_at desc);
create index if not exists security_events_event_type_created_at_idx
  on public.security_events (event_type, created_at desc);

alter table public.security_events enable row level security;

revoke all on public.security_rate_limits from public, anon, authenticated;
revoke all on public.security_events from public, anon, authenticated;
grant select, insert, update, delete on public.security_rate_limits to service_role;
grant select, insert on public.security_events to service_role;
grant usage, select on sequence public.security_events_id_seq to service_role;
