/* tryriscv.org — RISC-V IP catalog */
(function () {
  'use strict';

  var app = document.getElementById('ip-app');
  if (!app) return;
  var TR = window.TR;
  var esc = TR.esc;
  var COUNTRY = { CN: '中国大陆', TW: '中国台湾', US: '美国', EU: '欧洲', JP: '日本', other: '其他/未披露' };
  var DATA = [], defs = {}, state;

  function resetState() {
    state = { q: '', vendor: new Set(), country: new Set(), bits: new Set(), features: new Set(), license: new Set(), maturity: new Set(), freq: [null, null], sort: 'recommended' };
  }
  function readRange(v) {
    if (!v) return [null, null];
    var a = String(v).split('-');
    var x = a[0] === '' ? null : Number(a[0]);
    var y = a[1] === '' ? null : Number(a[1]);
    return [isFinite(x) ? x : null, isFinite(y) ? y : null];
  }
  function readUrl() {
    resetState();
    var q = new URLSearchParams(location.search);
    state.q = q.get('q') || '';
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (k) {
      if (q.get(k)) state[k] = new Set(q.get(k).split(','));
    });
    var r = readRange(q.get('freq'));
    if (r[0] != null || r[1] != null) state.freq = r;
    state.sort = q.get('sort') || 'recommended';
  }
  function writeUrl() {
    var q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (k) {
      if (state[k].size) q.set(k, Array.from(state[k]).join(','));
    });
    if (state.freq[0] != null || state.freq[1] != null) q.set('freq', (state.freq[0] == null ? '' : state.freq[0]) + '-' + (state.freq[1] == null ? '' : state.freq[1]));
    if (state.sort !== 'recommended') q.set('sort', state.sort);
    var qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function valuesFor(key, p) {
    switch (key) {
      case 'vendor': return [p.vendor];
      case 'country': return [p.country];
      case 'bits': return [String(p.bits)];
      case 'features': return p.features || [];
      case 'license': return [p.license];
      case 'maturity': return [p.maturity];
      default: return [];
    }
  }
  function tally(parts, key, labelFn) {
    var map = new Map();
    parts.forEach(function (p) {
      valuesFor(key, p).forEach(function (v) {
        if (v == null || v === '') return;
        var k = String(v);
        if (!map.has(k)) map.set(k, { value: k, label: labelFn ? labelFn(k) : k, count: 0 });
        map.get(k).count++;
      });
    });
    return Array.from(map.values()).sort(function (a, b) { return b.count - a.count || String(a.label).localeCompare(String(b.label), 'zh'); });
  }
  function buildFacets() {
    defs.vendor = tally(DATA, 'vendor');
    defs.country = tally(DATA, 'country', function (v) { return COUNTRY[v] || v; });
    defs.bits = [{ value: '32', label: '32 位', count: 0 }, { value: '64', label: '64 位', count: 0 }];
    defs.features = tally(DATA, 'features');
    defs.license = tally(DATA, 'license');
    defs.maturity = tally(DATA, 'maturity');
  }
  function renderFacet(key, options) {
    var box = document.querySelector('[data-facet="' + key + '"]');
    if (!box) return;
    box.innerHTML = options.map(function (o) {
      return '<label class="check"><input type="checkbox" value="' + esc(o.value) + '"><span>' + esc(o.label) + '</span><span class="count" data-count="' + esc(o.value) + '">0</span></label>';
    }).join('');
    box.addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      if (e.target.checked) state[key].add(e.target.value); else state[key].delete(e.target.value);
      apply();
    });
  }
  function renderAll() {
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (k) { renderFacet(k, defs[k]); });
  }
  function sync() {
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (k) {
      var box = document.querySelector('[data-facet="' + k + '"]');
      if (!box) return;
      box.querySelectorAll('input').forEach(function (i) { i.checked = state[k].has(i.value); });
    });
    var s = document.getElementById('ip-search');
    if (s) s.value = state.q;
    var sort = document.getElementById('ip-sort');
    if (sort) sort.value = state.sort;
    var min = document.getElementById('freq-min'), max = document.getElementById('freq-max');
    if (min) min.value = state.freq[0] == null ? '' : state.freq[0];
    if (max) max.value = state.freq[1] == null ? '' : state.freq[1];
  }
  function hay(p) {
    if (p._hay) return p._hay;
    p._hay = [p.name, p.vendor, p.vendor_en, p.isa, p.pipeline, p.family].concat(p.features || [], p.silicon || [], p.os || [], p.toolchain || []).join(' ').toLowerCase();
    return p._hay;
  }
  function matches(p, exclude) {
    if (state.q) {
      var h = hay(p);
      if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return h.indexOf(t) !== -1; })) return false;
    }
    if (exclude !== 'vendor' && state.vendor.size && !state.vendor.has(p.vendor)) return false;
    if (exclude !== 'country' && state.country.size && !state.country.has(p.country)) return false;
    if (exclude !== 'bits' && state.bits.size && !state.bits.has(String(p.bits))) return false;
    if (exclude !== 'features' && state.features.size && !(p.features || []).some(function (f) { return state.features.has(f); })) return false;
    if (exclude !== 'license' && state.license.size && !state.license.has(p.license)) return false;
    if (exclude !== 'maturity' && state.maturity.size && !state.maturity.has(p.maturity)) return false;
    if (state.freq[0] != null && !(p.freq >= state.freq[0])) return false;
    if (state.freq[1] != null && !(p.freq <= state.freq[1])) return false;
    return true;
  }
  function filtered(exclude) { return DATA.filter(function (p) { return matches(p, exclude); }); }
  function counts(key) {
    var base = filtered(key), map = {};
    base.forEach(function (p) { valuesFor(key, p).forEach(function (v) { map[v] = (map[v] || 0) + 1; }); });
    return map;
  }
  function updateCounts() {
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (key) {
      var box = document.querySelector('[data-facet="' + key + '"]');
      if (!box) return;
      var c = counts(key);
      box.querySelectorAll('[data-count]').forEach(function (span) {
        var v = span.getAttribute('data-count');
        var n = c[v] || 0;
        span.textContent = String(n);
        var input = span.parentElement.querySelector('input');
        if (input) input.disabled = n === 0 && !state[key].has(v);
        span.parentElement.style.opacity = n === 0 ? '0.45' : '';
      });
    });
  }
  function sort(list) {
    return list.slice().sort(function (a, b) {
      var r = 0;
      var fa = a.freq == null ? -Infinity : a.freq;
      var fb = b.freq == null ? -Infinity : b.freq;
      if (state.sort === 'freq-desc') r = fb - fa;
      else if (state.sort === 'freq-asc') r = (a.freq == null ? Infinity : a.freq) - (b.freq == null ? Infinity : b.freq);
      else if (state.sort === 'bits-desc') r = (b.bits || 0) - (a.bits || 0) || fb - fa;
      else if (state.sort === 'name') r = String(a.name).localeCompare(String(b.name));
      if (r === 0) r = (b.freq || 0) - (a.freq || 0);
      if (r === 0) r = String(a.name).localeCompare(String(b.name));
      return r;
    });
  }
  function badge(m) {
    if (m === '量产') return 'badge badge--green';
    if (m === '授权中' || m === '送样') return 'badge badge--amber';
    if (m === '预览') return 'badge badge--blue';
    return 'badge';
  }
  function tags(arr, cls) {
    return (arr || []).slice(0, 4).map(function (x) { return '<span class="tag ' + (cls || '') + '">' + esc(x) + '</span>'; }).join('');
  }
  function row(p) {
    return '<tr>' +
      '<td><a class="model-link" href="' + esc(p.url) + '">' + esc(p.name) + '</a><span class="sub-line">' + esc(p.vendor) + '</span></td>' +
      '<td>' + esc(COUNTRY[p.country] || p.country) + '</td>' +
      '<td>' + p.bits + ' 位<span class="sub-line">' + esc(p.isa) + '</span></td>' +
      '<td>' + esc(p.pipeline || '—') + '</td>' +
      '<td class="num">' + (p.freq == null ? '未公开' : p.freq + ' MHz') + '</td>' +
      '<td><div class="periph-cell">' + (tags(p.features, 'tag--indigo') || '—') + '</div></td>' +
      '<td>' + esc(p.license) + '</td>' +
      '<td><span class="' + badge(p.maturity) + '">' + esc(p.maturity) + '</span></td>' +
      '</tr>';
  }
  function card(p) {
    return '<article class="mcu-card">' +
      '<div class="mcu-card-head"><div><h3 class="mcu-card-title"><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3>' +
      '<div class="mcu-card-sub">' + esc(p.vendor) + ' · ' + esc(COUNTRY[p.country] || p.country) + '</div></div>' +
      '<div class="mcu-card-badges"><span class="' + badge(p.maturity) + '">' + esc(p.maturity) + '</span></div></div>' +
      '<dl class="mcu-card-specs"><div><dt>位宽</dt><dd>' + p.bits + ' bit</dd></div><div><dt>最高频率</dt><dd>' + p.freq + ' <small>MHz</small></dd></div><div><dt>授权</dt><dd style="font-size:12px">' + esc(p.license) + '</dd></div></dl>' +
      '<div class="periph-cell">' + tags(p.features) + '</div>' +
      '<div class="mcu-card-foot"><span>' + esc(p.isa) + '</span></div>' +
      '</article>';
  }
  function chips() {
    var out = [];
    function add(label, fn) { out.push({ label: label, fn: fn }); }
    var names = { vendor: '品牌：', country: '归属地：', bits: '位宽：', features: '特性：', license: '授权：', maturity: '成熟度：' };
    ['vendor', 'country', 'bits', 'features', 'license', 'maturity'].forEach(function (k) {
      state[k].forEach(function (v) {
        var label = k === 'country' ? (COUNTRY[v] || v) : k === 'bits' ? v + ' 位' : v;
        add(names[k] + label, function () { state[k].delete(v); });
      });
    });
    if (state.freq[0] != null || state.freq[1] != null) {
      add('频率 ' + (state.freq[0] == null ? '' : state.freq[0]) + '–' + (state.freq[1] == null ? '' : state.freq[1]) + ' MHz', function () { state.freq = [null, null]; });
    }
    return out;
  }
  function renderChips() {
    var box = document.getElementById('active-filters');
    if (!box) return;
    var list = chips();
    box.innerHTML = list.map(function (c, i) { return '<button type="button" class="chip" data-chip="' + i + '">' + esc(c.label) + ' <span aria-hidden="true">×</span></button>'; }).join('') +
      (list.length ? '<button type="button" class="chip chip--clear" id="clear-ip">清空全部</button>' : '');
    box.querySelectorAll('[data-chip]').forEach(function (b) {
      b.addEventListener('click', function () { list[Number(b.getAttribute('data-chip'))].fn(); apply(); });
    });
    var c = document.getElementById('clear-ip');
    if (c) c.addEventListener('click', function () { resetState(); sync(); apply(); });
  }
  function apply() {
    var list = sort(filtered(null));
    var tbody = document.getElementById('ip-tbody');
    var cards = document.getElementById('ip-cards');
    if (tbody) tbody.innerHTML = list.map(row).join('');
    if (cards) cards.innerHTML = list.map(card).join('');
    var count = document.getElementById('result-count');
    if (count) count.innerHTML = '共 <b>' + list.length + '</b> 个 IP 核（全库 ' + DATA.length + ' 个）';
    var empty = document.getElementById('ip-empty');
    if (empty) empty.hidden = list.length !== 0;
    renderChips();
    updateCounts();
    writeUrl();
  }
  function bind() {
    var s = document.getElementById('ip-search');
    var t = null;
    if (s) s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = s.value.trim(); apply(); }, 180); });
    var sortEl = document.getElementById('ip-sort');
    if (sortEl) sortEl.addEventListener('change', function () { state.sort = sortEl.value; apply(); });
    ['freq'].forEach(function () {
      var min = document.getElementById('freq-min'), max = document.getElementById('freq-max');
      function upd() {
        state.freq = [min.value === '' ? null : Number(min.value), max.value === '' ? null : Number(max.value)];
        apply();
      }
      if (min) min.addEventListener('change', upd);
      if (max) max.addEventListener('change', upd);
    });
    var reset = document.getElementById('reset-filters');
    if (reset) reset.addEventListener('click', function () { resetState(); sync(); apply(); });
  }

  readUrl();
  fetch(app.getAttribute('data-json'), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (data) {
    DATA = data.parts || [];
    buildFacets();
    renderAll();
    sync();
    bind();
    apply();
  }).catch(function (e) {
    var count = document.getElementById('result-count');
    if (count) count.textContent = '数据加载失败，请刷新重试。';
    if (window.console) console.error(e);
  });
})();
