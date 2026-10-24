/* ==========================================================================
   Gecekondu Event — Açılış introsu
   - Tam ekran kelebek videosu (Higgsfield) → kelebek bahçeye uçar → son kare
     sitenin ilk film karesiyle (f001) birebir aynı, böylece site kesintisiz başlar.
   - Video biterken logo çizilerek belirir, "Hoş geldiniz" gelir; canlı Three.js
     kelebek videodaki kelebeğin yerinden devralır, logonun üstüne konar.
   - Sonunda logo menüdeki logonun yerine uçar, hero açılır, kelebek düğmeye konar.
   - 12 saatte bir gösterilir; ?intro ile her zaman, ?nointro ile hiç gösterilmez.
     Hareket azaltma tercihi açıksa gösterilmez. "Geç" düğmesi ve Esc ile atlanır.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'gk-intro-seen', TTL = 12 * 3600 * 1000;
  var intro = document.getElementById('intro');
  if (!intro) return;
  var qs = location.search;
  var force = /[?&]intro\b/.test(qs), never = /[?&]nointro\b/.test(qs);
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var seen = false;
  try { var ts = +localStorage.getItem(KEY); seen = ts > 0 && Date.now() - ts < TTL; } catch (e) {}
  if (never || (!force && (seen || reduce))) { intro.parentNode.removeChild(intro); return; }

  var root = document.documentElement;
  root.classList.add('intro-on');

  // Video seti: dikey ekranlarda 9:16, diğerlerinde 16:9. bx/by = son karede kelebeğin yeri, bs = kanat açıklığı (kare oranı)
  // Dikey ekran mı? Pencere oranına ek olarak dokunmatik cihazın yönüne de bakar: bazı uygulama içi
  // tarayıcılar (Instagram, WhatsApp) sayfa açılırken pencere boyutunu yanlış/0 bildirir ve yatay seçilirdi.
  // intro.js ve film.js aynı kararı vermeli (intro'nun son karesi filmin ilk karesine birebir oturur).
  function isPortrait() {
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    if (mq('(max-aspect-ratio: 4/5)')) return true;
    var touch = mq('(pointer: coarse)');
    if (touch && mq('(orientation: portrait)')) return true;
    if (!(window.innerWidth > 0 && window.innerHeight > 0)) return touch && screen.height > screen.width;
    return false;
  }
  var portrait = isPortrait();
  var CFG = portrait
    ? { src: 'assets/intro/intro-9x16.mp4', poster: 'assets/intro/intro-9x16.jpg', bx: 0.5, by: 0.33, bs: 0.137 }
    : { src: 'assets/intro/intro-16x9.mp4', poster: 'assets/intro/intro-16x9.jpg', bx: 0.5, by: 0.30, bs: 0.05 };

  var video = document.getElementById('introVideo');
  var welcome = intro.querySelector('.intro__welcome');
  var logo = intro.querySelector('.intro__logo');
  var skipBtn = document.getElementById('introSkip');
  video.poster = CFG.poster;
  video.src = CFG.src;
  video.muted = true; video.defaultMuted = true; video.playsInline = true; video.autoplay = true;

  var api = window.GK_INTRO = {
    active: true, hideBf: true, goal: null, teleport: null, done: [],
    onDone: function (fn) { if (api.active) api.done.push(fn); else fn(); }
  };

  // Kare koordinatı → ekran px (film katmanıyla aynı: 116vw × 116vh, -8vw/-8vh, object-fit: cover)
  function framePoint(fx, fy) {
    var W = window.innerWidth, H = window.innerHeight;
    var cw = W * 1.16, ch = H * 1.16, cx = -W * 0.08, cy = -H * 0.08;
    var vw = video.videoWidth || (portrait ? 1080 : 1920), vh = video.videoHeight || (portrait ? 1920 : 1080);
    var s = Math.max(cw / vw, ch / vh), dw = vw * s, dh = vh * s;
    return { x: cx + (cw - dw) / 2 + fx * dw, y: cy + (ch - dh) / 2 + fy * dh, w: dw };
  }
  var P = { x: 0, y: 0 };
  function layout() {
    P = framePoint(CFG.bx, CFG.by);
    // logonun üst kenarı kelebeğin hemen altında olsun; kelebek logonun tepesine konar
    var H = window.innerHeight, W = window.innerWidth;
    var lh = Math.min(H * (portrait ? 0.2 : 0.24), W * (portrait ? 0.42 : 0.3));
    intro.style.setProperty('--logo-h', lh.toFixed(1) + 'px');
    intro.style.setProperty('--logo-top', (P.y + 14).toFixed(1) + 'px');
  }
  layout();
  window.addEventListener('resize', layout);
  function perchPoint() {   // logonun kemerinin tepesi (ekran px)
    var r = logo.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.01 };
  }

  var phase = 'video', welcomeAt = 0, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function startWelcome() {
    if (phase !== 'video') return;
    phase = 'welcome';
    intro.classList.add('is-draw');
    later(function () { intro.classList.add('is-welcome'); }, 380);
  }
  function handoff() {
    if (phase === 'handoff' || phase === 'out') return;
    if (phase === 'video') startWelcome();
    phase = 'handoff';
    // canlı kelebek videodaki kelebeğin yerinden devralır, logonun tepesine konar
    // aynı yer, aynı boy; 0,45 sn videodaki pozda bekler (video altında söner), sonra uçar
    var HOLD = 450;
    api.teleport = { x: P.x, y: P.y, span: CFG.bs * P.w, hold: HOLD / 1000 };
    var t0 = performance.now() + HOLD;
    api.goal = function () {
      var pp = perchPoint();
      // önce logonun üstünde kısa bir tur, sonra kemerin tepesine konuş
      if (performance.now() - t0 < 900) return { mode: 'hover', key: 'intro:air', p: { x: pp.x + 34, y: pp.y - 46 }, r: 22 };
      return { mode: 'perch', key: 'intro:logo', p: pp, facing: -1 };
    };
    api.hideBf = false;
    intro.classList.add('is-handoff');            // video yavaşça söner; alttaki film karesi aynı görüntü
    later(finish, 2100);
  }
  function finish() {
    if (phase === 'out') return;
    phase = 'out';
    timers.forEach(clearTimeout);
    api.goal = null;                               // kelebek normal hedefine (hero düğmesi) döner
    if (api.hideBf) { api.hideBf = false; }
    // logo menüdeki logonun yerine uçar (FLIP)
    var navLogo = document.querySelector('.nav .brand__logo');
    if (navLogo && intro.classList.contains('is-draw')) {
      var a = logo.getBoundingClientRect(), b = navLogo.getBoundingClientRect();
      if (a.width && b.width) {
        var k = b.height / a.height;
        logo.style.transformOrigin = '0 0';
        logo.style.transform = 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + k + ')';
      }
    }
    intro.classList.add('is-out');
    root.classList.remove('intro-on');
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    setTimeout(function () {
      api.active = false;
      var d = api.done.slice(); api.done.length = 0;
      d.forEach(function (fn) { try { fn(); } catch (e) {} });
    }, 420);                                       // "Hoş geldiniz" sönmeden hero yazısı gelmesin
    setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 1500);
  }

  // Video zamanlaması: bitişten ~1 sn önce logo çizilmeye başlar, bitişte devir
  function tick() {
    if (phase === 'out') return;
    var d = video.duration;
    if (d && isFinite(d)) {
      var t = video.currentTime;
      if (phase === 'video' && t >= d - 1.05) startWelcome();
      if (t >= d - 0.06 || video.ended) handoff();
    }
    requestAnimationFrame(tick);
  }
  video.addEventListener('ended', handoff);
  video.addEventListener('loadedmetadata', layout);

  var started = false;
  function begin() { if (started || phase !== 'video') return; started = true; requestAnimationFrame(tick); }
  video.addEventListener('playing', begin);
  function play() {
    // Yüklenmesi beklenmeden hemen başlatılır: iOS (Safari ve iOS'taki tüm tarayıcılar) oynatma istenmeden
    // videoyu yüklemez, "canplay" hiç gelmez ve ekranda ilk kare takılı kalırdı.
    var pr = video.play();
    if (pr && pr.then) pr.then(begin, function (e) { if (!e || e.name !== 'AbortError') noVideo(); });
  }
  // Ağ yavaşsa ya da otomatik oynatma engellenirse (ör. iPhone Düşük Güç Modu): videosuz kısa karşılama
  function noVideo() {
    if (started || phase !== 'video') return;
    try { video.pause(); } catch (e) {}
    intro.classList.add('is-novideo');
    startWelcome();
    later(handoff, 1400);
  }
  play();
  later(function () { if (!started) noVideo(); }, 4500);
  video.addEventListener('error', noVideo);

  skipBtn.addEventListener('click', finish);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && api.active) finish(); });
})();
