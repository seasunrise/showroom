# Supabase 使用文档：玩家信息共享与访问数据统计

本文档说明 showroom 站点如何用 Supabase 实现两件事：

1. **玩家之间的信息共享**（Realtime，用于 `game/multiplayer-arena.html` 多人对战）
2. **玩家访问数据统计**（Postgres REST，用于全站游戏的埋点与看板）

项目凭证（publishable key 可公开，安全靠 RLS 保证）：

| 项 | 值 |
|---|---|
| Project URL | `https://gxdackbnfxbaqcpabcgs.supabase.co` |
| Publishable key | `sb_publishable_7zuwaGboS5j-3Mq6Q0l8vw_VKkJLql2` |
| 相关文件 | `analytics.js`、`admin/analytics.html`、`admin/schema.sql`、`game/multiplayer-arena.html` |

> 本文档中的 SQL 与 `schema.sql` 保持一致，是最新验证过的版本。改动 SQL 时请两边同步。

---

## 一、玩家信息共享（Supabase Realtime）

多人游戏是纯前端实现，Supabase 只当"消息总线"：玩家状态、射击、命中、击杀全部通过 Broadcast 广播，不经过数据库。

### 1. 通道配置

```js
const channel = sb.channel('dorm_brawl_v1', {
  config: {
    broadcast: { self: true },          // 自回显：用于测网络延迟
    presence:  { key: me.id }
  }
});
```

- 所有玩家进**同一个固定频道**，无房间概念
- 客户端初始化参数：`{ realtime: { params: { eventsPerSecond: 10 } } }`

### 2. 事件协议

| 事件 | 频率 | 内容 | 说明 |
|---|---|---|---|
| `state` | 每 100ms | `{ id, name, x, y, angle, health, score, color }` | 玩家状态同步（核心数据流） |
| `shoot` | 触发 | `{ id, x, y, angle }` | 开火，其他人据此渲染子弹 |
| `hit` | 触发 | `{ targetId, damage, killerId, killerName }` | 只有被打中的人自己处理扣血 |
| `kill` | 触发 | `{ killerId, killerName, victimId, victimName, x, y, color }` | 击杀播报与记分 |
| `leave` | 触发 | `{ id }` | `beforeunload` 时发出，立即移除该玩家 |
| `ping` | 每 3s | `{ id, ts }` | 延迟测量：靠 `self: true` 回显算 RTT |

Presence **只用于加入/离开通知**，加入时 `track({ name })` 一次。

### 3. 关键经验（踩过的坑）

1. **Presence `track()` 有调用上限**：用 publishable key 时，连续调用约 5 次后通道会被关闭（表现为"进入房间后显示 Disconnected"）。所以状态同步一律走 Broadcast（无此限制），Presence 只在加入时 track 一次。
2. **`broadcast: { self: true }` 会收到自己发的所有消息**，各 handler 必须做好自过滤：
   - `state` / `shoot`：跳过 `payload.id === me.id`
   - `kill`：被杀的人已在本地 `die()` 处理过，收到自己的 kill 回显要 `return`
   - `ping`：**只处理自己的回显**（这正是测延迟的原理）
3. **心跳剔除**：远端玩家 3 秒没发 `state` 就移除，避免异常退出的人留残影。
4. **离开通知**：`beforeunload` 里先发 `leave` 再 `unsubscribe()`，否则其他人要等心跳超时。
5. **SYNC_INTERVAL = 100ms**：Broadcast 实测高频发送没有限制，位置同步足够流畅。

---

## 二、玩家访问数据统计（Analytics）

### 1. 工作原理

所有游戏页引入共用脚本 `analytics.js`，打开页面时：

```
insert gp_players（409 则改为 patch 更新）→ insert gp_sessions
→ 每 15s patch 心跳（last_heartbeat + active_seconds）
→ 页面关闭时用 fetch keepalive 补写 ended_at
```

埋点失败只打 `console.warn`，绝不影响游戏本身。

### 2. 接入方式（每个游戏页两行）

```html
<script src="../analytics.js"></script>
<script>Analytics.init({ game: 'my-game-slug' });</script>
```

可选 API：

```js
Analytics.score(1200);                        // 上报分数
Analytics.event('level_start', { level: 3 }); // 自定义事件
Analytics.playerId();                         // 当前匿名 ID
```

多人游戏可传昵称：`Analytics.init({ game: 'multiplayer-arena', nickname: 玩家名 })`。

### 3. 统计口径

| 指标 | 口径 |
|---|---|
| 玩家 | localStorage 里的匿名 UUID，**同一浏览器算同一人**（换设备/清缓存算新人） |
| 昵称 | 可选；多人游戏里填过的名字会自动带上 |
| 游玩时长 | `active_seconds`，**只在页面可见时累加**，切后台/切标签页不计时 |
| 会话 | 每打开一次页面算一场；从 bfcache 恢复会开新会话 |
| 异常退出 | 心跳停在最后 15 秒内，时长按最后心跳算，不会虚高 |

### 4. 数据模型

- `gp_players`：匿名玩家（id / nickname / first_seen / last_seen）
- `gp_sessions`：游玩会话（核心表，含 game_slug、起止时间、active_seconds、score、UA 等）
- `gp_events`：自定义事件（可选）
- 视图 `gp_session_durations` + 4 个聚合函数 `gp_overview / gp_game_stats / gp_daily_stats / gp_player_list`（参数都是天数）

### 5. 安全模型（RLS）

- `anon`（公开 key）：对三张表只有 **INSERT + UPDATE**，没有任何 SELECT
- `authenticated`（你登录后）：SELECT + 调用聚合函数
- 所以 publishable key 写在公开 HTML 里也是安全的：别人最多能往表里写垃圾行，读不到任何数据

**重要陷阱：不能用 upsert。** `INSERT ... ON CONFLICT DO UPDATE`（即 `Prefer: resolution=merge-duplicates`）在 RLS 下要求 SELECT 策略能看到冲突行，anon 没有 SELECT 权限会直接报 `42501`。`analytics.js` 采用「先插，遇 409 再 PATCH」绕过。

### 6. 看板 `admin/analytics.html`

- Supabase Auth 邮箱密码登录（RLS 保护，未登录读不到数据）
- 7 天 / 30 天切换：独立玩家、场次、总时长、人均/中位数时长、新增与回访
- 每日游玩时长柱状图、各游戏表现排行、玩家名单（含昵称与玩过的游戏）
- 页面带 `noindex`，但仍需登录才能看到数据

### 7. 初始化步骤（新环境只做一次）

1. SQL Editor 执行本文档第四节的完整 SQL
2. Authentication → Providers → Email：**关闭 "Enable sign ups"**（否则任何人都能注册账号看数据）
3. Authentication → Users → Add user：给自己建一个邮箱 + 密码
4. 打开任意游戏玩几秒 → `select * from gp_sessions order by started_at desc limit 5;` 有行即成功
5. 打开 `/admin/analytics.html` 登录看数

---

## 三、常用查询

```sql
-- 最近 5 场会话
select game_slug, active_seconds, started_at
from gp_sessions order by started_at desc limit 5;

-- 近 7 天独立玩家数（30 天把 7 改掉）
select count(distinct player_id) from gp_sessions
where started_at >= now() - interval '7 days';

-- 近 30 天每个游戏的表现
select * from gp_game_stats(30);

-- 清理测试数据（按需替换 id / slug）
delete from public.gp_events   where game_slug = '_probe';
delete from public.gp_sessions where game_slug = '_probe';
delete from public.gp_players  where nickname like 'cli-%';
```

## 四、排错手册

| 症状 | 原因 | 解决 |
|---|---|---|
| `42501 row-level security` on INSERT | 用了 upsert（`on_conflict` + `merge-duplicates`） | 改用「先插，409 再 PATCH」 |
| `404 Could not find the table` | 表还没建 | 执行第四节 SQL |
| `401 Invalid API key` | key 拼错 | 核对 publishable key |
| 查询 0 行但游戏明明玩过 | 看浏览器 Console 有没有 `[analytics]` 警告 | 按警告里的状态码对照本表 |
| 看板提示读取失败 | 聚合函数没建 / 未登录 | 检查 `select proname from pg_proc where proname like 'gp_%';` 应有 4 个函数 |
| 多人游戏进房后 Disconnected | Presence track 超上限 | 状态同步已全部改走 Broadcast，见第一节 |

## 五、完整建表 SQL（最新版，可整段执行）

```sql
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
```
