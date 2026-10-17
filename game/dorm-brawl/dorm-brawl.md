# 宿舍大乱斗代码讲解（初学者版）

我会按照“**先看全貌 → 再拆细节 → 最后教你改**”的顺序讲。别急着一次看完，可以先跳到你最想懂的部分。

---

## 一、先搞懂：这游戏是怎么跑起来的？

这个游戏有两个文件，分工非常明确：

| 文件         | 角色            | 干什么                                                |
| ------------ | --------------- | ----------------------------------------------------- |
| `server.py`  | **裁判 + 大脑** | 保存所有玩家位置、血量，计算谁被打中，谁死了，谁赢    |
| `index.html` | **画师 + 手**   | 把服务器传来的数据画成画面，把你的按键/鼠标传给服务器 |

**为什么不能只用 `index.html`？**

假设玩家 A 和玩家 B 打，如果 A 的电脑自己算“我打中了 B”，那 A 就能作弊（改代码说自己永远打中）。所以**所有判定都由服务器做**，客户端只负责“显示”和“输入”。

它们之间的通信叫 **WebSocket**，你可以理解成“**服务器和浏览器之间的一条实时电话线**”：两边随时可以互相发消息，而不是“我问一句你答一句”。

```
玩家按 W  ──► 浏览器发 {t:'input', dy:-1}  ──► 服务器
服务器算出你往上移动了 5 像素
服务器每秒 30 次广播  {t:'state', players:[...]}  ──► 所有浏览器
浏览器收到后画出来
```

---

## 二、服务器端 `server.py` 讲解

### 2.1 常量区（最上面那一堆大写字母）

```python
ARENA_W, ARENA_H = 800, 600
PLAYER_SPEED = 230
SHOOT_CD = 0.35
HIT_DMG = 20
```

**这是游戏最舒服的调参区**。你想改游戏手感，第一站就来这里。

- `ARENA_W` = 地图宽 800 像素
- `PLAYER_SPEED` = 玩家最大速度 230 像素/秒
- `SHOOT_CD` = 每 0.35 秒才能射一发
- `HIT_DMG` = 每发子弹打掉 20 点血（所以 5 发打死一个人）

### 2.2 三个“类”：Player / Projectile / PowerUp

**类**可以理解成“**模板**”，用来批量造对象。

```python
class Player:
    def __init__(self, pid, name, color):
        self.id = pid
        self.x = 400
        self.y = 300
        self.health = MAX_HP
        self.alive = True
        ...
```

`__init__` 是“创建这个对象时会自动执行的函数”。每来一个玩家，就 `Player('p1', '小明', '#ef4444')` 造一个。

`to_dict()` 方法的作用是：**把对象转成字典，方便变成 JSON 发给浏览器**。

```python
def to_dict(self):
    return {
        'id': self.id, 'name': self.name,
        'x': round(self.x, 1), 'y': round(self.y, 1),
        'hp': max(0, self.health), 'alive': self.alive,
        ...
    }
```

### 2.3 全局状态：所有“活的数据”放这里

```python
players = {}        # pid -> Player 对象
projectiles = []    # 所有子弹
powerups = []       # 地上所有道具
clients = {}        # pid -> WebSocket 连接
```

`{}` 是字典（键值对），`[]` 是列表。这两个是 Python 里最常用的“装东西的容器”。

### 2.4 工具函数：解决具体小问题

#### `resolve_circle_rect` —— 圆和矩形碰撞

玩家是个圆，床/桌子是矩形。玩家撞到床要“被推出来”，这个函数就干这事。

思路（**这个思路值得记住**）：
1. 找到矩形上离圆心最近的点
2. 算圆心到这个点的距离
3. 如果距离 < 半径，说明撞上了 → 把圆心往外推

```python
closest_x = max(rx, min(cx, rx + rw))   # 夹在矩形 x 范围内
closest_y = max(ry, min(cy, ry + rh))
dist = math.hypot(dx, dy)
if dist < r:
    push = r - dist
    cx += dx / dist * push    # 往外推
```

#### `start_round` —— 开始新回合

洗牌出生点 → 每个玩家随机分一个位置 → 血量回满 → 清空子弹和道具。

```python
pts = SPAWNS[:]        # [:] 是复制一份，不改原列表
random.shuffle(pts)    # 打乱顺序
```

### 2.5 核心：`update(dt)` 每帧更新

**这是整个服务器的心脏。** 它每秒被调用 30 次，每次传入 `dt`（距离上次过了多少秒，约 0.033）。

它依次做这些事：

**① 移动每个活着的玩家**

```python
p.vx += p.idx * accel * dt    # 加速度
f = math.exp(-friction * dt)  # 摩擦（让速度慢慢衰减）
p.vx *= f
p.x += p.vx * dt              # 位置 = 位置 + 速度 × 时间
```

这就是最基础的**物理模拟**：输入 → 加速度 → 速度 → 位置。摩擦让手感不“滑冰”。

**② 撞墙 / 撞床**

```python
p.x = max(PLAYER_R, min(ARENA_W - PLAYER_R, p.x))  # 卡在地图内
for ox, oy, ow, oh in OBSTACLES:
    p.x, p.y = resolve_circle_rect(p.x, p.y, PLAYER_R, ox, oy, ow, oh)
```

**③ 射击**

```python
if p.ishoot and p.shoot_cd <= 0:
    cd = SHOOT_CD * (0.35 if p.rapid_t > 0 else 1)   # 连发道具减 CD
    p.shoot_cd = cd
    dx = p.imx - p.x      # 鼠标位置 - 玩家位置 = 瞄准方向
    dy = p.imy - p.y
    d = math.hypot(dx, dy) or 1
    dx /= d; dy /= d      # 归一化：变成单位向量（长度=1）
    projectiles.append(Projectile(..., dx * PROJ_SPEED, dy * PROJ_SPEED, ...))
```

**归一化**很关键：`dx/d` 让方向向量长度变成 1，再乘以速度，就是“朝这个方向以固定速度飞”。

**④ 更新子弹**

```python
proj.x += proj.vx * dt
proj.y += proj.vy * dt
proj.life -= dt
```

然后检查：出界了？撞床了？撞玩家了？过期了？任何一种都让子弹消失。

**⑤ 判定命中和死亡**

```python
if math.hypot(p.x - proj.x, p.y - proj.y) < PLAYER_R + PROJ_R:
    if p.shield_t <= 0:      # 有盾就免伤
        p.health -= HIT_DMG
        if p.health <= 0:
            p.alive = False
            killer.score += 1
            kill_feed.append((kname, p.name, time.time()))
```

**⑥ 刷道具 / 拾取道具**

```python
if powerup_timer <= 0 and len(powerups) < 3:
    spawn_powerup()
    powerup_timer = PWR_INTERVAL
```

**⑦ 判断回合结束**

```python
alive_count = sum(1 for p in players.values() if p.alive)
if round_active and total_count >= 2 and alive_count <= 1:
    round_active = False
    round_end_timer = ROUND_END_DELAY   # 4 秒后开下一局
```

### 2.6 `ws_handler` —— 处理每个玩家的连接

每个浏览器连上来，就进入这个函数。流程：

```python
pid = 'p%d' % (len(players) + 1)      # 分配一个 id
player = Player(pid, name, color)
players[pid] = player
clients[pid] = ws

await ws.send_json({'t': 'joined', 'id': pid, ...})   # 告诉客户端"你叫啥"
```

然后进入一个循环 `async for msg in ws:`，不断收消息：

```python
if mtype == 'input':       # 收到输入
    player.idx = ...
    player.imx = ...
elif mtype == 'chat':      # 收到聊天
    广播给所有人
```

最后 `finally` 块里：玩家断线就删掉他。

### 2.7 `game_loop` —— 主循环

```python
async def game_loop():
    last = time.time()
    while True:
        now = time.time()
        dt = min(now - last, 0.05)    # 最大 0.05，防止卡顿跳帧
        last = now
        if players:
            update(dt)
        # 把状态广播给所有人
        for cid in clients:
            await clients[cid].send_str(state_json)
        await asyncio.sleep(1 / 30)   # 每秒 30 次
```

`async` / `await` 是 Python 的**异步编程**，可以理解成“**等待的时候去做别的事**”。初学阶段你只需要知道：这里的 `await` 让服务器能同时处理多个玩家，不卡。

---

## 三、客户端 `index.html` 讲解

HTML 文件分三块：**结构**（HTML）、**样式**（CSS）、**逻辑**（JS）。

### 3.1 两个界面

- `#joinScreen`：输入昵称和 IP
- `#gameScreen`：游戏本体

点“加入战斗”后，用 JS 把第一个隐藏、第二个显示出来。

### 3.2 关键 HTML 元素

```html
<canvas id="canvas" width="800" height="600"></canvas>
```

`<canvas>` 是**画布**，所有玩家、子弹、道具都画在这上面。

```html
<div class="hp-bar-wrap"><div class="hp-bar" id="myHpBar"></div></div>
```

血条是一个外框 + 一个内层彩色条，改内层 `width` 就能变长短。

### 3.3 JS 主干

#### 连接服务器

```javascript
ws = new WebSocket('ws://' + ip + ':8080/ws');
ws.onopen = function () {
    ws.send(JSON.stringify({ t: 'join', name: name }));
    joinScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    startLoops();
};
ws.onmessage = function (e) {
    handleMessage(JSON.parse(e.data));
};
```

`onopen` = 连接成功时执行，`onmessage` = 收到消息时执行。

#### 消息分发

```javascript
function handleMessage(data) {
    switch (data.t) {
        case 'joined': myId = data.id; ... break;
        case 'state':  onState(data);      break;
        case 'chat':   addChat(...);       break;
    }
}
```

`switch` 就是“看 `data.t` 是什么，就走哪个分支”。

#### 渲染循环 `render()`

```javascript
function render() {
    // 1. 算时间差 dt
    // 2. 更新粒子
    // 3. 画背景 + 网格
    // 4. 画障碍物、道具、子弹、玩家
    // 5. 请求下一帧
    requestAnimationFrame(render);
}
```

`requestAnimationFrame(render)` 的意思是：“**浏览器，等你准备好下一帧，就再调用一次 render**”——通常一秒 60 次。

#### 画一个玩家（`drawPlayers` 里）

```javascript
ctx.fillStyle = p.color;
ctx.beginPath();
ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);   // 画圆
ctx.fill();
```

Canvas 画图三步走：**选颜色 → 开始路径 → 画 → 填充**。

眼睛还会根据鼠标位置偏移：

```javascript
var dx = mouse.x - p.x, dy = mouse.y - p.y;
var d = Math.hypot(dx, dy) || 1;
var ex = dx / d * 5, ey = dy / d * 5;   // 眼睛向鼠标方向偏 5 像素
```

#### 发送输入

```javascript
function sendInput() {
    var dx = 0, dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }   // 斜着走不超速
    ws.send(JSON.stringify({
        t: 'input', dx: dx, dy: dy,
        mx: mouse.x, my: mouse.y, shoot: mouse.down
    }));
}
setInterval(sendInput, 1000 / 30);   // 每秒 30 次
```

`0.7071` 是 `√2/2`——如果同时按 W 和 D，方向是 (1,1)，长度是 1.414。乘上 0.7071 就变成单位长度，斜着走不会更快。

#### 更新 HUD

```javascript
bar.style.width = (hpPct * 100) + '%';
bar.style.background = hpPct > 0.5 ? 'var(--green)' : ...;
```

`? :` 是三元运算符：`条件 ? 真时的值 : 假时的值`。

---

## 四、一次“射击命中”的完整旅程

把两边串起来看：

1. 你按下鼠标 → `mouse.down = true`
2. `sendInput` 发 `{t:'input', shoot:true, mx, my}` 给服务器
3. 服务器 `ws_handler` 收到，存进 `player.ishoot`
4. `update` 里检测到 `p.ishoot`，生成一颗 `Projectile`
5. 子弹每帧移动，检查是否撞到别人
6. 撞到 → 扣血 → 血量 ≤0 → `alive=False` → 加击杀提示
7. `get_state()` 打包所有信息
8. 广播给所有人
9. 你的浏览器 `onState` 收到 → `render` 画出粒子、血条变化、击杀提示

**理解这条链，你就理解了整个游戏。**

---

## 五、动手练习（从易到难）

### ⭐ 练习 1：改数值，感受手感

打开 `server.py`，改这些：

```python
PLAYER_SPEED = 400      # 飞一样快
SHOOT_CD = 0.1          # 射速变成机枪
HIT_DMG = 50            # 两枪一个
MAX_HP = 300            # 血厚如牛
```

重启服务器（`Ctrl+C` 后重新 `python server.py`），刷新浏览器，感受区别。

**目的**：建立“数值 → 手感”的直觉。

### ⭐⭐ 练习 2：改地图

`OBSTACLES` 里每个是 `[x, y, 宽, 高]`：

```python
OBSTACLES = [
    [100, 90, 110, 45],
    [590, 90, 110, 45],
    [100, 465, 110, 45],
    [590, 465, 110, 45],
    [340, 260, 120, 70],
]
```

试着加一个：

```python
[350, 100, 100, 30],   # 加一个横着的桌子
```

如果想让客户端也显示新障碍物，还得改 `index.html` 里的 `labels`：

```javascript
var labels = ['床', '床', '床', '床', '桌', '桌'];
```

### ⭐⭐ 练习 3：加一种新道具

**服务器端**：

1. 在 `spawn_powerup` 里加进随机池：
   ```python
   kind = random.choice(['speed', 'shield', 'rapid', 'heal'])
   ```
2. 在 `update` 的拾取逻辑里加：
   ```python
   elif pu.kind == 'heal':
       p.health = min(MAX_HP, p.health + 40)
   ```

**客户端**：

1. 加图标和颜色：
   ```javascript
   var icons  = { speed:'速', shield:'盾', rapid:'连', heal:'血' };
   var colors = { speed:'#f59e0b', shield:'#4f6df5', rapid:'#ef4444', heal:'#22c55e' };
   ```

**目的**：走一遍“数据从服务器到画面”的完整流程。

### ⭐⭐⭐ 练习 4：加音效

在 `index.html` 里放一个 `<audio>` 或直接用 Web Audio API：

```javascript
function playHit() {
    var a = new AudioContext();
    var o = a.createOscillator();
    o.frequency.value = 880;
    o.connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.1);
}
```

在 `onState` 里检测到自己掉血时调用 `playHit()`。

### ⭐⭐⭐ 练习 5：加新武器

在服务器 `Player` 里加 `weapon = 'pistol'`，`update` 里根据武器改 `PROJ_SPEED`、`SHOOT_CD`、`HIT_DMG`。再做个“武器道具”让玩家换枪。

---

## 六、初学建议

1. **一次只改一个东西**，改完就重启测试。不要一口气改十个地方。
2. **善用 `console.log`（浏览器 F12）和 `print`（服务器终端）** 看数据。
3. **看不懂某段代码就先跳过**，先把“输入 → 更新 → 渲染”这条主线搞懂，其它都是细节。
4. **画个时序图**：谁先动、谁后动、谁通知谁。你会惊讶地发现很多东西一下就通了。

---

## 七、术语小词典

| 术语                        | 一句话解释                                 |
| --------------------------- | ------------------------------------------ |
| **类 / 对象**               | 类 = 模板，对象 = 用模板造出来的东西       |
| **`dt`**                    | 距上一帧过了多少秒，让运动速度不受帧率影响 |
| **归一化**                  | 把向量长度变成 1，只保留方向               |
| **WebSocket**               | 浏览器和服务器之间全双工的实时通道         |
| **JSON**                    | 一种“两边都能读”的数据格式                 |
| **`async/await`**           | Python 的异步写法，等的时候去干别的        |
| **`requestAnimationFrame`** | 让浏览器在下次重绘前调用你的函数           |
| **权威服务器**              | 所有判定由服务器做，客户端不能作弊         |

---

如果哪一段你想更深入（比如“异步到底是啥”、“碰撞检测数学怎么推”），告诉我，我再单独展开讲。
