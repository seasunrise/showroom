/* 网页游戏架构图解 — 所有动画与交互逻辑 */
(function () {
  'use strict';

  var css = getComputedStyle(document.documentElement);
  function v(name) { return css.getPropertyValue(name).trim(); }
  var ACCENT = v('--accent'), ACCENT2 = v('--accent2'), ACCENT3 = v('--accent3'), ACCENT4 = v('--accent4');

  /* ============================================================
   * 0. 滚动渐显
   * ========================================================== */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ============================================================
   * 1. 全景架构图：数据包沿连线流动
   * ========================================================== */
  (function heroPackets() {
    var paths = [
      { el: document.getElementById('w1'), dot: document.getElementById('pk1'), dur: 1400, gap: 600 },
      { el: document.getElementById('w2'), dot: document.getElementById('pk2'), dur: 2200, gap: 1400 },
      { el: document.getElementById('w3'), dot: document.getElementById('pk3'), dur: 1800, gap: 900 },
      { el: document.getElementById('w4'), dot: document.getElementById('pk4'), dur: 1000, gap: 1600 }
    ];
    paths.forEach(function (p) {
      if (!p.el || !p.dot) return;
      var len = p.el.getTotalLength();
      var t0 = performance.now() + Math.random() * 1000;
      (function anim(now) {
        var cycle = (now - t0) % (p.dur + p.gap);
        if (cycle < p.dur) {
          var pt = p.el.getPointAtLength((cycle / p.dur) * len);
          p.dot.setAttribute('cx', pt.x);
          p.dot.setAttribute('cy', pt.y);
          p.dot.setAttribute('opacity', '1');
        } else {
          p.dot.setAttribute('opacity', '0');
        }
        requestAnimationFrame(anim);
      })(performance.now());
    });
  })();

  /* ============================================================
   * 2. 迷你游戏：小蛇吃星星（Canvas + 键盘/触摸）
   *    —— 同时作为游戏循环监视器的数据源
   * ========================================================== */
  var game = (function miniGame() {
    var cv = document.getElementById('gameCanvas');
    if (!cv) return null;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;

    var player = { x: W / 2, y: H / 2, vx: 0, vy: 0, size: 16 };
    var star = { x: 200, y: 120, r: 9, pulse: 0 };
    var particles = [];
    var score = 0, ticks = 0, fps = 0;
    var keys = {};
    var frames = 0, lastFpsT = performance.now();
    var frameMs = 0, phase = '待机', phaseRatio = 0;

    function placeStar() {
      star.x = 40 + Math.random() * (W - 80);
      star.y = 40 + Math.random() * (H - 80);
    }

    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].indexOf(k) >= 0) {
        keys[k] = true; e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

    // 触摸 / 鼠标拖动
    var dragging = false, tx = 0, ty = 0;
    function setTarget(e) {
      var r = cv.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      tx = cx * (W / r.width); ty = cy * (H / r.height);
    }
    cv.addEventListener('pointerdown', function (e) { dragging = true; setTarget(e); });
    window.addEventListener('pointermove', function (e) { if (dragging) setTarget(e); });
    window.addEventListener('pointerup', function () { dragging = false; });

    var hudScore = document.getElementById('hudScore');
    var hudFps = document.getElementById('hudFps');
    var hudTicks = document.getElementById('hudTicks');

    function loop() {
      var t0 = performance.now();

      /* ---- 阶段 1：读取输入 ---- */
      phase = '① 读取输入'; phaseRatio = 0.15;
      var ax = 0, ay = 0;
      if (keys['arrowleft'] || keys['a']) ax -= 1;
      if (keys['arrowright'] || keys['d']) ax += 1;
      if (keys['arrowup'] || keys['w']) ay -= 1;
      if (keys['arrowdown'] || keys['s']) ay += 1;
      if (dragging) {
        var dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy) || 1;
        if (d > 6) { ax = dx / d; ay = dy / d; }
      }

      /* ---- 阶段 2：更新状态 ---- */
      phase = '② 更新状态'; phaseRatio = 0.5;
      var sp = 4.2;
      player.vx += (ax * sp - player.vx) * 0.25;
      player.vy += (ay * sp - player.vy) * 0.25;
      player.x = Math.max(player.size, Math.min(W - player.size, player.x + player.vx));
      player.y = Math.max(player.size, Math.min(H - player.size, player.y + player.vy));
      star.pulse += 0.08;

      if (Math.hypot(player.x - star.x, player.y - star.y) < player.size + star.r) {
        score += 10;
        for (var i = 0; i < 14; i++) {
          particles.push({ x: star.x, y: star.y, vx: (Math.random() - .5) * 7, vy: (Math.random() - .5) * 7, life: 1 });
        }
        placeStar();
      }
      particles = particles.filter(function (p) {
        p.x += p.vx; p.y += p.vy; p.life -= 0.03; return p.life > 0;
      });

      /* ---- 阶段 3：重新绘制 ---- */
      phase = '③ 重新绘制'; phaseRatio = 0.85;
      ctx.clearRect(0, 0, W, H);
      // 网格背景
      ctx.strokeStyle = 'rgba(140,160,255,0.07)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      // 星星
      var pr = star.r + Math.sin(star.pulse) * 3;
      ctx.fillStyle = ACCENT4;
      ctx.shadowColor = ACCENT4; ctx.shadowBlur = 18;
      ctx.beginPath();
      for (var s = 0; s < 10; s++) {
        var ang = -Math.PI / 2 + s * Math.PI / 5;
        var rr = s % 2 === 0 ? pr : pr * 0.45;
        var px = star.x + Math.cos(ang) * rr, py = star.y + Math.sin(ang) * rr;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      // 粒子
      ctx.shadowBlur = 0;
      particles.forEach(function (p) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = ACCENT4;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      // 玩家（小蛇 = 方块 + 眼睛）
      ctx.fillStyle = ACCENT;
      ctx.shadowColor = ACCENT; ctx.shadowBlur = 16;
      ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b1020';
      var ex = player.vx * 1.1, ey = player.vy * 1.1;
      ctx.fillRect(player.x - 5 + ex, player.y - 4 + ey, 3.5, 3.5);
      ctx.fillRect(player.x + 2 + ex, player.y - 4 + ey, 3.5, 3.5);

      frameMs = performance.now() - t0;
      phase = '待机（等待下一帧）'; phaseRatio = 1;

      /* ---- HUD ---- */
      ticks++; frames++;
      var now = performance.now();
      if (now - lastFpsT >= 500) {
        fps = Math.round(frames * 1000 / (now - lastFpsT));
        frames = 0; lastFpsT = now;
        if (hudFps) hudFps.textContent = fps;
      }
      if (hudScore) hudScore.textContent = score;
      if (hudTicks) hudTicks.textContent = ticks;

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return {
      get phase() { return phase; },
      get phaseRatio() { return phaseRatio; },
      get frameMs() { return frameMs; }
    };
  })();

  /* ---- 游戏循环心跳监视器 ---- */
  (function loopMonitor() {
    if (!game) return;
    var steps = [
      document.getElementById('lsInput'),
      document.getElementById('lsUpdate'),
      document.getElementById('lsRender')
    ];
    var fill = document.getElementById('tickFill');
    var hudPhase = document.getElementById('hudPhase');
    var hudMs = document.getElementById('hudFrameMs');
    var lastPhase = '';
    (function monitor() {
      var r = game.phaseRatio;
      if (fill) fill.style.width = (r * 100) + '%';
      var idx = r < 0.33 ? 0 : r < 0.66 ? 1 : r < 0.98 ? 2 : -1;
      steps.forEach(function (s, i) { if (s) s.classList.toggle('active', i === idx); });
      if (hudPhase && game.phase !== lastPhase) { hudPhase.textContent = game.phase; lastPhase = game.phase; }
      if (hudMs) hudMs.textContent = game.frameMs.toFixed(2);
      requestAnimationFrame(monitor);
    })();
  })();

  /* ============================================================
   * 3. 网络之旅模拟：逐行打印请求日志
   * ========================================================== */
  (function networkSim() {
    var btn = document.getElementById('btnNet');
    var reset = document.getElementById('btnNetReset');
    var log = document.getElementById('netlog');
    if (!btn || !log) return;
    var timer = null;

    var lines = [
      ['dim', '// 你在地址栏输入：you.github.io/my-game'],
      ['yellow', '① DNS 查询：github.io 的 IP 是多少？ → 185.199.108.153'],
      ['dim', '   （就像查通讯录：把名字翻译成电话号码）'],
      ['yellow', '② 建立 HTTPS 加密连接… ✔ 完成'],
      ['blue', '③ GET /my-game/index.html        → 200 OK   (3.2 KB)'],
      ['blue', '④ GET /my-game/style.css         → 200 OK   (1.8 KB)'],
      ['blue', '⑤ GET /my-game/game.js           → 200 OK   (12.6 KB)'],
      ['blue', '⑥ GET /my-game/hero.svg          → 200 OK   (4.1 KB)'],
      ['pink', '⑦ 浏览器开始执行 JavaScript → 游戏循环启动！'],
      ['', '🎮 渲染第 1 帧… 总耗时 0.42 秒，游戏已就绪']
    ];

    btn.addEventListener('click', function () {
      if (timer) return;
      log.innerHTML = '';
      var i = 0;
      timer = setInterval(function () {
        if (i >= lines.length) { clearInterval(timer); timer = null; return; }
        var s = document.createElement('span');
        if (lines[i][0]) s.className = lines[i][0];
        s.textContent = lines[i][1] + '\n';
        log.appendChild(s);
        i++;
      }, 450);
    });
    reset.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; }
      log.innerHTML = '<span class="dim">// 点击按钮，观看一次完整的网络请求…</span>';
    });
  })();

  /* ============================================================
   * 4. Supabase 实时同步模拟：拖动 A 屏幕，B 屏幕跟随
   * ========================================================== */
  (function supaDemo() {
    var me = document.getElementById('mePlayer');
    var ghost = document.getElementById('ghostPlayer');
    var screenA = document.getElementById('screenA');
    var tagMe = document.getElementById('tagMe');
    var tagGhost = document.getElementById('tagGhost');
    var pipe = document.getElementById('supaPipe');
    if (!me || !ghost) return;

    var dragging = false;
    var pos = { x: 30, y: 70 };
    var ghostPos = { x: 30, y: 70 };
    var ghostTarget = { x: 30, y: 70 };
    var pingTimer = null;

    function clamp(vv, max) { return Math.max(0, Math.min(max, vv)); }

    function render() {
      me.style.left = pos.x + 'px'; me.style.top = pos.y + 'px';
      tagMe.style.left = (pos.x + 11) + 'px'; tagMe.style.top = (pos.y + 26) + 'px';
      ghost.style.left = ghostPos.x + 'px'; ghost.style.top = ghostPos.y + 'px';
      tagGhost.style.left = (ghostPos.x + 11) + 'px'; tagGhost.style.top = (ghostPos.y + 26) + 'px';
    }

    function moveGhost(e) {
      var r = screenA.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      pos.x = clamp(cx - 11, r.width - 22);
      pos.y = clamp(cy - 11, r.height - 22);
      // 模拟网络延迟 80ms 后，服务器把坐标推给玩家 B
      var snap = { x: pos.x, y: pos.y };
      setTimeout(function () { ghostTarget = snap; }, 80);
      if (pipe) {
        pipe.textContent = '⇡ 发送坐标 {x:' + Math.round(pos.x) + ', y:' + Math.round(pos.y) +
          '} → Supabase Realtime → 推送给玩家 B ✔';
      }
      if (pingTimer) clearTimeout(pingTimer);
      pingTimer = setTimeout(function () {
        if (pipe) pipe.textContent = 'WebSocket 通道待命… 拖动试试看';
      }, 1500);
    }

    me.addEventListener('pointerdown', function (e) {
      dragging = true; me.setPointerCapture(e.pointerId); moveGhost(e);
    });
    me.addEventListener('pointermove', function (e) { if (dragging) moveGhost(e); });
    me.addEventListener('pointerup', function () { dragging = false; });

    // 让"朋友"平滑地滑向目标位置（模拟插值动画）
    (function ghostLerp() {
      ghostPos.x += (ghostTarget.x - ghostPos.x) * 0.15;
      ghostPos.y += (ghostTarget.y - ghostPos.y) * 0.15;
      render();
      requestAnimationFrame(ghostLerp);
    })();
  })();

  /* ============================================================
   * 5. SQL 查询动画：逐行高亮命中的记录
   * ========================================================== */
  (function sqlDemo() {
    var btn = document.getElementById('btnSql');
    var out = document.getElementById('sqlResult');
    if (!btn || !out) return;
    var running = false;

    btn.addEventListener('click', function () {
      if (running) return;
      running = true;
      document.querySelectorAll('.dbtable tr').forEach(function (tr) { tr.classList.remove('hit'); });
      out.textContent = '// 数据库正在扫描 scores 表…';

      var scoreRows = document.querySelectorAll('.dbtable')[1].querySelectorAll('tr[data-pid]');
      var i = 0;
      (function step() {
        if (i > 0) scoreRows[i - 1].classList.remove('hit');
        if (i < scoreRows.length) {
          var tr = scoreRows[i];
          tr.classList.add('hit');
          var pid = tr.getAttribute('data-pid');
          out.textContent = '// 第 ' + (i + 1) + ' 行：player_id=' + pid + ' → 去 players 表查昵称…';
          document.querySelectorAll('.dbtable')[0]
            .querySelectorAll('tr[data-pid="' + pid + '"]')
            .forEach(function (p) { p.classList.add('hit'); });
          i++;
          setTimeout(step, 900);
        } else {
          document.querySelectorAll('.dbtable')[0]
            .querySelectorAll('tr[data-pid]')
            .forEach(function (p) { p.classList.remove('hit'); });
          out.innerHTML = '查询结果：🥇 <b style="color:' + ACCENT3 + '">小夜 — 9800 分</b> · 🥈 阿梨 — 4100 分 · 🥉 阿梨 — 3200 分';
          running = false;
        }
      })();
    });
  })();

  /* ============================================================
   * 6. 事件循环动画：任务从队列移动到调用栈
   * ========================================================== */
  (function eventLoopAnim() {
    var task = document.getElementById('movingTask');
    var label = document.getElementById('movingLabel');
    var stack = document.getElementById('stackBox');
    var status = document.getElementById('stackStatus');
    var queue = document.getElementById('queueTasks');
    if (!task || !queue) return;

    var jobs = [
      { text: '🖱 点击事件', color: '#4cc9f0' },
      { text: '⏱ 定时器到点', color: '#f72585' },
      { text: '🌐 网络数据到达', color: '#80ed99' }
    ];
    var MOVE_MS = 900, WORK_MS = 1100, REST_MS = 500;
    var idx = 0, t0 = performance.now(), phaseN = 0; // 0=移动 1=执行 2=休息

    var rect = task.querySelector('rect');

    function frame(now) {
      var el = now - t0;
      if (phaseN === 0) {
        var job = jobs[idx];
        rect.setAttribute('fill', job.color);
        label.textContent = job.text;
        task.setAttribute('opacity', '1');
        var r = Math.min(1, el / MOVE_MS);
        var ease = 1 - Math.pow(1 - r, 3);
        var x = 80 + ease * (440 - 80);   // 队列 → 调用栈
        var y = 80 + ease * (107 - 80);
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        label.setAttribute('x', x + 70); label.setAttribute('y', y + 17);
        status.textContent = '从队列取出任务…';
        stack.style.stroke = '';
        if (el >= MOVE_MS) { phaseN = 1; t0 = now; }
      } else if (phaseN === 1) {
        status.textContent = '⚙ 正在执行：' + jobs[idx].text;
        stack.style.stroke = jobs[idx].color;
        stack.style.filter = 'drop-shadow(0 0 8px ' + jobs[idx].color + ')';
        if (el >= WORK_MS) {
          phaseN = 2; t0 = now;
          task.setAttribute('opacity', '0');
          stack.style.filter = '';
          stack.style.stroke = '';
          status.textContent = '✔ 执行完毕，引擎空闲，取下一件…';
        }
      } else if (el >= REST_MS) {
        // 队列轮转：把第一个任务移到最后，模拟出队
        var children = queue.children;
        if (children.length >= 6) {
          var firstRect = children[0], firstText = children[1];
          queue.appendChild(firstRect); queue.appendChild(firstText);
          var items = [];
          for (var i = 0; i < children.length; i += 2) items.push([children[i], children[i + 1]]);
          items.forEach(function (pair, k) {
            pair[0].setAttribute('y', 80 + k * 34);
            pair[1].setAttribute('y', 97 + k * 34);
          });
        }
        idx = (idx + 1) % jobs.length;
        phaseN = 0; t0 = now;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ============================================================
   * 7. 拆台实验：开关 CSS / JS
   * ========================================================== */
  (function labDemo() {
    var widget = document.getElementById('labWidget');
    var tglCss = document.getElementById('tglCss');
    var tglJs = document.getElementById('tglJs');
    var btn = document.getElementById('labBtn');
    var countEl = document.getElementById('labCount');
    var status = document.getElementById('labStatus');
    if (!widget || !tglCss) return;

    var count = 0;
    function updateStatus() {
      var css = tglCss.checked, js = tglJs.checked;
      if (css && js) status.textContent = '✔ 四件套齐全：好看又能点。';
      else if (!css && js) status.textContent = '🎨 CSS 已拆：功能还在，但"皮肤"没了 —— 按钮变回浏览器默认的朴素样式。';
      else if (css && !js) status.textContent = '🧠 JS 已拆：皮肤还在，但按钮点了没反应 —— 大脑宕机了。';
      else status.textContent = '💀 只剩 HTML 骨架：一堆不会动也不好看的标签。';
    }
    tglCss.addEventListener('change', function () {
      widget.classList.toggle('styled', tglCss.checked);
      updateStatus();
    });
    tglJs.addEventListener('change', updateStatus);
    btn.addEventListener('click', function () {
      if (!tglJs.checked) {
        status.textContent = '🧠 JS 已拆：点击事件无人处理，计数字段永远停在这里。';
        return;
      }
      count++;
      countEl.textContent = count;
    });
  })();

})();
