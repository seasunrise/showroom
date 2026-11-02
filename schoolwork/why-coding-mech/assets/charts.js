(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  /* ================= 薪资对比图：浮动区间条形图 ================= */
  var jobs = [
    { name: '普工 / 装配工',       min: 4,  max: 6,  code: false },
    { name: '机械绘图员',          min: 5,  max: 8,  code: false },
    { name: 'CNC 数控操作',        min: 6,  max: 9,  code: false },
    { name: 'PLC 编程工程师',      min: 9,  max: 14, code: true },
    { name: '机器人调试工程师',    min: 10, max: 15, code: true },
    { name: '智能制造工程师',      min: 15, max: 25, code: true }
  ];

  var salaryChart = echarts.init(document.getElementById('chart-salary'), null, { renderer: 'svg' });
  salaryChart.setOption({
    animation: false,
    grid: { left: 10, right: 60, top: 20, bottom: 10, containLabel: true },
    tooltip: {
      appendToBody: true,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink },
      formatter: function(params) {
        var j = jobs[params[0].dataIndex];
        return j.name + '<br/>月薪：' + j.min + 'K – ' + j.max + 'K';
      }
    },
    xAxis: {
      type: 'value',
      max: 28,
      axisLabel: { color: muted, formatter: '{value}K' },
      splitLine: { lineStyle: { color: rule } },
      axisLine: { lineStyle: { color: rule } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: jobs.map(function(j) { return j.name; }),
      axisLabel: {
        color: ink,
        fontSize: 13,
        formatter: function(name, idx) {
          return jobs[idx].code ? '{hot|' + name + ' ⚡}' : name;
        },
        rich: { hot: { color: accent, fontWeight: 700, fontSize: 13 } }
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        // 透明的基座，把区间条"浮"到正确位置
        type: 'bar',
        stack: 'range',
        data: jobs.map(function(j) { return j.min; }),
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
        barWidth: 22,
        tooltip: { show: false }
      },
      {
        type: 'bar',
        stack: 'range',
        data: jobs.map(function(j) {
          return {
            value: j.max - j.min,
            itemStyle: {
              color: j.code ? accent : '#3b5578',
              borderRadius: 11
            }
          };
        }),
        barWidth: 22,
        label: {
          show: true,
          position: 'right',
          color: ink,
          fontSize: 12,
          fontFamily: 'JetBrainsMono, monospace',
          formatter: function(p) {
            var j = jobs[p.dataIndex];
            return j.min + 'K–' + j.max + 'K';
          }
        }
      }
    ]
  });
  window.addEventListener('resize', function() { salaryChart.resize(); });

  /* ================= 大数字滚动计数 ================= */
  function animateCount(el) {
    var to = parseInt(el.getAttribute('data-to'), 10);
    var dur = 1400;
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ================= 滚动显现动画 ================= */
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      entry.target.querySelectorAll('.count').forEach(animateCount);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach(function(el) { io.observe(el); });
})();
