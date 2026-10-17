#!/usr/bin/env python3
"""
宿舍大乱斗 — 机器人示例（最小可运行版）

给同学写 AI 的入门脚本：直接跑起来就能以「机器人」身份加入战局，
和浏览器里的真人玩家人机大战；同时开多个机器人就是机器人之间的互殴。

============================================================
一、怎么跑
============================================================
1) 先启动游戏服务器（另开一个终端）：
       python server.py

2) 再启动机器人（可同时开多个终端跑多个机器人）：
       python bot.py --name 机器人小明
       python bot.py --name 机器人小红

   连公网 / Nginx 反代时指定地址（注意 wss 和子路径前缀）：
       python bot.py --name 机器人小明 --url wss://moodi.yao.cl/demo/game/dorm-brawl/ws

   只想先看协议、不动手：
       python bot.py --name 旁观 --passive

   默认已经比真人慢（速度 0.5、每 2 秒开一枪），想更慢/更快就调参数：
       python bot.py --name 慢吞吞 --speed 0.3 --shoot-interval 3
       python bot.py --name 快枪手 --speed 1.0 --shoot-interval 1

   依赖：aiohttp（和服务器同一个 requirements.txt，装过就不用再装）

============================================================
二、通信协议速查（WebSocket，消息都是 JSON 文本）
============================================================
连上 /ws 之后，服务器与你的机器人互发 JSON。

服务器 → 机器人：
  {"t":"joined","id":"p3","color":"#22c55e","name":"玩家3",
              "arena":[800,600]}
      连上后立刻收到，id 就是你在房间里的编号。

  {"t":"nameok","name":"[AI] 机器人小明","robot":true}
      服务器确认你的改名（机器人会自动加 [AI] 前缀）。

  {"t":"state", ...}            ← 每 1/30 秒来一次，游戏全部信息都在这里
      "players":     [{"id","name","color","x","y","hp","alive","score",
                       "shield","speed","rapid","robot"}, ...]
      "projectiles": [{"x","y","color"}, ...]      空中的子弹
      "powerups":    [{"x","y","kind"}, ...]       地上的道具
                     kind ∈ "speed"(加速) / "shield"(护盾) / "rapid"(连发)
      "obstacles":   [[x,y,w,h], ...]              床、桌子等障碍物（矩形）
      "round":       第几回合
      "roundActive": 本回合是否进行中
      "alive" / "total": 存活人数 / 总人数
      "killfeed":    [{"killer","victim"}, ...]
      "winner":      回合结束时的赢家名字

  {"t":"info","msg":"..."}           系统提示
  {"t":"chat","name","color","msg"}  别人发的聊天

机器人 → 服务器：
  {"t":"join","name":"机器人小明","robot":true}
      报名/改名。robot:true 表示这是机器人，网页上会显示 🤖 和 [AI] 前缀。

  {"t":"input","dx":0,"dy":0,"mx":400,"my":300,"shoot":false}
      告诉服务器你这一帧的操作（每收到一次 state 发一次即可）：
        dx, dy : 移动方向，-1 ~ 1（左负右正，上负下正）
        mx, my : 瞄准的“坐标”（战场像素坐标，不是方向！服务器朝这个点射击）
        shoot  : 是否开火，True=按住不放（受 0.35 秒冷却限制）

  {"t":"chat","msg":"..."}      发聊天

============================================================
三、战场坐标系
============================================================
原点 (0,0) 在左上角：x 向右增大，y 向下增大，战场 800 x 600。
玩家半径 16；子弹 430 像素/秒；中一枪 -20 血；满血 100。
============================================================

============================================================
四、你要改的只有 think() 一个函数
============================================================
think(st, me) 里根据当前局面返回 (dx, dy, mx, my, shoot)。
下面是一个「会追人、会开枪、会捡道具、残血会跑」的简单 AI，
照抄改着玩就行。

注意：think() 只管「想干什么」，真正下发前框架会统一处理两件事——
按 --speed 缩放移动快慢、按 --shoot-interval 控制开火频率，
所以你不用在 think() 里自己操心这两件事。
"""

import argparse
import asyncio
import json
import math
import time

import aiohttp

DEFAULT_URL = 'ws://127.0.0.1:8080/ws'

# 默认节奏：比真人慢一些，方便观察和学习，可用启动参数覆盖
DEFAULT_SPEED = 0.5           # 移动速度系数：1.0 = 满速，越小越慢
DEFAULT_SHOOT_INTERVAL = 2.0  # 射击间隔（秒）：越大越慢
SHOOT_HOLD = 0.2              # 扣扳机的保持时长，确保服务器能收到 shoot=True


class BotState:
    """把服务器发来的原始 dict 包一层，取值更方便。"""

    def __init__(self, data):
        self.players = data.get('players', [])
        self.projectiles = data.get('projectiles', [])
        self.powerups = data.get('powerups', [])
        self.obstacles = data.get('obstacles', [])
        self.round_active = data.get('roundActive', False)

    def me(self, my_id):
        for p in self.players:
            if p['id'] == my_id:
                return p
        return None

    def enemies(self, my_id):
        return [p for p in self.players if p['id'] != my_id and p['alive']]

    def nearest_powerup(self, x, y, radius=280):
        """返回半径内最近的道具，没有则 None。"""
        best, best_d = None, radius
        for pu in self.powerups:
            d = math.hypot(pu['x'] - x, pu['y'] - y)
            if d < best_d:
                best, best_d = pu, d
        return best


def think(st, me):
    """你的 AI 大脑：返回 (dx, dy, mx, my, shoot)。

    想写自己的 AI，就改这一个函数。
    """
    x, y, hp = me['x'], me['y'], me['hp']
    enemies = st.enemies(me['id'])

    # 没有活着的敌人 → 原地待命
    if not enemies:
        return 0.0, 0.0, x, y, False

    # 选目标：距离近 + 血少 的优先（越近越好打，残血的先收割）
    target = min(enemies, key=lambda p: math.hypot(p['x'] - x, p['y'] - y) + p['hp'] * 2)
    tx, ty = target['x'], target['y']
    dist = math.hypot(tx - x, ty - y) or 1.0

    # ---- 移动策略 ----
    if hp <= 40:
        # 残血：优先跑去捡道具（有护盾/加速最好），没道具就远离目标
        pu = st.nearest_powerup(x, y)
        if pu:
            dx, dy = pu['x'] - x, pu['y'] - y
        else:
            dx, dy = x - tx, y - ty
    elif dist < 180:
        # 贴得太近：后撤一点，避免互相撞脸
        dx, dy = x - tx, y - ty
    else:
        # 正常：朝目标靠拢，保持约 200 像素的射击距离
        dx, dy = tx - x, ty - y

    # 加一点侧向绕圈，走位别太呆（避免直线冲锋被预判）
    ang = math.atan2(ty - y, tx - x) + 0.4
    dx += math.cos(ang) * 60
    dy += math.sin(ang) * 60

    d = math.hypot(dx, dy) or 1.0
    dx, dy = dx / d, dy / d              # 归一化到 -1 ~ 1

    # ---- 瞄准 ----
    # 简单预判：按目标当前朝向提前一点点（子弹有飞行时间）
    mx, my = tx, ty

    # ---- 开火 ----
    shoot = dist < 480                    # 在射程内就一直开火

    return dx, dy, mx, my, shoot


async def run_bot(url, name, passive, speed=DEFAULT_SPEED,
                  shoot_interval=DEFAULT_SHOOT_INTERVAL):
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url, heartbeat=20) as ws:
            my_id = None
            last_shot = 0.0
            print('[bot] 已连接：%s' % url)
            print('[bot] 移动速度系数 %.2f · 射击间隔 %.1f 秒' % (speed, shoot_interval))

            # 第一步：报名加入（robot:true 让别人知道你是 AI）
            await ws.send_json({'t': 'join', 'name': name, 'robot': True})

            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    t = data.get('t')

                    if t == 'joined':
                        my_id = data['id']
                        print('[bot] 我是 %s，战场 %s' % (my_id, data.get('arena')))

                    elif t == 'state' and my_id:
                        st = BotState(data)
                        me = st.me(my_id)
                        if me is None:
                            continue
                        if passive or not me['alive']:
                            # 观战模式 / 已阵亡：站着别动
                            await ws.send_json({'t': 'input', 'dx': 0, 'dy': 0,
                                                'mx': me['x'], 'my': me['y'],
                                                'shoot': False})
                            continue
                        dx, dy, mx, my, shoot = think(st, me)

                        # 放慢移动：按系数缩放方向向量（服务器按这个力度给加速度）
                        dx, dy = dx * speed, dy * speed

                        # 放慢射击：每隔 shoot_interval 秒才扣一次扳机，
                        # 并保持 SHOOT_HOLD 秒，避免和服务器 30fps 的更新节奏错过
                        now = time.monotonic()
                        if shoot and now - last_shot >= shoot_interval:
                            last_shot = now
                        firing = shoot and (now - last_shot) < SHOOT_HOLD

                        await ws.send_json({'t': 'input', 'dx': round(dx, 3),
                                            'dy': round(dy, 3),
                                            'mx': mx, 'my': my, 'shoot': firing})

                elif msg.type in (aiohttp.WSMsgType.CLOSED,
                                  aiohttp.WSMsgType.ERROR):
                    print('[bot] 与服务器断开')
                    break


def main():
    ap = argparse.ArgumentParser(description='宿舍大乱斗机器人示例')
    ap.add_argument('--url', default=DEFAULT_URL,
                    help='WebSocket 地址，默认 %s' % DEFAULT_URL)
    ap.add_argument('--name', default='机器人', help='机器人名字')
    ap.add_argument('--passive', action='store_true', help='观战模式：只加入不动手')
    ap.add_argument('--speed', type=float, default=DEFAULT_SPEED,
                    help='移动速度系数 0~1，越小越慢（默认 %.2f）' % DEFAULT_SPEED)
    ap.add_argument('--shoot-interval', type=float, default=DEFAULT_SHOOT_INTERVAL,
                    help='射击间隔秒数，越大越慢（默认 %.1f）' % DEFAULT_SHOOT_INTERVAL)
    args = ap.parse_args()

    try:
        asyncio.run(run_bot(args.url, args.name, args.passive,
                            max(0.0, min(1.0, args.speed)), args.shoot_interval))
    except KeyboardInterrupt:
        print('\n[bot] 已退出')
    except aiohttp.ClientConnectorError as e:
        print('[bot] 连不上服务器：%s\n      请先运行 python server.py，'
              '或用 --url 指定正确地址\n      %s' % (args.url, e))


if __name__ == '__main__':
    main()
