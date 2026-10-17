/* ==========================================================================
   PepperScan — shared behaviour
   Reads content from config.js (window.SITE) and text from i18n.js (window.I18N).
   ========================================================================== */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  var DICT = window.I18N || { en: {}, km: {} };
  var R = SITE.results || {};
  var page = document.body.getAttribute('data-page');
  var NS = 'http://www.w3.org/2000/svg';
  var lang = 'en';
  try {
    var saved = localStorage.getItem('pepperscan-lang');
    if (saved === 'km' || saved === 'en') lang = saved;
  } catch (e) { /* storage unavailable: stay on English */ }

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function t(key, vars) {
    var s = DICT[lang] && DICT[lang][key];
    if (s === undefined) s = DICT.en && DICT.en[key];
    if (s === undefined) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function isPh(v) {
    return v === null || v === undefined || v === '' || (typeof v === 'string' && v.trim().charAt(0) === '[');
  }
  function getPath(o, p) {
    return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o);
  }
  function phSpan(text) {
    var s = document.createElement('span');
    s.className = 'ph';
    s.textContent = text;
    return s;
  }
  // Real value -> text node. Placeholder (empty / "[...]") -> dashed highlight.
  function valueNode(v, fallback) {
    if (isPh(v)) return phSpan(typeof v === 'string' && v ? v : fallback);
    return document.createTextNode(String(v));
  }
  // Fill an element from a translation that contains {name} slots.
  function fillTemplate(el, key, nodes) {
    el.textContent = '';
    t(key).split(/(\{\w+\})/).forEach(function (part) {
      var m = part.match(/^\{(\w+)\}$/);
      if (m && nodes[m[1]]) el.appendChild(nodes[m[1]].cloneNode(true));
      else if (part) el.appendChild(document.createTextNode(part));
    });
  }
  function svg(tag, attrs, text) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function pct(v, digits) { return (v * 100).toFixed(digits === undefined ? 1 : digits) + '%'; }
  function icon(id) {
    var s = svg('svg', { 'class': 'ic', 'aria-hidden': 'true' });
    var u = svg('use', {});
    u.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + id);
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }

  /* ---------- derived numbers (all traceable to config.results) ---------- */
  function realData() { return R.placeholder === false; }
  function derived() {
    var cm = R.confusion || [], total = 0, correct = 0;
    cm.forEach(function (row, i) { row.forEach(function (v, j) { total += v; if (i === j) correct += v; }); });
    var dep = (R.inference || [])[R.deployedIndex || 0];
    return {
      classes: (R.classNames || []).length,
      accuracy: total ? correct / total : null,
      inferenceSec: dep ? dep.ms / 1000 : null
    };
  }
  function metrics() {
    var cm = R.confusion || [], n = cm.length, out = { precision: [], recall: [], f1: [] };
    for (var i = 0; i < n; i++) {
      var col = 0, row = 0;
      for (var j = 0; j < n; j++) { col += cm[j][i]; row += cm[i][j]; }
      var tp = cm[i][i], p = col ? tp / col : 0, r = row ? tp / row : 0;
      out.precision.push(p); out.recall.push(r); out.f1.push(p + r ? 2 * p * r / (p + r) : 0);
    }
    return out;
  }

  /* ---------- static text, site values, links ---------- */
  function applyStatic() {
    document.documentElement.setAttribute('lang', lang);
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-placeholder]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.title = t('meta.' + page + '.title');
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta.' + page + '.desc'));
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }

  function applySite() {
    $$('[data-site]').forEach(function (el) {
      var v = getPath(SITE, el.getAttribute('data-site'));
      if (isPh(v)) { el.textContent = (typeof v === 'string' && v) ? v : '[PLACEHOLDER]'; el.classList.add('ph'); }
      else { el.textContent = v; el.classList.remove('ph'); }
    });
    var hasEmail = typeof SITE.email === 'string' && SITE.email.indexOf('@') > 0 && SITE.email.charAt(0) !== '[';
    $$('[data-email-text]').forEach(function (el) {
      if (hasEmail) { el.textContent = SITE.email; el.classList.remove('ph'); }
      else { el.textContent = SITE.email || '[YOUR TEAM EMAIL]'; el.classList.add('ph'); }
    });
    $$('a[data-email-href]').forEach(function (a) { markLink(a, hasEmail ? 'mailto:' + SITE.email : ''); });
    $$('a[data-link]').forEach(function (a) {
      var url = SITE.links && SITE.links[a.getAttribute('data-link')];
      markLink(a, isPh(url) ? '' : url);
    });
  }
  function markLink(a, url) {
    if (url) {
      a.setAttribute('href', url);
      a.classList.remove('ph-link'); a.removeAttribute('title');
      if (/^https?:/i.test(url)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
    } else {
      a.setAttribute('href', '#');
      a.classList.add('ph-link'); a.setAttribute('title', t('ph.link'));
      if (!a._phBound) { a._phBound = true; a.addEventListener('click', function (e) { if (a.classList.contains('ph-link')) e.preventDefault(); }); }
    }
  }

  /* ---------- home: stats ---------- */
  function renderStats() {
    var d = derived(), real = realData(), s = R.summary || {};
    $$('[data-stat]').forEach(function (el) {
      var k = el.getAttribute('data-stat'), node;
      if (k === 'classes') node = real ? document.createTextNode(String(d.classes)) : phSpan('[N]');
      else if (k === 'accuracy') node = real && d.accuracy !== null ? document.createTextNode(pct(d.accuracy)) : phSpan('[XX.X]%');
      else node = real && d.inferenceSec !== null ? document.createTextNode(d.inferenceSec.toFixed(2) + ' s') : phSpan('[X.XX] s');
      el.textContent = ''; el.appendChild(node);
    });
    $$('[data-stat-label]').forEach(function (el) {
      var k = el.getAttribute('data-stat-label');
      if (k === 'inference') fillTemplate(el, 'home.stat.inference', { pi: valueNode(s.piModel, '[model]') });
      else el.textContent = t('home.stat.' + k);
    });
    var c = $('[data-alert-line]');
    if (c) fillTemplate(c, 'home.alert.line', { c: phSpan('[disease name]'), p: phSpan('[X%]') });
  }

  /* ---------- results: facts, limitation, banner ---------- */
  function renderFacts() {
    var el = $('#facts'); if (!el) return;
    var s = R.summary || {}, d = derived(), real = realData();
    var rows = [
      ['fact.dataset', isPh(s.datasetImages) ? phSpan('[N]') : document.createTextNode(s.datasetImages + ' ' + t('fact.images'))],
      ['fact.classes', real ? document.createTextNode((R.classNames || []).join(', ')) : phSpan('[CLASS NAMES]')],
      ['fact.split', document.createTextNode('80 / 20')],
      ['fact.input', document.createTextNode('224 × 224')],
      ['fact.epochs', valueNode(s.epochs, '[N]')],
      ['fact.model', document.createTextNode('YOLOv11n-cls')],
      ['fact.pi', isPh(s.piModel) ? phSpan('[model]') : document.createTextNode('Raspberry Pi ' + s.piModel)],
      ['fact.threshold', valueNode(s.threshold, '[0.6]')],
      ['fact.accuracy', real && d.accuracy !== null ? document.createTextNode(pct(d.accuracy)) : phSpan('[XX.X]%')],
      ['fact.inference', real && d.inferenceSec !== null ? document.createTextNode(d.inferenceSec.toFixed(2) + ' s') : phSpan('[X.XX] s')]
    ];
    el.textContent = '';
    rows.forEach(function (r) {
      var box = document.createElement('div'); box.className = 'fact';
      var dt = document.createElement('dt'); dt.textContent = t(r[0]);
      var dd = document.createElement('dd'); dd.appendChild(r[1]);
      box.appendChild(dt); box.appendChild(dd); el.appendChild(box);
    });
    var lim = $('#lim-3');
    if (lim) fillTemplate(lim, 'lim.3', { status: valueNode(s.pilotStatus, '[PILOT STATUS]') });
    var banner = $('#ph-banner');
    if (banner) banner.hidden = realData();
  }

  /* ---------- team ---------- */
  function renderTeam() {
    var grid = $('#team-grid'); if (!grid) return;
    grid.textContent = '';
    (SITE.team || []).forEach(function (m) {
      var card = document.createElement('article'); card.className = 'member';
      var av = document.createElement('div'); av.className = 'avatar';
      if (m.photo) { var img = document.createElement('img'); img.src = m.photo; img.alt = isPh(m.name) ? '' : m.name; img.loading = 'lazy'; av.appendChild(img); }
      else { av.setAttribute('aria-hidden', 'true'); av.appendChild(icon('i-user')); }
      var h = document.createElement('h3'); h.appendChild(valueNode(m.name, '[NAME]'));
      var role = document.createElement('p'); role.className = 'role'; role.textContent = t('role.' + m.role);
      var desc = document.createElement('p'); desc.className = 'desc'; desc.textContent = t('role.' + m.role + '.d');
      card.appendChild(av); card.appendChild(h); card.appendChild(role); card.appendChild(desc); grid.appendChild(card);
    });
  }

  /* ---------- gallery + lightbox ---------- */
  var lbIndex = 0;
  function renderGallery() {
    var wrap = $('#gallery'); if (!wrap) return;
    wrap.textContent = '';
    (SITE.gallery || []).forEach(function (g, i) {
      var cap = t(g.cap);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'g-item'; b.setAttribute('aria-label', cap);
      if (g.src) { var img = document.createElement('img'); img.src = g.src; img.alt = cap; img.loading = 'lazy'; b.appendChild(img); }
      else { var ph = document.createElement('span'); ph.className = 'g-ph'; ph.textContent = t('gallery.missing'); b.appendChild(ph); }
      var c = document.createElement('span'); c.className = 'g-cap'; c.textContent = cap; b.appendChild(c);
      b.addEventListener('click', function () { openLightbox(i); });
      wrap.appendChild(b);
    });
    if ($('#lightbox') && $('#lightbox').open) showLightbox(lbIndex);
  }
  function showLightbox(i) {
    var items = SITE.gallery || []; if (!items.length) return;
    lbIndex = (i + items.length) % items.length;
    var g = items[lbIndex], media = $('#lb-media'), cap = t(g.cap);
    media.textContent = '';
    if (g.src) { var img = document.createElement('img'); img.src = g.src; img.alt = cap; media.appendChild(img); }
    else { var d = document.createElement('div'); d.className = 'lb-ph'; d.textContent = t('gallery.missing'); media.appendChild(d); }
    $('#lb-cap').textContent = cap + '  (' + (lbIndex + 1) + '/' + items.length + ')';
  }
  function openLightbox(i) {
    var dlg = $('#lightbox'); if (!dlg || typeof dlg.showModal !== 'function') return;
    showLightbox(i); dlg.showModal();
  }
  function initLightbox() {
    var dlg = $('#lightbox'); if (!dlg) return;
    $('.lb-close', dlg).addEventListener('click', function () { dlg.close(); });
    $('.lb-btn.prev', dlg).addEventListener('click', function () { showLightbox(lbIndex - 1); });
    $('.lb-btn.next', dlg).addEventListener('click', function () { showLightbox(lbIndex + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
      if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
    });
  }

  /* ---------- demo video ---------- */
  var videoStarted = false;
  function parseVideo(url) {
    url = url || '';
    if (/\.(mp4|webm)(\?.*)?$/i.test(url)) return { type: 'file', src: url };
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (m) return { type: 'youtube', id: m[1] };
    if (/^https?:\/\//i.test(url)) return { type: 'link', href: url };
    return null;
  }
  function renderVideo() {
    var box = $('#video-box'); if (!box || videoStarted) return;
    box.textContent = '';
    var v = parseVideo((SITE.links || {}).video);
    if (!v) {
      var p = document.createElement('div'); p.className = 'video-placeholder';
      var s = phSpan(t('demo.missing')); p.appendChild(s); box.appendChild(p);
    } else if (v.type === 'youtube') {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'video-play';
      b.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg)';
      var inner = document.createElement('span'); inner.className = 'pbtn';
      inner.appendChild(icon('i-play')); inner.appendChild(document.createTextNode(t('demo.play')));
      b.appendChild(inner);
      b.addEventListener('click', function () {
        videoStarted = true; box.textContent = '';
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0';
        f.title = t('project.demo.title');
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.setAttribute('allowfullscreen', '');
        box.appendChild(f); f.focus();
      });
      box.appendChild(b);
    } else if (v.type === 'file') {
      var vid = document.createElement('video'); vid.controls = true; vid.preload = 'metadata'; vid.setAttribute('playsinline', '');
      vid.src = v.src; vid.setAttribute('aria-label', t('project.demo.title')); box.appendChild(vid);
    } else {
      var a = document.createElement('a'); a.className = 'btn btn-primary'; a.href = v.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.appendChild(icon('i-play')); a.appendChild(document.createTextNode(t('demo.open'))); box.appendChild(a);
    }
  }

  /* ---------- pipeline animation ---------- */
  function initPipeline() {
    var root = $('#pipeline'); if (!root) return;
    var stages = $$('.stage', root), loop = $('#loopbar'), btn = $('#anim-toggle'), label = $('span', btn);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var step = -1, timer = null, paused = reduce;
    function show(i) {
      stages.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      loop.classList.toggle('active', i === 4);
    }
    function tick() { step = (step + 1) % 5; show(step); }
    function start() { if (!timer) { tick(); timer = setInterval(tick, 1700); } }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function sync() {
      btn.setAttribute('aria-pressed', String(paused));
      label.setAttribute('data-i18n', paused ? 'anim.play' : 'anim.pause');
      label.textContent = t(paused ? 'anim.play' : 'anim.pause');
    }
    btn.addEventListener('click', function () {
      paused = !paused;
      if (paused) { stop(); show(-1); step = -1; } else { start(); }
      sync();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!paused) start();
    });
    sync();
    if (!paused) start(); else show(-1);
  }

  /* ---------- charts (inline SVG, no libraries) ---------- */
  function watermark(card) {
    var old = $('.wm', card); if (old) old.remove();
    if (realData()) return;
    var w = document.createElement('div'); w.className = 'wm'; w.setAttribute('aria-hidden', 'true');
    w.textContent = t('chart.placeholder'); card.appendChild(w);
  }
  function legend(el, items) {
    el.textContent = '';
    items.forEach(function (it) {
      var li = document.createElement('li'), i = document.createElement('i');
      if (it.cls) i.className = it.cls; else i.style.background = it.color;
      li.appendChild(i); li.appendChild(document.createTextNode(it.label)); el.appendChild(li);
    });
  }
  function makeTable(headers, rows) {
    var tb = document.createElement('table'), tr = document.createElement('tr'), th;
    headers.forEach(function (h) { th = document.createElement('th'); th.scope = 'col'; th.textContent = h; tr.appendChild(th); });
    var head = document.createElement('thead'); head.appendChild(tr); tb.appendChild(head);
    var body = document.createElement('tbody');
    rows.forEach(function (r) {
      var row = document.createElement('tr');
      r.forEach(function (c, i) {
        var cell = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) cell.scope = 'row';
        cell.textContent = c; row.appendChild(cell);
      });
      body.appendChild(row);
    });
    tb.appendChild(body); return tb;
  }
  function putTable(id, headers, rows) { var el = $(id); if (el) el.replaceChildren(makeTable(headers, rows)); }

  function renderMetrics() {
    var el = $('#chart-metrics'); if (!el) return;
    var classes = R.classNames || [], m = metrics();
    var series = [['precision', 'c-prec', 'chart1.precision', 'var(--green)'], ['recall', 'c-rec', 'chart1.recall', 'var(--terra)'], ['f1', 'c-f1', 'chart1.f1', 'var(--green-mid)']];
    var W = 520, H = 300, l = 46, r = 10, tp = 12, b = 54, iw = W - l - r, ih = H - tp - b;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('chart1.title') });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      var y = tp + ih * (1 - v);
      s.appendChild(svg('line', { x1: l, x2: W - r, y1: y, y2: y, 'class': v === 0 ? 'axis' : 'grid' }));
      s.appendChild(svg('text', { x: l - 8, y: y + 4, 'text-anchor': 'end', 'class': 'tick' }, Math.round(v * 100) + '%'));
    });
    var gw = iw / Math.max(classes.length, 1), bw = Math.min(30, gw * 0.76 / series.length);
    classes.forEach(function (c, i) {
      var gx = l + gw * i + gw / 2 - (bw * series.length) / 2;
      series.forEach(function (sr, k) {
        var h = ih * m[sr[0]][i];
        if (h > 0) s.appendChild(svg('rect', { x: gx + bw * k, y: tp + ih - h, width: bw - 3, height: h, rx: 3, 'class': sr[1] }));
      });
      s.appendChild(svg('text', { x: l + gw * i + gw / 2, y: H - b + 24, 'text-anchor': 'middle', 'class': 'tick' }, c));
    });
    el.replaceChildren(s);
    legend($('#legend-metrics'), series.map(function (sr) { return { label: t(sr[2]), color: sr[3] }; }));
    putTable('#table-metrics', [t('fact.classes')].concat(series.map(function (sr) { return t(sr[2]); })),
      classes.map(function (c, i) { return [c, pct(m.precision[i]), pct(m.recall[i]), pct(m.f1[i])]; }));
    watermark(el.closest('.chart-card'));
  }

  function renderConfusion() {
    var el = $('#chart-confusion'); if (!el) return;
    var cm = R.confusion || [], names = R.classNames || [];
    var tb = document.createElement('table'); tb.className = 'cm';
    var cap = document.createElement('caption'); cap.className = 'sr-only'; cap.textContent = t('chart2.title'); tb.appendChild(cap);
    var head = document.createElement('tr'), corner = document.createElement('th'); corner.setAttribute('aria-hidden', 'true'); head.appendChild(corner);
    names.forEach(function (n) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = n; head.appendChild(th); });
    var thead = document.createElement('thead'); thead.appendChild(head); tb.appendChild(thead);
    var body = document.createElement('tbody');
    cm.forEach(function (row, i) {
      var tr = document.createElement('tr'), rh = document.createElement('th'), total = row.reduce(function (a, v) { return a + v; }, 0);
      rh.scope = 'row'; rh.textContent = names[i]; tr.appendChild(rh);
      row.forEach(function (v, j) {
        var td = document.createElement('td'), share = total ? v / total : 0;
        td.textContent = v;
        if (i === j && share >= 0.5) td.className = 'hi';
        else {
          td.className = 'lo';
          td.style.background = i === j ? 'rgba(47,82,51,' + (share * 0.6).toFixed(2) + ')' : 'rgba(192,86,33,' + Math.min(0.35, share * 1.5).toFixed(2) + ')';
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    var axis = document.createElement('div'); axis.className = 'cm-axis';
    var a1 = document.createElement('span'); a1.textContent = t('chart2.actual') + ' ↓';
    var a2 = document.createElement('span'); a2.textContent = t('chart2.predicted') + ' →';
    axis.appendChild(a1); axis.appendChild(a2);
    el.replaceChildren(tb, axis);
    watermark(el.closest('.chart-card'));
  }

  function renderCurves() {
    var el = $('#chart-curves'); if (!el) return;
    var tr = (R.training || {}).train || [], va = (R.training || {}).val || [], n = Math.max(tr.length, va.length);
    var W = 520, H = 300, l = 46, r = 16, tp = 12, b = 52, iw = W - l - r, ih = H - tp - b;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('chart3.title') });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      var y = tp + ih * (1 - v);
      s.appendChild(svg('line', { x1: l, x2: W - r, y1: y, y2: y, 'class': v === 0 ? 'axis' : 'grid' }));
      s.appendChild(svg('text', { x: l - 8, y: y + 4, 'text-anchor': 'end', 'class': 'tick' }, Math.round(v * 100) + '%'));
    });
    function px(i) { return l + (n > 1 ? iw * i / (n - 1) : iw / 2); }
    function py(v) { return tp + ih * (1 - v); }
    [0, Math.floor((n - 1) / 2), n - 1].forEach(function (i, k, arr) {
      if (k > 0 && i === arr[k - 1]) return;
      s.appendChild(svg('text', { x: px(i), y: H - b + 20, 'text-anchor': 'middle', 'class': 'tick' }, String(i + 1)));
    });
    s.appendChild(svg('text', { x: l + iw / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'axis-title' }, t('chart3.x')));
    function line(vals, cls, color) {
      if (!vals.length) return;
      s.appendChild(svg('polyline', { points: vals.map(function (v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' '), 'class': cls }));
      var last = vals.length - 1;
      s.appendChild(svg('circle', { cx: px(last), cy: py(vals[last]), r: 5, fill: color }));
    }
    line(tr, 'l-train', 'var(--green)'); line(va, 'l-val', 'var(--terra)');
    el.replaceChildren(s);
    legend($('#legend-curves'), [{ label: t('chart3.train'), cls: 'solid' }, { label: t('chart3.val'), cls: 'dash' }]);
    var rows = []; for (var i = 0; i < n; i++) rows.push([String(i + 1), tr[i] !== undefined ? pct(tr[i]) : '', va[i] !== undefined ? pct(va[i]) : '']);
    putTable('#table-curves', [t('chart3.x'), t('chart3.train'), t('chart3.val')], rows);
    watermark(el.closest('.chart-card'));
  }

  function renderInference() {
    var el = $('#chart-inference'); if (!el) return;
    var items = R.inference || [], max = Math.max.apply(null, items.map(function (x) { return x.ms; }).concat([1])) * 1.1;
    var W = 520, rowH = 58, H = 12 + items.length * rowH, l = 4, vw = 74, bw = W - l - vw;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('chart4.title') });
    items.forEach(function (it, i) {
      var y = 12 + i * rowH;
      s.appendChild(svg('text', { x: l, y: y + 12, 'class': 'bar-label' }, it.label));
      s.appendChild(svg('rect', { x: l, y: y + 22, width: bw, height: 20, rx: 6, fill: '#EEF2E9' }));
      s.appendChild(svg('rect', { x: l, y: y + 22, width: Math.max(2, bw * it.ms / max), height: 20, rx: 6, 'class': 'c-prec' }));
      s.appendChild(svg('text', { x: W - 4, y: y + 37, 'text-anchor': 'end', 'class': 'bar-value' }, it.ms + ' ms'));
    });
    el.replaceChildren(s);
    putTable('#table-inference', [t('fact.model'), t('chart4.unit')], items.map(function (x) { return [x.label, String(x.ms)]; }));
    watermark(el.closest('.chart-card'));
  }

  function renderCharts() { renderMetrics(); renderConfusion(); renderCurves(); renderInference(); }

  /* ---------- contact form ---------- */
  function initForm() {
    var form = $('#contact-form'); if (!form) return;
    var status = $('#form-status');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function setStatus(key, kind) {
      status.className = 'status' + (kind ? ' ' + kind : '');
      if (key) { status.setAttribute('data-i18n', key); status.textContent = t(key); }
      else { status.removeAttribute('data-i18n'); status.textContent = ''; }
    }
    function check(id, value) {
      if (!value.trim()) return 'form.required';
      if (id === 'email' && !emailRe.test(value.trim())) return 'form.emailInvalid';
      return '';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); setStatus('');
      var first = null;
      ['name', 'email', 'message'].forEach(function (id) {
        var input = form.elements[id], wrap = input.closest('.field'), err = $('.err', wrap), key = check(id, input.value);
        if (key) {
          wrap.classList.add('invalid'); input.setAttribute('aria-invalid', 'true');
          err.setAttribute('data-i18n', key); err.textContent = t(key); err.hidden = false;
          if (!first) first = input;
        } else {
          wrap.classList.remove('invalid'); input.removeAttribute('aria-invalid');
          err.removeAttribute('data-i18n'); err.textContent = ''; err.hidden = true;
        }
      });
      if (first) { first.focus(); return; }
      var name = form.elements.name.value.trim(), org = form.elements.org.value.trim();
      var hasEmail = typeof SITE.email === 'string' && SITE.email.indexOf('@') > 0 && SITE.email.charAt(0) !== '[';
      if (SITE.formEndpoint) {
        setStatus('form.sending');
        fetch(SITE.formEndpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) { if (res.ok) { setStatus('form.sent', 'ok'); form.reset(); } else setStatus('form.failed', 'bad'); })
          .catch(function () { setStatus('form.failed', 'bad'); });
      } else if (hasEmail) {
        setStatus('form.mailto', 'ok');
        var body = form.elements.message.value.trim() + '\n\n— ' + name + (org ? ' (' + org + ')' : '') + '\n' + form.elements.email.value.trim();
        window.location.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent('PepperScan — message from ' + name) + '&body=' + encodeURIComponent(body);
      } else {
        setStatus('form.noemail', 'bad');
      }
    });
  }

  /* ---------- header: language + mobile menu ---------- */
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('pepperscan-lang', l); } catch (e) { /* ignore */ }
    renderAll();
  }
  function initHeader() {
    $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
    var header = $('.site-header'), toggle = $('.nav-toggle');
    function close() { header.setAttribute('data-open', 'false'); toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', function () {
      var open = header.getAttribute('data-open') === 'true';
      header.setAttribute('data-open', String(!open)); toggle.setAttribute('aria-expanded', String(!open));
    });
    $$('.nav a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- render everything ---------- */
  function renderAll() {
    applyStatic(); applySite();
    renderStats(); renderFacts(); renderTeam(); renderGallery(); renderVideo(); renderCharts();
  }

  initHeader(); initLightbox(); initPipeline(); initForm();
  renderAll();
})();
