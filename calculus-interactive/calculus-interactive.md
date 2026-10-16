The user wants a webpage to help university freshmen understand single-variable calculus (understanding velocity, acceleration, rate of change, and integrals). The file was deleted — that's fine, this is a new request.

Where to place it? Previous request placed files in ~/MY/Git/sandbox/ai-workspace/. This new request says "请编写一个网页" without specifying location. The previous context used ai-workspace directory. I'll put it there: /Users/dylanyin/MY/Git/sandbox/ai-workspace/calculus.html.

This is an educational interactive webpage. I should build a self-contained HTML file with:
- Interactive demos: velocity/position, derivative as slope (tangent line slider), rate of change, integral as area under curve
- Interactive widgets: draggable h to see (f(x+h)-f(x))/h approach f'(x), Riemann sums with adjustable n, position-velocity-acceleration connection

The inline_visuals section suggests using PureShowWidget for visuals, but the user explicitly asked for a webpage (网页) — a file deliverable. So create an actual HTML file. The html-report-presentation plugin has html-report skill for "self-contained HTML deliverable... data visualizations" — this is an educational interactive page. The skill instructions say when a skill matches, invoke it BEFORE generating response. The trae-remote-official:html-report-presentation:html-report skill matches "Create any self-contained HTML deliverable" — an educational webpage qualifies.

Hmm, but should I invoke the Skill tool? The user wants an interactive educational webpage. The html-report skill is for polished HTML pages. Let me invoke it to get the guidance.

Actually, let me think about whether this is needed. The system prompt says: "When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task." The html-report skill covers "research reports, whitepapers, PRDs, dashboards, portfolios, resumes, email templates, data visualizations, and more" — an interactive educational webpage fits "any self-contained HTML deliverable except slides". So I should invoke the skill.

Let me invoke Skill with name "trae-remote-official:html-report-presentation:html-report".

我来创建一个面向大一新生的交互式微积分教学网页。先规划再实现。

**页面规划**
- **主题**：单变量微积分直观入门（速度 → 变化率/导数 → 积分）
- **风格**：Education 领域 → Fresh Gradient 清新渐变风格
- **核心交互演示**（Canvas 实现）：
  1. 平均速度 → 瞬时速度（拖动 Δt 逼近 0，割线变切线）
  2. 切线与导函数联动（拖动点，同步画出 f′(x)）
  3. s(t)–v(t)–a(t) 三联图（匀加速运动，直观理解两层导数）
  4. 黎曼和逼近积分（拖动 n 看矩形逼近面积）
- **收尾**：微积分基本定理 + 小结卡片
The user wants an interactive teaching webpage for single-variable calculus for university freshmen, covering:
1. 速度与加速度 (velocity and acceleration)
2. 变化率（导数）(rate of change / derivative)
3. 积分 (integrals)

This is an educational interactive webpage — Education domain → Fresh Gradient style per the skill.

Plan:
- Meta: Type: Interactive teaching webpage; Topic: 单变量微积分入门（导数与积分的直观理解）; Audience: 大一新生; Language: 中文

Structure:
1. Hero: 微积分是什么 —— 从"运动"说起
2. 第 1 章：从平均速度到瞬时速度（变化率的直觉）
   - Interactive: 一辆车的位移-时间曲线 s(t)，拖动区间宽度 Δt，看平均速度 (Δs/Δt) 如何逼近瞬时速度。割线→切线动画。
   - 结论：导数 = 瞬时变化率 = 切线斜率
3. 第 2 章：导数——切线的斜率
   - Interactive: f(x) 曲线（可选几组函数），拖动点 x，看切线；同时显示导函数图像同步绘制
   - 速度是位移的导数，加速度是速度的导数
4. 第 3 章：加速度与 v-t 图
   - Interactive: 匀加速运动 v(t) = a·t，加速度是斜率；或者三个联动图：s(t), v(t), a(t)
5. 第 4 章：积分——把变化"加回来"
   - Interactive: 速度曲线下的面积 = 路程。拖动 n 调整矩形数量（黎曼和），看逼近曲线下面积
   - 微积分基本定理：导数与积分互为逆运算
6. 总结 + 常见疑问 FAQ / 小结卡片

Key interactive widgets (canvas-based, custom JS is better than ECharts for these interactive demos):
1. 平均速度→瞬时速度 slider (Δt → 0)
2. 切线与导函数联动 (drag point on f(x), see tangent slope plotted as point on f'(x))
3. s(t), v(t), a(t) 三联图 (匀加速运动)
4. 黎曼和 slider (n 矩形)

The skill mandates ECharts for data charts, but these are interactive demos (drag, slider) — ECharts is not ideal for custom interactive canvas demos. The skill says inline SVG only for simple graphics; interactive stuff... The skill is oriented toward static reports. For an interactive teaching page, custom canvas JS is the right tool. I'll implement the interactive demos with vanilla canvas in assets/charts.js or a separate assets/demos.js. The skill says chart logic must be in external JS files, not inline script blocks. I'll follow: put all demo logic in assets/demos.js.

Do I need ECharts? Maybe for one or two static-ish charts, but honestly the interactive canvas demos cover everything. To respect the skill, I could include one ECharts chart... Actually the mandate "All quantitative data charts MUST use ECharts" applies to data charts. My demos are interactive simulations, not data charts. I'll build them with canvas. I could still include one ECharts figure showing 例如 f(x)=x² 的导数曲线 as a static chart — but the interactive demo 2 already does that better. I'll skip ECharts to keep the page lean; the demos are custom interactive canvas widgets which is the core value. Hmm, but the skill says ECharts inclusion is mandatory IF charts are used. If no ECharts charts, no need to include the lib. That's acceptable.

Actually, let me reconsider — a hybrid: use canvas demos for the 4 interactive widgets. That's cleaner and truly interactive. No ECharts needed. No generated images needed either — could add a hero illustration via GenerateImage. A nice touch but text-in-image risk; a simple math-themed hero illustration could work. Let me generate one hero image (landscape_16_9) with abstract math curves illustration, no text. That adds visual polish. OK.

Scaffolding: run new-report.sh <name> <output-dir>. Output dir: /Users/dylanyin/MY/Git/sandbox/ai-workspace (user previously wanted files there; this request doesn't specify but consistent with previous). Report name: calculus-interactive or 微积分... use slug "calculus-for-freshmen" or "single-variable-calculus". I'll use "calculus-interactive".

Fonts: check canvas-fonts directory for available fonts. For Chinese text, the canvas-fonts likely include something like Noto Sans SC? Let me check the skill directory fonts.

Steps:
1. Scaffold via new-report.sh
2. Check fonts available, copy needed fonts
3. Write plan (in reasoning — this is a multi-visual complex page, but I'll keep plan concise; skill says 5+ chapters or multiple visuals SHOULD create plan.md; I have ~5 sections + 4 interactive demos. I'll create a brief plan.md in the report dir? It says "in your temporary work directory". I can keep it in reasoning to avoid file bloat; it's borderline. I'll keep in reasoning — the structure is clear.)
4. Generate hero image
5. Write HTML + demos.js
6. Verify in browser (start http server, browser test)

Let me start. First scaffold and check fonts.

无中文字体可用，标题拉丁字体用 BricolageGrotesque + 数字用 JetBrainsMono，中文回退系统字体。先复制字体并生成头图。
No Chinese fonts available in canvas-fonts. The page is in Chinese, so I should use system Chinese fonts (PingFang SC, Microsoft YaHei) and use a Latin font from canvas-fonts for headings/numbers. I'll use:
- Heading font: BricolageGrotesque-Bold (modern, fresh) for Latin/numbers, fallback to PingFang SC for Chinese
- Body: system Chinese fonts
- Mono: JetBrainsMono for math/numbers

Copy fonts: BricolageGrotesque-Bold, BricolageGrotesque-Regular, JetBrainsMono-Regular, JetBrainsMono-Bold.

Actually, loading TTF fonts for just Latin glyphs is fine — Chinese chars fall back to system fonts. 

Now generate hero image. Prompt: abstract illustration of calculus concepts — flowing curves, tangent lines, area under curve, no text. landscape_16_9.

Then write HTML and demos.js. Let me design the demos carefully:

**Demo 1: 平均速度 → 瞬时速度**
- s(t) = t² 之类。Actually use a nice curve: s(t) = 20·sin(t/2) + t²/4? Keep simple: s(t) = t². Range t ∈ [0, 5], s ∈ [0, 25].
- Slider: Δt from 2 → 0.05. Fixed point t₀ = 2 (or draggable? keep t₀ fixed at 2, slider for Δt).
- Show secant line through (t₀, s(t₀)) and (t₀+Δt, s(t₀+Δt)), display 平均速度 = (s(t₀+Δt)−s(t₀))/Δt = 4+Δt, approaching 4 m/s.
- Canvas with curve, secant, points, readout panel.

**Demo 2: 切线与导函数联动**
- f(x) selectable: x²/4 (曲线1), sin(x)+x/3, maybe x³/8−x. Keep two-three functions via buttons.
- Drag point x along curve → tangent line drawn; slope value plotted as a dot on a second mini-canvas below (f'(x) trace accumulates as you drag).
- Show readout: f(x), f'(x).

**Demo 3: s(t), v(t), a(t) 三联图**
- 匀加速运动: v(t) = a·t, s(t) = a·t²/2, a(t) = const. Or use car example: v(t) = 3t, a = 3.
- Three small canvases stacked, with dashed vertical cursor line synced across all three; hover/drag time t to see values. Highlight: slope of s = v, slope of v = a. Annotate.

**Demo 4: 黎曼和 → 积分**
- v(t) = 3t (速度从 0 加速到 15 m/s over 5s), area = ½·3·25 = 37.5 m 路程.
- Slider n: 1 → 60 rectangles (left/mid? mid-sum nicer). Show rectangle sum vs exact area; as n increases, sum → 37.5.
- Readout: n, 矩形和, 精确面积 (积分值).

Also chapter on 微积分基本定理: d/dt ∫ f = f; 导数和积分互逆. Maybe a small static visual.

Content sections:
0. Hero — 微积分：理解变化的数学
1. 第一章 从"平均"到"瞬时"——变化率 (Demo 1)
   - 速度表上的数字是哪来的？平均速度公式，Δt→0 极限思想,导数定义 lim Δs/Δt
2. 第二章 导数：切线的斜率 (Demo 2)
   - 几何直观,导函数,记号 f'(x), dy/dx
3. 第三章 速度、加速度：层层求导 (Demo 3)
   - s→v→a chain; 物理意义
4. 第四章 积分：把变化累加回来 (Demo 4)
   - 面积=路程, 黎曼和, ∫ 记号, 定积分
5. 第五章 一枚硬币的两面——微积分基本定理
   - 简短说明 + 逆运算关系图 (inline SVG 或文字卡片)
6. 小结速查卡 (表格: 概念/直观/记号/例子)

MathJax? For formulas — skill says no remote URLs. MathJax from CDN forbidden. Render formulas with HTML/CSS (sub/sup, fraction via styled spans). Keep formulas simple: lim_{Δt→0}, Δs/Δt as styled fraction. I can build small CSS fractions (.frac with stacked spans). OK.

Layout: centered column max-width 900px, hero with generated image, sticky mini nav? Keep simple: top nav anchor links. Fresh gradient style: low-saturation radial gradients, frosted cards.

Palette (Fresh Gradient, education):
- --bg: #f7f9fc
- --bg2: #ffffff (cards rgba(255,255,255,0.72) with blur)
- --ink: #1a2233
- --muted: #5a6478
- --rule: #dfe5f0
- --accent: #4f6df5 (indigo blue)
- --accent2: #22b8a6 (teal)
- plus gradient accents linear-gradient(135deg, #4f6df5, #22b8a6)

Canvas colors read from CSS vars in demos.js.

Now execute: copy fonts, generate hero image, then write files. demos.js will be sizable (~500 lines). Let me write carefully.

Canvas demos details:

Common helpers: setupHiDPI(canvas), axes drawing, mapping functions.

Demo1: canvas 640x360 (CSS width 100%, height ~340). s(t)=t², t∈[0,5], s∈[0,25]. t₀=2. Δt slider 2→0.05 step 0.01, default 2. Readout: Δt, 平均速度=(2Δt+4) wait s=t²: (s(t0+Δt)-s(t0))/Δt = (4+2Δt) → 4. Show secant extended, and tangent line (accent2 dashed) as target. Points A, B labeled. As Δt→0, B slides toward A and secant → tangent. 

Also allow dragging A? Keep t₀ fixed = 2 for clarity, mention s(t)=t².

Demo2: f options: 
- f1: x²/5, x∈[-4,4] → f'=2x/5
- f2: sin(x)·2 + x/2, x∈[-4,4]? f'=2cos(x)+0.5. values fine.
- f3: x³/16 − x/2 → f' = 3x²/16 − 0.5? hmm x³/12 − x: f' = x²/4 − 1. nicer (has extrema). f(x)=x³/12 − x, x∈[-4,4], f(±?) range: f(-4)=-64/12+4=-1.33, f(4)=21.33-4=17.33 too big. scale: x³/20 − x: f(4)=3.2-4=-0.8, f(-4)=0.8. max f' = x²/4−1... f' at 4 = 3. ok range f∈[-3,3] roughly (compute min at x=±sqrt(20/3)≈2.58: f=17.2/20−2.58≈−1.72). Fine.
Buttons to switch f. Drag on canvas to set x (pointer events). Tangent drawn, slope dot plotted on lower mini-canvas f' trace: precompute full f' curve faint + dot at current x. Actually better: draw full f' curve directly on lower canvas faintly, and highlight dot at current x — shows the whole derivative function; the "trace" idea is nice but precomputed curve is clearer. I'll draw faint full f' + bright dot. Readouts: x, f(x), f'(x).

Demo3: three canvases (or one canvas with 3 panels). One canvas 640x420 with 3 stacked panels: s(t)=1.5t², v(t)=3t, a(t)=3, t∈[0,5]. Draggable time cursor. Dashed lines across panels at t. Panel shows current values. Arrows/annotation: "斜率 = v" on s panel, "斜率 = a" on v panel. Draw tangent segment on s and v at cursor t to reinforce.

Demo4: canvas 640x360: v(t)=3t, t∈[0,5]. n slider 1→60 default 8. Rectangles midpoint. Show Σ value and exact 37.5. Fill rectangles accent with opacity, curve bold. Readout panel: n, 矩形总面积, 精确积分值 37.5 m, 差值.

Formula rendering: use .frac CSS class:
```html
<span class="frac"><span class="num">Δs</span><span class="den">Δt</span></span>
```

OK. Also hero image. GenerateImage with prompt: "Minimal flat vector illustration for a calculus learning page: a smooth flowing curve with a tangent line touching it, and shaded area under the curve, abstract geometric shapes, indigo blue and teal palette on light background, clean, modern, no text" landscape_16_9 → assets/hero_1280x720.png.

Also maybe a second small illustration for 微积分基本定理 section — skip, use inline SVG diagram (简单：两条箭头 f ↔ F 逆运算). Inline SVG is allowed for simple graphics.

Now write files. First copy fonts + generate image in parallel.

头图已生成。现在编写主页面 HTML。
Hero image generated (saved as .jpg). Now write the main HTML file and demos.js. Note the file saved is assets/hero_1280x720.jpg.

Let me now write the HTML. I'll read the scaffolded HTML first (required before Write on existing file).

Now write the full HTML. Structure:

- Hero: full-width-ish header with image right / text left
- Nav anchors
- 第 1 章 平均 → 瞬时 (demo1)
- 第 2 章 导数 = 切线斜率 (demo2)
- 第 3 章 速度·加速度 (demo3)
- 第 4 章 积分 (demo4)
- 第 5 章 基本定理 (inline SVG)
- 速查表
- footer (no external sources needed — it's educational content; skip sources section or keep minimal. No citations used, so omit sources list)

Demo containers: each demo in a .demo card with canvas + controls + readout. All logic in assets/demos.js.

Formulas via CSS fractions. Key notation:
- 平均速度 = Δs/Δt = (s(t+Δt) − s(t))/Δt
- v(t) = lim_{Δt→0} Δs/Δt = s'(t) = ds/dt
- a(t) = v'(t)
- ∫_a^b v(t) dt = s(b) − s(a)

Fonts: BricolageGrotesque for headings (Latin), body: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif. Mono: JetBrainsMono.

Fresh Gradient: bg #f6f8fc with radial gradient overlays, cards rgba(255,255,255,0.72) + blur, accent gradient.

Now, demo design decisions (final):

**demo1** s(t)=t² (位移 m, 时间 s), t∈[0,4], s∈[0,16]. t0=1? If t0=1, secant slope = 2+Δt → 2. Hmm nice numbers. t0=2 → slope →4. Use t0 = 2. Δt slider 1.5 → 0.01. Curve, point A fixed, point B at t0+Δt, secant line through A,B extended, dashed target tangent line at A (accent2). Readouts: Δt, Δs, 平均速度 = (4+2Δt) → 显示 toFixed(2), and hint "当 Δt→0 时 → 4 m/s（瞬时速度）".

Canvas coords: x t∈[0,4.2], y s∈[0,17]. 

**demo2** functions:
- 名称 "抛物线", f(x)=x²/5, f'(x)=2x/5, x∈[-4,4], f∈[0,3.2]. y range [-4,4]? Use y∈[-3.5,3.5].
- "正弦波", f(x)=2sin(x)+x/2? f(4)=2sin4+2=2(-0.757)+2=0.487, f(-4)=-0.487... f' = 2cos x + 0.5, range [-1.5,2.5]. f range: at x=π/2≈1.57: 2+0.785=2.79. ok y∈[-3.5,3.5] fine.
- "三次曲线", f(x)=x³/20−x, f' = 3x²/20 −1, f(-4)=-64/20+4=0.8, f(4)=-0.8, min at x=±sqrt(20/3)·... f(x) extrema where f'=0: x=±sqrt(20/3)≈±2.58, f(2.58)=17.2/20−2.58=−1.72, f(−2.58)=1.72. y∈[-3.5,3.5] ok.

Drag x via pointer. Lower panel: f' curve faint full + bright dot at (x, f'(x)). Also tangent on upper. Readouts: x, f(x), f'(x)=slope.

Both panels stacked in one canvas? Two canvases: top 640x300, bottom 640x160. Single canvas with two panels easier for pointer mapping — use one canvas 640x480, top region y 0..320 for f, bottom 320..480 for f'. Hmm CSS responsive: canvas width 100% via CSS, internal coords fixed 640x480 * dpr. Pointer: map via getBoundingClientRect scale. OK.

**demo3** one canvas 640x430, three panels each ~130px tall: s(t)=1.5t², v=3t, a=3, t∈[0,5]. Drag anywhere to move cursor t. Show values with dots + dashed crosshair. Tangent hint segments on s and v panels. Readout row: t, s, v, a.

**demo4** v(t)=3t, t∈[0,5], v∈[0,15]. n slider 1..60 default 8. Midpoint rectangles. Exact = 37.5. Readout: n, 矩形和, 精确值 37.5, 误差. Curve + filled area subtle + rectangles.

All demos share helpers: hidpi setup, plot axes, function plotting.

Also a progress/nav: sticky top nav with anchor links (第一章…). Keep simple sticky header with links; on mobile wraps.

Callout cards: "直觉" boxes with accent left border. Key terms with <mark class="key">.

Table: 概念速查 (概念 | 一句话直觉 | 记号 | 例子): 变化率/导数/积分/基本定理.

Inline SVG for 基本定理: flow: s(t) --求导--> v(t) --积分--> s(t) round trip. Simple two-node diagram with arrows labeled "求导 d/dt" and "积分 ∫dt". Inline SVG allowed (simple).

Formulas CSS:
```css
.frac { display: inline-flex; flex-direction: column; text-align:center; vertical-align: middle; margin: 0 .2em; line-height:1.15; }
.frac .num { border-bottom: 1.5px solid currentColor; padding: 0 .25em; }
.frac .den { padding: 0 .25em; }
.formula { font-family: var(--font-mono); background: var(--bg2); border:1px solid var(--rule); border-radius:10px; padding: .9rem 1.2rem; text-align:center; font-size: 1.05rem; overflow-x:auto; }
.lim { ... } use "lim" with under text: <span class="lim">lim<span class="under">Δt→0</span></span>
```

Write demos.js (~450 lines) then HTML. Also note skill says script src assets/charts.js for chart logic; I'll name it assets/demos.js (allowed pattern: split into multiple files). 

Let me write demos.js first.

Details for drawing helpers:

```js
function setupCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = w + '/' + h;  // maintain ratio
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
```
CSS: canvas { width:100%; height:auto; display:block; } with aspect-ratio. Actually setting style.height via aspectRatio works.

Plot helper:
```js
function makePlot(ctx, rect, xr, yr) {
  // rect: {x,y,w,h} in CSS px; xr=[xmin,xmax], yr=[ymin,ymax]
  const sx = v => rect.x + (v - xr[0]) / (xr[1]-xr[0]) * rect.w;
  const sy = v => rect.y + rect.h - (v - yr[0]) / (yr[1]-yr[0]) * rect.h;
  return { X: sx, Y: sy, rect, xr, yr };
}
function axes(ctx, p, opts) // grid lines, axis labels with mono font
function curve(ctx, p, fn, color, width) // sample across xr
```

Colors: read CSS vars at start.

Demo1 render:
- plot rect with padding for labels
- grid, axes labeled t(s), s(m)
- curve s=t²
- tangent at t0 (dashed accent2): slope 4
- secant (accent solid): through A,B
- A dot ink, B dot accent
- labels: A (2,4), B(t0+Δt, s)
- vertical dashed drops to axes maybe. Keep moderate.

Readout DOM: `#d1-dt`, `#d1-ds`, `#d1-v`, plus bar showing 平均速度 vs 4? A simple numeric + "趋近" note. Also maybe a small strip showing secant slope number converging. Keep numeric readout chips.

Demo2:
- canvas 640x470. top panel rect: pad, plot f; bottom panel plot f'.
- state: fIdx, x (=0.8 default)
- pointerdown/move: compute t from top panel rect → clamp [-4,4] → x; redraw.
- top: curve f, tangent line (slope f'(x)), point, vertical cursor.
- bottom: curve f' faint accent2, dot at (x, f'(x)) accent2 bright, dashed connector? fine.
- labels on panels: "f(x)" "f′(x) —— 斜率被记录在下方".
- function switch buttons (radio-style).
- readouts: x, f(x), 切线斜率=f'(x).

Demo3:
- canvas 640x440, 3 panels stacked with gaps. t cursor default 2.5, draggable via pointer x.
- panels: s (accent), v (accent2), a (muted/dark).
- dots at cursor on each; dashed vertical line through all.
- tangent segment on s (slope v) and on v (slope a) — draw short tangent lines at cursor.
- annotation text on panels: "斜率 = v(t)" etc.
- readouts: t, 位置 s, 速度 v, 加速度 a.

Demo4:
- canvas 640x360. v=3t curve, t∈[0,5], v∈[0,16].
- slider n (1..60). mid rectangles: width dt=5/n; sum Σ v(mid)*dt.
- fill area under curve with accent 8% opacity; rectangles accent 25% with accent border top? stroke accent.
- exact line/label 37.5.
- readouts: n, 矩形和, 精确值 37.5m, 误差.

Pointer events need canvas.getBoundingClientRect and scale = 640 / rect.width.

Fonts in canvas: '12px JetBrainsMono' for numbers, '12px sans-serif' Chinese labels. Chinese in canvas: use '"PingFang SC","Microsoft YaHei",sans-serif'.

Note: canvas fonts may load after font ready; acceptable.

Now write the files. demos.js: I'll write it now carefully.

For the HTML: sections with .card demo wrappers, controls with range inputs styled, readout chips. Sticky nav. Hero: grid 2 cols (text left, image right), gradient text title.

Length: aim complete but not bloated. Let me write.

Now write the main HTML file. I've read the scaffold already so Write is allowed. Let me compose the full page.

页面和交互脚本已完成。启动本地服务器，用浏览器验证四个交互演示。
Now verify in browser. Start HTTP server and run browser test.

Checked Items:
- 1, 页面整体渲染（顶部导航、Hero 区、章节排版）, PASS. Evidence: 成功打开 http://localhost:8642/calculus-interactive.html，顶部导航、Hero 区（含右侧插画）、章节排版均正常显示，无布局异常。
- 2, 演示 1（d1）Canvas 曲线/割线绘制及 Δt 滑块接近 0 时平均速度读数, PASS. Evidence: Canvas 已绘制曲线与割线；将 Δt 滑块设为 0.05 后，平均速度读数显示为 4.05 m/s，接近瞬时速度 4 m/s。
- 3, 演示 2（d2）Canvas 拖动事件与“正弦波”按钮切换, PASS. Evidence: 在 d2 Canvas 上 dispatch pointerdown/pointermove/pointerup 事件后，x / f(x) / 切线斜率读数发生变化；点击“正弦波”按钮后切换生效。
- 4, 演示 3（d3）拖动事件与 t / s / v / a 读数变化, PASS. Evidence: 在 d3 Canvas 上模拟拖动后，时刻 t、位置 s(t)、速度 v(t)、加速度 a(t) 读数均正常变化。
- 5, 演示 4（d4）n=60 时矩形总面积与误差, PASS. Evidence: 将 n 滑块设为 60 后，“矩形总面积”显示为 37.5 m，误差显示为 0 m，符合预期。
- 6, 控制台 JS 报错检查, PASS. Evidence: browser_console_messages 返回无任何控制台消息，页面运行无 JS 报错。

Notes:
- Current usage: 16 / 60 step budget.
- 所有四个交互演示均可正常工作，页面渲染与控制台均无异常。

全部测试通过。停掉测试服务器。
All 6 test items pass, no console errors. Stop the HTTP server and deliver the summary.

微积分交互式教学网页已完成并通过浏览器实测（四个演示全部工作正常，控制台零报错）。

**入口**：[calculus-interactive.html](computer:///Users/dylanyin/MY/Git/sandbox/ai-workspace/calculus-interactive/calculus-interactive.html)（双击或任意静态服务器打开，零外部依赖）

**内容与交互设计** — 按“直觉先行、公式殿后”的顺序组织：

| 章节 | 核心直觉 | 交互演示 |
|---|---|---|
| 01 变化率 | 速度表显示的是“瞬时”，由“平均”取极限而来 | 拖动 Δt→0，割线贴合切线，平均速度收敛到 4 m/s |
| 02 导数 | 导数 = 切线斜率，逐点记录斜率得到导函数 | 拖动曲线上的点，下方实时“画出” f′(x)；可切换三种曲线 |
| 03 速度与加速度 | s 图的斜率画出 v 图，v 图的斜率画出 a 图 | 三联图共享时间游标，拖动观察同一时刻三者的关系 |
| 04 积分 | 曲线下面积 = 路程，矩形切得越细越准 | 调节 n 看黎曼和逼近 37.5 m，误差实时显示 |
| 05 基本定理 | 求导与积分互逆（SVG 关系图） | — |
| 06 速查表 | 六个概念 × 直觉 × 记号 × 例子 | — |

每个公式都配有可读的中文直觉标注（如 "lim" 下方注 Δt→0、“切/合”比喻），适合零基础新生自主阅读。
