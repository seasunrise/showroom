/* =========================================================
   高数在车间 · Workshop Calculus
   Canvas 演示引擎：9 个课程演示 + 首页机构动画
   所有绘图单位为 CSS 像素，高清屏缩放由 app.js 处理
   ========================================================= */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const C = {
    ink: '#18213d',
    body: '#4d5159',
    muted: '#7c7568',
    faint: '#a89a88',
    line: '#cdbda6',
    lineSoft: 'rgba(24,33,61,.12)',
    teal: '#0f8b8d',
    tealSoft: 'rgba(15,139,141,.14)',
    amber: '#b85f28',
    amberSoft: 'rgba(184,95,40,.13)',
    gold: '#b98a3a',
    card: '#faf4e8',
    paper: '#f6eddd'
  };
  const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,"PingFang SC",monospace';
  const COND = '"Barlow Semi Condensed","PingFang SC",sans-serif';

  /* ---------------- 基础绘图工具 ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v, d = 1) => {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
    return v.toFixed(d);
  };

  function txt(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.fillStyle = o.color || C.muted;
    ctx.font = `${o.weight || 400} ${o.size || 10}px ${o.mono === false ? COND : MONO}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2, color, width = 1, dash) {
    ctx.save();
    ctx.strokeStyle = color || C.line;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function circle(ctx, x, y, r, o = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1; ctx.stroke(); }
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, width = 1.6, head = 7) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = color || C.ink;
    ctx.fillStyle = color || C.ink;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42));
    ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spring(ctx, x1, x2, y, coils = 9, amp = 11, color = C.ink, width = 1.5) {
    const len = x2 - x1;
    if (len < 8) return;
    const lead = Math.min(16, len * 0.12);
    const a = x1 + lead, b = x2 - lead;
    const step = (b - a) / coils;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(a, y);
    for (let i = 0; i < coils; i++) {
      const bx = a + step * i;
      ctx.lineTo(bx + step * 0.26, y - amp);
      ctx.lineTo(bx + step * 0.74, y + amp);
    }
    ctx.lineTo(b, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  function hatch(ctx, x, y, w, h, color, gap = 8) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = color || C.lineSoft;
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += gap) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cross(ctx, x, y, r, color) {
    line(ctx, x - r, y, x + r, y, color || C.muted, 1);
    line(ctx, x, y - r, x, y + r, color || C.muted, 1);
  }

  /* 三通道波形图：x / v / a 同屏 */
  function bands(ctx, box, o) {
    const { x, y, w, h } = box;
    const padL = 40, padR = 12, padT = 8, padB = 18;
    const iw = w - padL - padR;
    const ih = h - padT - padB;
    const bandH = ih / o.series.length;
    const X = v => x + padL + (v / TAU) * iw;
    const markers = [];
    ctx.save();
    ctx.strokeStyle = 'rgba(24,33,61,.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + padL, y + padT, iw, ih);
    for (let i = 1; i < o.series.length; i++) {
      line(ctx, x + padL, y + padT + bandH * i, x + padL + iw, y + padT + bandH * i, 'rgba(24,33,61,.07)');
    }
    o.series.forEach((s, idx) => {
      const top = y + padT + bandH * idx;
      let mn = Infinity, mx = -Infinity;
      s.pts.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); });
      const span = (mx - mn) || 1;
      const Y = v => top + bandH - 8 - ((v - mn) / span) * (bandH - 16);
      txt(ctx, s.label, x + padL - 8, top + bandH / 2, { size: 9.5, color: s.color, align: 'right' });
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.8;
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      s.pts.forEach((p, i) => {
        const px = X(p[0]), py = Y(p[1]);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
      markers.push({ Y, color: s.color, pts: s.pts });
    });
    // 时间轴
    [0, Math.PI, TAU].forEach((v, i) => {
      const px = X(v);
      txt(ctx, i === 0 ? '0' : (i === 1 ? 'π' : '2π'), px, y + h - 7, { size: 8.5, align: 'center' });
    });
    if (o.cursor !== undefined) {
      const px = X(((o.cursor % TAU) + TAU) % TAU);
      line(ctx, px, y + padT, px, y + padT + ih, C.ink, 1, [3, 3]);
      markers.forEach(m => {
        // 线性插值取值
        const t = ((o.cursor % TAU) + TAU) % TAU;
        const arr = m.pts;
        let idx = arr.findIndex(p => p[0] >= t);
        if (idx < 0) idx = arr.length - 1;
        const p1 = arr[Math.max(0, idx - 1)], p2 = arr[idx];
        const k = p2[0] === p1[0] ? 0 : (t - p1[0]) / (p2[0] - p1[0]);
        const val = p1[1] + (p2[1] - p1[1]) * clamp(k, 0, 1);
        circle(ctx, px, m.Y(val), 3, { fill: m.color });
      });
    }
    ctx.restore();
  }

  /* 坐标图 */
  function plot(ctx, box, cfg) {
    const { x, y, w, h } = box;
    const padL = cfg.padL ?? 40, padR = cfg.padR ?? 12;
    let padT = cfg.padT ?? 10, padB = cfg.padB ?? 30;
    // 舞台很矮（横屏手机）时收紧上下留白，保证曲线至少可读
    if (h - padT - padB < 20) { padT = Math.min(padT, 6); padB = Math.min(padB, 22); }
    const iw = w - padL - padR, ih = h - padT - padB;
    if (iw < 20 || ih < 20) return null;
    const xr = cfg.xRange, yr = cfg.yRange;
    const X = v => x + padL + (v - xr[0]) / (xr[1] - xr[0]) * iw;
    const Y = v => y + padT + ih - (v - yr[0]) / (yr[1] - yr[0]) * ih;
    const xTicks = cfg.xTicks || [0, 0.25, 0.5, 0.75, 1].map(k => xr[0] + (xr[1] - xr[0]) * k);
    const yTicks = cfg.yTicks || [0, 0.25, 0.5, 0.75, 1].map(k => yr[0] + (yr[1] - yr[0]) * k);
    const xf = cfg.xFmt || (v => fmt(v, 0));
    const yf = cfg.yFmt || (v => fmt(v, 0));

    ctx.save();
    // 网格
    ctx.strokeStyle = 'rgba(24,33,61,.075)';
    ctx.lineWidth = 1;
    xTicks.forEach(v => line(ctx, X(v), y + padT, X(v), y + padT + ih, 'rgba(24,33,61,.075)'));
    yTicks.forEach(v => line(ctx, x + padL, Y(v), x + padL + iw, Y(v), 'rgba(24,33,61,.075)'));
    // 坐标轴
    line(ctx, x + padL, y + padT, x + padL, y + padT + ih, 'rgba(24,33,61,.42)', 1);
    line(ctx, x + padL, y + padT + ih, x + padL + iw, y + padT + ih, 'rgba(24,33,61,.42)', 1);
    // 刻度文字
    xTicks.forEach(v => txt(ctx, xf(v), X(v), y + padT + ih + 12, { size: 8.5, align: 'center', color: C.faint }));
    yTicks.forEach(v => txt(ctx, yf(v), x + padL - 7, Y(v), { size: 8.5, align: 'right', color: C.faint }));
    if (cfg.xLabel) txt(ctx, cfg.xLabel, x + padL + iw, y + h - 4, { size: 8.5, align: 'right', color: C.muted });
    if (cfg.yLabel) txt(ctx, cfg.yLabel, x + padL, y + 1, { size: 8.5, color: C.muted });

    // 参考线
    (cfg.vLines || []).forEach(l => {
      line(ctx, X(l.v), y + padT, X(l.v), y + padT + ih, l.color || C.line, l.width || 1, l.dash || [4, 4]);
    });
    (cfg.hLines || []).forEach(l => {
      line(ctx, x + padL, Y(l.v), x + padL + iw, Y(l.v), l.color || C.line, l.width || 1, l.dash || [4, 4]);
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + padL, y + padT, iw, ih);
    ctx.clip();
    (cfg.series || []).forEach(s => {
      if (!s.pts || s.pts.length < 2) return;
      if (s.fill) {
        ctx.beginPath();
        s.pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
        ctx.lineTo(X(s.pts[s.pts.length - 1][0]), Y(s.fillTo ?? yr[0]));
        ctx.lineTo(X(s.pts[0][0]), Y(s.fillTo ?? yr[0]));
        ctx.closePath();
        ctx.fillStyle = s.fillColor || 'rgba(15,139,141,.14)';
        ctx.fill();
      }
      ctx.beginPath();
      s.pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.8;
      if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.restore();

    // 点
    (cfg.dots || []).forEach(d => {
      circle(ctx, X(d.x), Y(d.y), d.r || 4, { fill: d.color || C.teal, stroke: C.card, width: 1.5 });
    });
    // 竖向游标
    (cfg.markers || []).forEach(m => {
      line(ctx, X(m.x), y + padT, X(m.x), y + padT + ih, m.color || C.ink, 1, [3, 3]);
    });
    ctx.restore();
    return { X, Y };
  }

  /* 收拢图表下沿，给舞台左下角的暂停/复位按钮让位 */
  function fitBox(b, H) {
    b.h = Math.max(56, Math.min(b.h, H - 46 - b.y));
    return b;
  }

  /* 通用：机体坐标系文字 */
  function tag(ctx, s, x, y, color, size = 8.5) {
    txt(ctx, s, x, y, { size, color: color || C.muted });
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* 齿轮 */
  function gear(ctx, cx, cy, z, m, rot, o = {}) {
    const rp = z * m / 2;
    const ra = rp + m * 0.95;
    const rf = Math.max(2, rp - m * 1.1);
    const pitch = TAU / z;
    const halfRoot = pitch * 0.30, halfTip = pitch * 0.17;
    const fill = o.fill || C.card;
    const ink = o.ink || C.ink;
    ctx.save();
    ctx.translate(cx, cy);
    // 轮齿
    ctx.beginPath();
    for (let i = 0; i < z; i++) {
      const a = rot + i * pitch;
      const p1x = Math.cos(a - halfRoot) * rf, p1y = Math.sin(a - halfRoot) * rf;
      const p2x = Math.cos(a - halfTip) * ra, p2y = Math.sin(a - halfTip) * ra;
      const p3x = Math.cos(a + halfTip) * ra, p3y = Math.sin(a + halfTip) * ra;
      const p4x = Math.cos(a + halfRoot) * rf, p4y = Math.sin(a + halfRoot) * rf;
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // 轮体
    circle(ctx, 0, 0, rf, { fill, stroke: ink, width: 1.2 });
    // 辐板
    const hub = Math.max(7, rp * 0.16);
    if (z >= 22) {
      ctx.strokeStyle = 'rgba(24,33,61,.28)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const a = rot + k * TAU / 5;
        line(ctx, Math.cos(a) * hub, Math.sin(a) * hub, Math.cos(a) * (rf - 5), Math.sin(a) * (rf - 5), 'rgba(24,33,61,.28)', 1);
      }
    }
    circle(ctx, 0, 0, hub, { fill: C.paper, stroke: ink, width: 1.2 });
    circle(ctx, 0, 0, hub * 0.42, { stroke: ink, width: 1 });
    cross(ctx, 0, 0, 4, 'rgba(24,33,61,.5)');
    ctx.restore();
    return rp;
  }

  function rotArrow(ctx, cx, cy, r, a0, a1, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const dir = a1 > a0 ? 1 : -1;
    ctx.arc(cx, cy, r, a0, a1, dir < 0);
    ctx.stroke();
    const ax = cx + r * Math.cos(a1), ay = cy + r * Math.sin(a1);
    const tang = a1 + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + 7 * Math.cos(tang - 0.5), ay + 7 * Math.sin(tang - 0.5));
    ctx.lineTo(ax + 7 * Math.cos(tang + 0.5), ay + 7 * Math.sin(tang + 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     01 曲柄滑块
     ========================================================= */
  function crankDemo() {
    const state = { rpm: 24, r: 40, ratio: 4, theta: 0, dragging: false, t: 0 };
    const L = () => state.r * state.ratio;
    const w = () => state.rpm * TAU / 60;

    function vel(theta) {
      const r = state.r, Lv = L(), s = Math.sin(theta), c = Math.cos(theta);
      const root = Math.sqrt(Math.max(1e-9, Lv * Lv - r * r * s * s));
      return (-r * s - (r * r * s * c) / root) * w();
    }
    function pos(theta) {
      const r = state.r, Lv = L(), s = Math.sin(theta);
      return r * Math.cos(theta) + Math.sqrt(Math.max(1e-9, Lv * Lv - r * r * s * s));
    }
    function acc(theta) {
      const e = 1e-4;
      return (vel(theta + e) - vel(theta - e)) / (2 * e) * w();
    }

    return {
      state,
      step(dt) {
        state.t += dt;
        if (!state.dragging) state.theta = (state.theta + w() * dt) % TAU;
      },
      draw(ctx, W, H) {
        const th = state.theta, r = state.r, Lv = L();
        const mechH = H * 0.52;
        const trackY = Math.max(96, mechH * 0.56);
        const scale = Math.min((W * 0.72) / (Lv + 2 * r), (mechH * 0.52) / (2 * r));
        const ox = W * 0.13;
        const sx = ox + pos(th) * scale;
        const pinX = ox + r * Math.cos(th) * scale;
        const pinY = trackY - r * Math.sin(th) * scale;

        // 轨道
        line(ctx, ox - r * scale - 26, trackY + 20, ox + (Lv + r) * scale + 34, trackY + 20, 'rgba(24,33,61,.5)', 1.2);
        hatch(ctx, ox - r * scale - 26, trackY + 20, (Lv + 2 * r) * scale + 60, 9, 'rgba(24,33,61,.18)', 7);
        // 机架
        circle(ctx, ox, trackY, 4, { fill: C.ink });
        line(ctx, ox, trackY, ox, trackY + 20, 'rgba(24,33,61,.5)', 1.2);

        // 曲柄圆
        circle(ctx, ox, trackY, r * scale, { stroke: 'rgba(24,33,61,.28)', width: 1, });
        ctx.save();
        ctx.setLineDash([3, 4]);
        circle(ctx, ox, trackY, r * scale, { stroke: 'rgba(24,33,61,.22)', width: 1 });
        ctx.restore();
        // 曲柄
        line(ctx, ox, trackY, pinX, pinY, C.ink, 6);
        circle(ctx, ox, trackY, 8, { fill: C.card, stroke: C.ink, width: 1.4 });
        circle(ctx, pinX, pinY, 5.5, { fill: C.teal, stroke: C.card, width: 1.4 });
        // 连杆
        line(ctx, pinX, pinY, sx, trackY, C.ink, 8);
        line(ctx, pinX, pinY, sx, trackY, C.card, 4);
        circle(ctx, sx, trackY, 4, { fill: C.ink });
        // 滑块
        ctx.save();
        roundedRect(ctx, sx - 22, trackY - 15, 44, 30, 2);
        ctx.fillStyle = C.card; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.restore();
        line(ctx, sx - 13, trackY, sx + 13, trackY, 'rgba(24,33,61,.35)', 1);
        // 尺寸标注
        const dimY = trackY + 48;
        line(ctx, ox, dimY, sx, dimY, 'rgba(24,33,61,.45)', 1);
        arrow(ctx, ox + 16, dimY, ox, dimY, 'rgba(24,33,61,.45)', 1, 5);
        arrow(ctx, sx - 16, dimY, sx, dimY, 'rgba(24,33,61,.45)', 1, 5);
        line(ctx, ox, dimY - 5, ox, dimY + 5, 'rgba(24,33,61,.45)', 1);
        line(ctx, sx, dimY - 5, sx, dimY + 5, 'rgba(24,33,61,.45)', 1);
        txt(ctx, 'x = ' + fmt(pos(th), 1) + ' mm', (ox + sx) / 2, dimY - 9, { size: 8.5, align: 'center', color: C.muted });

        // 标注
        tag(ctx, 'O', ox - 12, trackY + 12, C.muted, 9);
        tag(ctx, 'r', ox + r * scale * 0.5 - 12, trackY - r * scale * 0.5 - 8, C.teal, 9);
        tag(ctx, 'L', (pinX + sx) / 2, (pinY + trackY) / 2 - 9, C.ink, 9);
        rotArrow(ctx, ox, trackY, r * scale + 12, -0.7, 0.55, 'rgba(15,139,141,.75)');
        txt(ctx, 'ω', ox + r * scale + 17, trackY - r * scale * 0.55, { size: 10, color: C.teal });

        // 三条波形
        const pts = [[], [], []];
        const N = 180;
        for (let i = 0; i <= N; i++) {
          const a = TAU * i / N;
          pts[0].push([a, pos(a)]);
          pts[1].push([a, vel(a)]);
          pts[2].push([a, acc(a)]);
        }
        bands(ctx, fitBox({ x: 8, y: H * 0.56, w: W - 16, h: H * 0.35 }, H), {
          series: [
            { label: 'x', pts: pts[0], color: C.teal, width: 1.9 },
            { label: 'v', pts: pts[1], color: C.amber, width: 1.7 },
            { label: 'a', pts: pts[2], color: C.ink, width: 1.5, dash: [4, 3] }
          ],
          cursor: th
        });
        txt(ctx, 'x 位移 / v 速度 / a 加速度（各自归一化）', W - 16, H * 0.555, { size: 8, align: 'right', color: C.faint });
      },
      readouts() {
        const th = state.theta;
        return {
          theta: fmt(((th / TAU) * 360 + 360) % 360, 0) + '°',
          x: fmt(pos(th), 1),
          v: fmt(vel(th), 1),
          a: fmt(acc(th) / 1000, 2)
        };
      },
      reset() { state.theta = 0; },
      pointer(type, x, y, px, py) {
        if (type === 'down') { state.dragging = true; state.dragX = x; }
        if (type === 'move' && state.dragging) {
          state.theta = (state.theta + (x - state.dragX) * 0.012 + TAU) % TAU;
          state.dragX = x;
        }
        if (type === 'up') state.dragging = false;
      }
    };
  }

  /* =========================================================
     02 齿轮传动
     ========================================================= */
  function gearDemo() {
    const state = { z1: 18, z2: 36, n1: 40, theta: 0, dragging: false };

    return {
      state,
      step(dt) {
        if (!state.dragging) state.theta = (state.theta + state.n1 * TAU / 60 * dt * 0.55) % TAU;
      },
      draw(ctx, W, H) {
        const z1 = state.z1, z2 = state.z2;
        const m = Math.min(
          (W * 0.72) / ((z1 + z2) / 2 + 2.4),
          (H * 0.62) / (z1 + 2.4),
          (H * 0.62) / (z2 + 2.4)
        );
        const r1 = z1 * m / 2, r2 = z2 * m / 2;
        const cy = H * 0.43;
        const cx = W * 0.5;
        const c1 = cx - (r1 + r2) / 2, c2 = cx + (r1 + r2) / 2;
        const rot1 = state.theta;
        const rot2 = -state.theta * z1 / z2 + Math.PI / z2;

        // 中心连线与节圆
        line(ctx, c1, cy, c2, cy, 'rgba(24,33,61,.3)', 1, [4, 4]);
        ctx.save();
        ctx.setLineDash([4, 4]);
        circle(ctx, c1, cy, r1, { stroke: 'rgba(15,139,141,.38)', width: 1 });
        circle(ctx, c2, cy, r2, { stroke: 'rgba(15,139,141,.38)', width: 1 });
        ctx.restore();

        gear(ctx, c1, cy, z1, m, rot1, { fill: C.card });
        gear(ctx, c2, cy, z2, m, rot2, { fill: C.card });

        // 旋转方向
        rotArrow(ctx, c1, cy, r1 + 16, -1.1, 0.5, C.teal);
        rotArrow(ctx, c2, cy, r2 + 16, Math.PI - 0.5, Math.PI + 1.1, C.amber);

        // 标注
        txt(ctx, '主动轮  z₁ = ' + z1, c1, cy + r1 + 38, { size: 9.5, align: 'center', color: C.ink });
        txt(ctx, '从动轮  z₂ = ' + z2, c2, cy + r2 + 38, { size: 9.5, align: 'center', color: C.ink });
        txt(ctx, 'n₁ = ' + state.n1 + ' r/min', c1, cy + r1 + 54, { size: 8.5, align: 'center', color: C.teal });
        txt(ctx, 'n₂ = ' + fmt(state.n1 * z1 / z2, 1) + ' r/min', c2, cy + r2 + 54, { size: 8.5, align: 'center', color: C.amber });
        tag(ctx, '节点  v = ω₁r₁ = ω₂r₂', cx, cy - 18, C.muted, 8.5);
        cross(ctx, c1, cy, 3, 'rgba(24,33,61,.55)');
        cross(ctx, c2, cy, 3, 'rgba(24,33,61,.55)');
        // 齿数比大字
        const i = z2 / z1;
        txt(ctx, 'i = z₂/z₁ = ' + fmt(i, 2), W - 18, 22, { size: 9.5, align: 'right', color: C.teal });
        txt(ctx, '转向相反', W - 18, 38, { size: 8.5, align: 'right', color: C.muted });
      },
      readouts() {
        return {
          z1: state.z1 + ' 齿',
          z2: state.z2 + ' 齿',
          i: fmt(state.z2 / state.z1, 2),
          n2: fmt(state.n1 * state.z1 / state.z2, 1) + ' r/min'
        };
      },
      reset() { state.theta = 0; },
      pointer(type, x) {
        if (type === 'down') { state.dragging = true; state.dragX = x; }
        if (type === 'move' && state.dragging) {
          state.theta = (state.theta + (x - state.dragX) * 0.01 + TAU) % TAU;
          state.dragX = x;
        }
        if (type === 'up') state.dragging = false;
      },
      onControl(k) { if (k === 'z1' || k === 'z2') state.theta = 0; }
    };
  }

  /* =========================================================
     03 切削速度优化
     ========================================================= */
  function cuttingDemo() {
    const K = 500, CC = 300, NEXP = 0.2, CM = 1.2;
    const state = { v: 110, ct: 30, auto: false, target: 110, t: 0 };
    const tm = v => K / v;
    const life = v => Math.pow(CC / v, 1 / NEXP);
    const cost = v => CM * tm(v) + state.ct * K * Math.pow(v, 4) / Math.pow(CC, 5);
    const vStar = () => Math.pow(CM * Math.pow(CC, 5) / (4 * state.ct), 0.2);

    return {
      state,
      step(dt) {
        state.t += dt;
        if (state.auto) {
          state.v += (state.target - state.v) * Math.min(1, dt * 5);
          if (Math.abs(state.target - state.v) < 0.6) { state.v = state.target; state.auto = false; }
        }
      },
      draw(ctx, W, H) {
        const bedY = Math.min(H * 0.42, 190);
        const v = state.v;
        const st = vStar();
        const spin = (1000 * v) / (Math.PI * 50); // r/min for d=50mm

        // 车床床身
        line(ctx, 42, bedY, W - 42, bedY, 'rgba(24,33,61,.55)', 1.4);
        hatch(ctx, 42, bedY, W - 84, 8, 'rgba(24,33,61,.16)', 8);
        // 主轴箱
        ctx.save();
        roundedRect(ctx, 52, bedY - 62, 66, 62, 2);
        ctx.fillStyle = 'rgba(24,33,61,.06)'; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        // 卡盘（正视图，旋转）
        const chx = 132, chy = bedY - 34, chr = 24;
        circle(ctx, chx, chy, chr, { fill: C.card, stroke: C.ink, width: 1.3 });
        for (let k = 0; k < 3; k++) {
          const a = state.t * Math.min(3.2, spin / 240) + k * TAU / 3;
          ctx.save();
          ctx.translate(chx, chy);
          ctx.rotate(a);
          ctx.fillStyle = 'rgba(24,33,61,.55)';
          ctx.fillRect(chr - 9, -3, 12, 6);
          ctx.restore();
        }
        circle(ctx, chx, chy, 5, { fill: C.card, stroke: C.ink, width: 1 });
        // 工件
        const wx = chx + 20, wlen = Math.min(W * 0.46, 330), wy = chy - 17, whh = 34;
        ctx.save();
        roundedRect(ctx, wx, wy, wlen, whh, 3);
        ctx.fillStyle = 'rgba(24,33,61,.05)'; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.clip();
        ctx.strokeStyle = 'rgba(24,33,61,.14)';
        ctx.lineWidth = 1;
        const off = (state.t * Math.min(60, spin / 12)) % 22;
        for (let gx = wx - 30 + off; gx < wx + wlen; gx += 22) {
          ctx.beginPath(); ctx.moveTo(gx, wy); ctx.lineTo(gx + 16, wy + whh); ctx.stroke();
        }
        ctx.restore();
        // 刀具
        const txx = wx + wlen * 0.52;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(txx - 4, bedY);
        ctx.lineTo(txx + 26, bedY);
        ctx.lineTo(txx + 18, bedY - 16);
        ctx.lineTo(txx - 4, bedY - 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(184,95,40,.16)'; ctx.fill();
        ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        // 火花
        for (let k = 0; k < 5; k++) {
          const ph = (state.t * 2.2 + k * 0.37) % 1;
          const sx = txx + 6 + ph * 26;
          const sy = bedY - 22 + Math.sin(ph * 9 + k) * 5 - ph * 12;
          line(ctx, txx + 4, bedY - 22, sx, sy, 'rgba(184,95,40,' + (0.55 * (1 - ph)) + ')', 1.1);
        }
        tag(ctx, 'd = 50 mm', wx + 10, wy + 17, C.faint, 8);
        tag(ctx, 'v_c = ' + fmt(v, 0) + ' m/min', txx, bedY + 20, C.amber, 9);
        tag(ctx, 'n ≈ ' + fmt(spin, 0) + ' r/min', txx, bedY + 33, C.muted, 8.5);

        // 成本曲线
        const bx = fitBox({ x: 10, y: bedY + 80, w: W - 20, h: H - 44 - (bedY + 80) }, H);
        const ptsMach = [], ptsTool = [], ptsTotal = [];
        let ymax = 1;
        for (let i = 0; i <= 150; i++) {
          const vv = 60 + (240 - 60) * i / 150;
          const a = CM * tm(vv), b = state.ct * K * Math.pow(vv, 4) / Math.pow(CC, 5);
          ptsMach.push([vv, a]);
          ptsTool.push([vv, b]);
          ptsTotal.push([vv, a + b]);
          ymax = Math.max(ymax, a + b);
        }
        ymax *= 1.12;
        const chart = plot(ctx, bx, {
          xRange: [60, 240], yRange: [0, ymax],
          xTicks: [60, 90, 120, 150, 180, 210, 240],
          yTicks: [0, ymax * 0.25, ymax * 0.5, ymax * 0.75, ymax],
          xFmt: vv => fmt(vv, 0),
          yFmt: vv => fmt(vv, 1),
          xLabel: '切削速度 v (m/min)',
          yLabel: '单件成本 (元)',
          series: [
            { pts: ptsMach, color: 'rgba(15,139,141,.62)', width: 1.4, dash: [5, 4] },
            { pts: ptsTool, color: 'rgba(184,95,40,.62)', width: 1.4, dash: [5, 4] },
            { pts: ptsTotal, color: C.ink, width: 2.2, fill: true, fillTo: 0, fillColor: 'rgba(24,33,61,.045)' }
          ]
        });
        if (!chart) return;
        // 最优线
        line(ctx, chart.X(st), bx.y + 10, chart.X(st), bx.y + bx.h - 24, C.teal, 1, [3, 3]);
        circle(ctx, chart.X(st), chart.Y(cost(st)), 4, { fill: C.teal, stroke: C.card, width: 1.4 });
        txt(ctx, 'v* = ' + fmt(st, 0), chart.X(st) + 5, bx.y + 18, { size: 8.5, color: C.teal });
        // 当前点与切线
        const c0 = cost(v);
        const slope = (cost(v + 1) - cost(v - 1)) / 2;
        const x1 = 60, x2 = 240;
        const y1 = c0 + slope * (x1 - v), y2 = c0 + slope * (x2 - v);
        line(ctx, chart.X(x1), chart.Y(y1), chart.X(x2), chart.Y(y2), 'rgba(184,95,40,.8)', 1.2, [6, 4]);
        circle(ctx, chart.X(v), chart.Y(c0), 4.5, { fill: C.amber, stroke: C.card, width: 1.5 });
        txt(ctx, '切线斜率 = dC/dv', bx.x + bx.w - 12, bx.y + 18, { size: 8.5, align: 'right', color: C.amber });
        txt(ctx, '成本最低点：导数为零', bx.x + bx.w - 12, bx.y + 31, { size: 8, align: 'right', color: C.muted });
      },
      readouts() {
        return {
          cost: '¥ ' + fmt(cost(state.v), 2),
          life: fmt(life(state.v), 0) + ' min',
          vstar: fmt(vStar(), 0) + ' m/min',
          spindle: fmt(1000 * state.v / (Math.PI * 50), 0) + ' r/min'
        };
      },
      controlValues() { return { v: Math.round(state.v) }; },
      reset() { state.v = 110; state.auto = false; },
      autoFind() { state.target = Math.round(vStar()); state.auto = true; },
      onControl(k) { if (k === 'v') state.auto = false; }
    };
  }

  /* =========================================================
     04 变力做功
     ========================================================= */
  function springWorkDemo() {
    const state = { k: 10, x: 40, compare: false, dragging: false };
    const MAX = 50;
    const force = () => state.k * state.x;
    const work = () => 0.5 * state.k * state.x * state.x / 1000;

    return {
      state,
      step() { },
      draw(ctx, W, H) {
        const mechH = H * 0.46;
        const y = mechH * 0.52;
        const wallX = 58;
        const scaleX = Math.min(4.4, (W - 300) / MAX);
        const x0 = wallX + 22;
        const blockW = 48;
        const blockX = x0 + 150 + state.x * scaleX;
        const bx = blockX + blockW / 2;

        // 墙
        line(ctx, wallX, y - 66, wallX, y + 66, C.ink, 2);
        hatch(ctx, wallX - 14, y - 66, 14, 132, 'rgba(24,33,61,.2)', 8);
        // 弹簧
        spring(ctx, wallX + 2, blockX, y, 11, 13, C.ink, 1.5);
        // 物块
        ctx.save();
        roundedRect(ctx, blockX, y - 26, blockW, 52, 2);
        ctx.fillStyle = C.card; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        // 手/手柄
        line(ctx, blockX + blockW, y, blockX + blockW + 20, y, 'rgba(24,33,61,.45)', 1.4);
        circle(ctx, blockX + blockW + 24, y, 4, { fill: C.teal });
        // 力箭头
        const F = force();
        const alen = 20 + Math.min(1, F / Math.max(1, state.k * MAX)) * 92;
        arrow(ctx, blockX - 4, y - 38, blockX - 4 - alen, y - 38, C.amber, 2, 8);
        txt(ctx, 'F = ' + fmt(F, 0) + ' N', blockX - 10, y - 50, { size: 9, align: 'right', color: C.amber });
        // 位移标注
        const dimY = y + 56;
        line(ctx, x0 + 150, dimY, blockX, dimY, 'rgba(24,33,61,.4)', 1);
        arrow(ctx, x0 + 150 + 14, dimY, x0 + 150, dimY, 'rgba(24,33,61,.4)', 1, 5);
        arrow(ctx, blockX - 14, dimY, blockX, dimY, 'rgba(24,33,61,.4)', 1, 5);
        txt(ctx, 'x = ' + fmt(state.x, 0) + ' mm', (x0 + 150 + blockX) / 2, dimY - 9, { size: 8.5, align: 'center' });
        tag(ctx, 'k = ' + fmt(state.k, 0) + ' N/mm', wallX + 16, y - 78, C.muted, 8.5);

        // 图：F–x
        const box = fitBox({ x: 10, y: H * 0.50, w: W - 20, h: H * 0.42 }, H);
        const k = state.k;
        const pts = [[0, 0], [MAX, k * MAX]];
        const xMax = state.x;
        const fMax = k * MAX;
        const chart = plot(ctx, box, {
          xRange: [0, MAX], yRange: [0, Math.max(10, fMax) * 1.08],
          xTicks: [0, 10, 20, 30, 40, 50],
          yTicks: [0, fMax * 0.25, fMax * 0.5, fMax * 0.75, fMax].map(v => v),
          xFmt: v => fmt(v, 0),
          yFmt: v => fmt(v, 0),
          xLabel: '伸长量 x (mm)',
          yLabel: '拉力 F (N)',
          series: [
            { pts, color: C.teal, width: 2 },
            { pts: [[0, 0], [xMax, k * xMax]], color: C.teal, width: 2, fill: true, fillTo: 0, fillColor: 'rgba(15,139,141,.20)' }
          ],
          dots: [{ x: xMax, y: k * xMax, color: C.teal }]
        });
        if (!chart) return;
        if (state.compare && xMax > 0.2) {
          ctx.save();
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(184,95,40,.7)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(chart.X(0), chart.Y(k * xMax), chart.X(xMax) - chart.X(0), chart.Y(0) - chart.Y(k * xMax));
          ctx.restore();
          txt(ctx, 'F·x（高估）', chart.X(xMax) + 6, chart.Y(k * xMax) + 2, { size: 8, color: C.amber });
        }
        // 面积说明
        txt(ctx, '面积 = 做功 W = ' + fmt(work(), 2) + ' J', chart.X(xMax / 2), chart.Y(k * xMax / 2) - 10, {
          size: 9, align: 'center', color: C.teal
        });
      },
      readouts() {
        return {
          x: fmt(state.x, 0) + ' mm',
          F: fmt(force(), 0) + ' N',
          W: fmt(work(), 2) + ' J',
          favg: fmt(force() / 2, 0) + ' N'
        };
      },
      reset() { state.x = 40; },
      pointer(type, x, y, px, py, W) {
        if (type === 'down') state.dragging = true;
        if (type === 'up') state.dragging = false;
        if (type === 'move' && state.dragging) {
          const scaleX = Math.min(4.4, (W - 300) / MAX);
          const base = 58 + 22 + 150;
          state.x = clamp((x - base) / scaleX, 0, MAX);
        }
      },
      onControl(k) { if (k === 'compare') { } }
    };
  }

  /* =========================================================
     05 转动惯量
     ========================================================= */
  function inertiaDemo() {
    const state = { rho: 0.35, omega: 80, angle: 0 };
    const M = 5, R = 0.3;
    const I = () => 0.5 * M * R * R * (1 + state.rho * state.rho);

    return {
      state,
      step(dt) { state.angle += Math.min(3, state.omega * 0.16) * dt; },
      draw(ctx, W, H) {
        const wide = W > 640;
        const fw = wide ? W * 0.44 : W;
        const fh = wide ? H : H * 0.43;
        const cx = fw * 0.5, cy = fh * 0.5;
        const rad = Math.min(fw * 0.31, fh * 0.34);
        const inner = rad * state.rho;

        // 飞轮
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.angle);
        // 轮缘
        circle(ctx, 0, 0, rad, { fill: 'rgba(15,139,141,.10)', stroke: C.ink, width: 1.6 });
        circle(ctx, 0, 0, rad - 7, { stroke: 'rgba(24,33,61,.18)', width: 1 });
        // 内孔
        circle(ctx, 0, 0, inner, { fill: C.paper, stroke: C.ink, width: 1.3 });
        // 同心环
        for (let k = 1; k <= 6; k++) {
          const rr = inner + (rad - inner) * k / 6;
          circle(ctx, 0, 0, rr, { stroke: 'rgba(24,33,61,.12)', width: 1 });
        }
        // 辐板
        ctx.save();
        ctx.setLineDash([2, 3]);
        circle(ctx, 0, 0, rad * 0.24, { stroke: 'rgba(24,33,61,.2)', width: 1 });
        ctx.restore();
        for (let k = 0; k < 6; k++) {
          const a = k * TAU / 6;
          line(ctx, Math.cos(a) * inner, Math.sin(a) * inner, Math.cos(a) * (rad - 6), Math.sin(a) * (rad - 6), 'rgba(24,33,61,.22)', 1.2);
        }
        circle(ctx, 0, 0, Math.max(10, rad * 0.16), { fill: C.card, stroke: C.ink, width: 1.4 });
        circle(ctx, 0, 0, Math.max(4, rad * 0.07), { stroke: C.ink, width: 1 });
        cross(ctx, 0, 0, 4, 'rgba(24,33,61,.55)');
        ctx.restore();

        // 尺寸
        line(ctx, cx, cy, cx + rad, cy, 'rgba(184,95,40,.7)', 1);
        txt(ctx, 'R', cx + rad * 0.5, cy - 8, { size: 9, align: 'center', color: C.amber });
        if (state.rho > 0.03) {
          line(ctx, cx, cy, cx + inner, cy, 'rgba(15,139,141,.7)', 1);
          txt(ctx, 'a', cx + inner * 0.5, cy + 12, { size: 9, align: 'center', color: C.teal });
        }
        txt(ctx, '飞轮截面 · ρ = ' + fmt(state.rho, 2), cx, cy + rad + 24, { size: 9.5, align: 'center', color: C.ink });
        txt(ctx, '质量 ' + M + ' kg · 外径 0.30 m', cx, cy + rad + 38, { size: 8.5, align: 'center', color: C.muted });

        // 右/下：I–ρ 曲线
        const box = wide
          ? { x: W * 0.48, y: H * 0.13, w: W * 0.50, h: H * 0.72 }
          : fitBox({ x: 10, y: H * 0.50, w: W - 20, h: H * 0.42 }, H);
        const pts = [];
        for (let i = 0; i <= 80; i++) {
          const r = i / 80;
          pts.push([r, 0.5 * M * R * R * (1 + r * r)]);
        }
        const iMax = 0.5 * M * R * R * 2;
        const chart = plot(ctx, box, {
          xRange: [0, 1], yRange: [0, iMax * 1.08],
          xTicks: [0, 0.25, 0.5, 0.75, 1],
          yTicks: [0, iMax * 0.25, iMax * 0.5, iMax * 0.75, iMax],
          xFmt: v => fmt(v, 2),
          yFmt: v => fmt(v, 3),
          xLabel: '内孔半径比 ρ = a/R',
          yLabel: 'I (kg·m²)',
          series: [{ pts, color: C.teal, width: 2.2, fill: true, fillTo: 0, fillColor: 'rgba(15,139,141,.08)' }],
          dots: [{ x: state.rho, y: I(), color: C.amber }]
        });
        if (!chart) return;
        line(ctx, chart.X(state.rho), box.y + 10, chart.X(state.rho), box.y + box.h - 24, 'rgba(184,95,40,.65)', 1, [3, 3]);
        txt(ctx, 'I = ' + fmt(I(), 3), chart.X(state.rho) + 6, box.y + 18, { size: 8.5, color: C.amber });
        txt(ctx, '实心圆盘 ½mR²', chart.X(0) + 6, chart.Y(0.5 * M * R * R) - 8, { size: 8, color: C.muted });
        txt(ctx, '薄圆环 mR²', chart.X(0.74), chart.Y(iMax * 0.92), { size: 8, color: C.muted });
      },
      readouts() {
        return {
          I: fmt(I(), 3) + ' kg·m²',
          E: fmt(0.5 * I() * state.omega * state.omega, 0) + ' J',
          k: fmt(Math.sqrt(I() / M), 3) + ' m',
          ratio: fmt(I() / (M * R * R), 2)
        };
      },
      reset() { state.rho = 0.35; },
      onControl(k) { if (k === 'rho') { } }
    };
  }

  /* =========================================================
     06 悬臂梁挠度
     ========================================================= */
  function beamDemo() {
    const state = { P: 300, L: 1.0, d: 30, E: 210, t: 0 };
    const G = 1e9;
    const inert = () => Math.PI * Math.pow(state.d / 1000, 4) / 64;
    const EI = () => state.E * G * inert();
    const delta = () => state.P * Math.pow(state.L, 3) / (3 * EI()) * 1000; // mm
    const yOf = x => state.P * x * x * (3 * state.L - x) / (6 * EI()) * 1000;

    return {
      state,
      step(dt) { state.t += dt; },
      draw(ctx, W, H) {
        const wallX = 72, tipX = W - 74;
        const beamY = H * 0.24;
        const Lp = tipX - wallX;
        const dmm = delta();
        const dPx = Math.min(64, dmm * 5.6, H * 0.13);
        const thick = 15;

        // 墙
        line(ctx, wallX, beamY - 56, wallX, beamY + 100, C.ink, 2);
        hatch(ctx, wallX - 18, beamY - 56, 18, 156, 'rgba(24,33,61,.2)', 8);

        // 挠曲线
        const top = [], bot = [], mid = [];
        const N = 60;
        for (let i = 0; i <= N; i++) {
          const xr = i / N;
          const xm = xr * state.L;
          const yp = (yOf(xm) / Math.max(0.001, dmm)) * dPx;
          const px = wallX + xr * Lp;
          top.push([px, beamY + yp - thick / 2]);
          bot.push([px, beamY + yp + thick / 2]);
          mid.push([px, beamY + yp]);
        }
        ctx.save();
        ctx.beginPath();
        top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
        ctx.closePath();
        ctx.fillStyle = 'rgba(24,33,61,.06)';
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        // 未变形参考线
        line(ctx, wallX, beamY, tipX, beamY, 'rgba(24,33,61,.25)', 1, [5, 4]);

        // 载荷
        const tipY = beamY + dPx;
        const pulse = 1 + Math.sin(state.t * 2) * 0.03;
        const alen = Math.min(58, H * 0.12);
        arrow(ctx, tipX, tipY - alen * pulse - thick / 2, tipX, tipY - thick / 2 - 3, C.amber, 2, 9);
        txt(ctx, 'P = ' + fmt(state.P, 0) + ' N', tipX - 8, tipY - alen - 16, { size: 9.5, align: 'right', color: C.amber });

        // 弯矩图（梁下）
        const mBase = beamY + dPx + 24;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(wallX, mBase);
        ctx.lineTo(wallX, mBase + 24);
        ctx.lineTo(tipX, mBase);
        ctx.closePath();
        ctx.fillStyle = 'rgba(184,95,40,.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(184,95,40,.8)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        txt(ctx, 'M(x) = P(L−x)', wallX + 8, mBase + 30, { size: 8.5, color: C.amber });
        txt(ctx, '最大弯矩 ' + fmt(state.P * state.L, 0) + ' N·m', tipX, mBase + 30, { size: 8.5, align: 'right', color: C.muted });
        txt(ctx, '挠度 δ = ' + fmt(dmm, 2) + ' mm（变形放大显示）', wallX, beamY - 26, { size: 9, color: C.teal });

        // y(x) 图
        const box = fitBox({ x: 10, y: H * 0.58, w: W - 20, h: H * 0.32 }, H);
        const pts = [];
        for (let i = 0; i <= 80; i++) {
          const xm = state.L * i / 80;
          pts.push([xm, yOf(xm)]);
        }
        const chart = plot(ctx, box, {
          xRange: [0, state.L], yRange: [Math.max(0.1, dmm) * 1.15, 0],
          xTicks: [0, state.L * 0.25, state.L * 0.5, state.L * 0.75, state.L],
          yTicks: [0, dmm * 0.25, dmm * 0.5, dmm * 0.75, dmm],
          xFmt: v => fmt(v, 2),
          yFmt: v => fmt(v, 1),
          xLabel: '位置 x (m)',
          yLabel: '挠度 y (mm，向下)',
          series: [{ pts, color: C.teal, width: 2.2, fill: true, fillTo: 0, fillColor: 'rgba(15,139,141,.10)' }],
          markers: [{ x: state.L, color: 'rgba(184,95,40,.6)' }],
          dots: [{ x: state.L, y: dmm, color: C.amber }]
        });
        if (!chart) return;
        txt(ctx, '端点挠度 δ', chart.X(state.L) - 8, chart.Y(dmm) - 12, { size: 8.5, align: 'right', color: C.amber });
        txt(ctx, 'EI y″ = M(x)  →  积分两次 → y(x)', box.x + box.w - 12, box.y + 16, { size: 8.5, align: 'right', color: C.muted });
      },
      readouts() {
        return {
          delta: fmt(delta(), 2) + ' mm',
          I: fmt(inert() * 1e8, 2) + ' cm⁴',
          M: fmt(state.P * state.L, 0) + ' N·m',
          EI: fmt(EI() / 1000, 1) + ' kN·m²'
        };
      },
      reset() { state.P = 300; state.L = 1.0; state.d = 30; }
    };
  }

  /* =========================================================
     07 简谐振动
     ========================================================= */
  function shmDemo() {
    const state = { m: 2, k: 80, A: 0.15, phase: 0, t: 0 };
    const omega = () => Math.sqrt(state.k / state.m);

    return {
      state,
      step(dt) {
        state.t += dt;
        state.phase = (state.phase + omega() * dt) % TAU;
      },
      draw(ctx, W, H) {
        const om = omega();
        const mechH = H * 0.44;
        const y = mechH * 0.52;
        const wallX = 56;
        const eqX = W * 0.52;
        const pxPerM = Math.min(280, (W * 0.26) / 0.25);
        const x = state.A * Math.cos(state.phase);
        const bx = eqX + x * pxPerM;
        const blockW = 54, blockH = 44;

        // 导轨
        line(ctx, wallX, y + blockH / 2 + 8, W - 48, y + blockH / 2 + 8, 'rgba(24,33,61,.5)', 1.2);
        hatch(ctx, wallX, y + blockH / 2 + 8, W - 48 - wallX, 8, 'rgba(24,33,61,.15)', 8);
        // 墙
        line(ctx, wallX, y - 54, wallX, y + 54, C.ink, 2);
        hatch(ctx, wallX - 15, y - 54, 15, 108, 'rgba(24,33,61,.2)', 8);
        // 弹簧
        spring(ctx, wallX + 2, bx - blockW / 2, y, 10, 12, C.ink, 1.5);
        // 物块
        ctx.save();
        roundedRect(ctx, bx - blockW / 2, y - blockH / 2, blockW, blockH, 2);
        ctx.fillStyle = C.card; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        txt(ctx, 'm', bx, y + 1, { size: 12, align: 'center', color: C.ink, weight: 600 });
        // 平衡位置
        line(ctx, eqX, y - 58, eqX, y + 62, 'rgba(24,33,61,.35)', 1, [4, 4]);
        txt(ctx, '平衡位置', eqX, y - 68, { size: 8, align: 'center', color: C.muted });
        // 位移箭头
        const dimY = y + 58;
        if (Math.abs(bx - eqX) > 3) {
          arrow(ctx, eqX, dimY, bx, dimY, C.teal, 1.4, 6);
          txt(ctx, 'x', (eqX + bx) / 2, dimY + 12, { size: 9, align: 'center', color: C.teal });
        }
        tag(ctx, 'k = ' + fmt(state.k, 0) + ' N/m', wallX + 14, y - 42, C.muted, 8.5);
        tag(ctx, 'A = ' + fmt(state.A * 1000, 0) + ' mm', eqX + 8, y + 46, C.muted, 8.5);

        // 三通道波形
        const pts = [[], [], []];
        const N = 200;
        for (let i = 0; i <= N; i++) {
          const ph = TAU * i / N;
          pts[0].push([ph, state.A * Math.cos(ph)]);
          pts[1].push([ph, -state.A * om * Math.sin(ph)]);
          pts[2].push([ph, -state.A * om * om * Math.cos(ph)]);
        }
        bands(ctx, fitBox({ x: 8, y: H * 0.47, w: W - 16, h: H * 0.45 }, H), {
          series: [
            { label: 'x', pts: pts[0], color: C.teal, width: 2 },
            { label: 'v', pts: pts[1], color: C.amber, width: 1.7 },
            { label: 'a', pts: pts[2], color: C.ink, width: 1.5, dash: [4, 3] }
          ],
          cursor: state.phase
        });
        txt(ctx, '一个周期内 x / v / a 的相位关系', W - 16, H * 0.465, { size: 8, align: 'right', color: C.faint });
      },
      readouts() {
        const om = omega(), T = TAU / om;
        return {
          T: fmt(T, 2) + ' s',
          f: fmt(1 / T, 2) + ' Hz',
          w: fmt(om, 2) + ' rad/s',
          vmax: fmt(state.A * om, 2) + ' m/s'
        };
      },
      reset() { state.phase = 0; },
      onControl() { state.phase = 0; state.t = 0; }
    };
  }

  /* =========================================================
     08 阻尼振动
     ========================================================= */
  function dampingDemo() {
    const state = { zeta: 0.15, A: 0.12, t: 0 };
    const m = 2, k = 200, wn = Math.sqrt(k / m);
    const TSPAN = 4;
    const xOf = t => {
      const z = state.zeta, A = state.A;
      if (z < 0.9999) {
        const wd = wn * Math.sqrt(1 - z * z);
        return A * Math.exp(-z * wn * t) * (Math.cos(wd * t) + (z * wn / wd) * Math.sin(wd * t));
      }
      if (z < 1.0001) return A * (1 + wn * t) * Math.exp(-wn * t);
      const s = wn * Math.sqrt(z * z - 1);
      return A * Math.exp(-z * wn * t) * (Math.cosh(s * t) + (z * wn / s) * Math.sinh(s * t));
    };
    const status = () => state.zeta < 0.02 ? '无阻尼' : state.zeta < 0.98 ? '欠阻尼' : state.zeta < 1.02 ? '临界阻尼' : '过阻尼';

    return {
      state,
      step(dt) { state.t = (state.t + dt) % TSPAN; },
      draw(ctx, W, H) {
        const y = H * 0.16;
        const wallX = 54;
        const eqX = W * 0.5;
        const pxPerM = Math.min(240, (W * 0.24) / 0.18);
        const x = xOf(state.t);
        const bx = eqX + x * pxPerM;
        const bw = 50, bh = 38;

        // 地面
        line(ctx, wallX, y + 62, W - 46, y + 62, 'rgba(24,33,61,.45)', 1.2);
        hatch(ctx, wallX, y + 62, W - 46 - wallX, 8, 'rgba(24,33,61,.14)', 8);
        // 左墙
        line(ctx, wallX, y - 40, wallX, y + 62, C.ink, 2);
        hatch(ctx, wallX - 14, y - 40, 14, 102, 'rgba(24,33,61,.2)', 8);
        // 右墙
        line(ctx, W - 46, y - 40, W - 46, y + 62, C.ink, 2);
        hatch(ctx, W - 46, y - 40, 14, 102, 'rgba(24,33,61,.2)', 8);
        // 弹簧
        spring(ctx, wallX + 2, bx - bw / 2, y - 6, 9, 9, C.ink, 1.4);
        // 阻尼器（并联，右侧）
        const cylX = W - 46 - 92;
        line(ctx, bx + bw / 2, y + 14, cylX + 66, y + 14, 'rgba(24,33,61,.55)', 2.4);
        ctx.save();
        roundedRect(ctx, cylX, y + 2, 76, 24, 3);
        ctx.fillStyle = 'rgba(15,139,141,.10)'; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.restore();
        // 活塞
        const pistonX = cylX + 14 + clamp((bx - eqX) * 0.35 + 30, 4, 56);
        line(ctx, pistonX, y + 3, pistonX, y + 25, C.ink, 2);
        line(ctx, pistonX, y + 7, pistonX, y + 21, 'rgba(24,33,61,.3)', 1);
        tag(ctx, 'c', cylX + 38, y + 38, C.muted, 9);
        // 物块
        ctx.save();
        roundedRect(ctx, bx - bw / 2, y - bh / 2, bw, bh, 2);
        ctx.fillStyle = C.card; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        txt(ctx, 'm', bx, y, { size: 12, align: 'center', color: C.ink, weight: 600 });
        line(ctx, eqX, y - 44, eqX, y + 66, 'rgba(24,33,61,.3)', 1, [4, 4]);
        tag(ctx, 'ζ = ' + fmt(state.zeta, 2) + ' · ' + status(), eqX + 8, y - 50, C.teal, 8.5);

        // 曲线
        const box = fitBox({ x: 10, y: H * 0.40, w: W - 20, h: H * 0.50 }, H);
        const pts = [], envU = [], envL = [];
        const N = 200;
        for (let i = 0; i <= N; i++) {
          const tt = TSPAN * i / N;
          pts.push([tt, xOf(tt)]);
          const ev = state.A * Math.exp(-state.zeta * wn * tt);
          envU.push([tt, ev]);
          envL.push([tt, -ev]);
        }
        const chart = plot(ctx, box, {
          xRange: [0, TSPAN], yRange: [-state.A * 1.12, state.A * 1.12],
          xTicks: [0, 1, 2, 3, 4],
          yTicks: [-state.A, -state.A / 2, 0, state.A / 2, state.A],
          xFmt: v => fmt(v, 0),
          yFmt: v => fmt(v * 1000, 0),
          xLabel: '时间 t (s)',
          yLabel: '位移 x (mm)',
          series: [
            { pts: envU, color: 'rgba(184,95,40,.5)', width: 1.1, dash: [4, 4] },
            { pts: envL, color: 'rgba(184,95,40,.5)', width: 1.1, dash: [4, 4] },
            { pts: pts, color: C.teal, width: 2 }
          ],
          markers: [{ x: state.t, color: 'rgba(24,33,61,.5)' }],
          dots: [{ x: state.t, y: xOf(state.t), color: C.amber }]
        });
        if (!chart) return;
        txt(ctx, '包络 ±A·e^(−ζωₙt)', box.x + box.w - 12, box.y + 18, { size: 8.5, align: 'right', color: C.amber });
        if (state.zeta < 0.03) {
          txt(ctx, 'ζ = 0：永不衰减', chart.X(1.3), box.y + 34, { size: 9, color: C.amber });
        }
      },
      readouts() {
        const c = 2 * state.zeta * Math.sqrt(k * m);
        const wd = state.zeta < 1 ? wn * Math.sqrt(1 - state.zeta * state.zeta) : NaN;
        const settle = state.zeta > 0.001 ? Math.log(20) / (state.zeta * wn) : Infinity;
        return {
          zeta: fmt(state.zeta, 2),
          c: fmt(c, 1) + ' N·s/m',
          wd: isFinite(wd) ? fmt(wd, 2) + ' rad/s' : '—',
          settle: isFinite(settle) ? fmt(settle, 2) + ' s' : '∞'
        };
      },
      reset() { state.t = 0; },
      onControl() { state.t = 0; }
    };
  }

  /* =========================================================
     09 泰勒展开与小角度
     ========================================================= */
  function taylorDemo() {
    const state = { theta0: 20, order: 3, L: 0.8 };
    const g = 9.81;
    const thE = { a: 0, v: 0 }, thL = { a: 0, v: 0 };
    const resetSim = () => { thE.a = state.theta0 * Math.PI / 180; thE.v = 0; thL.a = thE.a; thL.v = 0; };
    resetSim();

    function ellipK(k) {
      let a = 1, b = Math.sqrt(Math.max(0, 1 - k * k));
      for (let i = 0; i < 5; i++) {
        const a1 = (a + b) / 2;
        b = Math.sqrt(a * b);
        a = a1;
      }
      return Math.PI / (2 * a);
    }
    const T0 = () => TAU * Math.sqrt(state.L / g);
    const Texact = () => 4 * Math.sqrt(state.L / g) * ellipK(Math.sin(state.theta0 * Math.PI / 360));
    const err = () => (Texact() / T0() - 1) * 100;

    return {
      state,
      step(dt) {
        let remain = Math.min(dt, 0.05);
        const h = 0.004;
        while (remain > 0) {
          const step = Math.min(h, remain);
          thE.v += -(g / state.L) * Math.sin(thE.a) * step;
          thE.a += thE.v * step;
          thL.v += -(g / state.L) * thL.a * step;
          thL.a += thL.v * step;
          remain -= step;
        }
      },
      draw(ctx, W, H) {
        const wide = W > 660;
        const mechW = wide ? W * 0.44 : W;
        const mechH = wide ? H : H * 0.46;
        const pivotX = mechW * 0.5;
        const pivotY = mechH * 0.14;
        const R = Math.min(mechH * 0.60, mechW * 0.34, 138);

        const bob = th => [pivotX + Math.sin(th) * R, pivotY + Math.cos(th) * R];
        const [ex, ey] = bob(thE.a);
        const [lx, ly] = bob(thL.a);
        // 支撑
        line(ctx, pivotX - 26, pivotY, pivotX + 26, pivotY, C.ink, 2.5);
        hatch(ctx, pivotX - 26, pivotY - 8, 52, 8, 'rgba(24,33,61,.2)', 6);
        circle(ctx, pivotX, pivotY, 4, { fill: C.ink });
        // 精确摆
        line(ctx, pivotX, pivotY, ex, ey, C.teal, 1.6);
        circle(ctx, ex, ey, 11, { fill: 'rgba(15,139,141,.16)', stroke: C.teal, width: 1.6 });
        // 线性摆
        ctx.save();
        ctx.setLineDash([6, 4]);
        line(ctx, pivotX, pivotY, lx, ly, C.amber, 1.3);
        ctx.restore();
        circle(ctx, lx, ly, 8, { fill: 'rgba(184,95,40,.10)', stroke: C.amber, width: 1.4 });
        // 角度弧
        ctx.save();
        ctx.strokeStyle = 'rgba(15,139,141,.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 34, Math.PI / 2 - thE.a, Math.PI / 2, thE.a > 0);
        ctx.stroke();
        ctx.restore();
        txt(ctx, 'θ = ' + fmt(thE.a * 180 / Math.PI, 1) + '°', pivotX + 10, pivotY + 44, { size: 9, color: C.teal });
        const labelY = Math.min(mechH - 14, pivotY + R + 34);
        txt(ctx, '精确 sin θ', pivotX - R * 0.1, labelY, { size: 8.5, align: 'center', color: C.teal });
        txt(ctx, '线性 θ', pivotX + R * 0.55, labelY, { size: 8.5, align: 'center', color: C.amber });

        // 泰勒曲线
        const box = wide
          ? { x: W * 0.47, y: H * 0.10, w: W * 0.51, h: H * 0.78 }
          : fitBox({ x: 10, y: H * 0.50, w: W - 20, h: H * 0.41 }, H);
        const sinPts = [], p1 = [], p3 = [], p5 = [];
        for (let i = 0; i <= 160; i++) {
          const x = -Math.PI + TAU * i / 160;
          sinPts.push([x, Math.sin(x)]);
          p1.push([x, x]);
          p3.push([x, x - Math.pow(x, 3) / 6]);
          p5.push([x, x - Math.pow(x, 3) / 6 + Math.pow(x, 5) / 120]);
        }
        const polys = [];
        if (state.order >= 1) polys.push({ pts: p1, color: 'rgba(184,95,40,.55)', width: 1.2, dash: [4, 4] });
        if (state.order >= 3) polys.push({ pts: p3, color: 'rgba(184,95,40,.9)', width: 1.6 });
        if (state.order >= 5) polys.push({ pts: p5, color: C.ink, width: 1.5, dash: [5, 3] });
        const chart = plot(ctx, box, {
          xRange: [-Math.PI, Math.PI], yRange: [-1.45, 1.45],
          xTicks: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI],
          yTicks: [-1, 0, 1],
          xFmt: v => Math.abs(v) < 0.001 ? '0' : (Math.abs(Math.abs(v) - Math.PI) < 0.001 ? (v > 0 ? 'π' : '−π') : (Math.abs(Math.abs(v) - Math.PI / 2) < 0.001 ? (v > 0 ? 'π/2' : '−π/2') : '')),
          yFmt: v => fmt(v, 0),
          xLabel: '角度 x (rad)',
          yLabel: 'sin x',
          series: [{ pts: sinPts, color: C.teal, width: 2.2 }, ...polys],
          markers: [{ x: thE.a, color: 'rgba(24,33,61,.4)' }]
        });
        if (!chart) return;
        const ySin = Math.sin(thE.a);
        circle(ctx, chart.X(thE.a), chart.Y(ySin), 4, { fill: C.teal, stroke: C.card, width: 1.4 });
        tag(ctx, 'sin x', chart.X(-2.6), chart.Y(0.55), C.teal, 8.5);
        tag(ctx, state.order === 1 ? 'x' : (state.order === 3 ? 'x − x³/6' : 'x − x³/6 + x⁵/120'), chart.X(1.5), chart.Y(1.06), C.amber, 8.5);
      },
      readouts() {
        return {
          theta: fmt(thE.a * 180 / Math.PI, 1) + '°',
          T0: fmt(T0(), 3) + ' s',
          Te: fmt(Texact(), 3) + ' s',
          err: fmt(Math.abs(err()), 2) + ' %'
        };
      },
      reset() { resetSim(); },
      onControl(k) { if (k === 'theta0') resetSim(); }
    };
  }

  /* =========================================================
     首页机构动画
     ========================================================= */
  function initHero(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let theta = 0, dragging = false, dragX = 0, raf = 0, last = 0;
    const r = 34, L = 150;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    function pos(a) { return r * Math.cos(a) + Math.sqrt(L * L - r * r * Math.sin(a) * Math.sin(a)); }
    function vel(a) { const s = Math.sin(a), c = Math.cos(a); return -r * s - (r * r * s * c) / Math.sqrt(L * L - r * r * s * s); }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const mechH = H * 0.58;
      const trackY = mechH * 0.55;
      const scale = Math.min((W * 0.66) / (L + 2 * r), (mechH * 0.55) / (2 * r));
      const ox = W * 0.16;
      const sx = ox + pos(theta) * scale;
      const pinX = ox + r * Math.cos(theta) * scale;
      const pinY = trackY - r * Math.sin(theta) * scale;

      // 轨道
      line(ctx, ox - r * scale - 20, trackY + 16, ox + (L + r) * scale + 24, trackY + 16, 'rgba(24,33,61,.45)', 1);
      hatch(ctx, ox - r * scale - 20, trackY + 16, (L + 2 * r) * scale + 44, 7, 'rgba(24,33,61,.13)', 6);
      // 曲柄
      ctx.save();
      ctx.setLineDash([3, 4]);
      circle(ctx, ox, trackY, r * scale, { stroke: 'rgba(24,33,61,.22)', width: 1 });
      ctx.restore();
      line(ctx, ox, trackY, pinX, pinY, C.ink, 5);
      circle(ctx, ox, trackY, 7, { fill: C.card, stroke: C.ink, width: 1.2 });
      circle(ctx, pinX, pinY, 4.5, { fill: C.teal });
      line(ctx, pinX, pinY, sx, trackY, C.ink, 7);
      line(ctx, pinX, pinY, sx, trackY, C.card, 3.5);
      ctx.save();
      roundedRect(ctx, sx - 18, trackY - 12, 36, 24, 2);
      ctx.fillStyle = C.card; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      // 标注
      tag(ctx, 'x(θ)', ox + r * scale + 8, trackY - 4, C.teal, 8.5);

      // 下方曲线
      const cy = H * 0.72, ch = H * 0.22;
      line(ctx, 12, cy + ch, W - 12, cy + ch, 'rgba(24,33,61,.3)', 1);
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const a = TAU * i / 120;
        pts.push([a, pos(a)]);
      }
      let mn = Infinity, mx = -Infinity;
      pts.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); });
      const X = a => 12 + (a / TAU) * (W - 24);
      const Y = v => cy + ch - 6 - (v - mn) / (mx - mn) * (ch - 14);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(15,139,141,.75)';
      ctx.lineWidth = 1.6;
      pts.forEach((p, i) => { const px = X(p[0]), py = Y(p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.restore();
      const cx = X(theta), cyy = Y(pos(theta));
      line(ctx, cx, cy, cx, cy + ch, 'rgba(24,33,61,.3)', 1, [3, 3]);
      circle(ctx, cx, cyy, 4, { fill: C.amber, stroke: C.card, width: 1.2 });
      txt(ctx, '位移曲线 x(θ)', W - 14, cy - 2, { size: 7.5, align: 'right', color: C.faint });
      tag(ctx, '拖动画面转曲柄', 12, H - 12, C.faint, 7.5);
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      if (!dragging && !reduce) theta = (theta + 0.75 * dt) % TAU;
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onDown(e) {
      dragging = true;
      dragX = e.clientX;
      canvas.setPointerCapture?.(e.pointerId);
    }
    function onMove(e) {
      if (!dragging) return;
      theta = (theta + (e.clientX - dragX) * 0.012 + TAU) % TAU;
      dragX = e.clientX;
    }
    function onUp() { dragging = false; }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    last = performance.now();
    draw();
    if (!reduce) raf = requestAnimationFrame(frame);

    return function destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }

  /* ---------------- 导出 ---------------- */
  window.DEMOS = {
    crank: crankDemo,
    gears: gearDemo,
    cutting: cuttingDemo,
    spring: springWorkDemo,
    inertia: inertiaDemo,
    beam: beamDemo,
    shm: shmDemo,
    damping: dampingDemo,
    taylor: taylorDemo
  };
  window.initHero = initHero;
})();
