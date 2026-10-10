/* ==========================================================================
   Gecekondu Event — Altın kelebek (Three.js, gerçek 3D; renkler sitenin altın–kiremit–gece paletinden)
   - Girişte "Kaydırın, gece başlasın" düğmesinin üstüne konmuş bekler.
   - Kaydırdıkça fotoğrafları, simgeleri ve kartları takip ederek uçar,
     derinlikte yaklaşıp uzaklaşır, arkasında sihirli ışıltılar bırakır.
   - Formda önce "Organizasyon" kutusuna konar; doldurulan alanların üstünde
     uçar; form tamamlanınca "Instagram'dan Gönder" düğmesinin sağ üst
     köşesine konar ve orada belirli aralıklarla kanat açıp kapatır.
   - Performans: Three.js sayfa açıldıktan sonra yüklenir; kelebek konmuşken
     çizim yarı hızda yapılır; okuma bölümlerinde öğe öğe atlamaz, panele konar.
   ========================================================================== */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Three.js yalnızca kelebek için gerekir; sayfa ve film kareleri öncelikli, kütüphane ardından gelir.
  // Not: sürüm 0.160.0'da sabit kalmalı — tek dosyalık build/three.min.js sonraki sürümlerde yok.
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  function boot() {
    if (window.THREE) return init();
    var sc = document.createElement('script'); sc.src = THREE_URL; sc.async = true; sc.onload = init;
    document.head.appendChild(sc);
  }
  var later = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1); };
  setTimeout(function () { later(boot, { timeout: 1200 }); }, 350);

  function init() {
  if (!window.THREE) return;
  var T = window.THREE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  // ---------- Tuval ----------
  var canvas = document.createElement('canvas');
  canvas.className = 'butterfly';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { canvas.parentNode.removeChild(canvas); return; }
  var SMALL = window.innerWidth < 760;
  var DPR = Math.min(window.devicePixelRatio || 1, SMALL ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;

  var scene = new T.Scene();
  var FOV = 30, W = 1, H = 1, D = 1000;
  var camera = new T.PerspectiveCamera(FOV, 1, 10, 10000);
  var SCALE = SMALL ? 1.0 : 1.3;             // kanat açıklığı ≈ 64 / 83 px

  scene.add(new T.HemisphereLight(0xfff1dc, 0x2a1a14, 1.2));
  var key = new T.DirectionalLight(0xffffff, 1.7); key.position.set(-0.45, 0.8, 1); scene.add(key);
  var rim = new T.DirectionalLight(0xffc27a, 0.85); rim.position.set(0.7, -0.3, 0.6); scene.add(rim);

  // ---------- Kanat biçimi (yerel birim; gövde x=0, sol kanat x<0) ----------
  var FORE = [[-1.5, 3], ['c', -8, 14, -18, 22.5, -27, 24], ['c', -31, 24.6, -32.5, 21, -30.5, 16.5],
              ['c', -27.5, 10, -22, 4.2, -14, 1.2], ['c', -9, -0.4, -4, 0, -1.5, 0.6]];
  var HIND = [[-1.5, 0.2], ['c', -8, 1.2, -17, -0.8, -21.5, -6], ['c', -24.5, -10.5, -22.5, -17.5, -17, -21.5],
              ['c', -12.5, -24.5, -7.5, -23, -5, -18.5], ['c', -3, -13.5, -2, -7.5, -1.5, -2.5]];
  var VEINS_F = [[-27, 23], [-30, 18], [-27.5, 11], [-21, 5], [-13, 2]];
  var VEINS_H = [[-21, -6.5], [-22, -12], [-18, -20], [-9, -21.5]];
  var SPOTS_F = [[-27.4, 21.2], [-29.4, 18.1], [-28.8, 14.6], [-26.9, 11.4]];
  var SPOTS_H = [[-20.4, -15.8], [-16.4, -19.8], [-11.6, -21.2]];

  function shapeFrom(path, sx) {
    var s = new T.Shape();
    s.moveTo(path[0][0] * sx, path[0][1]);
    for (var i = 1; i < path.length; i++) { var p = path[i]; s.bezierCurveTo(p[1] * sx, p[2], p[3] * sx, p[4], p[5] * sx, p[6]); }
    s.closePath();
    return s;
  }
  function wingGeo(path, sx) {
    var g = new T.ShapeGeometry(shapeFrom(path, sx), 16);
    var pos = g.attributes.position, uv = g.attributes.uv;
    for (var i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 32) / 64, (pos.getY(i) + 32) / 64);
    uv.needsUpdate = true;
    return g;
  }

  // ---------- Kanat dokusu (tuvalde boyanır): kökte krem-altın, uçlara doğru kehribar ve kiremit, kenarda gece mavisi ----------
  function wingTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    function m(x, y) { return [(x + 32) * 8, (32 - y) * 8]; }
    function trace(path, sx) {
      var p0 = m(path[0][0] * sx, path[0][1]);
      g.beginPath(); g.moveTo(p0[0], p0[1]);
      for (var i = 1; i < path.length; i++) {
        var p = path[i], a = m(p[1] * sx, p[2]), b = m(p[3] * sx, p[4]), e = m(p[5] * sx, p[6]);
        g.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
      }
      g.closePath();
    }
    function paint(path, sx, root, R, veins, spots, margin) {
      g.save(); trace(path, sx); g.clip();
      var r0 = m(root[0] * sx, root[1]);
      var grd = g.createRadialGradient(r0[0], r0[1], 4, r0[0], r0[1], R);
      grd.addColorStop(0, '#fff4dc'); grd.addColorStop(0.1, '#ffd59a'); grd.addColorStop(0.36, '#f0b96b');
      grd.addColorStop(0.6, '#d9822f'); grd.addColorStop(0.82, '#b8553e'); grd.addColorStop(1, '#5a1f1c');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
      // yanardöner parıltı şeridi
      var tip = m(veins[1][0] * sx, veins[1][1]);
      var sh = g.createLinearGradient(r0[0], r0[1], tip[0], tip[1]);
      sh.addColorStop(0.25, 'rgba(255,240,200,0)'); sh.addColorStop(0.5, 'rgba(255,240,200,.3)'); sh.addColorStop(0.62, 'rgba(255,214,150,0)');
      g.fillStyle = sh; g.fillRect(0, 0, 512, 512);
      // damarlar
      g.strokeStyle = 'rgba(52,18,10,.5)'; g.lineWidth = 2.4; g.lineCap = 'round';
      veins.forEach(function (v) { var e = m(v[0] * sx, v[1]); g.beginPath(); g.moveTo(r0[0], r0[1]); g.quadraticCurveTo((r0[0] + e[0]) / 2, (r0[1] + e[1]) / 2 - 10, e[0], e[1]); g.stroke(); });
      // koyu kenar bandı
      trace(path, sx); g.lineWidth = margin; g.strokeStyle = 'rgba(13,19,36,.97)'; g.lineJoin = 'round'; g.stroke();
      // beyaz benekler
      g.fillStyle = 'rgba(255,244,222,.95)';
      spots.forEach(function (s, i) { var p = m(s[0] * sx, s[1]); g.beginPath(); g.arc(p[0], p[1], i % 2 ? 4.2 : 5.4, 0, Math.PI * 2); g.fill(); });
      g.restore();
    }
    [1, -1].forEach(function (sx) {
      paint(FORE, sx, [-2, 2], 235, VEINS_F, SPOTS_F, 46);
      paint(HIND, sx, [-2, -1], 190, VEINS_H, SPOTS_H, 32);
    });
    var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  }

  // ---------- Model ----------
  var tex = wingTexture();
  var wingMat = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55,
    roughness: 0.32, metalness: 0.18, side: T.DoubleSide, transparent: true, alphaTest: 0.04 });
  var bodyMat = new T.MeshStandardMaterial({ color: 0x1c1512, roughness: 0.5, metalness: 0.25, emissive: 0x5a2a12, emissiveIntensity: 0.35 });

  var bfly = new T.Group(); scene.add(bfly);
  var model = new T.Group(); bfly.add(model); model.scale.setScalar(SCALE);
  var wingL = new T.Group(), wingR = new T.Group(), hindL = new T.Group(), hindR = new T.Group();
  wingL.add(new T.Mesh(wingGeo(FORE, 1), wingMat)); wingR.add(new T.Mesh(wingGeo(FORE, -1), wingMat));
  hindL.add(new T.Mesh(wingGeo(HIND, 1), wingMat)); hindR.add(new T.Mesh(wingGeo(HIND, -1), wingMat));
  hindL.position.z = hindR.position.z = -0.25;
  model.add(wingL, wingR, hindL, hindR);
  var sph = new T.SphereGeometry(1, 18, 12);
  var thorax = new T.Mesh(sph, bodyMat); thorax.scale.set(2.1, 4.4, 2.2); thorax.position.y = 2.4;
  var abdomen = new T.Mesh(sph, bodyMat); abdomen.scale.set(1.55, 7.8, 1.6); abdomen.position.y = -6.4;
  var headM = new T.Mesh(sph, bodyMat); headM.scale.setScalar(1.75); headM.position.y = 7.3;
  model.add(thorax, abdomen, headM);
  [1, -1].forEach(function (s) {
    var curve = new T.CatmullRomCurve3([new T.Vector3(0.6 * s, 8.4, 0.6), new T.Vector3(2.4 * s, 12.5, 1.6), new T.Vector3(5.6 * s, 16.8, 2.2)]);
    model.add(new T.Mesh(new T.TubeGeometry(curve, 14, 0.28, 5, false), bodyMat));
    var club = new T.Mesh(sph, bodyMat); club.scale.setScalar(0.8); club.position.set(5.6 * s, 16.8, 2.2); model.add(club);
  });

  // yumuşak altın hâle
  function glowTex(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  var aura = new T.Sprite(new T.SpriteMaterial({ map: glowTex([[0, 'rgba(255,215,150,.8)'], [0.35, 'rgba(240,160,80,.26)'], [1, 'rgba(0,0,0,0)']]),
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.3 }));
  aura.scale.set(120 * SCALE, 120 * SCALE, 1); scene.add(aura);

  // ---------- Işıltı izi ----------
  var MAXP = 700, pi = 0;
  var pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3), pSize = new Float32Array(MAXP), pAlpha = new Float32Array(MAXP);
  var pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP), pSeed = new Float32Array(MAXP), pBase = new Float32Array(MAXP);
  var sGeo = new T.BufferGeometry();
  sGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  sGeo.setAttribute('aColor', new T.BufferAttribute(pCol, 3));
  sGeo.setAttribute('aSize', new T.BufferAttribute(pSize, 1));
  sGeo.setAttribute('aAlpha', new T.BufferAttribute(pAlpha, 1));
  var sMat = new T.ShaderMaterial({
    uniforms: { uCam: { value: 1000 }, uDpr: { value: DPR } },
    vertexShader: [
      'attribute vec3 aColor; attribute float aSize; attribute float aAlpha;',
      'uniform float uCam; uniform float uDpr; varying vec3 vC; varying float vA;',
      'void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      ' gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uDpr * (uCam / -mv.z); }'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vC; varying float vA;',
      'void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float d = length(p);',
      ' float core = exp(-d * d * 9.0);',
      ' float fx = max(0.0, 1.0 - abs(p.y) * 7.0) * max(0.0, 1.0 - abs(p.x));',
      ' float fy = max(0.0, 1.0 - abs(p.x) * 7.0) * max(0.0, 1.0 - abs(p.y));',
      ' float a = (core + (fx + fy) * 0.6) * vA; if (a < 0.01) discard;',
      ' gl_FragColor = vec4(vC, a); }'
    ].join('\n'),
    transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending
  });
  var sparks = new T.Points(sGeo, sMat); sparks.frustumCulled = false; scene.add(sparks);
  var PALETTE = [[1, 0.84, 0.55], [1, 0.7, 0.38], [1, 1, 1], [1, 0.93, 0.78], [0.95, 0.55, 0.4]];  // altın, kehribar, beyaz, krem, kiremit
  var PW = [0.32, 0.26, 0.2, 0.14, 0.08];
  function pickColor() { var r = Math.random(), acc = 0; for (var i = 0; i < PW.length; i++) { acc += PW[i]; if (r <= acc) return PALETTE[i]; } return PALETTE[0]; }
  function emit(px, py, pz, vx, vy, spread, soft) {
    var i = pi; pi = (pi + 1) % MAXP;
    var a = Math.random() * Math.PI * 2, rr = Math.random() * spread;
    pPos[i * 3] = px + Math.cos(a) * rr; pPos[i * 3 + 1] = py + Math.sin(a) * rr * 0.7; pPos[i * 3 + 2] = pz + (Math.random() - 0.5) * 10;
    pVel[i * 3] = (Math.random() - 0.5) * 70 - vx * 0.07; pVel[i * 3 + 1] = (Math.random() - 0.5) * 70 - vy * 0.07; pVel[i * 3 + 2] = (Math.random() - 0.5) * 40;
    var c = pickColor(); pCol[i * 3] = c[0]; pCol[i * 3 + 1] = c[1]; pCol[i * 3 + 2] = c[2];
    pMax[i] = pLife[i] = (soft ? 0.6 : 0.75) + Math.random() * (soft ? 0.6 : 1.0);
    pBase[i] = (soft ? 3 : 4) + Math.random() * (soft ? 6 : 11);
    pSeed[i] = Math.random() * 100;
  }
  function burst(n) { for (var k = 0; k < n; k++) emit(pos.x, pos.y, pos.z, 0, 0, 22 * SCALE, true); }
  function updateSparks(dt, t) {
    for (var i = 0; i < MAXP; i++) {
      if (pLife[i] <= 0) { pAlpha[i] = 0; continue; }
      pLife[i] -= dt;
      var k = i * 3;
      pVel[k] *= 0.965; pVel[k + 1] = pVel[k + 1] * 0.965 - 22 * dt; pVel[k + 2] *= 0.965;
      pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt;
      var f = clamp(pLife[i] / pMax[i], 0, 1);
      var tw = 0.65 + 0.35 * Math.sin(t * 18 + pSeed[i]);
      pAlpha[i] = Math.pow(f, 1.3) * tw;
      pSize[i] = pBase[i] * (0.45 + 0.55 * f);
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.aColor.needsUpdate = true;
    sGeo.attributes.aSize.needsUpdate = true; sGeo.attributes.aAlpha.needsUpdate = true;
  }

  // ---------- Ekran ↔ dünya ----------
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
    D = (H / 2) / Math.tan(T.MathUtils.degToRad(FOV / 2));
    camera.aspect = W / H; camera.near = D * 0.05; camera.far = D * 4;
    camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    sMat.uniforms.uCam.value = D;
  }
  resize(); window.addEventListener('resize', resize);
  function toWorld(px, py, z, out) { var k = (D - z) / D; return out.set((px - W / 2) * k, (H / 2 - py) * k, z); }

  // ---------- Hedefler (sayfa öğeleri) ----------
  var heroBtn = $('.hero__actions .btn--ghost');
  var SECTIONS = ['top', 'anlar', 'neden', 'mekanlar', 'hizmetler', 'medya', 'etkinlikler', 'galeri', 'rezervasyon', 'iletisim']
    .map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var booking = document.getElementById('rezervasyon');
  var typeEl = $('#f-type'), dateEl = $('#f-date'), noDate = $('#f-nodate'), igSend = $('#igSend');
  var FIELDS = ['#f-type', '#f-date', '#f-nodate', '#f-guests', '#f-name', '#f-note'].map(function (s) { return $(s); }).filter(Boolean);
  var REQUIRED = [typeEl, dateEl, noDate];
  var nav = $('#nav'), lastField = null, lastFieldT = -10;
  FIELDS.forEach(function (el) { el.addEventListener('input', function () { lastField = el; lastFieldT = clock; }); el.addEventListener('change', function () { lastField = el; lastFieldT = clock; }); });

  function rectOf(el) { return el ? el.getBoundingClientRect() : null; }
  function activeSection() {
    var mid = H * 0.45;
    for (var i = 0; i < SECTIONS.length; i++) { var r = SECTIONS[i].getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return SECTIONS[i]; }
    return null;
  }
  function progressIn(el) { var r = el.getBoundingClientRect(); return clamp((H * 0.5 - r.top) / Math.max(1, r.height), 0, 0.999); }
  function onTop(r, dx) { return { x: r.right - (dx || 26), y: r.top + 1 }; }
  function formComplete() { return !!typeEl.value && (noDate.checked || !!dateEl.value); }

  function formGoal() {
    var ae = document.activeElement, focused = FIELDS.indexOf(ae) >= 0 ? ae : null;
    var complete = formComplete(), recent = lastField && clock - lastFieldT < 1.4 ? lastField : null;
    // Zorunlu alanlar tamamsa ve odak hâlâ onlardaysa düğmeye geçer; isteğe bağlı alanlarda odağı takip eder
    var f = focused && !(complete && REQUIRED.indexOf(focused) >= 0) ? focused : recent;
    if (f) {
      var target = f === noDate ? noDate.closest('label') || f : f;
      var r = target.getBoundingClientRect();
      return { mode: 'hover', key: 'f:' + (f.id || 'x'), p: { x: r.right - 22, y: r.top - 14 }, r: 16 };
    }
    if (!typeEl.value) return { mode: 'perch', key: 'perch:type', p: onTop(typeEl.getBoundingClientRect(), 28), facing: -1 };
    if (!(noDate.checked || dateEl.value)) return { mode: 'perch', key: 'perch:date', p: onTop(dateEl.getBoundingClientRect(), 28), facing: -1 };
    return { mode: 'perch', key: 'final', p: onTop(igSend.getBoundingClientRect(), 24), facing: -1 };
  }

  var tnEls = $$('.tn'), gcards = $$('.gcard');
  function calmGoal(el, key) {
    var r = el.getBoundingClientRect();
    if (r.top > 96 && r.top < H - 90) return { mode: 'perch', key: key, p: onTop(r, 40), facing: -1 };
    return { mode: 'hover', key: key + ':air', p: { x: Math.min(r.right - 40, W - 56), y: clamp(r.top + 40, 120, H * 0.3) }, r: 10 };
  }
  function goal() {
    if (state.finalLanded) {
      if (formComplete()) return { mode: 'perch', key: 'final', p: onTop(igSend.getBoundingClientRect(), 24), facing: -1 };
      state.finalLanded = false;
    }
    if (window.scrollY < 40 && heroBtn) return { mode: 'perch', key: 'perch:hero', p: onTop(heroBtn.getBoundingClientRect(), 30), facing: -1 };
    var br = booking && booking.getBoundingClientRect();
    if (br && br.top < H * 0.72 && br.bottom > H * 0.3) return formGoal();
    var sec = activeSection(), id = sec ? sec.id : '';
    var i, r;
    if (id === 'anlar') {
      var best = null, bestA = 0;
      for (i = 0; i < tnEls.length; i++) {
        var el = tnEls[i];
        if (el.style.visibility === 'hidden' || parseFloat(el.style.opacity || '0') < 0.55) continue;
        r = el.getBoundingClientRect();
        if (r.bottom < 70 || r.top > H || r.right < 0 || r.left > W || r.width > W * 0.85) continue;
        var a = r.width * r.height; if (a > bestA) { bestA = a; best = r; }
      }
      if (best) return { mode: 'hover', key: 'tn', p: { x: best.right - best.width * 0.14, y: best.top + best.height * 0.1 }, r: 24 };
      return { mode: 'cruise', key: 'air', p: { x: W * 0.64, y: H * 0.42 } };
    }
    // Okuma bölümleri: öğe öğe atlamak yerine panelin üst kenarına konar; kenar ekrandan çıkınca yakında sakin süzülür
    if (id === 'neden') return calmGoal($('#neden .panel'), 'neden');
    if (id === 'mekanlar') {
      var fl = $('.face.is-front .face__float--a') || $('.face.is-front');
      if (fl) { r = fl.getBoundingClientRect(); return { mode: 'hover', key: 'face', p: { x: r.left + r.width * 0.22, y: r.top + 4 }, r: 20 }; }
    }
    if (id === 'hizmetler') return calmGoal($('#hizmetler .services'), 'hizmet');
    if (id === 'medya') {
      var h2 = $('#medya h2'); r = h2.getBoundingClientRect();
      return { mode: 'hover', key: 'medya', p: { x: Math.min(r.right + 34, W - 60), y: r.top + r.height * 0.3 }, r: 46 };
    }
    if (id === 'etkinlikler') return calmGoal($('#etkinlikler .panel'), 'etkinlik');
    if (id === 'galeri' && gcards.length) {
      var front = null, fo = -1;
      for (i = 0; i < gcards.length; i++) { var o = parseFloat(gcards[i].style.opacity || '0'); if (o > fo) { fo = o; front = gcards[i]; } }
      r = front.getBoundingClientRect();
      return { mode: 'hover', key: 'gal', p: { x: r.right - 18, y: r.top + 16 }, r: 18 };
    }
    if (id === 'iletisim') {
      var fb = $('.footer__cta .btn--ig');
      if (fb) { r = fb.getBoundingClientRect(); return { mode: 'hover', key: 'foot', p: { x: r.right - 10, y: r.top - 34 }, r: 12 }; }
    }
    return { mode: 'cruise', key: 'air', p: { x: W * 0.7, y: H * 0.38 } };
  }

  // ---------- Durum ----------
  var pos = new T.Vector3(), vel = new T.Vector3(), tmp = new T.Vector3(), goalW = new T.Vector3();
  var qFlight = new T.Quaternion(), qPerch = new T.Quaternion(), qT = new T.Quaternion(), qYaw = new T.Quaternion();
  var eul = new T.Euler(0, 0, 0, 'ZXY'), m4 = new T.Matrix4();
  var vHead = new T.Vector3(), vDors = new T.Vector3(), vSpan = new T.Vector3(), YAXIS = new T.Vector3(0, 1, 0);
  var state = { landed: true, key: 'perch:hero', heading: Math.PI, turn: 0, phase: 0, glide: 0, nextGlide: 3, openT: -1, nextOpen: 1.2, finalLanded: false, emitAcc: 0 };
  var clock = 0, gCache = null, goalAge = 0;

  // Konmuş poz: kenarın üstünde yandan, 3/4 açıdan; kanatlar kapalıyken yukarıda yelken gibi durur
  function perchQuat(facing, out) {
    var tilt = 0.6;
    vHead.set(facing, 0, 0);
    vDors.set(0, Math.cos(tilt), Math.sin(tilt));
    vSpan.crossVectors(vHead, vDors);
    m4.makeBasis(vSpan, vHead, vDors);
    out.setFromRotationMatrix(m4);
    qYaw.setFromAxisAngle(YAXIS, facing * 0.45);
    return out.premultiply(qYaw);
  }

  (function init() {
    var g = goal();
    toWorld(g.p.x, g.p.y - 6 * SCALE, 0, pos);
    bfly.position.copy(pos);
    bfly.quaternion.copy(perchQuat(-1, qPerch));
  })();

  function step(dt) {
    clock += dt;
    // Hedef seçimi (sayfa öğelerinin konumunu ölçer) saniyede ~20 kez; konarken her kare, böylece öğeyle birlikte kayar
    goalAge += dt;
    if (!gCache || gCache.mode === 'perch' || goalAge > 0.05) { gCache = goal(); goalAge = 0; }
    var t = clock, g = gCache;
    if (g.key !== state.key) {
      if (state.landed) { vel.y += 240; vel.x += (Math.random() - 0.5) * 140; burst(10); }
      state.landed = false; state.key = g.key;
    }
    // hedef nokta (ekran px → dünya)
    var px = g.p.x, py = g.p.y, z = 0;
    if (g.mode === 'perch') py -= 6 * SCALE;
    else if (g.mode === 'hover') { var R = g.r || 22; px += Math.cos(t * 1.7) * R; py += Math.sin(t * 2.3) * R * 0.55; z = Math.sin(t * 0.9) * 45; }
    else { px += Math.sin(t * 0.8) * 70; py += Math.cos(t * 1.1) * 45; z = Math.sin(t * 0.45) * 150 + Math.sin(t * 0.21) * 60; }
    if (g.mode !== 'perch') { px = clamp(px, 36, W - 36); py = clamp(py, 86, H - 44); }
    toWorld(px, py, z, goalW);

    var d = 0, speed = 0;
    if (state.landed) {
      pos.copy(goalW); vel.set(0, 0, 0);
    } else {
      tmp.copy(goalW).sub(pos); d = tmp.length();
      var maxS = g.mode === 'cruise' ? 1150 : 980, arriveR = g.mode === 'perch' ? 180 : 130;
      tmp.setLength(maxS * Math.min(1, d / arriveR));
      tmp.sub(vel);
      var maxA = 3000 * dt; if (tmp.length() > maxA) tmp.setLength(maxA);
      vel.add(tmp); pos.addScaledVector(vel, dt);
      speed = Math.hypot(vel.x, vel.y);
      if (g.mode === 'perch' && d < 3 && vel.length() < 70) {
        state.landed = true; pos.copy(goalW); vel.set(0, 0, 0);
        state.openT = -1; state.nextOpen = t + 1.1;
        if (g.key === 'final') state.finalLanded = true;
        burst(16);
      }
    }

    // yön: uçarken hız yönüne bakar, konarken yan poza geçer
    if (!state.landed && speed > 25) {
      var hd = Math.atan2(vel.y, vel.x), dh = wrap(hd - state.heading);
      var k = Math.min(1, dt * 6); state.heading = wrap(state.heading + dh * k);
      state.turn += (dh * k / Math.max(dt, 1e-3) - state.turn) * Math.min(1, dt * 4);
    } else state.turn *= 0.9;
    eul.set(-0.5 + clamp(vel.y / 2200, -0.25, 0.25), clamp(-state.turn * 0.14, -0.75, 0.75), state.heading - Math.PI / 2, 'ZXY');
    qFlight.setFromEuler(eul);
    perchQuat(g.facing || -1, qPerch);
    var w = state.landed ? 1 : (g.mode === 'perch' ? clamp(1 - (d - 6) / 110, 0, 1) : 0);
    qT.copy(qFlight).slerp(qPerch, ease(w));
    bfly.quaternion.slerp(qT, 1 - Math.exp(-dt * 9));

    // kanatlar
    var theta, hind;
    if (state.landed) {
      var closed = 1.3, open = 0.12, a = closed;
      if (state.openT < 0 && t > state.nextOpen) state.openT = 0;
      if (state.openT >= 0) {
        var o = (state.openT += dt);
        if (o < 0.6) a = closed + (open - closed) * ease(o / 0.6);
        else if (o < 1.35) a = open;
        else if (o < 1.95) a = open + (closed - open) * ease((o - 1.35) / 0.6);
        else { state.openT = -1; state.nextOpen = t + 1.8 + Math.random() * 2.6; }
        if (o >= 0.55 && o - dt < 0.55) burst(7);
      }
      theta = a + Math.sin(t * 2.3) * 0.025; hind = theta;
      model.position.y = 0;
    } else {
      var fr = 5.2 + Math.min(speed / 380, 3.6);
      if (g.mode === 'perch' && d < 90) fr = 9.5;
      state.phase += dt * fr * Math.PI * 2;
      if (state.glide > 0) { state.glide -= dt; theta = 0.2 + Math.sin(t * 3) * 0.05; hind = theta * 0.9; }
      else {
        theta = 0.55 + 0.78 * Math.sin(state.phase); hind = 0.52 + 0.7 * Math.sin(state.phase - 0.5);
        if (t > state.nextGlide && g.mode === 'cruise' && speed > 180 && speed < 850) { state.glide = 0.5; state.nextGlide = t + 3 + Math.random() * 3; }
      }
      model.position.y = Math.cos(state.phase) * 1.6;
    }
    wingL.rotation.y = theta; wingR.rotation.y = -theta;
    hindL.rotation.y = hind * 0.92; hindR.rotation.y = -hind * 0.92;
    bfly.position.copy(pos);

    // hâle ve ışıltılar
    aura.position.copy(pos);
    aura.material.opacity = state.landed ? 0.2 + 0.07 * Math.sin(t * 2) : 0.32;
    if (!state.landed) {
      state.emitAcc += dt * (38 + Math.min(speed * 0.11, 120));
      while (state.emitAcc >= 1) { state.emitAcc -= 1; emit(pos.x, pos.y, pos.z, vel.x, vel.y, 12 * SCALE, false); }
    } else if (Math.random() < dt * 1.4) emit(pos.x, pos.y, pos.z, 0, 0, 18 * SCALE, true);
    updateSparks(dt, t);
  }

  // ---------- Döngü ----------
  // Konmuş, kanat açmıyor ve sayfa kaydırılmıyorsa yarı hızda (≈30 fps) çizilir; göz farkı yok, GPU yükü yarıya iner
  var last = performance.now(), skip = 0, lastScroll = 0;
  window.addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    var calm = state.landed && state.openT < 0 && now - lastScroll > 200;
    if (calm && ++skip < 2) return;
    skip = 0;
    var dt = Math.min((now - last) / 1000, 0.06); last = now;
    canvas.style.opacity = nav && nav.classList.contains('is-open') ? '0' : '1';
    step(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  }
})();
