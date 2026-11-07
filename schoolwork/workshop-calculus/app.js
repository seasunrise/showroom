/* =========================================================
   高数在车间 · Workshop Calculus
   课程数据、首页渲染、课时渲染与交互
   ========================================================= */
(function () {
  'use strict';

  const CHAPTERS = [
    {
      no: '01', en: 'RATES OF CHANGE',
      title: '变化率：机构里的导数',
      desc: '从位置到速度、从齿数到转速、从成本曲线到最优点——导数在车间里不是符号，而是"有多快、往哪变、什么时候停"。',
      math: 'd/dt'
    },
    {
      no: '02', en: 'ACCUMULATION',
      title: '累积：强度、惯量与做功',
      desc: '把无数个小量加起来，弹簧储能、飞轮惯量、梁的挠度就都有了答案。积分是把局部拼成整体的工具。',
      math: '∫ f dx'
    },
    {
      no: '03', en: 'DIFFERENTIAL EQUATIONS',
      title: '微分方程：让机械稳住',
      desc: '振动不是三角函数练习，而是二阶微分方程的解。看懂它，才知道机床为什么会颤、减振器该怎么调。',
      math: 'x″ + ω²x = 0'
    }
  ];

  const LESSONS = [
    {
      id: 'crank', demo: 'crank', ch: 0, no: '01',
      title: '曲柄滑块', en: 'CRANK-SLIDER MECHANISM', tag: '导数',
      tagline: '位置曲线有多陡，滑块就有多快；再陡一点的程度，就是加速度。',
      blurb: '冲床与发动机里最常见的机构：把导数画在活塞上。',
      note: '拖动画面转曲柄，或调节右侧参数',
      fig: '曲柄滑块：一个周期内的位移、速度与加速度（各自归一化）',
      hud: [
        { k: 'theta', label: '转角 θ' }, { k: 'x', label: '位移 x' },
        { k: 'v', label: '速度 v' }, { k: 'a', label: '加速度 a', hot: true }
      ],
      body: `
        <p>冲床、内燃机、牛头刨床里都藏着同一个机构：<b>曲柄滑块</b>。曲柄匀速转动，滑块却不是匀速前进——它在两端慢下来，在行程中间冲得最快。</p>
        <p>把曲柄转角记作 θ = ωt，滑块位置是 <mark>x(θ) = r cos θ + √(L² − r² sin²θ)</mark>。位置对时间求一次导，得到速度；再求一次，得到加速度。<b>曲线有多陡，就是导数有多大。</b></p>
        <p>看下方三条曲线：位移到死点时速度归零，而加速度在死点附近达到峰值——这正是发动机振动和惯性力的来源。</p>
      `,
      formula: `
        <div class="fx"><b>x</b> = r cos θ + √(L² − r² sin² θ)</div>
        <div class="fx"><b>v</b> = <span class="frac"><span>dx</span><span>dt</span></span> = <span class="frac"><span>dx</span><span>dθ</span></span> · ω</div>
        <div class="fx"><b>a</b> = <span class="frac"><span>d²x</span><span>dt²</span></span> <span class="dim">（再求一次导）</span></div>
      `,
      controls: [
        { t: 'range', k: 'rpm', label: '曲柄转速（演示慢放）', min: 6, max: 36, step: 1, val: 24, unit: ' r/min' },
        { t: 'range', k: 'r', label: '曲柄半径 r', min: 20, max: 60, step: 1, val: 40, unit: ' mm' },
        { t: 'range', k: 'ratio', label: '连杆长度 L / r', min: 2, max: 6, step: 0.1, val: 4, unit: ' ×' }
      ],
      callout: '冲床把工作行程安排在下死点附近：那里滑块速度接近零，力量最大、冲击最小；而高速发动机必须加平衡块，因为死点处的加速度峰值会带来巨大的往复惯性力。',
      think: {
        q: '滑块在最两端速度为零，为什么不是"停住"了？',
        a: '速度为零只是一个瞬间的转向点（死点），加速度并不为零；下一瞬间速度就反向增大。导数为零只说明"这一瞬间的变化率为零"，不代表运动结束。'
      }
    },
    {
      id: 'gears', demo: 'gears', ch: 0, no: '02',
      title: '齿轮传动', en: 'GEAR TRAIN', tag: '链式法则',
      tagline: '两个齿轮咬在一起，节圆线速度必须相同；转速只能按齿数反比分配。',
      blurb: '传动比不是背出来的，是链式法则算出来的。',
      note: '拖动画面可手动转动齿轮',
      fig: '外啮合齿轮：齿数、转速与节圆线速度',
      hud: [
        { k: 'z1', label: '主动轮 z₁' }, { k: 'z2', label: '从动轮 z₂' },
        { k: 'i', label: '传动比 i', hot: true }, { k: 'n2', label: '输出转速 n₂' }
      ],
      body: `
        <p>齿轮是机械里最诚实的"数学机器"：两个节圆在节点处必须拥有相同的线速度，否则轮齿会互相刮擦。</p>
        <p>设主动轮齿数 z₁、转速 n₁，从动轮 z₂、转速 n₂，则 <mark>n₁z₁ = n₂z₂</mark>。换成角速度就是 ω₂ = ω₁ · z₁/z₂。</p>
        <p>从数学上看，这是<b>链式法则</b>：θ₂ 是 θ₁ 的函数，而 θ₁ 又是时间的函数，所以 dθ₂/dt = (dθ₂/dθ₁)(dθ₁/dt)。传动比，就是那个"中间导数"。</p>
      `,
      formula: `
        <div class="fx"><b>ω₂</b> = ω₁ · <span class="frac"><span>z₁</span><span>z₂</span></span> <span class="dim">，i = z₂/z₁ = n₁/n₂</span></div>
        <div class="fx"><span class="frac"><span>dθ₂</span><span>dt</span></span> = <span class="frac"><span>dθ₂</span><span>dθ₁</span></span> · <span class="frac"><span>dθ₁</span><span>dt</span></span></div>
        <div class="fx"><b>v</b>节圆 = ω₁r₁ = ω₂r₂</div>
      `,
      controls: [
        { t: 'range', k: 'z1', label: '主动轮齿数 z₁', min: 12, max: 40, step: 1, val: 18, unit: ' 齿' },
        { t: 'range', k: 'z2', label: '从动轮齿数 z₂', min: 12, max: 60, step: 1, val: 36, unit: ' 齿' },
        { t: 'range', k: 'n1', label: '主动轮转速（演示慢放）', min: 20, max: 80, step: 1, val: 40, unit: ' r/min' }
      ],
      callout: '减速器、机床主轴箱、汽车变速箱都在做同一件事：小齿轮带大齿轮，转速降下来，扭矩升上去。忽略损失时功率 P = Tω 守恒，转速降多少，扭矩就升多少。',
      think: {
        q: '为什么齿数少的齿轮转得更快？',
        a: '同样一段时间里，两个齿轮"走过"的齿数必须相同。齿数少的齿轮每一转用掉的齿少，所以必须转更多圈才能跟上对方。'
      }
    },
    {
      id: 'cutting', demo: 'cutting', ch: 0, no: '03',
      title: '切削速度', en: 'CUTTING SPEED', tag: '极值',
      tagline: '速度越高，加工越快；但刀具磨得也越快。最省钱的点，出现在导数为零处。',
      blurb: '用一条 U 形成本曲线，讲清楚导数为什么能找最优。',
      note: '拖动 v 观察成本曲线，或点"自动找最优点"',
      fig: '车削加工的单件成本：加工成本下降、换刀成本上升',
      hud: [
        { k: 'cost', label: '单件成本', hot: true }, { k: 'life', label: '刀具寿命' },
        { k: 'vstar', label: '最优 v*' }, { k: 'spindle', label: '主轴转速' }
      ],
      body: `
        <p>车间里最贵的选择之一，是切削速度调多少。速度高，单件加工时间短；但刀具磨损快，换刀成本又上来了。</p>
        <p>泰勒公式给出刀具寿命 T = (C/v)^(1/n)。把"加工成本"和"换刀成本"相加，得到一条先降后升的总成本曲线——它的最低点，正好是<b>导数为零</b>的地方。</p>
        <p>这就是高数里的极值问题：不必试遍所有转速，只要令 dC/dv = 0，解出 v*。图中橙色虚线就是当前速度处的切线；在最优点，切线恰好水平。</p>
      `,
      formula: `
        <div class="fx"><b>T</b> = (C/v)<sup>1/n</sup> <span class="dim">（泰勒刀具寿命）</span></div>
        <div class="fx"><b>C</b>总(v) = c<sub>m</sub>·K/v + c<sub>t</sub>·K·v⁴/C⁵</div>
        <div class="fx">dC总/dv = 0 <span class="dim">→</span> <b>v*</b> = (c<sub>m</sub>C⁵ / 4c<sub>t</sub>)<sup>1/5</sup></div>
      `,
      controls: [
        { t: 'range', k: 'v', label: '切削速度 v', min: 60, max: 240, step: 1, val: 110, unit: ' m/min' },
        { t: 'range', k: 'ct', label: '每次换刀成本 c_t', min: 10, max: 80, step: 1, val: 30, unit: ' 元' },
        { t: 'button', label: '自动找到最优点', action: 'autoFind' }
      ],
      callout: '数控编程里的切削参数库、刀具样本上的推荐 v_c，本质都在解这个极值问题。泰勒公式 1907 年提出，今天仍在车间里用。',
      think: {
        q: '如果刀具很便宜，最优点会往哪边移？',
        a: '换刀成本 c_t 越小，v* 越往右移——可以更激进地提高速度。把右侧的"每次换刀成本"调到最小，再点一次"自动找到最优点"看看。'
      }
    },
    {
      id: 'spring', demo: 'spring', ch: 1, no: '04',
      title: '变力做功', en: 'WORK OF A SPRING', tag: '定积分',
      tagline: '弹簧越拉越费劲，所以不能拿最后的力乘全程；把每一小段 F·dx 加起来，才是真正的功。',
      blurb: '力–位移曲线下的面积，就是积分最直观的样子。',
      note: '左右拖动画面，或调节拉伸量',
      fig: '弹簧拉伸：F = kx 曲线下的面积即做功 W = ½kx²',
      hud: [
        { k: 'x', label: '伸长 x' }, { k: 'F', label: '拉力 F' },
        { k: 'W', label: '做功 W', hot: true }, { k: 'favg', label: '平均力 F̄' }
      ],
      body: `
        <p>把弹簧从 0 拉到 x，力从 0 一路涨到 kx。如果拿最后的力乘全程，就会高估做功——因为前半程你根本没使那么大劲。</p>
        <p>正确的做法：把全程切成无数小段，每一小段近似为恒力，做一点功 F·dx，再全部加起来。这就是<b>定积分</b>，几何上就是 F–x 曲线下的面积。</p>
        <p>弹簧的 F = kx 是一条直线，所以面积是一个三角形：W = ½kx²。打开"对比 F·x"的开关，你会看到矩形比三角形大了一倍。</p>
      `,
      formula: `
        <div class="fx"><b>W</b> = ∫<sub>0</sub><sup>x</sup> F dx = ∫<sub>0</sub><sup>x</sup> kx dx = <b>½kx²</b></div>
        <div class="fx">平均力 <span class="dim">F̄ = W/x =</span> ½kx <span class="dim">（线性力的中点）</span></div>
      `,
      controls: [
        { t: 'range', k: 'k', label: '弹簧刚度 k', min: 2, max: 20, step: 1, val: 10, unit: ' N/mm' },
        { t: 'range', k: 'x', label: '拉伸量 x', min: 0, max: 50, step: 0.5, val: 40, unit: ' mm' },
        { t: 'toggle', k: 'compare', label: '对比 "用力乘全程" 的矩形 F·x', val: false }
      ],
      callout: '弹簧储能、缓冲器、板簧设计都按 ½kx² 计算。压缩到两倍行程，能量就是四倍——这也是弹簧会过热、会疲劳的原因之一。',
      think: {
        q: '把同一根弹簧从 0 拉到 2x，做功是原来的几倍？',
        a: '4 倍。W = ½kx²，与伸长量的平方成正比，不是线性增长。'
      }
    },
    {
      id: 'inertia', demo: 'inertia', ch: 1, no: '05',
      title: '转动惯量', en: 'MOMENT OF INERTIA', tag: '定积分',
      tagline: '同样 5 kg 的铁，放在轮心还是轮缘，转起来的"费劲程度"完全不同。',
      blurb: '为什么飞轮总把质量堆在轮缘？积分告诉你答案。',
      note: '调节内孔半径比 ρ，观察飞轮截面与 I 的变化',
      fig: '飞轮截面：内孔越大，质量越靠外，转动惯量越大',
      hud: [
        { k: 'I', label: '转动惯量 I', hot: true }, { k: 'E', label: '储能 E' },
        { k: 'k', label: '惯性半径 k' }, { k: 'ratio', label: 'I / (mR²)' }
      ],
      body: `
        <p>同样 5 kg 的铁，做成实心圆盘和做成薄圆环，转起来的"费劲程度"完全不同。这个费劲程度叫<b>转动惯量</b>。</p>
        <p>把物体切成无数小质量 dm，每一块对转轴的贡献是 r²dm——离轴越远，贡献按半径的平方增长。全部加起来，就是 I = ∫r²dm。</p>
        <p>实心圆盘 I = ½mR²；把质量全推到轮缘的薄圆环 I = mR²，整整大一倍。中间挖孔，就是把材料往外挪——右图这条曲线，就是"半径平方"在积分里的分量。</p>
      `,
      formula: `
        <div class="fx"><b>I</b> = ∫ r² dm</div>
        <div class="fx">实心圆盘 <b>I</b> = ½mR² <span class="dim">；</span> 薄圆环 <b>I</b> = mR²</div>
        <div class="fx">环形截面 <b>I</b> = ½m(R² + a²) <span class="dim">，ρ = a/R</span></div>
      `,
      controls: [
        { t: 'range', k: 'rho', label: '内孔半径比 ρ = a/R', min: 0, max: 0.95, step: 0.01, val: 0.35, unit: '' },
        { t: 'range', k: 'omega', label: '角速度 ω', min: 20, max: 200, step: 1, val: 80, unit: ' rad/s' }
      ],
      callout: '冲床飞轮、发动机飞轮、储能飞轮都把质量放在轮缘；自行车轮圈减重也是同一个道理——减在轮缘，效果最大。',
      think: {
        q: '质量减半、半径加倍，转动惯量怎么变？',
        a: 'I ∝ mR²，所以变为原来的 2 倍。半径的影响远大于质量，这也是飞轮"大而轻"比"小而重"更划算的原因。'
      }
    },
    {
      id: 'beam', demo: 'beam', ch: 1, no: '06',
      title: '梁的挠度', en: 'BEAM DEFLECTION', tag: '两次积分',
      tagline: '载荷变成弯矩，弯矩积分一次得到转角，再积分一次得到挠度。',
      blurb: '悬臂梁为什么会弯？两次积分把载荷变成曲线。',
      note: '调节载荷、长度与直径，观察变形与弯矩图',
      fig: '悬臂梁端部受载：弯矩图与挠度曲线',
      hud: [
        { k: 'delta', label: '端部挠度 δ', hot: true }, { k: 'I', label: '截面惯性矩 I' },
        { k: 'M', label: '最大弯矩 M' }, { k: 'EI', label: '抗弯刚度 EI' }
      ],
      body: `
        <p>悬臂梁受一个端部载荷。载荷让梁产生弯矩，弯矩让梁弯曲；把弯矩积分一次得到转角，再积分一次得到挠度。</p>
        <p>对端部集中力，M(x) = P(L−x)。代入 EIy″ = M(x)，用固定端的边界条件（y(0)=0，y′(0)=0）积分两次，得到一条三次曲线。</p>
        <p>结果很残酷：挠度与长度的<b>三次方</b>成正比，与直径的<b>四次方</b>成反比。悬臂长一点、细一点，精度就塌了。</p>
      `,
      formula: `
        <div class="fx"><b>EI y″</b> = M(x) = P(L − x)</div>
        <div class="fx"><b>y(x)</b> = P x²(3L − x) / (6EI)</div>
        <div class="fx"><b>δ</b> = PL³ / (3EI) <span class="dim">，I = πd⁴/64</span></div>
      `,
      controls: [
        { t: 'range', k: 'P', label: '端部载荷 P', min: 0, max: 400, step: 5, val: 300, unit: ' N' },
        { t: 'range', k: 'L', label: '悬臂长度 L', min: 0.6, max: 1.4, step: 0.05, val: 1.0, unit: ' m' },
        { t: 'range', k: 'd', label: '圆截面直径 d', min: 30, max: 60, step: 1, val: 30, unit: ' mm' },
        {
          t: 'seg', k: 'E', label: '材料弹性模量 E', val: 210, opts: [
            { v: 210, label: '钢 210 GPa' }, { v: 120, label: '铸铁 120' }, { v: 70, label: '铝 70' }
          ]
        }
      ],
      callout: '机床悬臂、镗刀杆、卡盘爪、量具测杆都怕"长而细"。提高刚度不要只想着换更贵的材料——把截面惯性矩 I 做大，往往更有效。',
      think: {
        q: '直径加倍，端部挠度变为原来的几分之一？',
        a: '1/16。因为 I = πd⁴/64，挠度 δ ∝ 1/I ∝ 1/d⁴，直径翻倍就是 16 倍刚度。'
      }
    },
    {
      id: 'shm', demo: 'shm', ch: 2, no: '07',
      title: '简谐振动', en: 'SIMPLE HARMONIC MOTION', tag: '微分方程',
      tagline: '加速度永远指向平衡位置、大小与位移成正比——这正是 x″ = −ω²x。',
      blurb: '弹簧振子的解为什么一定是正弦？看方程怎么"生成"曲线。',
      note: '调节质量、刚度与振幅，观察周期变化',
      fig: '弹簧振子：一个周期内 x / v / a 的相位关系',
      hud: [
        { k: 'T', label: '周期 T', hot: true }, { k: 'f', label: '频率 f' },
        { k: 'w', label: '角频率 ω' }, { k: 'vmax', label: '最大速度' }
      ],
      body: `
        <p>把质量块拉开、松手，它就来回振动。加速度始终指向平衡位置，大小与位移成正比——写成方程就是 m x″ + kx = 0。</p>
        <p>这是一个二阶线性微分方程。它的解不是指数，而是正弦/余弦：x = A cos(ωt)，其中 ω = √(k/m)。</p>
        <p>注意加速度与位移<b>反号</b>：位移最大时，加速度最大且指向回程；速度则领先位移四分之一周期。这正是"二阶导数等于负的自己"。</p>
      `,
      formula: `
        <div class="fx"><b>m x″ + k x</b> = 0</div>
        <div class="fx"><b>x</b> = A cos(ωt) <span class="dim">，</span> ω = √(k/m)</div>
        <div class="fx"><b>T</b> = 2π/ω = 2π√(m/k)</div>
      `,
      controls: [
        { t: 'range', k: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, val: 2, unit: ' kg' },
        { t: 'range', k: 'k', label: '弹簧刚度 k', min: 30, max: 200, step: 1, val: 80, unit: ' N/m' },
        { t: 'range', k: 'A', label: '振幅 A', min: 0.05, max: 0.25, step: 0.01, val: 0.15, unit: ' m' }
      ],
      callout: '机床减振垫、车辆悬架、振动输送机都按固有频率设计；要让 f_n 远离激振频率，否则会共振。隔振设计里常说：固有频率至少低于激振频率的 1/√2。',
      think: {
        q: '质量加倍，周期怎么变？',
        a: '变为 √2 倍。T = 2π√(m/k)，对质量是平方根关系：质量变 4 倍，周期才变 2 倍。'
      }
    },
    {
      id: 'damping', demo: 'damping', ch: 2, no: '08',
      title: '阻尼振动', en: 'DAMPED VIBRATION', tag: '特征方程',
      tagline: '阻尼比决定系统是"晃几下就停"还是"慢慢爬回来"。',
      blurb: '机床颤振、汽车悬架，都在这条指数包络里。',
      note: '拖动阻尼比 ζ，比较欠阻尼、临界阻尼与过阻尼',
      fig: '阻尼振动：振幅按 ±A·e^(−ζωₙt) 的包络衰减',
      hud: [
        { k: 'zeta', label: '阻尼比 ζ', hot: true }, { k: 'c', label: '阻尼系数 c' },
        { k: 'wd', label: '阻尼频率 ω_d' }, { k: 'settle', label: '稳定时间' }
      ],
      body: `
        <p>真实系统总有阻尼。加一个与速度成正比的阻尼力 c x′，方程变成 m x″ + c x′ + kx = 0。</p>
        <p>解的形状由<b>阻尼比</b> ζ = c/(2√(km)) 决定：ζ&lt;1 时，振幅按 e^(−ζωₙt) 衰减，还会振荡几下；ζ=1 是临界阻尼；ζ&gt;1 则慢慢爬回平衡位置，不再振荡。</p>
        <p>高数里那个"特征方程"的判别式，在这里对应三种完全不同的物理命运。把 ζ 从 0 拖到 1.5，看曲线怎么从"晃不停"变成"爬回来"。</p>
      `,
      formula: `
        <div class="fx"><b>m x″ + c x′ + k x</b> = 0</div>
        <div class="fx"><b>ζ</b> = c / (2√(km)) <span class="dim">，</span> <b>ω_d</b> = ω_n√(1 − ζ²)</div>
        <div class="fx">包络 <b>±A e^(−ζω_n t)</b></div>
      `,
      controls: [
        { t: 'range', k: 'zeta', label: '阻尼比 ζ', min: 0, max: 1.5, step: 0.01, val: 0.15, unit: '' },
        { t: 'range', k: 'A', label: '初始振幅 A', min: 0.04, max: 0.16, step: 0.005, val: 0.12, unit: ' m' }
      ],
      callout: '精密机床床身用铸铁、花岗岩，就是因为材料内耗大、阻尼高；减振器、悬架、建筑阻尼器也都在调 ζ。太小的 ζ 会一直晃，太大的 ζ 则响应迟钝。',
      think: {
        q: '为什么阻尼不是越大越好？',
        a: 'ζ 太大（过阻尼）虽然不振，但回到平衡位置很慢，机床响应会变迟钝。工程上常取 0.1–0.3，兼顾快速与稳定。'
      }
    },
    {
      id: 'taylor', demo: 'taylor', ch: 2, no: '09',
      title: '泰勒展开', en: 'TAYLOR SERIES', tag: '小角度近似',
      tagline: '工程师为什么敢用 sin θ ≈ θ？因为误差是可以用下一项估出来的。',
      blurb: '小角度近似不是偷懒，是泰勒展开截断到第一项。',
      note: '调节摆角，比较精确摆与线性化摆的周期',
      fig: 'sin x 与它的泰勒多项式；右侧摆角放大后，两种解逐渐失步',
      hud: [
        { k: 'theta', label: '当前摆角 θ' }, { k: 'T0', label: '线性周期 T₀' },
        { k: 'Te', label: '精确周期 T', hot: true }, { k: 'err', label: '周期误差' }
      ],
      body: `
        <p>单摆的方程是 θ″ + (g/L) sin θ = 0。它没有初等函数解——因为 sin θ 是非线性的。</p>
        <p>但小角度时，sin θ 和 θ 几乎重合：sin θ = θ − θ³/6 + θ⁵/120 − …。只保留第一项，方程变成线性的 θ″ + (g/L)θ = 0，才有 T = 2π√(L/g) 这个漂亮的公式。</p>
        <p>摆角 30° 时，精确周期比线性周期长约 1.7%；60° 时约 7.3%。<b>近似不是错，只是有适用范围。</b></p>
      `,
      formula: `
        <div class="fx">sin x = x − <span class="frac"><span>x³</span><span>3!</span></span> + <span class="frac"><span>x⁵</span><span>5!</span></span> − …</div>
        <div class="fx">sin θ ≈ θ <span class="dim">（θ ≪ 1）</span></div>
        <div class="fx"><b>T</b> ≈ 2π√(L/g) <span class="dim">；精确 T = 4√(L/g)·K(sin(θ₀/2))</span></div>
      `,
      controls: [
        { t: 'range', k: 'theta0', label: '初始摆角 θ₀', min: 2, max: 60, step: 1, val: 20, unit: '°' },
        { t: 'range', k: 'L', label: '摆长 L', min: 0.5, max: 1.2, step: 0.05, val: 0.8, unit: ' m' },
        {
          t: 'seg', k: 'order', label: '泰勒多项式阶数', val: 3, opts: [
            { v: 1, label: 'x' }, { v: 3, label: 'x − x³/6' }, { v: 5, label: 'x − x³/6 + x⁵/120' }
          ]
        }
      ],
      callout: '振动分析的第一步就是线性化；梁的小变形假设、齿轮压力角计算也一样。但大角度、大变形时，要记得近似会失效——工程判断力，就是知道"什么时候还能用"。',
      think: {
        q: '摆角 30° 时，小角度近似的周期误差约为多少？',
        a: '约 1.7%。所以课堂上 θ 小于 10° 的近似够用；要精确分析 60° 以上，就得上椭圆积分或数值解。'
      }
    }
  ];

  const STORE_KEY = 'workshop-calculus-progress';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $view = document.getElementById('view');
  const $back = document.getElementById('backBtn');
  const $progText = document.getElementById('progText');
  const $progBar = document.getElementById('progBar');
  const $railProg = document.getElementById('railProg');
  const $railRing = document.getElementById('railRing');
  const $toast = document.getElementById('toast');
  const $loader = document.getElementById('loader');

  let completed = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (Array.isArray(raw)) completed = new Set(raw.filter(id => LESSONS.some(l => l.id === id)));
  } catch (e) { completed = new Set(); }

  let active = null;        // 当前课时演示
  let heroDestroy = null;   // 首页动画销毁函数
  let rafId = 0;
  let lastTime = 0;
  let lastRead = 0;

  /* ---------------- 工具 ---------------- */
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove('show'), 1800);
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...completed])); } catch (e) { }
  }
  function chapterOf(l) { return CHAPTERS[l.ch]; }
  function pad(n) { return String(n).padStart(2, '0'); }

  function cleanup() {
    if (heroDestroy) { heroDestroy(); heroDestroy = null; }
    if (active) {
      if (active.ro) active.ro.disconnect();
      if (active.demo && active.demo.destroy) active.demo.destroy();
      active = null;
    }
  }

  /* ---------------- 进度 ---------------- */
  function updateProgress() {
    const n = completed.size;
    $progText.textContent = n + ' / ' + LESSONS.length;
    $progBar.style.width = (n / LESSONS.length * 100) + '%';
    $railProg.textContent = n;
    $railRing.style.setProperty('--p', (n / LESSONS.length * 100).toFixed(0));
    document.querySelectorAll('.lesson-card[data-open]').forEach(card => {
      card.classList.toggle('is-done', completed.has(card.dataset.open));
    });
    if (active && active.lesson) updateDoneBtn();
  }
  function updateDoneBtn() {
    const btn = document.getElementById('doneBtn');
    if (!btn || !active || !active.lesson) return;
    const done = completed.has(active.lesson.id);
    btn.classList.toggle('is-done', done);
    btn.textContent = done ? '✓ 已完成' : '标记完成';
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    const h = location.hash || '#/';
    if (h === '#map') return { view: 'home', map: true };
    const m = h.match(/^#\/lesson\/([a-z]+)$/);
    if (m) return { view: 'lesson', id: m[1] };
    return { view: 'home' };
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function render() {
    cleanup();
    const route = parseHash();
    if (route.view === 'lesson') {
      const lesson = LESSONS.find(l => l.id === route.id);
      if (!lesson) { location.hash = '#/'; return; }
      renderLesson(lesson);
    } else {
      renderHome();
      if (route.map) {
        setTimeout(() => {
          const el = document.getElementById('map');
          if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }, 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
    updateProgress();
  }

  /* ---------------- 首页 ---------------- */
  function lessonCard(l) {
    const ch = chapterOf(l);
    return `
      <article class="lesson-card" data-open="${l.id}" role="button" tabindex="0"
        aria-label="第 ${l.no} 课 ${l.title}">
        <span class="lc-done" aria-hidden="true">✓</span>
        <div class="lc-top">
          <span class="lc-no">${l.no}</span>
          <span class="lc-tag">${l.tag}</span>
        </div>
        <h3>${l.title}</h3>
        <p>${l.blurb}</p>
        <div class="lc-foot">
          <span class="lc-en">${l.en}</span>
          <span class="lc-go">开始 <span aria-hidden="true">→</span></span>
        </div>
      </article>`;
  }

  function homeHTML() {
    const chapters = CHAPTERS.map((ch, i) => {
      const items = LESSONS.filter(l => l.ch === i);
      return `
        <section class="chapter" id="ch-${i + 1}">
          <header class="ch-head">
            <div class="ch-no">${ch.no}</div>
            <div>
              <div class="ch-en">${ch.en}</div>
              <h2>${ch.title}</h2>
              <p>${ch.desc}</p>
            </div>
            <div class="ch-math">${ch.math}</div>
          </header>
          <div class="lesson-grid">${items.map(lessonCard).join('')}</div>
        </section>`;
    }).join('');

    return `
      <div class="home">
        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow"><i></i>应用高等数学 · 机械设计与制造</div>
            <h1>高数，<br><em>在车间里</em>活过来。</h1>
            <p class="lede">导数不是符号游戏：它是活塞的速度、齿轮的传动比。积分不是面积公式：它是弹簧储能、飞轮惯量、梁的挠度。9 节可动手的课，把高数装回机械里。</p>
            <div class="hero-actions">
              <button class="btn-primary" data-open="crank">
                从第 1 课开始
                <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
              <a class="btn-ghost" href="#map">
                先看公式地图
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
              </a>
            </div>
            <ul class="hero-stats">
              <li><b>9</b><span>节课</span></li>
              <li><b>3</b><span>条主线</span></li>
              <li><b>9</b><span>个实时演示</span></li>
            </ul>
          </div>
          <figure class="hero-fig">
            <div class="fig-frame">
              <canvas id="heroCanvas" aria-label="曲柄滑块机构动画，可拖动曲柄"></canvas>
              <span class="corner tl"></span><span class="corner tr"></span>
              <span class="corner bl"></span><span class="corner br"></span>
              <span class="fig-tag">FIG. 00</span>
            </div>
            <figcaption class="fig-caption"><b>曲柄滑块</b><span>拖动画面转曲柄：位移曲线随角度实时变化，它的斜率就是滑块速度。</span></figcaption>
          </figure>
        </section>

        <div class="chapters">${chapters}</div>

        <section class="map-sec" id="map">
          <div class="sec-head">
            <div>
              <div class="eyebrow"><i></i>FORMULA MAP</div>
              <h2>一页公式地图</h2>
            </div>
            <p>三章不是三个孤立的技巧，而是一条线：先学会描述变化，再学会累积，最后用方程预测未来。</p>
          </div>
          <div class="map-grid">
            <div class="map-col">
              <div class="mc-no">01 / DERIVATIVES</div>
              <h3>导数：描述变化</h3>
              <div class="mc-en">RATES OF CHANGE</div>
              <ul>
                <li><span>位移 → 速度</span><b>v = dx/dt</b></li>
                <li><span>速度 → 加速度</span><b>a = d²x/dt²</b></li>
                <li><span>齿轮链式法则</span><b>dθ₂/dt</b></li>
                <li><span>成本最小</span><b>dC/dv = 0</b></li>
              </ul>
              <p class="mc-note">导数回答三件事：变化多快、往哪变、什么时候达到极值。</p>
            </div>
            <div class="map-col">
              <div class="mc-no">02 / INTEGRALS</div>
              <h3>积分：累积整体</h3>
              <div class="mc-en">ACCUMULATION</div>
              <ul>
                <li><span>变力做功</span><b>W = ∫F dx</b></li>
                <li><span>转动惯量</span><b>I = ∫r² dm</b></li>
                <li><span>梁的挠度</span><b>EI y″ = M(x)</b></li>
                <li><span>两次积分</span><b>y = ∬M/EI</b></li>
              </ul>
              <p class="mc-note">积分把"一小块一小块"拼成整体：面积、质量、挠度。</p>
            </div>
            <div class="map-col">
              <div class="mc-no">03 / ODE</div>
              <h3>微分方程：预测未来</h3>
              <div class="mc-en">DIFFERENTIAL EQUATIONS</div>
              <ul>
                <li><span>无阻尼振动</span><b>mx″ + kx = 0</b></li>
                <li><span>阻尼振动</span><b>mx″ + cx′ + kx = 0</b></li>
                <li><span>小角度近似</span><b>sin θ ≈ θ</b></li>
                <li><span>特征根决定命运</span><b>ζ = c/2√(km)</b></li>
              </ul>
              <p class="mc-note">微分方程把"变化规律"写成方程，解出来就是系统的未来。</p>
            </div>
          </div>
        </section>

        <section class="how">
          <div class="how-item">
            <div class="how-num">01</div>
            <div><h4>先看现象</h4><p>每个演示都是一台真机构：先让它动起来，观察曲线和数值怎么跟着变。</p></div>
          </div>
          <div class="how-item">
            <div class="how-num">02</div>
            <div><h4>动手改参数</h4><p>拖滑块、改齿数、调阻尼：看看哪个参数决定了结果，哪个只是陪衬。</p></div>
          </div>
          <div class="how-item">
            <div class="how-num">03</div>
            <div><h4>再回到公式</h4><p>把公式对回现象：哪一项对应哪个零件，哪个导数对应哪条曲线。</p></div>
          </div>
        </section>

        <footer class="home-foot">
          <span>© <b>WORKSHOP CALCULUS</b> · 写给机械设计与制造专业的大一新生</span>
          <span>9 个 Canvas 演示 · 无需安装 · 手机可看</span>
        </footer>
      </div>`;
  }

  function renderHome() {
    $view.innerHTML = homeHTML();
    $back.hidden = true;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('is-on', b.dataset.rail === 'home'));
    const canvas = document.getElementById('heroCanvas');
    if (canvas && window.initHero) {
      try { heroDestroy = window.initHero(canvas); } catch (e) { console.error(e); }
    }
    updateProgress();
  }

  /* ---------------- 课时 ---------------- */
  function controlsHTML(l) {
    return l.controls.map(c => {
      if (c.t === 'range') {
        return `
          <div class="ctl">
            <div class="ctl-head">
              <label for="ctl-${l.id}-${c.k}">${c.label}</label>
              <output data-out="${c.k}">${c.val}${c.unit || ''}</output>
            </div>
            <input id="ctl-${l.id}-${c.k}" type="range" data-k="${c.k}" data-unit="${c.unit || ''}"
              min="${c.min}" max="${c.max}" step="${c.step}" value="${c.val}">
            ${c.hint ? `<div class="ctl-hint">${c.hint}</div>` : ''}
          </div>`;
      }
      if (c.t === 'seg') {
        return `
          <div class="ctl">
            <div class="ctl-head"><label>${c.label}</label></div>
            <div class="seg" data-k="${c.k}" role="group" aria-label="${c.label}">
              ${c.opts.map(o => `<button type="button" data-val="${o.v}" class="${o.v === c.val ? 'is-on' : ''}">${o.label}</button>`).join('')}
            </div>
          </div>`;
      }
      if (c.t === 'toggle') {
        return `
          <div class="ctl">
            <label class="ctl-toggle">
              <input type="checkbox" data-k="${c.k}" ${c.val ? 'checked' : ''}>
              <i></i><span>${c.label}</span>
            </label>
          </div>`;
      }
      if (c.t === 'button') {
        return `
          <div class="ctl">
            <button type="button" class="mini-btn" data-action="${c.action}">${c.label}</button>
          </div>`;
      }
      return '';
    }).join('');
  }

  function lessonHTML(l) {
    const ch = chapterOf(l);
    const idx = LESSONS.indexOf(l);
    const done = completed.has(l.id);
    const hud = l.hud.map(h => `
      <span class="hud-chip${h.hot ? ' hot' : ''}">
        <span>${h.label}</span><b data-read="${h.k}">—</b>
      </span>`).join('');
    return `
      <section class="lesson-view">
        <div class="stage-col">
          <div class="stage-card">
            <canvas id="demoCanvas" aria-label="${l.title} 互动演示"></canvas>
            <div class="stage-hud">
              <span class="hud-tag">LESSON ${l.no} / ${pad(LESSONS.length)}</span>
              <div id="hudReads" style="display:flex;gap:6px;flex-wrap:wrap;flex:1 1 auto;min-width:0">${hud}</div>
            </div>
            <div class="stage-ctl">
              <button class="mini-btn" id="playBtn" type="button">暂停</button>
              <button class="mini-btn" id="resetBtn" type="button">复位</button>
              <span class="stage-note">${l.note}</span>
            </div>
          </div>
          <div class="stage-caption"><b>FIG. ${l.no}</b><span>${l.fig}</span></div>
        </div>
        <aside class="panel">
          <div class="panel-inner">
            <div class="p-eyebrow">CHAPTER ${ch.no} · ${ch.en}</div>
            <h2 class="p-title">${l.title}</h2>
            <p class="p-en">${l.en}</p>
            <p class="p-lead">${l.tagline}</p>
            <div class="p-text">${l.body}</div>
            <div class="formula">${l.formula}</div>
            <div class="controls">
              <div class="controls-head"><i></i>动手调一调</div>
              ${controlsHTML(l)}
            </div>
            <div class="callout">
              <div class="co-k">
                <svg viewBox="0 0 24 24"><path d="M12 3.5 4.5 7.6v8.8L12 20.5l7.5-4.1V7.6zM12 8v4.5M12 15.8v.2"/></svg>
                工程现场
              </div>
              <p>${l.callout}</p>
            </div>
            <details class="think">
              <summary>想一想</summary>
              <p><b>问：</b>${l.think.q}</p>
              <p><b>答：</b>${l.think.a}</p>
            </details>
            <div class="p-nav">
              <button type="button" data-step="-1" ${idx === 0 ? 'disabled' : ''}>← 上一课</button>
              <button type="button" id="doneBtn" class="done-btn${done ? ' is-done' : ''}">${done ? '✓ 已完成' : '标记完成'}</button>
              <button type="button" data-step="1" ${idx === LESSONS.length - 1 ? 'disabled' : ''}>下一课 →</button>
            </div>
          </div>
        </aside>
      </section>`;
  }

  function renderLesson(l) {
    $view.innerHTML = lessonHTML(l);
    $back.hidden = false;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('is-on', false));
    window.scrollTo({ top: 0, behavior: 'auto' });

    const canvas = document.getElementById('demoCanvas');
    const demo = window.DEMOS[l.demo]();
    // 用控件默认值初始化状态
    l.controls.forEach(c => {
      if (c.t === 'range' || c.t === 'seg' || c.t === 'toggle') demo.state[c.k] = c.val;
    });
    if (demo.onControl) demo.onControl('init');

    const ctx = canvas.getContext('2d');
    const mount = { W: 0, H: 0, dpr: 1 };

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      mount.dpr = Math.min(2, window.devicePixelRatio || 1);
      mount.W = r.width;
      mount.H = r.height;
      canvas.width = Math.round(r.width * mount.dpr);
      canvas.height = Math.round(r.height * mount.dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    active = {
      lesson: l, demo, canvas, ctx, ro,
      paused: reduceMotion,
      readEls: {},
      get W() { return mount.W; },
      get H() { return mount.H; },
      get dpr() { return mount.dpr; }
    };
    document.querySelectorAll('[data-read]').forEach(el => { active.readEls[el.dataset.read] = el; });

    // 播放 / 复位
    const playBtn = document.getElementById('playBtn');
    function syncPlayBtn() {
      playBtn.textContent = active.paused ? '播放' : '暂停';
    }
    playBtn.addEventListener('click', () => { active.paused = !active.paused; syncPlayBtn(); });
    syncPlayBtn();
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (demo.reset) demo.reset();
      updateReadouts(true);
    });

    // 控件
    document.querySelectorAll('.controls input[type=range]').forEach(inp => {
      const k = inp.dataset.k;
      const out = document.querySelector(`.controls output[data-out="${k}"]`);
      const sync = () => {
        const v = parseFloat(inp.value);
        demo.state[k] = v;
        if (out) out.textContent = inp.value + (inp.dataset.unit || '');
        if (demo.onControl) demo.onControl(k);
      };
      inp.addEventListener('input', sync);
      sync();
    });
    document.querySelectorAll('.controls .seg').forEach(seg => {
      const k = seg.dataset.k;
      seg.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = btn.dataset.val;
          const val = isNaN(parseFloat(raw)) ? raw : parseFloat(raw);
          demo.state[k] = val;
          seg.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === btn));
          if (demo.onControl) demo.onControl(k);
        });
      });
    });
    document.querySelectorAll('.controls input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        demo.state[cb.dataset.k] = cb.checked;
        if (demo.onControl) demo.onControl(cb.dataset.k);
      });
    });
    document.querySelectorAll('.controls [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof demo[btn.dataset.action] === 'function') demo[btn.dataset.action]();
      });
    });

    // 画布拖拽
    let dragging = false;
    if (demo.pointer) {
      canvas.style.cursor = 'grab';
      const pos = e => {
        const r = canvas.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      canvas.addEventListener('pointerdown', e => {
        dragging = true;
        canvas.setPointerCapture?.(e.pointerId);
        const [x, y] = pos(e);
        demo.pointer('down', x, y, 0, 0, mount.W, mount.H);
        canvas.style.cursor = 'grabbing';
      });
      canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        const [x, y] = pos(e);
        demo.pointer('move', x, y, 0, 0, mount.W, mount.H);
      });
      const up = () => {
        if (!dragging) return;
        dragging = false;
        demo.pointer('up', 0, 0, 0, 0, mount.W, mount.H);
        canvas.style.cursor = 'grab';
        if (demo.onControl) demo.onControl('pointer');
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
    }

    // 上一课 / 下一课
    document.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = LESSONS.indexOf(l) + parseInt(btn.dataset.step, 10);
        if (LESSONS[idx]) location.hash = '#/lesson/' + LESSONS[idx].id;
      });
    });
    // 标记完成
    document.getElementById('doneBtn').addEventListener('click', () => {
      if (completed.has(l.id)) {
        completed.delete(l.id);
        toast('已取消完成标记');
      } else {
        completed.add(l.id);
        toast('第 ' + l.no + ' 课 · 完成');
      }
      saveProgress();
      updateProgress();
    });

    updateReadouts(true);
    lastTime = performance.now();
  }

  function updateReadouts(force) {
    if (!active || !active.demo) return;
    let ro;
    try { ro = active.demo.readouts(); } catch (e) { return; }
    if (!ro) return;
    const now = performance.now();
    if (!force && now - lastRead < 120) return;
    lastRead = now;
    Object.keys(active.readEls).forEach(k => {
      if (ro[k] !== undefined) active.readEls[k].textContent = ro[k];
    });
    // 演示内部改动的参数（如自动寻优）同步回控件
    if (typeof active.demo.controlValues === 'function') {
      let cv;
      try { cv = active.demo.controlValues(); } catch (e) { cv = null; }
      if (cv) Object.keys(cv).forEach(k => {
        const inp = document.querySelector('.controls input[type=range][data-k="' + k + '"]');
        if (!inp) return;
        const v = String(cv[k]);
        if (inp.value !== v) inp.value = v;
        const out = document.querySelector('.controls output[data-out="' + k + '"]');
        if (out) out.textContent = v + (inp.dataset.unit || '');
      });
    }
  }

  /* ---------------- 主循环 ---------------- */
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!active) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    if (!active.paused) {
      try { active.demo.step(dt); } catch (e) { console.error(e); }
    }
    if (!active.W || !active.H) return;
    active.ctx.setTransform(active.dpr, 0, 0, active.dpr, 0, 0);
    active.ctx.clearRect(0, 0, active.W, active.H);
    try { active.demo.draw(active.ctx, active.W, active.H); } catch (e) { console.error(e); }
    updateReadouts(false);
  }

  /* ---------------- 全局绑定 ---------------- */
  $view.addEventListener('click', e => {
    const card = e.target.closest('[data-open]');
    if (card) {
      location.hash = '#/lesson/' + card.dataset.open;
      return;
    }
    const go = e.target.closest('a[href="#map"]');
    if (go) {
      if (location.hash === '#map') {
        const el = document.getElementById('map');
        if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  });
  $view.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.lesson-card[data-open]');
    if (!card) return;
    e.preventDefault();
    location.hash = '#/lesson/' + card.dataset.open;
  });

  $back.addEventListener('click', () => navigate('#/'));

  document.querySelectorAll('.rail-btn[data-rail]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.rail === 'home') navigate('#/');
      else if (btn.dataset.rail === 'map') navigate('#map');
    });
  });

  document.getElementById('resetProgress').addEventListener('click', () => {
    if (!completed.size) { toast('还没有完成记录'); return; }
    completed.clear();
    saveProgress();
    updateProgress();
    toast('学习进度已清空');
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && parseHash().view === 'lesson') navigate('#/');
  });

  window.addEventListener('hashchange', render);

  // 立即启动淡出：外部字体/网络异常时也不会卡在加载页
  const hideLoader = () => setTimeout(() => $loader.classList.add('gone'), 420);
  hideLoader();

  rafId = requestAnimationFrame(frame);
  render();
})();
