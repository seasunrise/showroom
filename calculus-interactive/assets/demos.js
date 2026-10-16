// assets/demos.js — 微积分交互演示（Canvas）
(function () {
  'use strict';

  var style = getComputedStyle(document.documentElement);
  var C = {
    accent: style.getPropertyValue('--accent').trim() || '#4f6df5',
    accent2: style.getPropertyValue('--accent2').trim() || '#22b8a6',
    ink: style.getPropertyValue('--ink').trim() || '#1a2233',
    muted: style.getPropertyValue('--muted').trim() || '#5a6478',
    rule: style.getPropertyValue('--rule').trim() || '#dfe5f0'
  };
  var FONT_NUM = '12px "JetBrainsMono", monospace';
  var FONT_CN = '12px "PingFang SC","Microsoft YaHei",sans-serif';

  // ---------- 公共工具 ----------
  function setup(canvas, w, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.aspectRatio = w + ' / ' + h;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function plot(ctx, rect, xr, yr) {
    return {
      X: function (v) { return rect.x + (v - xr[0]) / (xr[1] - xr[0]) * rect.w; },
      Y: function (v) { return rect.y + rect.h - (v - yr[0]) / (yr[1] - yr[0]) * rect.h; },
      rect: rect, xr: xr, yr: yr
    };
  }

  function grid(ctx, p, xStep, yStep) {
    ctx.save();
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    ctx.font = FONT_NUM;
    ctx.fillStyle = C.muted;
    var i, v;
    for (v = Math.ceil(p.xr[0] / xStep) * xStep; v <= p.xr[1] + 1e-9; v += xStep) {
      ctx.globalAlpha = v === 0 ? 0.9 : 0.45;
      ctx.beginPath();
      ctx.moveTo(p.X(v), p.rect.y);
      ctx.lineTo(p.X(v), p.rect.y + p.rect.h);
      ctx.stroke();
      if (v !== 0) ctx.fillText(fmt(v), p.X(v) - 6, p.rect.y + p.rect.h + 14);
    }
    for (v = Math.ceil(p.yr[0] / yStep) * yStep; v <= p.yr[1] + 1e-9; v += yStep) {
      ctx.globalAlpha = v === 0 ? 0.9 : 0.45;
      ctx.beginPath();
      ctx.moveTo(p.rect.x, p.Y(v));
      ctx.lineTo(p.rect.x + p.rect.w, p.Y(v));
      ctx.stroke();
      if (v !== 0) ctx.fillText(fmt(v), p.rect.x - 24, p.Y(v) + 4);
    }
    ctx.restore();
  }

  function fmt(v) {
    return (Math.round(v * 100) / 100).toString();
  }

  function curve(ctx, p, fn, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var n = 160;
    for (var i = 0; i <= n; i++) {
      var t = p.xr[0] + (p.xr[1] - p.xr[0]) * i / n;
      var y = fn(t);
      if (!isFinite(y)) continue;
      var px = p.X(t), py = p.Y(y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function line(ctx, p, x1, y1, x2, y2, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(p.X(x1), p.Y(y1));
    ctx.lineTo(p.X(x2), p.Y(y2));
    ctx.stroke();
    ctx.restore();
  }

  function dot(ctx, p, x, y, color, r) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.X(x), p.Y(y), r || 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function label(ctx, p, x, y, text, color, dx, dy) {
    ctx.save();
    ctx.font = FONT_CN;
    ctx.fillStyle = color;
    var px = p.X(x) + (dx || 8), py = p.Y(y) + (dy || -8);
    ctx.fillText(text, px, py);
    ctx.restore();
  }

  function panelTitle(ctx, x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 13px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 指针事件 → 画布 CSS 坐标
  function pointerPos(canvas, e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas._w / r.width, y: (e.clientY - r.top) * canvas._h / r.height };
  }

  function inRect(pos, rect) {
    return pos.x >= rect.x - 6 && pos.x <= rect.x + rect.w + 6 &&
           pos.y >= rect.y - 10 && pos.y <= rect.y + rect.h + 10;
  }

  // ================= 演示 1：平均速度 → 瞬时速度 =================
  (function () {
    var canvas = document.getElementById('d1');
    if (!canvas) return;
    var W = 640, H = 380;
    canvas._w = W; canvas._h = H;
    var ctx = setup(canvas, W, H);
    var rect = { x: 46, y: 16, w: W - 62, h: H - 44 };
    var p = plot(ctx, rect, [-0.2, 4.4], [-1, 17.5]);
    var s = function (t) { return t * t; };
    var T0 = 2;

    var slider = document.getElementById('d1-dt');
    var outDt = document.getElementById('d1-dt-val');
    var outV = document.getElementById('d1-v-val');

    function avgV(dt) { return (s(T0 + dt) - s(T0)) / dt; }

    function render() {
      var dt = parseFloat(slider.value);
      ctx.clearRect(0, 0, W, H);
      grid(ctx, p, 1, 4);

      // 目标切线（Δt→0）
      line(ctx, p, T0 - 1.35, s(T0) - 1.35 * 4, T0 + 1.35, s(T0) + 1.35 * 4, C.accent2, 2, [6, 5]);

      // 割线
      var tB = T0 + dt;
      var slope = avgV(dt);
      var ext = Math.min(1.4, dt + 0.25);
      line(ctx, p, T0 - ext, s(T0) - ext * slope, tB + ext, s(T0) + ext * slope, C.accent, 2.5);

      curve(ctx, p, s, C.ink, 2.5);

      // Δt / Δs 虚线
      line(ctx, p, T0, s(T0), tB, s(T0), C.muted, 1.5, [4, 4]);
      line(ctx, p, tB, s(T0), tB, s(tB), C.muted, 1.5, [4, 4]);
      ctx.save();
      ctx.font = FONT_CN;
      ctx.fillStyle = C.muted;
      ctx.fillText('Δt', p.X(T0 + dt / 2) - 8, p.Y(s(T0)) + 16);
      ctx.fillText('Δs', p.X(tB) + 6, p.Y(s(T0) + s(tB) / 2));
      ctx.restore();

      dot(ctx, p, T0, s(T0), C.ink);
      dot(ctx, p, tB, s(tB), C.accent);
      label(ctx, p, T0, s(T0), 'A', C.ink, -18, -6);
      label(ctx, p, tB, s(tB), 'B', C.accent, 10, -6);

      panelTitle(ctx, 56, 30, '位移 s(t) = t²', C.ink);

      outDt.textContent = fmt(dt);
      outV.textContent = fmt(slope) + ' m/s';
    }

    slider.addEventListener('input', render);
    render();
  })();

  // ================= 演示 2：切线与导函数 =================
  (function () {
    var canvas = document.getElementById('d2');
    if (!canvas) return;
    var W = 640, H = 470;
    canvas._w = W; canvas._h = H;
    var ctx = setup(canvas, W, H);

    var fns = [
      { name: '抛物线', f: function (x) { return x * x / 5; }, df: function (x) { return 2 * x / 5; } },
      { name: '正弦波', f: function (x) { return 2 * Math.sin(x) + x / 2; }, df: function (x) { return 2 * Math.cos(x) + 0.5; } },
      { name: '三次曲线', f: function (x) { return x * x * x / 20 - x; }, df: function (x) { return 3 * x * x / 20 - 1; } }
    ];
    var fIdx = 0, x = 0.9;

    var pTop = plot(ctx, { x: 46, y: 16, w: W - 62, h: 250 }, [-4.3, 4.3], [-3.6, 3.6]);
    var pBot = plot(ctx, { x: 46, y: 316, w: W - 62, h: 118 }, [-4.3, 4.3], [-3.6, 3.6]);

    var outX = document.getElementById('d2-x');
    var outF = document.getElementById('d2-f');
    var outDf = document.getElementById('d2-df');

    function render() {
      var fn = fns[fIdx];
      ctx.clearRect(0, 0, W, H);
      grid(ctx, pTop, 2, 2);
      grid(ctx, pBot, 2, 2);

      // 上：f 与切线
      curve(ctx, pTop, fn.f, C.ink, 2.5);
      var m = fn.df(x), y0 = fn.f(x);
      line(ctx, pTop, x - 1.6, y0 - 1.6 * m, x + 1.6, y0 + 1.6 * m, C.accent, 2.5);
      dot(ctx, pTop, x, y0, C.accent);
      line(ctx, pTop, x, pTop.yr[0], x, y0, C.muted, 1, [3, 4]);
      panelTitle(ctx, 56, 32, 'f(x)　拖动曲线上的点试试', C.ink);

      // 下：f' 曲线与当前点
      curve(ctx, pBot, fn.df, C.accent2, 2);
      ctx.save();
      ctx.globalAlpha = 0.25;
      line(ctx, pBot, x, pBot.yr[0], x, fn.df(x), C.accent2, 1.5, [3, 4]);
      ctx.restore();
      dot(ctx, pBot, x, fn.df(x), C.accent2);
      panelTitle(ctx, 56, 306, "f′(x)　切线的斜率被'记录'在这里", C.accent2);

      outX.textContent = fmt(x);
      outF.textContent = fmt(y0);
      outDf.textContent = fmt(m);
    }

    // 指针交互
    var dragging = false;
    function setFromEvent(e) {
      var pos = pointerPos(canvas, e);
      if (!inRect(pos, pTop.rect)) return;
      x = Math.max(-4, Math.min(4, (pos.x - pTop.rect.x) / pTop.rect.w * 8.6 - 4.3));
      render();
    }
    canvas.addEventListener('pointerdown', function (e) { dragging = true; canvas.setPointerCapture(e.pointerId); setFromEvent(e); });
    canvas.addEventListener('pointermove', function (e) { if (dragging) setFromEvent(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });

    var btns = document.querySelectorAll('#d2-fns button');
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        fIdx = i;
        btns.forEach(function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        render();
      });
    });

    render();
  })();

  // ================= 演示 3：s–v–a 三联图 =================
  (function () {
    var canvas = document.getElementById('d3');
    if (!canvas) return;
    var W = 640, H = 450;
    canvas._w = W; canvas._h = H;
    var ctx = setup(canvas, W, H);

    var A = 3; // 加速度 3 m/s²
    var s = function (t) { return A * t * t / 2; };
    var v = function (t) { return A * t; };
    var a = function () { return A; };

    var pS = plot(ctx, { x: 46, y: 22, w: W - 62, h: 108 }, [-0.15, 5.2], [-1.5, 19]);
    var pV = plot(ctx, { x: 46, y: 180, w: W - 62, h: 108 }, [-0.15, 5.2], [-1.5, 19]);
    var pA = plot(ctx, { x: 46, y: 338, w: W - 62, h: 78 }, [-0.15, 5.2], [-1.5, 19]);

    var t = 2.4;
    var outT = document.getElementById('d3-t');
    var outS = document.getElementById('d3-s');
    var outV = document.getElementById('d3-v');
    var outA = document.getElementById('d3-a');

    function render() {
      ctx.clearRect(0, 0, W, H);
      grid(ctx, pS, 1, 6);
      grid(ctx, pV, 1, 6);
      grid(ctx, pA, 1, 6);

      curve(ctx, pS, s, C.accent, 2.5);
      curve(ctx, pV, v, C.accent2, 2.5);
      // a(t) 水平线
      ctx.save();
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(pA.X(0), pA.Y(A)); ctx.lineTo(pA.X(5), pA.Y(A)); ctx.stroke();
      ctx.restore();

      // 时间游标
      [pS, pV, pA].forEach(function (p) {
        line(ctx, p, t, p.yr[0], t, p.yr[1], C.muted, 1, [4, 4]);
      });

      // s 面板：切线（斜率 = v）
      var mS = v(t);
      line(ctx, pS, t - 0.75, s(t) - 0.75 * mS, t + 0.75, s(t) + 0.75 * mS, C.accent, 1.8, [5, 4]);

      // v 面板：切线（斜率 = a）
      line(ctx, pV, t - 0.7, v(t) - 0.7 * A, t + 0.7, v(t) + 0.7 * A, C.accent2, 1.8, [5, 4]);

      dot(ctx, pS, t, s(t), C.accent);
      dot(ctx, pV, t, v(t), C.accent2);
      dot(ctx, pA, t, A, C.muted);

      panelTitle(ctx, 56, 14, '位置 s(t) —— 虚线切线的斜率就是此刻的速度', C.accent);
      panelTitle(ctx, 56, 172, '速度 v(t) —— 斜率恒为 a', C.accent2);
      panelTitle(ctx, 56, 330, '加速度 a(t) = 3 m/s²（常数）', C.muted);

      outT.textContent = fmt(t) + ' s';
      outS.textContent = fmt(s(t)) + ' m';
      outV.textContent = fmt(v(t)) + ' m/s';
      outA.textContent = A + ' m/s²';
    }

    function setFromEvent(e) {
      var pos = pointerPos(canvas, e);
      if (!inRect(pos, pS.rect) && !inRect(pos, pV.rect) && !inRect(pos, pA.rect)) return;
      t = Math.max(0, Math.min(5, (pos.x - pS.rect.x) / pS.rect.w * 5.35 - 0.15));
      render();
    }
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) { dragging = true; canvas.setPointerCapture(e.pointerId); setFromEvent(e); });
    canvas.addEventListener('pointermove', function (e) { if (dragging) setFromEvent(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });

    render();
  })();

  // ================= 演示 4：黎曼和 → 积分 =================
  (function () {
    var canvas = document.getElementById('d4');
    if (!canvas) return;
    var W = 640, H = 360;
    canvas._w = W; canvas._h = H;
    var ctx = setup(canvas, W, H);
    var rect = { x: 46, y: 16, w: W - 62, h: H - 44 };
    var p = plot(ctx, rect, [-0.2, 5.3], [-1.2, 16.5]);
    var v = function (t) { return 3 * t; };
    var EXACT = 37.5;

    var slider = document.getElementById('d4-n');
    var outN = document.getElementById('d4-n-val');
    var outSum = document.getElementById('d4-sum');
    var outErr = document.getElementById('d4-err');

    function render() {
      var n = parseInt(slider.value, 10);
      var dt = 5 / n;
      var sum = 0;
      ctx.clearRect(0, 0, W, H);
      grid(ctx, p, 1, 4);

      // 曲线下淡色面积
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.X(0), p.Y(0));
      for (var i = 0; i <= 120; i++) {
        var tt = 5 * i / 120;
        ctx.lineTo(p.X(tt), p.Y(v(tt)));
      }
      ctx.lineTo(p.X(5), p.Y(0));
      ctx.closePath();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = C.accent;
      ctx.fill();
      ctx.restore();

      // 矩形（中点）
      for (var k = 0; k < n; k++) {
        var tm = (k + 0.5) * dt;
        var h = v(tm);
        sum += h * dt;
        var x0 = p.X(k * dt), x1 = p.X((k + 1) * dt), y1 = p.Y(h);
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = C.accent2;
        ctx.fillRect(x0, y1, x1 - x0, p.Y(0) - y1);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x0, y1, x1 - x0, p.Y(0) - y1);
        ctx.restore();
      }

      curve(ctx, p, v, C.accent, 2.5);

      panelTitle(ctx, 56, 30, '速度 v(t) = 3t —— 矩形总面积 ≈ 曲线下面积 = 路程', C.ink);

      outN.textContent = n;
      outSum.textContent = fmt(sum) + ' m';
      outErr.textContent = fmt(Math.abs(sum - EXACT)) + ' m';
    }

    slider.addEventListener('input', render);
    render();
  })();
})();
