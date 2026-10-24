/* Gecekondu Event — arayüz, 3D tünel, prizma, galeri, Instagram hazır mesaj */
(function () {
  'use strict';

  // ---- İletişim ayarları (tek yerden değiştirin) ----
  // Instagram kullanıcı adı: ana yönlendirmeler bu hesabın DM'ine gider.
  // WhatsApp (ülke koduyla, boşluksuz): Instagram kullanmayanlar ve bot erişilemezse yedek kanal.
  var CONFIG = { instagram: 'gecekonduevent', whatsapp: '905016480746' };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = 'assets/images/';
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / window.innerWidth * 2 - 1; mouse.y = e.clientY / window.innerHeight * 2 - 1; }, { passive: true });

  // ---- Film yükleme çizgisi (sayfayı engellemez) ----
  var loadbar = $('#loadbar'), loadFill = $('#loadBar');
  window.addEventListener('film:progress', function (e) {
    var p = e.detail; loadFill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    if (p >= 0.999) loadbar.classList.add('is-done');
  });
  // Hero girişi: açılış introsu varsa o bitince oynar
  function heroIn() { requestAnimationFrame(function () { $$('.hero .reveal').forEach(function (el) { el.classList.add('is-in'); }); }); }
  if (window.GK_INTRO && window.GK_INTRO.active) window.GK_INTRO.onDone(heroIn); else heroIn();

  // ---- Navigasyon ----
  var nav = $('#nav'), burger = $('#burger'), igFloat = $('.ig-float');
  var timebar = $('.timebar'), heroScrim = $('#heroScrim');
  // Açılış karartması: ekranın %70'i kadar kaydırınca yumuşak bir eğriyle tamamen kaybolur
  function scrimState() {
    if (!heroScrim) return;
    var k = clamp(1 - window.scrollY / (window.innerHeight * 0.7), 0, 1);
    heroScrim.style.opacity = (k * k * (3 - 2 * k)).toFixed(3);
  }
  function navState() { var s = window.scrollY; if (timebar) timebar.classList.toggle('is-off', s > document.documentElement.scrollHeight - window.innerHeight * 1.6); nav.classList.toggle('is-scrolled', s > 40); igFloat.classList.toggle('is-on', s > window.innerHeight * 0.6); }
  window.addEventListener('scroll', navState, { passive: true }); navState();
  window.addEventListener('scroll', scrimState, { passive: true }); window.addEventListener('resize', scrimState); scrimState();
  function closeMenu() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Menüyü aç'); document.body.style.overflow = ''; }
  burger.addEventListener('click', function () {
    var o = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Menüyü kapat' : 'Menüyü aç'); document.body.style.overflow = o ? 'hidden' : '';
  });
  var navLinks = $$('#navLinks a'); navLinks.forEach(function (a) { a.addEventListener('click', closeMenu); });
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); }); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  ['anlar', 'neden', 'mekanlar', 'hizmetler', 'galeri', 'iletisim'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });

  // ---- Belirme ----
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(function (el) { if (!el.closest('.hero')) io.observe(el); });

  function sectionProgress(el) {
    var r = el.getBoundingClientRect(), range = el.offsetHeight - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  // =====================================================================
  // 3D TÜNEL — gerçek fotoğrafların arasından ileri uçuş
  // =====================================================================
  var TUNNEL = [
    ['48-wedding-a-frame-ceremony-wide', 'Düğün'], ['45-wedding-a-frame-bride-arch', 'Düğün'],
    ['13-henna-floral-stage', 'Kına Gecesi'], ['49-kina-bride-performers', 'Kına Gecesi'],
    ['24-proposal-a-frame-bouquet', 'Evlilik Teklifi'], ['41-proposal-kneeling', 'Evlilik Teklifi'],
    ['06-birthday-sparklers', 'Doğum Günü'], ['04-birthday-dinner', 'Doğum Günü'],
    ['08-yellow-beetle-bride', 'Gelin Çekimi'], ['01-classic-mercedes-bride', 'Gelin Çekimi'],
    ['19-wedding-ceremony-arch', 'Nikah'], ['47-wedding-arch-couple', 'Nikah'],
    ['03-wedding-toast', 'Kutlama'], ['52-kina-davul-dancers', 'Kutlama']
  ];
  var CHAPTERS = []; TUNNEL.forEach(function (t) { if (CHAPTERS.indexOf(t[1]) < 0) CHAPTERS.push(t[1]); });
  var tunnel = $('#anlar'), world = $('#world'), hudTitle = $('#hudTitle'), hudIdx = $('#hudIdx'), hud = $('.tunnel__hud');
  $('#hudTotal').textContent = String(CHAPTERS.length).padStart(2, '0');
  var D = 760, items = [];
  TUNNEL.forEach(function (t, i) {
    var f = document.createElement('figure'); f.className = 'tn';
    f.innerHTML = '<img src="' + IMG + t[0] + '-lg.webp" alt="' + t[1] + ' — Gecekondu Event" ' + (i > 3 ? 'loading="lazy"' : '') + ' decoding="async"><figcaption>' + t[1] + '</figcaption>';
    world.appendChild(f);
    var side = i % 2 ? 1 : -1;
    items.push({ el: f, z: -(i + 1) * D, xs: side * (0.2 + (i % 3) * 0.06), ys: ((i * 37) % 7 - 3) * 0.035, rot: side * -6, chap: t[1] });
  });
  var tunnelDepth = (TUNNEL.length + 1) * D;
  function sizeTunnel() { tunnel.style.height = (window.innerHeight + tunnelDepth * (window.innerWidth < 760 ? 0.75 : 0.95)) + 'px'; }
  sizeTunnel();
  var camZ = 0, camT = 0, lastChap = '';
  function renderTunnel() {
    var vw = window.innerWidth, vh = window.innerHeight, mob = vw < 760;
    var tp = sectionProgress(tunnel);
    camT = tp * tunnelDepth;
    camZ += (camT - camZ) * (reduce ? 1 : 0.1);
    var cur = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], rel = it.z + camZ;               // 0 = kamera düzlemi
      var op = smooth(-5200, -3000, rel) * (1 - smooth(-150, 260, rel));
      if (op <= 0.001) { if (it.vis !== false) { it.el.style.visibility = 'hidden'; it.vis = false; } continue; }
      if (it.vis !== true) { it.el.style.visibility = 'visible'; it.vis = true; }
      var x = it.xs * vw * (mob ? 0.55 : 1) - mouse.sx * rel * -0.02, yy = it.ys * vh - mouse.sy * rel * -0.015;
      it.el.style.opacity = op.toFixed(3);
      it.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,' + rel.toFixed(1) + 'px) rotateY(' + (it.rot * (1 - smooth(-2500, 0, rel) * 0.6)).toFixed(2) + 'deg)';
      if (rel < 260 && (!cur || rel > cur.r)) cur = { r: rel, c: it.chap };
    }
    // tüm kareler geçtiyse son bölümde kal (başa, "Düğün"e dönme); tünel biterken başlık söner
    var chap = cur ? cur.c : CHAPTERS[CHAPTERS.length - 1];
    hud.style.opacity = (1 - smooth(0.9, 0.99, tp)).toFixed(3);
    if (chap !== lastChap) {
      lastChap = chap; hudTitle.classList.remove('swap'); void hudTitle.offsetWidth; hudTitle.classList.add('swap');
      hudTitle.textContent = chap; hudIdx.textContent = String(CHAPTERS.indexOf(chap) + 1).padStart(2, '0');
    }
  }

  // =====================================================================
  // ÜÇGEN PRİZMA — Üçgen Ev'e selam: üç yüzlü dönen köşe vitrini
  // =====================================================================
  var prism = $('#mekanlar'), body = $('#prismBody'), faces = $$('.face', body), pnav = $$('#prismNav button');
  var rotNow = 0;
  function layoutPrism() {
    var w = body.offsetWidth, ap = w / (2 * Math.tan(Math.PI / 3));
    body.style.setProperty('--ap', ap + 'px');
    faces.forEach(function (f, i) { f.style.transform = 'rotateY(' + (i * 120) + 'deg) translateZ(' + ap + 'px)'; });
  }
  layoutPrism();
  function renderPrism() {
    var p = sectionProgress(prism) * 2.0001, seg = Math.min(2, Math.floor(p)), frac = p - seg;
    var f = seg >= 2 ? 2 : seg + smooth(0.3, 0.7, frac);
    var target = -f * 120;
    rotNow += (target - rotNow) * (reduce ? 1 : 0.12);
    var tx = mouse.sy * 4, ty = mouse.sx * -6;
    body.style.transform = 'translateZ(calc(var(--ap) * -1)) rotateX(' + tx.toFixed(2) + 'deg) rotateY(' + (rotNow + ty).toFixed(2) + 'deg)';
    var active = Math.round(-rotNow / 120);
    pnav.forEach(function (b, i) { b.classList.toggle('is-active', i === active); });
    faces.forEach(function (fc, i) { fc.classList.toggle('is-front', i === active); });
  }
  pnav.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = +b.getAttribute('data-i'), range = prism.offsetHeight - window.innerHeight;
      window.scrollTo({ top: prism.offsetTop + range * (i / 2) + (i ? -2 : 2), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ---- Hizmet kartları: 3D eğim ----
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = 'rotateX(' + ((0.5 - py) * 7) + 'deg) rotateY(' + ((px - 0.5) * 9) + 'deg)';
        card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%');
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  // =====================================================================
  // GALERİ — 3D halka
  // =====================================================================
  var PHOTOS = [
    ['18-wedding-a-frame', 'Üçgen Ev'], ['12-garden-tables', 'Kır bahçesi'], ['14-henna-red-veil', 'Kına gecesi'],
    ['11-yellow-orange-beetles', 'Klasik arabalar'], ['34-proposal-ring-couple', 'Evet anı'], ['46-wedding-a-frame-ceremony', 'Nikah'],
    ['05-birthday-bonfire', 'Doğum günü'], ['50-kina-dance-group', 'Kına gecesi'], ['09-yellow-beetle-couple', 'Gelin & damat'],
    ['25-proposal-ring-closeup', 'Evlilik teklifi'], ['07-fireside-lounge', 'Şömineli Loca'], ['29-wedding-blue-dress-portrait', 'Düğün'],
    ['17-henna-red-floral-sofa', 'Kına dekoru'], ['31-proposal-bicycle-couple', 'Romantik anlar'], ['02-classic-mercedes-portrait', 'Klasik Mercedes'],
    ['23-wedding-arch-empty', 'Tören alanı'], ['40-proposal-a-frame-bride', 'Üçgen Ev'], ['51-kina-performers-stage', 'Kına şov'],
    ['36-wedding-bride-mirror', 'Karşılama'], ['44-proposal-wooden-lounge', 'Ahşap loca']
  ];
  var ring = $('#ring'), carousel = $('#carousel'), cap = $('#galCaption');
  var N = PHOTOS.length, step = 360 / N, angle = 0, vel = 0, gtarget = null, radius = 0;
  PHOTOS.forEach(function (p, i) {
    var b = document.createElement('button'); b.className = 'gcard'; b.type = 'button'; b.setAttribute('aria-label', p[1] + ' — büyüt');
    b.innerHTML = '<img data-src="' + IMG + p[0] + '-sm.webp" alt="' + p[1] + '" decoding="async" draggable="false"><span>' + p[1] + '</span>';
    b.addEventListener('click', function () { if (!moved) openLB(i); }); ring.appendChild(b);
  });
  var cards = $$('.gcard', ring);
  // Halkadaki kartlar 3D'de yana/arkaya döndüğü için tarayıcının tembel yüklemesi onları hiç "görmez" ve
  // kart boş kalır. Bunun yerine galeri ekrana yaklaşınca (≈1,5 ekran önce) 20 fotoğrafın hepsi birlikte yüklenir.
  var ringLoad = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    $$('img[data-src]', ring).forEach(function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); });
    ringLoad.disconnect();
  }, { rootMargin: '150% 0px' });
  ringLoad.observe(carousel);
  function layoutRing() {
    var w = window.innerWidth < 760 ? 160 : window.innerWidth < 1100 ? 200 : 236;
    radius = Math.round((w + 22) / (2 * Math.tan(Math.PI / N)));
    cards.forEach(function (c, i) { c.style.setProperty('--cw', w + 'px'); c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + radius + 'px)'; });
  }
  layoutRing();
  function frontIdx() { var i = Math.round(-angle / step) % N; return (i + N) % N; }
  var lastFront = -1, dragging = false, moved = false, lx = 0, ringVisible = false;
  new IntersectionObserver(function (e) { ringVisible = e[0].isIntersecting; }).observe(carousel);
  carousel.addEventListener('pointerdown', function (e) { dragging = true; moved = false; lx = e.clientX; vel = 0; gtarget = null; carousel.classList.add('is-drag'); });
  window.addEventListener('pointermove', function (e) { if (!dragging) return; var dx = e.clientX - lx; lx = e.clientX; if (Math.abs(dx) > 2) moved = true; angle += dx * 0.22; vel = dx * 0.22; });
  window.addEventListener('pointerup', function () { if (!dragging) return; dragging = false; carousel.classList.remove('is-drag'); setTimeout(function () { moved = false; }, 0); });
  function go(dir) { gtarget = Math.round(angle / step) * step - dir * step; vel = 0; }
  $('#prev').addEventListener('click', function () { go(-1); });
  $('#next').addEventListener('click', function () { go(1); });
  carousel.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); if (e.key === 'Enter') openLB(frontIdx()); });
  function renderRing() {
    if (!dragging) {
      if (gtarget !== null) { angle += (gtarget - angle) * 0.12; if (Math.abs(gtarget - angle) < 0.05) { angle = gtarget; gtarget = null; } }
      else if (Math.abs(vel) > 0.02) { angle += vel; vel *= 0.94; }
      else if (!reduce) angle -= 0.05;
    }
    ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateX(' + (-5 + mouse.sy * 3).toFixed(2) + 'deg) rotateY(' + angle.toFixed(3) + 'deg)';
    var f = frontIdx(); if (f !== lastFront) { lastFront = f; cap.textContent = PHOTOS[f][1]; }
    cards.forEach(function (c, i) {
      var d = 1 - Math.abs(((i * step + angle) % 360 + 540) % 360 - 180) / 180;
      c.style.opacity = Math.max(0.2, d).toFixed(3); c.style.filter = 'brightness(' + (0.4 + 0.6 * d).toFixed(3) + ')';
    });
  }

  // ---- Lightbox ----
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), cur = 0, lastFocus;
  function show(i) { cur = (i + N) % N; lbImg.src = IMG + PHOTOS[cur][0] + '-lg.webp'; lbImg.alt = PHOTOS[cur][1]; lbCap.textContent = PHOTOS[cur][1]; }
  function openLB(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); }
  function closeLB() { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  $('#lbClose').addEventListener('click', closeLB);
  $('#lbPrev').addEventListener('click', function () { show(cur - 1); });
  $('#lbNext').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });

  // =====================================================================
  // INSTAGRAM — hazır mesaj: form doldukça DM önizlemesi canlı güncellenir;
  // düğme mesajı panoya kopyalar ve Instagram sohbetini açar (otomatik asistan anında yanıtlar)
  // =====================================================================
  var IG_DM = 'https://ig.me/m/' + CONFIG.instagram;
  // ref: Meta'nın resmî ig.me parametresi. Form bilgisi "gsite1_" + base64url(JSON) olarak bota gider
  // (izinli karakterler: harf, rakam, - _ =; en çok 2083). Bot bunu okuyup kişiye özel yanıt verir.
  // text: belgelenmemiş; bazı sürümlerde mesaj kutusunu doldurur. Doldurmazsa panodaki metin yapıştırılır.
  function b64url(str) {
    var bin = '';
    if (window.TextEncoder) { new TextEncoder().encode(str).forEach(function (b) { bin += String.fromCharCode(b); }); }
    else { bin = unescape(encodeURIComponent(str)); }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function siteRef(obj) { obj.v = 1; return 'gsite1_' + b64url(JSON.stringify(obj)); }
  function igLink(text, refObj) {
    var q = [];
    if (refObj) q.push('ref=' + siteRef(refObj));
    if (text) q.push('text=' + encodeURIComponent(text));
    return IG_DM + (q.length ? '?' + q.join('&') : '');
  }
  $$('a[href^="https://ig.me/m/"]').forEach(function (l) { if (!l.hasAttribute('data-q') && l.id !== 'igSend') l.href = IG_DM; });
  // WhatsApp: text parametresi resmî olarak desteklenir, mesaj kutusu hazır dolu açılır
  function waLink(text) { return 'https://wa.me/' + CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : ''); }
  $$('a[data-wa]').forEach(function (l) { l.href = waLink('Merhaba Gecekondu Event, web sitenizden yazıyorum.'); });

  var toast = $('#toast'), toastT = 0;
  function showToast(msg) {
    toast.textContent = msg; toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add('is-on'); });
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('is-on'); setTimeout(function () { toast.hidden = true; }, 400); }, 6500);
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.readOnly = true; ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var done = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta); return !!done;
    } catch (e) { return false; }
  }
  // Panoya kopyalar; sonuç (true/false) Promise ile döner. Tıklama anında çağrılmalı.
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(text));
  }

  // Hızlı sorular: dokununca soru kopyalanır ve Instagram açılır
  $$('.chip[data-q]').forEach(function (c) {
    var q = c.getAttribute('data-q'); c.href = igLink(q, { q: c.getAttribute('data-k') });
    c.addEventListener('click', function () {
      copyText(q).then(function (copied) {
        showToast(copied ? '“' + c.textContent + '” sorusu hazır. Instagram\'da Gönder\'e dokunun; kutu boşsa basılı tutup “Yapıştır”ı seçin.'
                         : 'Instagram açılıyor. Sorunuzu DM\'den yazın, asistanımız anında yanıtlasın.');
      });
    });
  });

  var form = $('#form'), err = $('#formErr'), ok = $('#formOk'), msgOut = $('#msgOut'), igSend = $('#igSend'), waSend = $('#waSend'), dmMsg = $('#dmMsg');
  var typeEl = $('#f-type'), dateEl = $('#f-date'), noDate = $('#f-nodate'), guests = $('#f-guests'), out = $('#guestsOut'), nameEl = $('#f-name'), noteEl = $('#f-note');
  dateEl.min = new Date().toISOString().slice(0, 10);
  function fmtDate(v) { var p = v.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function fields() {
    return {
      type: typeEl.value,
      date: noDate.checked ? 'Henüz belli değil' : (dateEl.value ? fmtDate(dateEl.value) : ''),
      guests: guests.value + ' kişi',
      name: nameEl.value.trim(),
      note: noteEl.value.trim()
    };
  }
  function refData() {
    return { t: typeEl.value || '', d: noDate.checked ? 'belirsiz' : (dateEl.value || ''), k: +guests.value,
             a: nameEl.value.trim().slice(0, 60), n: noteEl.value.trim().slice(0, 300) };
  }
  var INTRO = 'Merhaba Gecekondu Event, web sitenizden yazıyorum.', ASK = 'Fiyat ve detaylar hakkında bilgi alabilir miyim?';
  function buildMsg(f) {
    return INTRO + '\n\nOrganizasyon: ' + (f.type || '-') + '\nTarih: ' + (f.date || '-') + '\nTahmini davetli: ' + f.guests +
      (f.name ? '\nAdım: ' + f.name : '') + (f.note ? '\nNot: ' + f.note : '') + '\n\n' + ASK;
  }
  function preview(f) {
    function v(x, ph) { return x ? '<b>' + esc(x) + '</b>' : '<span class="ph">' + ph + '</span>'; }
    return esc(INTRO) + '<br><br>Organizasyon: ' + v(f.type, 'seçin') + '<br>Tarih: ' + v(f.date, 'gün.ay.yıl') +
      '<br>Tahmini davetli: <b>' + esc(f.guests) + '</b>' + (f.name ? '<br>Adım: <b>' + esc(f.name) + '</b>' : '') +
      (f.note ? '<br>Not: ' + esc(f.note) : '') + '<br><br>' + esc(ASK);
  }
  function sync() {
    var f = fields();
    out.textContent = f.guests;
    dateEl.disabled = noDate.checked;
    dmMsg.innerHTML = preview(f);
    igSend.href = igLink(buildMsg(f), refData());
    if (waSend) waSend.href = waLink(f.type ? buildMsg(f) : INTRO + ' ' + ASK);
    if (!msgOut.hidden) msgOut.value = buildMsg(f);
    if (err.textContent && f.type && f.date) err.textContent = '';
  }
  function validate() {
    var typeOk = !!typeEl.value, dateOk = noDate.checked || !!dateEl.value;
    typeEl.classList.toggle('is-invalid', !typeOk); dateEl.classList.toggle('is-invalid', !dateOk);
    if (!typeOk || !dateOk) {
      ok.textContent = '';
      err.textContent = 'Önce organizasyon türünü ve tarihi seçin. Tarih belli değilse “Tarih henüz belli değil” kutusunu işaretleyin.';
      (typeOk ? dateEl : typeEl).focus(); return false;
    }
    err.textContent = ''; return true;
  }
  form.addEventListener('input', function (e) { if (e.target.classList) e.target.classList.remove('is-invalid'); sync(); });
  form.addEventListener('change', function (e) { if (e.target === noDate) dateEl.classList.remove('is-invalid'); sync(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    sync(); ok.textContent = 'Mesajınız hazır. “Instagram\'dan Gönder” düğmesine dokunun.'; igSend.focus();
  });
  igSend.addEventListener('click', function (e) {
    if (!validate()) { e.preventDefault(); return; }
    sync();
    var msg = buildMsg(fields());
    copyText(msg).then(function (copied) {
      if (copied) {
        msgOut.hidden = true;
        ok.textContent = 'Mesajınız hazır ve kopyalandı. Instagram\'da Gönder\'e dokunun; kutu boşsa basılı tutup “Yapıştır”ı seçin.';
        showToast('Mesajınız hazır. Instagram\'da Gönder\'e dokunun, asistanımız anında yanıtlasın.');
      } else {
        msgOut.hidden = false; msgOut.value = msg; msgOut.focus(); msgOut.select();
        ok.textContent = 'Otomatik kopyalama yapılamadı. Aşağıdaki metni seçip kopyalayın, sonra Instagram\'da gönderin.';
      }
    });
  });
  sync();

  // ---- Ana döngü ----
  window.addEventListener('resize', function () { sizeTunnel(); layoutPrism(); layoutRing(); if (window.GECEKONDU_FILM) window.GECEKONDU_FILM.refresh(); });
  (function loop() {
    requestAnimationFrame(loop);
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    var vh = window.innerHeight, tr = tunnel.getBoundingClientRect(), pr = prism.getBoundingClientRect();
    if (tr.bottom > -vh && tr.top < vh * 2) renderTunnel();
    if (pr.bottom > -vh && pr.top < vh * 2) renderPrism();
    if (ringVisible) renderRing();
  })();
  renderRing();
})();
