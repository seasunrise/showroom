#!/usr/bin/env python3
"""
宿舍大乱斗 — 多人实时对战游戏服务器
依赖: pip install aiohttp
运行: python server.py
加入: 浏览器打开 http://<本机IP>:8080
"""
import asyncio
import json
import random
import math
import time
import os
from aiohttp import web, WSMsgType

# ==================== 游戏常量 ====================
ARENA_W, ARENA_H = 800, 600
PLAYER_R = 16
PROJ_R = 7
PLAYER_SPEED = 230        # 像素/秒
PROJ_SPEED = 430
SHOOT_CD = 1.0  # 0.35           # 射击冷却（秒）
MAX_HP = 100
HIT_DMG = 10
PROJ_LIFE = 2.0           # 弹丸存活时间
PWR_INTERVAL = 14.0        # 道具刷新间隔
ROUND_END_DELAY = 8.0     # 回合结束后等待时间

# 玩家颜色池
COLORS = [
    '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
    '#a855f7', '#06b6d4', '#ec4899', '#84cc16',
    '#f97316', '#6366f1'
]

# 宿舍家具障碍物 [x, y, w, h]
OBSTACLES = [
    [100, 90, 110, 45],    # 上铺床
    [590, 90, 110, 45],
    [100, 465, 110, 45],   # 下铺床
    [590, 465, 110, 45],
    [340, 260, 120, 70],   # 书桌
    # 4 张椅子，围绕书桌摆放（座位障碍物）
    [380, 180, 40, 40],    # 椅·桌上方
    [380, 370, 40, 40],    # 椅·桌下方
    [260, 275, 40, 40],    # 椅·桌左侧
    [500, 275, 40, 40],    # 椅·桌右侧
]

# 出生点
SPAWNS = [
    (50, 50), (750, 50), (50, 550), (750, 550),
    (400, 50), (400, 550), (50, 300), (750, 300),
    (220, 220), (580, 380),
]


# ==================== 游戏对象 ====================
class Player:
    def __init__(self, pid, name, color):
        self.id = pid
        self.name = name[:12]
        self.color = color
        self.robot = False    # 由外部程序（机器人）加入时为 True
        self.x = 400
        self.y = 300
        self.vx = 0.0
        self.vy = 0.0
        self.health = MAX_HP
        self.alive = True
        self.score = 0
        self.shoot_cd = 0.0
        # 输入缓存
        self.idx = 0
        self.idy = 0
        self.imx = 400
        self.imy = 300
        self.ishoot = False
        # 道具增益
        self.shield_t = 0.0
        self.speed_t = 0.0
        self.rapid_t = 0.0
        # 击杀者
        self.last_hit_by = None

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'color': self.color,
            'x': round(self.x, 1), 'y': round(self.y, 1),
            'hp': max(0, self.health), 'alive': self.alive,
            'score': self.score,
            'robot': self.robot,
            'shield': round(self.shield_t, 1),
            'speed': round(self.speed_t, 1),
            'rapid': round(self.rapid_t, 1),
        }


class Projectile:
    def __init__(self, x, y, vx, vy, owner_id, owner_color, owner_name):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.owner = owner_id
        self.color = owner_color
        self.owner_name = owner_name
        self.life = PROJ_LIFE

    def to_dict(self):
        return {
            'x': round(self.x, 1), 'y': round(self.y, 1),
            'color': self.color,
        }


class PowerUp:
    def __init__(self, x, y, kind):
        self.x = x
        self.y = y
        self.kind = kind  # 'speed' / 'shield' / 'rapid'

    def to_dict(self):
        return {'x': round(self.x, 1), 'y': round(self.y, 1), 'kind': self.kind}


# ==================== 全局状态 ====================
players = {}        # pid -> Player
projectiles = []    # [Projectile]
powerups = []       # [PowerUp]
clients = {}        # pid -> WebSocketResponse
spectators = set()  # 观战者 pid：不生成玩家实体，只接收状态广播
pid_seq = 0         # pid 单调递增，避免有人离开后编号被复用
color_idx = 0
round_num = 0
round_active = False
round_end_timer = 0.0
powerup_timer = 0.0
kill_feed = []      # [(killer, victim, ts)]


# ==================== 工具函数 ====================
def assign_color():
    global color_idx
    c = COLORS[color_idx % len(COLORS)]
    color_idx += 1
    return c


def next_pid():
    """分配唯一连接编号。用单调计数，避免玩家离开后 pid 被复用（会导致编号冲突）。"""
    global pid_seq
    pid_seq += 1
    return 'p%d' % pid_seq


async def broadcast_info(text, exclude=None):
    """向所有连接广播系统提示（exclude 用于跳过自己）。"""
    for cid, c in clients.items():
        if cid != exclude and not c.closed:
            try:
                await c.send_json({'t': 'info', 'msg': text})
            except Exception:
                pass


def resolve_circle_rect(cx, cy, r, rx, ry, rw, rh):
    """圆 vs 矩形碰撞解算：若碰撞则返回修正后的 (cx, cy)，否则返回原值。"""
    closest_x = max(rx, min(cx, rx + rw))
    closest_y = max(ry, min(cy, ry + rh))
    dx = cx - closest_x
    dy = cy - closest_y
    dist = math.hypot(dx, dy)
    if dist < r and dist > 0.001:
        push = r - dist
        cx += dx / dist * push
        cy += dy / dist * push
    elif dist <= 0.001:
        # 圆心在矩形内，推到最近边
        left = cx - rx
        right = rx + rw - cx
        top = cy - ry
        bottom = ry + rh - cy
        m = min(left, right, top, bottom)
        if m == left:
            cx = rx - r
        elif m == right:
            cx = rx + rw + r
        elif m == top:
            cy = ry - r
        else:
            cy = ry + rh + r
    return cx, cy


def spawn_powerup():
    """在随机位置生成道具（避开障碍物）。"""
    for _ in range(20):
        x = random.uniform(40, ARENA_W - 40)
        y = random.uniform(40, ARENA_H - 40)
        ok = True
        for ox, oy, ow, oh in OBSTACLES:
            if ox - 20 <= x <= ox + ow + 20 and oy - 20 <= y <= oy + oh + 20:
                ok = False
                break
        if ok:
            kind = random.choice(['speed', 'shield', 'rapid'])
            powerups.append(PowerUp(x, y, kind))
            return


def start_round():
    """开始新回合：所有玩家复活并随机出生。"""
    global round_active, round_end_timer, powerup_timer, round_num
    round_num += 1
    round_active = True
    round_end_timer = 0.0
    # 清空弹丸和道具
    projectiles.clear()
    powerups.clear()
    # 出生点洗牌
    pts = SPAWNS[:]
    random.shuffle(pts)
    for i, p in enumerate(players.values()):
        if i < len(pts):
            p.x, p.y = pts[i]
        else:
            p.x = random.uniform(40, ARENA_W - 40)
            p.y = random.uniform(40, ARENA_H - 40)
        p.vx = 0
        p.vy = 0
        p.health = MAX_HP
        p.alive = True
        p.shoot_cd = 0
        p.shield_t = 0
        p.speed_t = 0
        p.rapid_t = 0
    powerup_timer = 3.0  # 3 秒后开始刷道具


# ==================== 游戏更新逻辑 ====================
def update(dt):
    global round_end_timer, powerup_timer, round_active

    # --- 更新玩家 ---
    for p in players.values():
        if not p.alive:
            continue

        # 道具计时
        p.shield_t = max(0, p.shield_t - dt)
        p.speed_t = max(0, p.speed_t - dt)
        p.rapid_t = max(0, p.rapid_t - dt)

        # 输入 → 加速度
        accel = 1400
        friction = 7.5
        cap = PLAYER_SPEED * (1.6 if p.speed_t > 0 else 1)

        p.vx += p.idx * accel * dt
        p.vy += p.idy * accel * dt
        # 摩擦
        f = math.exp(-friction * dt)
        p.vx *= f
        p.vy *= f
        # 限速
        sp = math.hypot(p.vx, p.vy)
        if sp > cap:
            p.vx = p.vx / sp * cap
            p.vy = p.vy / sp * cap

        # 移动
        p.x += p.vx * dt
        p.y += p.vy * dt

        # 墙壁碰撞
        p.x = max(PLAYER_R, min(ARENA_W - PLAYER_R, p.x))
        p.y = max(PLAYER_R, min(ARENA_H - PLAYER_R, p.y))

        # 障碍物碰撞
        for ox, oy, ow, oh in OBSTACLES:
            p.x, p.y = resolve_circle_rect(p.x, p.y, PLAYER_R, ox, oy, ow, oh)

        # 射击
        p.shoot_cd -= dt
        if p.ishoot and p.shoot_cd <= 0:
            cd = SHOOT_CD * (0.35 if p.rapid_t > 0 else 1)
            p.shoot_cd = cd
            dx = p.imx - p.x
            dy = p.imy - p.y
            d = math.hypot(dx, dy) or 1
            dx /= d
            dy /= d
            projectiles.append(Projectile(
                p.x + dx * (PLAYER_R + 3),
                p.y + dy * (PLAYER_R + 3),
                dx * PROJ_SPEED,
                dy * PROJ_SPEED,
                p.id, p.color, p.name
            ))

    # --- 更新弹丸 ---
    for proj in projectiles[:]:
        proj.x += proj.vx * dt
        proj.y += proj.vy * dt
        proj.life -= dt

        # 出界
        if proj.x < 0 or proj.x > ARENA_W or proj.y < 0 or proj.y > ARENA_H:
            projectiles.remove(proj)
            continue

        # 撞障碍物
        hit_obstacle = False
        for ox, oy, ow, oh in OBSTACLES:
            if ox <= proj.x <= ox + ow and oy <= proj.y <= oy + oh:
                hit_obstacle = True
                break
        if hit_obstacle:
            projectiles.remove(proj)
            continue

        # 撞玩家
        hit_player = False
        for p in players.values():
            if p.alive and p.id != proj.owner:
                if math.hypot(p.x - proj.x, p.y - proj.y) < PLAYER_R + PROJ_R:
                    if p.shield_t <= 0:
                        p.health -= HIT_DMG
                        p.last_hit_by = proj.owner
                        if p.health <= 0:
                            p.alive = False
                            killer = players.get(proj.owner)
                            kname = killer.name if killer else '未知'
                            kill_feed.append((kname, p.name, time.time()))
                            if killer:
                                killer.score += 1
                    hit_player = True
                    break
        if hit_player:
            projectiles.remove(proj)
            continue

        # 过期
        if proj.life <= 0:
            if proj in projectiles:
                projectiles.remove(proj)

    # --- 道具 ---
    powerup_timer -= dt
    if powerup_timer <= 0 and len(powerups) < 3:
        spawn_powerup()
        powerup_timer = PWR_INTERVAL

    # 拾取道具
    for pu in powerups[:]:
        for p in players.values():
            if p.alive and math.hypot(p.x - pu.x, p.y - pu.y) < PLAYER_R + 14:
                if pu.kind == 'speed':
                    p.speed_t = 5.0
                elif pu.kind == 'shield':
                    p.shield_t = 4.0
                elif pu.kind == 'rapid':
                    p.rapid_t = 5.0
                if pu in powerups:
                    powerups.remove(pu)
                break

    # --- 回合判定 ---
    alive_count = sum(1 for p in players.values() if p.alive)
    total_count = len(players)

    if round_active and total_count >= 2 and alive_count <= 1:
        round_active = False
        round_end_timer = ROUND_END_DELAY

    if round_end_timer > 0:
        round_end_timer -= dt
        if round_end_timer <= 0 and total_count >= 2:
            start_round()

    # 清理过期击杀提示
    now = time.time()
    kill_feed[:] = [k for k in kill_feed if now - k[2] < 5]


# ==================== 状态序列化 ====================
def get_state():
    return {
        't': 'state',
        'players': [p.to_dict() for p in players.values()],
        'projectiles': [pr.to_dict() for pr in projectiles],
        'powerups': [pu.to_dict() for pu in powerups],
        'obstacles': OBSTACLES,
        'round': round_num,
        'roundActive': round_active,
        'alive': sum(1 for p in players.values() if p.alive),
        'total': len(players),
        'killfeed': [{'killer': k, 'victim': v} for k, v, _ in kill_feed[-5:]],
        'winner': next((p.name for p in players.values() if p.alive), None) if not round_active and round_end_timer > 0 else None,
    }


# ==================== WebSocket 处理 ====================
async def ws_handler(request):
    # heartbeat=30：每 30 秒 ping 一次，防止 Nginx 等反代因空闲超时断开连接，
    # 同时能及时清理已死亡的连接
    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)

    # 连接时就用 ?spectate=1 表明身份，避免观战者被算进场上玩家
    # （否则观战者一连接就会被当成第 2 个玩家，误触发开局）
    is_spectator = request.query.get('spectate') in ('1', 'true', 'yes')

    pid = next_pid()
    name = '观众' if is_spectator else ('玩家' + pid[1:])
    color = assign_color()
    player = Player(pid, name, color)
    clients[pid] = ws
    if is_spectator:
        spectators.add(pid)
    else:
        players[pid] = player

    # 确认加入（还没收到 join 消息，先给个默认身份）
    await ws.send_json({'t': 'joined', 'id': pid, 'color': color, 'name': name,
                         'spectate': is_spectator, 'arena': [ARENA_W, ARENA_H]})

    # 如果场上人数 >= 2 且当前无回合，自动开始（观战者不计数）
    if len(players) >= 2 and not round_active and round_end_timer <= 0:
        start_round()

    # 处理消息
    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    mtype = data.get('t')

                    if mtype == 'join' and 'name' in data:
                        raw = str(data['name'])[:12] or name
                        if data.get('robot'):
                            # 外部程序接入的机器人：打标记 + [AI] 前缀，
                            # 让计分板、击杀提示、战场上都能一眼区分人机
                            player.robot = True
                            player.name = ('[AI]' + raw)[:12]
                        else:
                            player.name = raw
                        await ws.send_json({'t': 'nameok', 'name': player.name,
                                            'robot': player.robot})
                        act = '进入观战' if pid in spectators else '加入了房间'
                        await broadcast_info('%s %s' % (player.name, act), exclude=pid)

                    elif mtype == 'input':
                        if player.alive:
                            player.idx = max(-1, min(1, float(data.get('dx', 0))))
                            player.idy = max(-1, min(1, float(data.get('dy', 0))))
                            player.imx = max(0, min(ARENA_W, float(data.get('mx', 400))))
                            player.imy = max(0, min(ARENA_H, float(data.get('my', 300))))
                            player.ishoot = bool(data.get('shoot', False))

                    elif mtype == 'chat' and 'msg' in data:
                        text = str(data['msg'])[:80]
                        for cid, c in clients.items():
                            if not c.closed:
                                try:
                                    await c.send_json({'t': 'chat', 'name': player.name,
                                                       'color': player.color, 'msg': text})
                                except Exception:
                                    pass

                except (json.JSONDecodeError, ValueError, KeyError):
                    pass

            elif msg.type == WSMsgType.ERROR:
                break
    except Exception:
        pass
    finally:
        # 清理离线玩家 / 观战者
        if pid in players:
            del players[pid]
        spectators.discard(pid)
        if pid in clients:
            del clients[pid]
        await broadcast_info('%s 离开了房间' % player.name)

    return ws


# ==================== HTTP 页面 ====================
async def index_handler(request):
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            return web.Response(text=f.read(), content_type='text/html')
    except FileNotFoundError:
        return web.Response(text='<h1>index.html not found</h1><p>请确保 index.html 与 server.py 在同一目录</p>',
                           content_type='text/html')


# ==================== 游戏循环 ====================
async def game_loop():
    last = time.time()
    while True:
        now = time.time()
        dt = min(now - last, 0.05)
        last = now

        if players:
            update(dt)

        # 广播状态
        state = get_state()
        state_json = json.dumps(state, ensure_ascii=False, separators=(',', ':'))
        for cid in list(clients.keys()):
            c = clients.get(cid)
            if c and not c.closed:
                try:
                    await c.send_str(state_json)
                except Exception:
                    pass

        await asyncio.sleep(1 / 30)


# ==================== 主入口 ====================
async def on_startup(app):
    """服务器启动时开启游戏循环"""
    asyncio.ensure_future(game_loop())


def main():
    app = web.Application()
    app.router.add_get('/', index_handler)
    app.router.add_get('/ws', ws_handler)
    app.on_startup.append(on_startup)

    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8080))
    print()
    print('=' * 50)
    print('  宿舍大乱斗 — 游戏服务器已启动')
    print('  监听: %s:%d' % (host, port))
    if host in ('127.0.0.1', 'localhost'):
        # 只绑定回环时，外部（含局域网）都连不上，只能经 Nginx 访问
        print('  仅监听本机回环，外部请通过 Nginx 反代访问')
    else:
        print('  局域网加入地址:')
        # 尝试打印本机 IP
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            local_ip = s.getsockname()[0]
            s.close()
            print('  http://%s:%d' % (local_ip, port))
        except Exception:
            print('  http://<本机IP>:%d' % port)
        print('  本机: http://localhost:%d' % port)
    print('  Nginx 反代部署: 参考同目录 nginx.conf.example')
    print('=' * 50)
    print()

    web.run_app(app, host=host, port=port, print=None)


if __name__ == '__main__':
    main()
