/* ==========================================================================
   Gecekondu Event — Kaydırmayla oynayan drone filmi + 3D ışık bokeh katmanı
   - gecekondu1.mp4'ten çıkarılmış 179 kare (12 fps) canvas'a çizilir;
     sayfa ilerledikçe film gün batımından gece havai fişeklerine akar.
   - Film düzlemi fare ve kaydırmayla perspektifte eğilir (gerçek 3D).
   - Üstte derinlikli, paralaks yapan sıcak ışık parçacıkları (2D tuvalde
     perspektif izdüşümüyle; ikinci bir WebGL bağlamı açmaz).
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.innerWidth < 760;
  // Kare setleri:
  //  frames   — 1280×720, yatay ekranlar
  //  frames-p — 540×720, ortadan kırpılmış; dikey ekranda görünen şerit aynı çözünürlükte, dosya yarı boyutta
  function pickDir() {
    return window.innerWidth / window.innerHeight < 0.8 ? 'assets/frames-p/' : 'assets/frames/';
  }
  var DIR = pickDir();
  var COUNT = 179;

  var canvas = document.getElementById('film'), ctx = canvas.getContext('2d');
  var tilt = document.getElementById('filmTilt'), shade = document.getElementById('filmShade');
  var timeLabel = document.getElementById('timeLabel'), timeFill = document.getElementById('timeFill');
  var frames = new Array(COUNT), loaded = new Array(COUNT), loadedCount = 0;

  function src(i) { return DIR + 'f' + String(i + 1).padStart(3, '0') + '.webp'; }

  // Öncelikli yükleme: önce seyrek kareler, sonra aralar dolar
  var order = [], seen = {};
  [32, 16, 8, 4, 2, 1].forEach(function (step) {
    for (var i = 0; i < COUNT; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
  });
  var inflight = 0, cursor = 0, MAX = 6, gen = 0;
  function pump() {
    while (inflight < MAX && cursor < order.length) {
      (function (i, g) {
        var img = new Image(); img.decoding = 'async'; inflight++;
        img.onload = function () { inflight--; if (g !== gen) return pump(); frames[i] = img; loaded[i] = true; loadedCount++; dirty = true; pump();
          window.dispatchEvent(new CustomEvent('film:progress', { detail: loadedCount / COUNT })); };
        img.onerror = function () { inflight--; pump(); };
        img.src = src(i);
      })(order[cursor++], gen);
    }
  }
  pump();
  // Ekran dikeyden yataya (ya da tersi) dönerse uygun sete geçilir; eski kareler yenileri gelene dek gösterilir
  function switchSet() {
    var d = pickDir(); if (d === DIR) return;
    DIR = d; gen++; cursor = 0;
    var old = frames.slice(), oldLoaded = loaded.slice();
    frames = new Array(COUNT); loaded = new Array(COUNT); loadedCount = 0;
    fallback = { frames: old, loaded: oldLoaded };
    pump();
  }
  var fallback = null;

  function nearest(i, ld) {
    if (ld[i]) return i;
    for (var d = 1; d < COUNT; d++) {
      if (i - d >= 0 && ld[i - d]) return i - d;
      if (i + d < COUNT && ld[i + d]) return i + d;
    }
    return -1;
  }

  var W = 0, H = 0, DPR = 1;
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * 1.16 * DPR); canvas.height = Math.round(H * 1.16 * DPR);
    dirty = true;
    sizeBokeh();
    switchSet();
  }
  window.addEventListener('resize', size);

  var target = 0, prog = 0, lastDrawn = -1, dirty = true;
  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  function draw(img) {
    if (!img) return;
    var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  var LABELS = [[0, 'Gün batımı'], [0.28, 'Altın saat'], [0.45, 'Mavi saat'], [0.6, 'Işıklar yanıyor'], [0.78, 'Gece başlıyor']];
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1; }, { passive: true });

  // ---------- Bokeh (2D tuval, gerçek perspektif izdüşümü) ----------
  // Önceki Three.js sürümüyle aynı sahne: 55° görüş açılı kamera, ileri uçuş, toplamsal (additive) parlama.
  var bc = document.getElementById('bokeh'), bctx = bc.getContext('2d'), BDPR = 1;
  var sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
  (function () {
    var g = sprite.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,210,1)'); grd.addColorStop(0.25, 'rgba(255,205,140,.85)'); grd.addColorStop(0.6, 'rgba(255,160,80,.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  })();
  var BN = small ? 70 : 140, base = [];
  for (var bi = 0; bi < BN; bi++) {
    var bz = -Math.random() * 60 + 4, spread = (10 - bz) * 0.62;
    base.push([(Math.random() * 2 - 1) * spread * 1.2, (Math.random() * 2 - 1) * spread * 0.9, bz, Math.random() * 6.28, 0.2 + Math.random() * 0.5]);
  }
  var FOCAL = 1 / Math.tan(55 / 2 * Math.PI / 180);
  function sizeBokeh() {
    BDPR = Math.min(window.devicePixelRatio || 1, 1.5);
    bc.width = Math.round(window.innerWidth * BDPR); bc.height = Math.round(window.innerHeight * BDPR);
  }
  function bokeh(t, p) {
    var w = bc.width, h = bc.height, f = FOCAL * h / 2;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.globalCompositeOperation = 'source-over'; bctx.clearRect(0, 0, w, h);
    bctx.globalCompositeOperation = 'lighter';
    // gece ilerledikçe ışıklar artar
    bctx.globalAlpha = 0.18 + Math.min(1, Math.max(0, (p - 0.35) / 0.35)) * 0.62;
    var cx = mouse.sx * 1.4, cy = -mouse.sy * 0.9 - p * 6, cz = 10 - p * 34;  // kaydırdıkça ışıkların arasından ileri uçuş
    var yaw = Math.atan2(-0.7 * cx, 20), cs = Math.cos(yaw), sn = Math.sin(yaw);  // kamera hafifçe merkeze döner
    for (var i = 0; i < BN; i++) {
      var b = base[i];
      var rx = b[0] + Math.sin(t * b[4] + b[3]) * 0.6 - cx, ry = b[1] + Math.sin(t * b[4] * 0.7 + b[3] * 2) * 0.4 - cy, rz = b[2] - cz;
      var x = cs * rx + sn * rz, depth = -(-sn * rx + cs * rz);
      if (depth < 0.1) continue;
      var s = Math.min(0.9 * f / depth, 600 * BDPR);
      var sx = w / 2 + x * f / depth, sy = h / 2 - ry * f / depth;
      if (sx < -s || sx > w + s || sy < -s || sy > h + s) continue;
      bctx.drawImage(sprite, sx - s / 2, sy - s / 2, s, s);
    }
  }

  // ---------- Döngü ----------
  var clock0 = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var k = reduce ? 1 : 0.085;
    prog += (target - prog) * k;
    mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;

    var fi = Math.min(COUNT - 1, Math.round(prog * (COUNT - 1)));
    var n = nearest(fi, loaded), o = -1;
    // set değiştiyse ve yeni setin en yakın karesi uzaksa, yenisi gelene dek eski setten çiz
    if (fallback && (n < 0 || Math.abs(n - fi) > 6)) o = nearest(fi, fallback.loaded);
    if (o >= 0) { if (o !== lastDrawn - 1000 || dirty) { draw(fallback.frames[o]); lastDrawn = o + 1000; dirty = false; } }
    else if (n >= 0 && (n !== lastDrawn || dirty)) { draw(frames[n]); lastDrawn = n; dirty = false; }
    if (fallback && loadedCount === COUNT) fallback = null;

    // 3D eğim: fare + kaydırmaya bağlı kamera hareketi
    if (!reduce) {
      var rx = mouse.sy * -2.2 + Math.sin(prog * Math.PI * 2) * 1.5;
      var ry = mouse.sx * 3.2;
      var sc = 1.0 + prog * 0.08;
      tilt.style.transform = 'translate3d(' + (-mouse.sx * 14) + 'px,' + (-mouse.sy * 10) + 'px,0) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg) scale(' + sc.toFixed(4) + ')';
    }
    shade.style.setProperty('--p', prog.toFixed(4));

    for (var l = LABELS.length - 1; l >= 0; l--) if (prog >= LABELS[l][0]) { if (timeLabel.textContent !== LABELS[l][1]) timeLabel.textContent = LABELS[l][1]; break; }
    timeFill.style.transform = 'scaleX(' + prog.toFixed(4) + ')';

    if (!document.hidden) bokeh((now - clock0) / 1000, prog);
  }
  size(); readScroll(); prog = target;
  requestAnimationFrame(loop);
  window.GECEKONDU_FILM = { refresh: readScroll };
})();
