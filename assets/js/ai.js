/* tryriscv.org — AI accelerator catalog (preview) */
(function () {
  'use strict';
  var app = document.getElementById('ai-app');
  if (!app) return;
  var TR = window.TR;
  var esc = TR.esc;
  var I18N = window.__TR_I18N__ || {};
  var TXT = I18N.text || {};
  function txt(k, fallback) { return TXT[k] || fallback; }
  function fmt(str, vars) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
  function countryLabel(c) { return (I18N.country && I18N.country[c]) || c; }
  function typeLabel(v) { return (I18N.type && I18N.type[v]) || v; }
  function archLabel(v) { return (I18N.arch && I18N.arch[v]) || v; }
  function maturityLabel(v) { return (I18N.maturity && I18N.maturity[v]) || v; }
  function vendorLabel(p) { return (I18N.isZh ? p.vendor : (p.vendor_en || p.vendor)); }
  var DATA = [], defs = {}, state;
  var ARCH_CLASS = { 'RISC-V': 'tag--teal', 'ARM 对照': 'tag--indigo' };

  function reset() {
    state = { q: '', type: new Set(), country: new Set(), arch: new Set(), precision: new Set(), frameworks: new Set(), maturity: new Set(), tops: [null, null], sort: 'tops-desc' };
  }
  function readRange(v) {
    if (!v) return [null, null];
    var a = String(v).split('-');
    var x = a[0] === '' ? null : Number(a[0]);
    var y = a[1] === '' ? null : Number(a[1]);
    return [isFinite(x) ? x : null, isFinite(y) ? y : null];
  }
  function readUrl() {
    reset();
    var q = new URLSearchParams(location.search);
    state.q = q.get('q') || '';
    ['type', 'country', 'arch', 'precision', 'frameworks', 'maturity'].forEach(function (k) {
      if (q.get(k)) state[k] = new Set(q.get(k).split(','));
    });
    var r = readRange(q.get('tops'));
    if (r[0] != null || r[1] != null) state.tops = r;
    state.sort = q.get('sort') || 'tops-desc';
  }
  function writeUrl() {
    var q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    ['type', 'country', 'arch', 'precision', 'frameworks', 'maturity'].forEach(function (k) {
      if (state[k].size) q.set(k, Array.from(state[k]).join(','));
    });
    if (state.tops[0] != null || state.tops[1] != null) q.set('tops', (state.tops[0] == null ? '' : state.tops[0]) + '-' + (state.tops[1] == null ? '' : state.tops[1]));
    if (state.sort !== 'tops-desc') q.set('sort', state.sort);
    var qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  function values(key, p) {
    switch (key) {
      case 'type': return [p.type];
      case 'country': return [p.country];
      case 'arch': return [p.arch];
      case 'precision': return p.precision || [];
      case 'frameworks': return p.frameworks || [];
      case 'maturity': return [p.maturity];
      default: return [];
    }
  }
  function build() {
    ['type', 'country', 'arch', 'precision', 'frameworks', 'maturity'].forEach(function (key) {
      var map = new Map();
      DATA.forEach(function (p) {
        values(key, p).forEach(function (v) {
          if (v == null || v === '') return;
          var k = String(v);
          var label = key === 'country' ? countryLabel(k) : key === 'type' ? typeLabel(k) : key === 'arch' ? archLabel(k) : key === 'maturity' ? maturityLabel(k) : k;
          if (!map.has(k)) map.set(k, { value: k, label: label, count: 0 });
          map.get(k).count++;
        });
      });
      defs[key] = Array.from(map.values()).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label, 'zh'); });
    });
  }
  function renderFacets() {
    Object.keys(defs).forEach(function (key) {
      var box = document.querySelector('[data-facet="' + key + '"]');
      if (!box) return;
      box.innerHTML = defs[key].map(function (o) {
        return '<label class="check"><input type="checkbox" value="' + esc(o.value) + '"><span>' + esc(o.label) + '</span><span class="count" data-count="' + esc(o.value) + '">0</span></label>';
      }).join('');
      box.addEventListener('change', function (e) {
        if (e.target.type !== 'checkbox') return;
        if (e.target.checked) state[key].add(e.target.value); else state[key].delete(e.target.value);
        apply();
      });
    });
  }
  function sync() {
    Object.keys(defs).forEach(function (key) {
      var box = document.querySelector('[data-facet="' + key + '"]');
      if (!box) return;
      box.querySelectorAll('input').forEach(function (i) { i.checked = state[key].has(i.value); });
    });
    var s = document.getElementById('ai-search');
    if (s) s.value = state.q;
    var sort = document.getElementById('ai-sort');
    if (sort) sort.value = state.sort;
    var min = document.getElementById('tops-min'), max = document.getElementById('tops-max');
    if (min) min.value = state.tops[0] == null ? '' : state.tops[0];
    if (max) max.value = state.tops[1] == null ? '' : state.tops[1];
  }
  function hay(p) {
    if (p._hay) return p._hay;
    p._hay = [p.name, p.vendor, p.type, p.sdk, p.notes].concat(p.precision || [], p.frameworks || [], p.silicon || []).join(' ').toLowerCase();
    return p._hay;
  }
  function matches(p, exclude) {
    if (state.q) {
      var h = hay(p);
      if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return h.indexOf(t) !== -1; })) return false;
    }
    if (exclude !== 'type' && state.type.size && !state.type.has(p.type)) return false;
    if (exclude !== 'country' && state.country.size && !state.country.has(p.country)) return false;
    if (exclude !== 'arch' && state.arch.size && !state.arch.has(p.arch)) return false;
    if (exclude !== 'precision' && state.precision.size && !(p.precision || []).some(function (x) { return state.precision.has(x); })) return false;
    if (exclude !== 'frameworks' && state.frameworks.size && !(p.frameworks || []).some(function (x) { return state.frameworks.has(x); })) return false;
    if (exclude !== 'maturity' && state.maturity.size && !state.maturity.has(p.maturity)) return false;
    if (state.tops[0] != null && !(p.tops >= state.tops[0])) return false;
    if (state.tops[1] != null && !(p.tops <= state.tops[1])) return false;
    return true;
  }
  function counts(key) {
    var base = DATA.filter(function (p) { return matches(p, key); }), map = {};
    base.forEach(function (p) { values(key, p).forEach(function (v) { map[v] = (map[v] || 0) + 1; }); });
    return map;
  }
  function updateCounts() {
    Object.keys(defs).forEach(function (key) {
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
  function badge(m) {
    if (m === '量产') return 'badge badge--green';
    if (m === '送样') return 'badge badge--amber';
    if (m === '预览') return 'badge badge--blue';
    return 'badge';
  }
  function row(p) {
    return '<tr><td><b class="model-link">' + esc(p.name) + '</b><span class="sub-line">' + esc(vendorLabel(p)) + '</span></td>' +
      '<td>' + esc(typeLabel(p.type)) + '<span class="sub-line">' + esc(countryLabel(p.country)) + ' · ' + esc(archLabel(p.arch || '—')) + '</span></td>' +
      '<td class="num">' + (p.tops == null ? '—' : p.tops + ' TOPS') + '</td>' +
      '<td>' + esc((p.precision || []).join(' / ') || '—') + '</td>' +
      '<td>' + esc((p.frameworks || []).join(' / ') || '—') + '</td>' +
      '<td>' + esc(p.sdk || '—') + '</td>' +
      '<td><span class="' + badge(p.maturity) + '">' + esc(maturityLabel(p.maturity) || '—') + '</span></td>' +
      '<td>' + esc((p.silicon || []).slice(0, 2).join('、') || '—') + '</td></tr>';
  }
  function card(p) {
    return '<article class="mcu-card"><div class="mcu-card-head"><div><h3 class="mcu-card-title">' + esc(p.name) + '</h3>' +
      '<div class="mcu-card-sub">' + esc(vendorLabel(p)) + ' · ' + esc(typeLabel(p.type)) + ' · ' + esc(archLabel(p.arch || '—')) + '</div></div>' +
      '<div class="mcu-card-badges"><span class="' + badge(p.maturity) + '">' + esc(maturityLabel(p.maturity) || '—') + '</span></div></div>' +
      '<dl class="mcu-card-specs"><div><dt>' + esc(txt('tableTops', 'TOPS')) + '</dt><dd>' + (p.tops == null ? '—' : p.tops + ' <small>TOPS</small>') + '</dd></div>' +
      '<div><dt>' + esc(txt('aiPrecision', 'Precision')) + '</dt><dd style="font-size:12px">' + esc((p.precision || []).join(' / ') || '—') + '</dd></div>' +
      '<div><dt>' + esc(txt('tableCountry', 'Country')) + '</dt><dd style="font-size:12px">' + esc(countryLabel(p.country)) + '</dd></div></dl>' +
      '<div class="small muted">' + esc((p.frameworks || []).join(' / ') || '') + '</div>' +
      '<div class="mcu-card-foot"><span>' + esc(p.sdk || '') + '</span></div></article>';
  }
  function chips() {
    var out = [], names = { type: txt('aiType', 'Type') + ': ', country: txt('tableCountry', 'Country') + ': ', arch: txt('aiArch', 'Architecture') + ': ', precision: txt('aiPrecision', 'Precision') + ': ', frameworks: txt('aiFrameworks', 'Frameworks') + ': ', maturity: txt('tableMaturity', 'Maturity') + ': ' };
    Object.keys(names).forEach(function (k) {
      state[k].forEach(function (v) {
        var lv = k === 'country' ? countryLabel(v) : k === 'type' ? typeLabel(v) : k === 'arch' ? archLabel(v) : k === 'maturity' ? maturityLabel(v) : v;
        out.push({ label: names[k] + lv, fn: function () { state[k].delete(v); } });
      });
    });
    if (state.tops[0] != null || state.tops[1] != null) out.push({ label: txt('tableTops', 'TOPS') + ' ' + (state.tops[0] == null ? '' : state.tops[0]) + '–' + (state.tops[1] == null ? '' : state.tops[1]) + ' TOPS', fn: function () { state.tops = [null, null]; } });
    return out;
  }
  function renderChips() {
    var box = document.getElementById('active-filters');
    if (!box) return;
    var list = chips();
    box.innerHTML = list.map(function (c, i) { return '<button type="button" class="chip" data-chip="' + i + '">' + esc(c.label) + ' <span aria-hidden="true">×</span></button>'; }).join('') +
      (list.length ? '<button type="button" class="chip chip--clear" id="clear-ai">' + esc(txt('clearAll', 'Clear all')) + '</button>' : '');
    box.querySelectorAll('[data-chip]').forEach(function (b) { b.addEventListener('click', function () { list[Number(b.getAttribute('data-chip'))].fn(); apply(); }); });
    var c = document.getElementById('clear-ai');
    if (c) c.addEventListener('click', function () { reset(); sync(); apply(); });
  }
  function apply() {
    var list = DATA.filter(function (p) { return matches(p, null); });
    list.sort(function (a, b) {
      if (state.sort === 'tops-asc') return (a.tops == null ? Infinity : a.tops) - (b.tops == null ? Infinity : b.tops) || String(a.name).localeCompare(String(b.name));
      if (state.sort === 'recommended') return (b.maturity === '量产' ? 1 : 0) - (a.maturity === '量产' ? 1 : 0) || (b.tops || 0) - (a.tops || 0);
      return (b.tops == null ? -1 : b.tops) - (a.tops == null ? -1 : a.tops) || String(a.name).localeCompare(String(b.name));
    });
    var tbody = document.getElementById('ai-tbody'), cards = document.getElementById('ai-cards');
    if (tbody) tbody.innerHTML = list.map(row).join('');
    if (cards) cards.innerHTML = list.map(card).join('');
    var count = document.getElementById('result-count');
    if (count) count.innerHTML = fmt(txt('resultAi', '{count} records'), { count: '<b>' + list.length + '</b>', total: DATA.length });
    var empty = document.getElementById('ai-empty');
    if (empty) empty.hidden = list.length !== 0;
    renderChips();
    updateCounts();
    writeUrl();
  }
  function bind() {
    var s = document.getElementById('ai-search'), t = null;
    if (s) s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = s.value.trim(); apply(); }, 180); });
    var sort = document.getElementById('ai-sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; apply(); });
    var min = document.getElementById('tops-min'), max = document.getElementById('tops-max');
    function upd() { state.tops = [min.value === '' ? null : Number(min.value), max.value === '' ? null : Number(max.value)]; apply(); }
    if (min) min.addEventListener('change', upd);
    if (max) max.addEventListener('change', upd);
    var resetBtn = document.getElementById('reset-filters');
    if (resetBtn) resetBtn.addEventListener('click', function () { reset(); sync(); apply(); });
  }

  readUrl();
  fetch(app.getAttribute('data-json'), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (data) {
    DATA = data.parts || [];
    build();
    renderFacets();
    sync();
    bind();
    apply();
  }).catch(function (e) {
    var count = document.getElementById('result-count');
    if (count) count.textContent = txt('loadError', 'Failed to load data.');
    if (window.console) console.error(e);
  });
})();
