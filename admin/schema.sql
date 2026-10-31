-- ============================================================
--  网页游戏埋点 · Supabase 建表脚本
--  在 Supabase Dashboard → SQL Editor 里整段粘贴执行一次
-- ============================================================

-- 1. 玩家（设备维度匿名 ID）
create table if not exists public.gp_players (
  id          uuid primary key,
  nickname    text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

-- 2. 游玩会话（核心表）
create table if not exists public.gp_sessions (
  id              uuid primary key,
  player_id       uuid not null references public.gp_players(id) on delete cascade,
  game_slug       text not null,
  started_at      timestamptz not null default now(),
  last_heartbeat  timestamptz not null default now(),
  ended_at        timestamptz,
  active_seconds  integer not null default 0,
  score           integer,
  locale          text,
  ua              text,
  screen          text,
  referrer        text
);

-- 3. 自定义事件（可选）
create table if not exists public.gp_events (
  id          bigserial primary key,
  session_id  uuid references public.gp_sessions(id) on delete cascade,
  game_slug   text not null,
  name        text not null,
  props       jsonb,
  at          timestamptz not null default now()
);

create index if not exists gp_sessions_game_start_idx
  on public.gp_sessions (game_slug, started_at desc);
create index if not exists gp_sessions_player_start_idx
  on public.gp_sessions (player_id, started_at desc);
create index if not exists gp_events_session_idx
  on public.gp_events (session_id);

-- ============================================================
--  RLS：匿名只能写，登录用户（你自己）才能读
-- ============================================================
alter table public.gp_players  enable row level security;
alter table public.gp_sessions enable row level security;
alter table public.gp_events   enable row level security;

drop policy if exists gp_players_anon_insert on public.gp_players;
drop policy if exists gp_players_anon_update on public.gp_players;
drop policy if exists gp_sessions_anon_insert on public.gp_sessions;
drop policy if exists gp_sessions_anon_update on public.gp_sessions;
drop policy if exists gp_events_anon_insert on public.gp_events;
drop policy if exists gp_players_read on public.gp_players;
drop policy if exists gp_sessions_read on public.gp_sessions;
drop policy if exists gp_events_read on public.gp_events;

create policy gp_players_anon_insert on public.gp_players
  for insert to anon with check (true);
create policy gp_players_anon_update on public.gp_players
  for update to anon using (true) with check (true);
create policy gp_sessions_anon_insert on public.gp_sessions
  for insert to anon with check (true);
create policy gp_sessions_anon_update on public.gp_sessions
  for update to anon using (true) with check (true);
create policy gp_events_anon_insert on public.gp_events
  for insert to anon with check (true);

create policy gp_players_read on public.gp_players
  for select to authenticated using (true);
create policy gp_sessions_read on public.gp_sessions
  for select to authenticated using (true);
create policy gp_events_read on public.gp_events
  for select to authenticated using (true);

-- ============================================================
--  便捷视图（security_invoker 让 RLS 依然生效，不会泄露给 anon）
-- ============================================================
create or replace view public.gp_session_durations
with (security_invoker = true) as
select
  s.id,
  s.player_id,
  s.game_slug,
  s.started_at,
  s.last_heartbeat,
  s.ended_at,
  s.active_seconds,
  s.score,
  s.locale,
  s.referrer
from public.gp_sessions s;

-- ============================================================
--  看板聚合函数（登录用户可调用）
-- ============================================================
create or replace function public.gp_overview(p_days int default 30)
returns jsonb
language sql
security invoker
stable
as $$
  with s as (
    select * from public.gp_sessions
    where started_at >= now() - make_interval(days => p_days)
  )
  select jsonb_build_object(
    'players',          (select count(distinct player_id) from s),
    'sessions',         (select count(*) from s),
    'total_seconds',    (select coalesce(sum(active_seconds), 0) from s),
    'avg_seconds',      (select coalesce(round(avg(active_seconds)), 0) from s),
    'median_seconds',   (select coalesce(percentile_cont(0.5) within group (order by active_seconds), 0) from s),
    'new_players',      (select count(*) from public.gp_players
                          where first_seen >= now() - make_interval(days => p_days)),
    'returning_players',(select count(*) from public.gp_players
                          where first_seen < now() - make_interval(days => p_days)
                            and id in (select player_id from s))
  );
$$;

create or replace function public.gp_game_stats(p_days int default 30)
returns table (
  game_slug      text,
  players        bigint,
  sessions       bigint,
  total_seconds  bigint,
  avg_seconds    numeric
)
language sql
security invoker
stable
as $$
  select
    s.game_slug,
    count(distinct s.player_id),
    count(*),
    coalesce(sum(s.active_seconds), 0)::bigint,
    coalesce(round(avg(s.active_seconds)), 0)::numeric
  from public.gp_sessions s
  where s.started_at >= now() - make_interval(days => p_days)
  group by s.game_slug
  order by 4 desc;
$$;

create or replace function public.gp_daily_stats(p_days int default 30)
returns table (
  day            date,
  players        bigint,
  sessions       bigint,
  total_seconds  bigint
)
language sql
security invoker
stable
as $$
  select
    date_trunc('day', s.started_at)::date,
    count(distinct s.player_id),
    count(*),
    coalesce(sum(s.active_seconds), 0)::bigint
  from public.gp_sessions s
  where s.started_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1;
$$;

create or replace function public.gp_player_list(p_days int default 30)
returns table (
  player_id      uuid,
  nickname       text,
  sessions       bigint,
  total_seconds  bigint,
  last_played    timestamptz,
  games          text
)
language sql
security invoker
stable
as $$
  select
    s.player_id,
    p.nickname,
    count(*),
    coalesce(sum(s.active_seconds), 0)::bigint,
    max(s.started_at),
    string_agg(distinct s.game_slug, ', ')
  from public.gp_sessions s
  join public.gp_players p on p.id = s.player_id
  where s.started_at >= now() - make_interval(days => p_days)
  group by s.player_id, p.nickname
  order by max(s.started_at) desc;
$$;

-- 只给登录用户执行权限，anon 不能调用
revoke execute on function public.gp_overview(int)      from anon;
revoke execute on function public.gp_game_stats(int)    from anon;
revoke execute on function public.gp_daily_stats(int)   from anon;
revoke execute on function public.gp_player_list(int)   from anon;
grant execute on function public.gp_overview(int)      to authenticated;
grant execute on function public.gp_game_stats(int)    to authenticated;
grant execute on function public.gp_daily_stats(int)   to authenticated;
grant execute on function public.gp_player_list(int)   to authenticated;

-- ============================================================
--  使用前还需要（在 Dashboard 里手动做一次）：
--   1. Authentication → Providers → Email：关闭 "Enable sign ups"
--      （否则任何人都能注册账号看数据）
--   2. Authentication → Users → Add user：给自己建一个邮箱 + 密码账号
-- ============================================================
