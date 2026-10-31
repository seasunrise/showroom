/*!
 * supabase-kit.js — showroom 统一 Supabase 入口（所有游戏页共用）
 *
 * 提供两件事：
 *   1. Analytics      — 轻量埋点（REST 直连，不依赖 supabase-js）
 *   2. Supa.client()  — 共享 Supabase JS 客户端（Realtime 用；单例，自动按需加载 CDN）
 *
 * 用法（埋点，所有游戏页）：
 *   <script src="../supabase-kit.js"></script>
 *   <script>
 *     Analytics.init({ game: 'angry-birds' });
 *     Analytics.score(1200);                        // 可选
 *     Analytics.event('level_start', { level: 3 }); // 可选
 *   </script>
 *
 * 用法（Realtime 多人游戏）：
 *   Supa.client().then(function (sb) {
 *     const channel = sb.channel('xxx', { config: { broadcast: { self: true } } });
 *     // ...
 *   });
 *
 * 统计口径：
 *   - player_id 存在 localStorage，同一浏览器算同一玩家（换设备算新玩家）
 *   - active_seconds 只在页面可见时累加，挂后台/切标签页不计时
 *   - 每 15 秒写一次心跳，关闭页面时补写 ended_at
 */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://gxdackbnfxbaqcpabcgs.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_7zuwaGboS5j-3Mq6Q0l8vw_VKkJLql2';
  var CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var REST = SUPABASE_URL + '/rest/v1';
  var FLUSH_MS = 15000;

  // ============================================================
  //  Supa — 共享客户端（Realtime）
  // ============================================================
  var libPromise = null;
  var clientPromise = null;

  function loadLib() {
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      return Promise.resolve();
    }
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = CDN_URL;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        libPromise = null;
        reject(new Error('supabase-js 加载失败'));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function client() {
    if (!clientPromise) {
      clientPromise = loadLib().then(function () {
        return global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          realtime: { params: { eventsPerSecond: 10 } }
        });
      }).catch(function (e) {
        clientPromise = null; // 允许重试
        throw e;
      });
    }
    return clientPromise;
  }

  global.Supa = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    client: client
  };

  // ============================================================
  //  Analytics — 轻量埋点（fetch 直连 REST，零依赖）
  // ============================================================
  var LS_PLAYER = 'ga_player_id';
  var LS_NAME = 'player_name';

  var sessionId = null;
  var gameSlug = null;
  var activeMs = 0;
  var lastTick = 0;
  var visible = false;
  var timer = null;
  var started = false;
  var playerKey = null;

  function now() {
    return performance.now();
  }

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function readLS(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeLS(key, val) {
    try { global.localStorage.setItem(key, val); } catch (e) { /* ignore */ }
  }

  function request(method, path, body, prefer, keepalive, okStatuses) {
    var headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json'
    };
    if (prefer) headers['Prefer'] = prefer;
    return fetch(REST + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      keepalive: !!keepalive
    }).then(function (res) {
      var ok = res.ok || (okStatuses && okStatuses.indexOf(res.status) >= 0);
      if (!ok) {
        res.text().then(function (t) {
          console.warn('[analytics]', method, path, res.status, t);
        });
      }
      return res.status;
    }).catch(function (e) {
      console.warn('[analytics]', method, path, e);
      return 0;
    });
  }

  function accumulate() {
    if (visible) activeMs += now() - lastTick;
    lastTick = now();
  }

  function patch(ended, keepalive) {
    if (!sessionId) return;
    var body = {
      last_heartbeat: new Date().toISOString(),
      active_seconds: Math.round(activeMs / 1000)
    };
    if (ended) body.ended_at = new Date().toISOString();
    request('PATCH', '/gp_sessions?id=eq.' + sessionId, body, 'return=minimal', keepalive);
    if (ended) sessionId = null;
  }

  function beat() {
    accumulate();
    patch(false, false);
  }

  function startTimer() {
    if (timer || !sessionId) return;
    lastTick = now();
    if (visible) timer = setInterval(beat, FLUSH_MS);
  }

  function stopTimer() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function onVisibilityChange() {
    accumulate();
    visible = !document.hidden;
    lastTick = now();
    if (document.hidden) {
      stopTimer();
      patch(false, true);
    } else {
      startTimer();
    }
  }

  function onPageHide() {
    accumulate();
    stopTimer();
    patch(true, true);
  }

  function startSession() {
    if (!playerKey) return Promise.resolve();
    sessionId = uuid();
    activeMs = 0;
    lastTick = now();
    visible = !document.hidden;

    return request('POST', '/gp_sessions', {
      id: sessionId,
      player_id: playerKey,
      game_slug: gameSlug,
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      active_seconds: 0,
      locale: global.navigator.language || null,
      ua: (global.navigator.userAgent || '').slice(0, 300),
      screen: global.screen.width + 'x' + global.screen.height,
      referrer: (global.document.referrer || '').slice(0, 300) || null
    }, 'return=minimal').then(function () {
      if (visible) startTimer();
    });
  }

  function init(opts) {
    if (started || !opts || !opts.game) return Promise.resolve();

    started = true;
    gameSlug = String(opts.game);

    playerKey = readLS(LS_PLAYER);
    if (!playerKey) {
      playerKey = uuid();
      writeLS(LS_PLAYER, playerKey);
    }

    var nickname = opts.nickname !== undefined ? opts.nickname : readLS(LS_NAME);
    if (nickname) writeLS(LS_NAME, nickname);

    // 注意：不能用 upsert（on_conflict + merge-duplicates）。
    // ON CONFLICT DO UPDATE 在 RLS 下要求 SELECT 策略可见冲突行，
    // anon 没有 SELECT 权限会直接报 42501。改为「先插，409 再更新」。
    return request('POST', '/gp_players', {
      id: playerKey,
      nickname: nickname || null,
      last_seen: new Date().toISOString()
    }, 'return=minimal', false, [409]).then(function (status) {
      if (status === 409) {
        return request('PATCH', '/gp_players?id=eq.' + playerKey, {
          nickname: nickname || null,
          last_seen: new Date().toISOString()
        }, 'return=minimal');
      }
    }).then(startSession).then(function () {
      document.addEventListener('visibilitychange', onVisibilityChange);
      global.addEventListener('pagehide', onPageHide);
      // 从 bfcache 返回时重新开一段会话
      global.addEventListener('pageshow', function (e) {
        if (e.persisted && !sessionId) startSession();
      });
    });
  }

  function score(value) {
    if (!sessionId) return;
    request('PATCH', '/gp_sessions?id=eq.' + sessionId, {
      score: Number(value) || 0
    }, 'return=minimal');
  }

  function event(name, props) {
    if (!sessionId || !name) return;
    request('POST', '/gp_events', {
      session_id: sessionId,
      game_slug: gameSlug,
      name: String(name),
      props: props || null
    }, 'return=minimal');
  }

  global.Analytics = {
    init: init,
    score: score,
    event: event,
    playerId: function () { return playerKey; }
  };
})(window);
