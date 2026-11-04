/* tryriscv.org — MCU catalog filtering, sorting and comparison */
(function () {
  'use strict';

  var app = document.getElementById('mcu-app');
  if (!app) return;
  var TR = window.TR;
  var esc = TR.esc;
  var I18N = window.__TR_I18N__ || {};
  var TXT = I18N.text || {};
  var IS_ZH = I18N.isZh !== undefined ? I18N.isZh : (document.documentElement.lang || '').indexOf('zh') === 0;
  function txt(k, fallback) { return TXT[k] || fallback; }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  function statusLabel(s) { return (I18N.status && I18N.status[s]) || s || txt('statusUnknown', '—'); }
  function maturityLabel(s) { return (I18N.maturity && I18N.maturity[s]) || s; }
  function countryLabel(c) { return (I18N.country && I18N.country[c]) || c; }
  function vendorName(p) { return (!IS_ZH && p.vendor_en) ? p.vendor_en : p.vendor; }
  function brandName(b) { return (!IS_ZH && I18N.brand && I18N.brand[b]) ? I18N.brand[b] : b; }
  var VENDOR_EN = {};
  function vendorLabel(v) {
    if (IS_ZH) return v;
    if (!VENDOR_EN[v]) {
      for (var i = 0; i < DATA.length; i++) { if (DATA[i].vendor === v) { VENDOR_EN[v] = DATA[i].vendor_en || v; break; } }
    }
    return VENDOR_EN[v] || v;
  }
  var LANG_PREFIX = (I18N.lang && I18N.lang !== 'zh') ? '/' + I18N.lang : '';
  function urlFor(u) { return u && u.indexOf('/') === 0 ? LANG_PREFIX + u : u; }

  var PERI_ORDER = ['uart', 'spi', 'i2c', 'can', 'usb_fs', 'usb_hs', 'eth', 'ble', 'wifi', 'i2s', 'sdio', 'lcd', 'cam', 'iso7816', 'opamp', 'comp', 'touch', 'dma_ch'];
  var PERI_LABEL = {
    uart: 'UART', spi: 'SPI', i2c: 'I²C', can: 'CAN', usb_fs: 'USB FS', usb_hs: 'USB HS',
    eth: txt('periEth', 'Ethernet'), ble: 'BLE', wifi: 'Wi-Fi', i2s: 'I²S', sdio: 'SDIO', lcd: 'LCD',
    cam: 'CAM', iso7816: 'ISO7816', opamp: txt('periOpamp', 'Op-amp'), comp: txt('periComp', 'Comparator'), touch: txt('periTouch', 'Touch'), dma_ch: txt('periDma', 'DMA')
  };
  var STATUS_ORDER = ['量产', '送样', '预告', '停产'];
  var PAGE_SIZE = 30;

  var VOLT_OPTS = [
    { value: 'wide', label: txt('voltWide', '5V wide (≥4.5V)'), test: function (p) { return p.voltage && p.voltage[1] >= 4.5; } },
    { value: 'v33', label: txt('voltV33', '3.3V typical (≤3.6V)'), test: function (p) { return p.voltage && p.voltage[1] <= 3.6; } },
    { value: 'low18', label: txt('voltLow18', '1.8V low (min ≤1.8V)'), test: function (p) { return p.voltage && p.voltage[0] <= 1.8; } }
  ];
  var ADC_OPTS = [
    { value: 0, label: txt('adcAny', 'Any') }, { value: 10, label: txt('adcGe10', '≥ 10 bit') }, { value: 12, label: txt('adcGe12', '≥ 12 bit') }, { value: 16, label: txt('adcGe16', '≥ 16 bit') }
  ];
  var TEMP_OPTS = [
    { value: 0, label: txt('tempAny', 'Any') }, { value: 85, label: txt('tempGe85', '≥ 85 ℃') }, { value: 105, label: txt('tempGe105', '≥ 105 ℃') }, { value: 125, label: txt('tempGe125', '≥ 125 ℃') }
  ];

  var state, DATA = [], defs = {}, limit = PAGE_SIZE, pendingCompare = [];

  function resetState() {
    state = {
      q: '',
      vendor: new Set(), ip: new Set(), ipc: new Set(), isa: new Set(),
      peri: new Set(), pkg: new Set(), volt: new Set(), eco: new Set(), status: new Set(),
      freq: [null, null], sram: [null, null], flash: [null, null], run: [null, null], sleep: [null, null], standby: [null, null],
      adc: 0, temp: 0, hasPower: false, sort: 'recommended', view: 'table'
    };
  }

  function readRange(v) {
    if (!v) return [null, null];
    var parts = String(v).split('-');
    var a = parts[0] === '' || parts[0] == null ? null : Number(parts[0]);
    var b = parts[1] === '' || parts[1] == null ? null : Number(parts[1]);
    return [isFinite(a) ? a : null, isFinite(b) ? b : null];
  }

  function readUrl() {
    resetState();
    var q = new URLSearchParams(location.search);
    state.q = q.get('q') || '';
    ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status'].forEach(function (key) {
      var raw = q.get(key);
      if (raw) state[key] = new Set(raw.split(',').filter(Boolean));
    });
    ['freq', 'sram', 'flash', 'run', 'sleep', 'standby'].forEach(function (key) {
      var r = readRange(q.get(key));
      if (r[0] != null || r[1] != null) state[key] = r;
    });
    state.adc = Number(q.get('adc')) || 0;
    state.temp = Number(q.get('temp')) || 0;
    state.hasPower = q.get('has_power') === '1';
    state.sort = q.get('sort') || 'recommended';
    state.view = q.get('view') === 'grid' ? 'grid' : 'table';
    var cmp = q.get('compare');
    if (cmp) pendingCompare = cmp.split(',').filter(Boolean).slice(0, 4);
  }

  function writeUrl() {
    var q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status'].forEach(function (key) {
      if (state[key] && state[key].size) q.set(key, Array.from(state[key]).join(','));
    });
    ['freq', 'sram', 'flash', 'run', 'sleep', 'standby'].forEach(function (key) {
      var r = state[key];
      if (r[0] != null || r[1] != null) q.set(key, (r[0] == null ? '' : r[0]) + '-' + (r[1] == null ? '' : r[1]));
    });
    if (state.adc) q.set('adc', String(state.adc));
    if (state.temp) q.set('temp', String(state.temp));
    if (state.hasPower) q.set('has_power', '1');
    if (state.sort !== 'recommended') q.set('sort', state.sort);
    if (state.view === 'grid') q.set('view', 'grid');
    var cmp = TR.readCompare();
    if (cmp.length) q.set('compare', cmp.join(','));
    var qs = q.toString();
    var url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    history.replaceState(null, '', url);
  }

  /* ---------- facet helpers ---------- */
  function valuesFor(key, p) {
    switch (key) {
      case 'vendor': return [p.vendor];
      case 'ip': return [p.ip_vendor];
      case 'ipc': return [p.ip_country];
      case 'isa': return [p.isa];
      case 'pkg': return p.packages || [];
      case 'eco': return p.ecosystem || [];
      case 'status': return [p.status];
      case 'peri': return PERI_ORDER.filter(function (k) { return p.peripherals && p.peripherals[k] > 0; });
      case 'volt': return VOLT_OPTS.filter(function (o) { return o.test(p); }).map(function (o) { return o.value; });
      default: return [];
    }
  }

  function tally(parts, fn, labelFn) {
    var map = new Map();
    parts.forEach(function (p) {
      fn(p).forEach(function (v) {
        if (v == null || v === '') return;
        var k = String(v);
        if (!map.has(k)) map.set(k, { value: k, label: labelFn ? labelFn(k, p) : k, count: 0 });
        map.get(k).count++;
      });
    });
    return Array.from(map.values()).sort(function (a, b) {
      return b.count - a.count || String(a.label).localeCompare(String(b.label), 'zh');
    });
  }

  function buildFacets() {
    defs.vendor = tally(DATA, function (p) { return valuesFor('vendor', p); }, vendorLabel);
    defs.ip = tally(DATA, function (p) { return valuesFor('ip', p); }, brandName);
    defs.ipc = tally(DATA, function (p) { return valuesFor('ipc', p); }, function (v) { return countryLabel(v); });
    defs.isa = tally(DATA, function (p) { return valuesFor('isa', p); }).sort(function (a, b) {
      return String(a.label).localeCompare(String(b.label), 'en');
    });
    defs.pkg = tally(DATA, function (p) { return valuesFor('pkg', p); });
    defs.peri = PERI_ORDER.filter(function (k) {
      return DATA.some(function (p) { return p.peripherals && p.peripherals[k] > 0; });
    }).map(function (k) { return { value: k, label: PERI_LABEL[k] || k, count: 0 }; });
    defs.eco = tally(DATA, function (p) { return valuesFor('eco', p); });
    defs.status = STATUS_ORDER.filter(function (s) {
      return DATA.some(function (p) { return p.status === s; });
    }).map(function (s) { return { value: s, label: statusLabel(s), count: 0 }; });
  }

  function renderCheckFacet(key, options) {
    var box = document.querySelector('[data-facet="' + key + '"]');
    if (!box) return;
    box.innerHTML = options.map(function (o) {
      return '<label class="check"><input type="checkbox" value="' + esc(o.value) + '" data-facet="' + key + '">' +
        '<span>' + esc(o.label) + '</span><span class="count" data-count="' + esc(o.value) + '">0</span></label>';
    }).join('');
    box.addEventListener('change', function (e) {
      var input = e.target;
      if (input.type !== 'checkbox') return;
      var set = state[key];
      if (input.checked) set.add(input.value); else set.delete(input.value);
      apply();
    });
  }

  function renderRadioFacet(key, options, current) {
    var box = document.querySelector('[data-facet="' + key + '"]');
    if (!box) return;
    box.innerHTML = options.map(function (o) {
      return '<label class="check"><input type="radio" name="facet-' + key + '" value="' + o.value + '" data-facet="' + key + '"' +
        (Number(o.value) === Number(current) ? ' checked' : '') + '>' +
        '<span>' + esc(o.label) + '</span><span class="count" data-count="' + o.value + '">0</span></label>';
    }).join('');
    box.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      state[key] = Number(e.target.value);
      apply();
    });
  }

  function renderAllFacets() {
    renderCheckFacet('vendor', defs.vendor);
    renderCheckFacet('ip', defs.ip);
    renderCheckFacet('ipc', defs.ipc);
    renderCheckFacet('isa', defs.isa);
    renderCheckFacet('peri', defs.peri);
    renderCheckFacet('pkg', defs.pkg);
    renderCheckFacet('volt', VOLT_OPTS.map(function (o) { return { value: o.value, label: o.label }; }));
    renderCheckFacet('eco', defs.eco);
    renderCheckFacet('status', defs.status);
    renderRadioFacet('adc', ADC_OPTS, state.adc);
    renderRadioFacet('temp', TEMP_OPTS, state.temp);
  }

  /* ---------- filtering ---------- */
  function inRange(value, range) {
    if (!range || (range[0] == null && range[1] == null)) return true;
    if (value == null) return false;
    if (range[0] != null && value < range[0]) return false;
    if (range[1] != null && value > range[1]) return false;
    return true;
  }

  function haystack(p) {
    if (p._hay) return p._hay;
    var parts = [p.name, p.family, p.vendor, p.vendor_en, p.ip_vendor, p.core, p.isa, p.bits + 'bit', p.bits + '位'];
    parts = parts.concat(p.tags || [], p.packages || [], p.ecosystem || [], [p.notes || '']);
    if (p.peripherals) {
      Object.keys(p.peripherals).forEach(function (k) {
        if (p.peripherals[k]) parts.push(k, PERI_LABEL[k] || '');
      });
    }
    p._hay = parts.join(' ').toLowerCase();
    return p._hay;
  }

  function matches(p, exclude) {
    if (state.q) {
      var hay = haystack(p);
      var ok = state.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return hay.indexOf(t) !== -1; });
      if (!ok) return false;
    }
    if (exclude !== 'vendor' && state.vendor.size && !state.vendor.has(p.vendor)) return false;
    if (exclude !== 'ip' && state.ip.size && !state.ip.has(p.ip_vendor)) return false;
    if (exclude !== 'ipc' && state.ipc.size && !state.ipc.has(p.ip_country)) return false;
    if (exclude !== 'isa' && state.isa.size && !state.isa.has(p.isa)) return false;
    if (exclude !== 'pkg' && state.pkg.size && !(p.packages || []).some(function (x) { return state.pkg.has(x); })) return false;
    if (exclude !== 'status' && state.status.size && !state.status.has(p.status)) return false;
    if (exclude !== 'eco' && state.eco.size && !(p.ecosystem || []).some(function (x) { return state.eco.has(x); })) return false;
    if (exclude !== 'volt' && state.volt.size && !VOLT_OPTS.some(function (o) { return state.volt.has(o.value) && o.test(p); })) return false;
    if (exclude !== 'peri' && state.peri.size) {
      var okPeri = Array.from(state.peri).every(function (k) { return p.peripherals && p.peripherals[k] > 0; });
      if (!okPeri) return false;
    }
    if (!inRange(p.freq, state.freq)) return false;
    if (!inRange(p.sram, state.sram)) return false;
    if (!inRange(p.flash, state.flash)) return false;
    if (!inRange(p.power ? p.power.run : null, state.run)) return false;
    if (!inRange(p.power ? p.power.sleep : null, state.sleep)) return false;
    if (!inRange(p.power ? p.power.standby : null, state.standby)) return false;
    if (exclude !== 'adc' && state.adc && !(p.peripherals && p.peripherals.adc_bits >= state.adc)) return false;
    if (exclude !== 'temp' && state.temp && !(p.temp_max >= state.temp)) return false;
    if (state.hasPower && !(p.power && (p.power.run != null || p.power.sleep != null || p.power.standby != null))) return false;
    return true;
  }

  function filterParts(exclude) {
    return DATA.filter(function (p) { return matches(p, exclude); });
  }

  /* ---------- counts ---------- */
  function countsFor(key) {
    var base = filterParts(key);
    var map = {};
    if (key === 'adc') {
      ADC_OPTS.forEach(function (o) {
        map[o.value] = o.value === 0 ? base.length : base.filter(function (p) { return p.peripherals && p.peripherals.adc_bits >= o.value; }).length;
      });
      return map;
    }
    if (key === 'temp') {
      TEMP_OPTS.forEach(function (o) {
        map[o.value] = o.value === 0 ? base.length : base.filter(function (p) { return p.temp_max >= o.value; }).length;
      });
      return map;
    }
    base.forEach(function (p) {
      valuesFor(key, p).forEach(function (v) {
        map[v] = (map[v] || 0) + 1;
      });
    });
    return map;
  }

  function updateCounts() {
    var keys = ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status', 'adc', 'temp'];
    keys.forEach(function (key) {
      var box = document.querySelector('[data-facet="' + key + '"]');
      if (!box) return;
      var counts = countsFor(key);
      var isRadio = key === 'adc' || key === 'temp';
      box.querySelectorAll('[data-count]').forEach(function (span) {
        var v = span.getAttribute('data-count');
        var n = counts[v] || 0;
        span.textContent = String(n);
        var input = span.parentElement.querySelector('input');
        if (!input) return;
        if (isRadio) {
          input.disabled = n === 0 && String(state[key]) !== v;
        } else {
          input.disabled = n === 0 && !state[key].has(v);
        }
        span.parentElement.style.opacity = n === 0 ? '0.45' : '';
      });
    });
  }

  /* ---------- sync controls ---------- */
  function syncControls() {
    var search = document.getElementById('mcu-search');
    if (search && search.value !== state.q) search.value = state.q;
    var sort = document.getElementById('mcu-sort');
    if (sort) sort.value = state.sort;
    [['freq', 'freq'], ['sram', 'sram'], ['flash', 'flash'], ['run', 'run'], ['sleep', 'sleep'], ['standby', 'standby']].forEach(function (pair) {
      var k = pair[0];
      var min = document.getElementById(k + '-min');
      var max = document.getElementById(k + '-max');
      if (min) min.value = state[k][0] == null ? '' : state[k][0];
      if (max) max.value = state[k][1] == null ? '' : state[k][1];
    });
    var hp = document.getElementById('has-power');
    if (hp) hp.checked = state.hasPower;
    ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status'].forEach(function (key) {
      var box = document.querySelector('[data-facet="' + key + '"]');
      if (!box) return;
      box.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
        input.checked = state[key].has(input.value);
      });
    });
    document.querySelectorAll('[data-facet="adc"] input, [data-facet="temp"] input').forEach(function (input) {
      var key = input.getAttribute('data-facet');
      input.checked = Number(input.value) === Number(state[key]);
    });
    app.dataset.view = state.view;
    document.querySelectorAll('.view-toggle button').forEach(function (btn) {
      var on = btn.getAttribute('data-view') === state.view;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  /* ---------- formatting ---------- */
  function mem(kb) {
    if (kb == null) return '—';
    if (kb === 0) return txt('none', '—');
    if (kb >= 1024) return (kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1) + txt('memMb', ' MB');
    return kb + txt('memKb', ' KB');
  }
  function price(p) {
    if (p.price_cny == null) return txt('inquire', '—');
    var v = Number(p.price_cny);
    var s = v < 1 ? v.toFixed(3) : v.toFixed(2);
    return '¥' + s.replace(/0+$/, '').replace(/\.$/, '');
  }
  function badgeClass(status) {
    if (status === '量产') return 'badge badge--green';
    if (status === '送样') return 'badge badge--amber';
    if (status === '预告') return 'badge badge--blue';
    if (status === '停产') return 'badge badge--gray';
    return 'badge';
  }
  function periphTags(p, max) {
    var keys = PERI_ORDER.filter(function (k) { return p.peripherals && p.peripherals[k] > 0; });
    var out = keys.slice(0, max || 4).map(function (k) {
      var n = p.peripherals[k];
      return '<span class="tag">' + esc(PERI_LABEL[k] || k) + (n > 1 ? '×' + n : '') + '</span>';
    });
    if (p.peripherals && p.peripherals.adc_bits) {
      out.push('<span class="tag tag--indigo">ADC ' + p.peripherals.adc_bits + 'b</span>');
    }
    if (keys.length > (max || 4)) out.push('<span class="tag">+' + (keys.length - (max || 4)) + '</span>');
    return out.join('');
  }

  function periphText(p, max) {
    var keys = PERI_ORDER.filter(function (k) { return p.peripherals && p.peripherals[k] > 0; });
    var out = keys.slice(0, max).map(function (k) {
      var n = p.peripherals[k];
      return PERI_LABEL[k] + (n > 1 ? '×' + n : '');
    });
    if (keys.length > max) out.push('+' + (keys.length - max));
    if (p.peripherals && p.peripherals.adc_bits) out.push('ADC ' + p.peripherals.adc_bits + 'b');
    return esc(out.join(' · '));
  }

  function rowHtml(p) {
    var url = p.url;
    var run = p.power && p.power.run != null ? p.power.run + txt('runSuffix', ' µA/MHz') : '—';
    var sleep = p.power && p.power.sleep != null ? '<span class="sleep">' + txt('sleepPrefix', 'Sleep ') + p.power.sleep + txt('sleepSuffix', ' µA') + '</span>' : '';
    var checked = TR.readCompare().indexOf(p.id) !== -1;
    return '<tr data-id="' + esc(p.id) + '">' +
      '<td><input type="checkbox" class="cmp-check" data-id="' + esc(p.id) + '" aria-label="' + esc(txt('compareOpen', 'Compare')) + ' ' + esc(p.name) + '"' + (checked ? ' checked' : '') + '></td>' +
      '<td><a class="model-link" href="' + esc(urlFor(url)) + '">' + esc(p.name) + '</a><span class="sub-line">' + esc(vendorName(p)) + ' · <span class="' + badgeClass(p.status) + '">' + esc(statusLabel(p.status)) + '</span></span></td>' +
      '<td class="ip-cell">' + esc(brandName(p.ip_vendor)) + '<span class="sub-line">' + esc(p.core) + ' · ' + esc(p.isa) + '</span></td>' +
      '<td class="num">' + p.freq + ' MHz</td>' +
      '<td class="num">' + mem(p.sram) + '</td>' +
      '<td class="num">' + mem(p.flash) + '</td>' +
      '<td class="num power-cell"><span class="run">' + run + '</span>' + sleep + '</td>' +
      '<td><div class="periph-text">' + periphText(p, 3) + '</div></td>' +
      '<td class="num">' + price(p) + (p.price_cny != null ? '<span class="sub-line">' + esc(txt('priceK', '1k ref')) + '</span>' : '') + '</td>' +
      '</tr>';
  }

  function cardHtml(p) {
    var url = p.url;
    var checked = TR.readCompare().indexOf(p.id) !== -1;
    var run = p.power && p.power.run != null ? p.power.run + txt('runSuffix', ' µA/MHz') : txt('powerUnknown', '—');
    var sleep = p.power && p.power.sleep != null ? ' · ' + txt('sleepPrefix', 'Sleep ') + p.power.sleep + txt('sleepSuffix', ' µA') : '';
    var pkg = (p.packages || [])[0] || '—';
    return '<article class="mcu-card" data-id="' + esc(p.id) + '">' +
      '<div class="mcu-card-head">' +
      '<input type="checkbox" class="cmp-check" data-id="' + esc(p.id) + '" aria-label="' + esc(txt('compareOpen', 'Compare')) + ' ' + esc(p.name) + '"' + (checked ? ' checked' : '') + '>' +
      '<div><h3 class="mcu-card-title"><a href="' + esc(urlFor(url)) + '">' + esc(p.name) + '</a></h3>' +
      '<div class="mcu-card-sub">' + esc(vendorName(p)) + ' · ' + esc(brandName(p.ip_vendor)) + ' ' + esc(p.core) + '</div></div>' +
      '<div class="mcu-card-badges"><span class="' + badgeClass(p.status) + '">' + esc(statusLabel(p.status)) + '</span></div>' +
      '</div>' +
      '<dl class="mcu-card-specs">' +
      '<div><dt>' + esc(txt('chipFreq', 'Freq')) + '</dt><dd>' + p.freq + ' <small>MHz</small></dd></div>' +
      '<div><dt>SRAM</dt><dd>' + mem(p.sram) + '</dd></div>' +
      '<div><dt>Flash</dt><dd>' + mem(p.flash) + '</dd></div>' +
      '</dl>' +
      '<div class="small muted">' + run + sleep + ' · ' + (p.voltage ? p.voltage[0] + '–' + p.voltage[1] + 'V' : txt('voltageUnknown', '—')) + '</div>' +
      '<div class="periph-cell" style="margin-top:8px">' + periphTags(p, 4) + '</div>' +
      '<div class="mcu-card-foot"><span>' + esc(pkg) + '</span><span class="price">' + price(p) + '</span></div>' +
      '</article>';
  }

  /* ---------- sorting ---------- */
  function cmpNum(a, b, dir) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return dir * (a - b);
  }
  function score(p) {
    var s = 0;
    if (p.price_cny != null) s += 2;
    if (p.power && p.power.run != null) s += 3;
    if (p.power && p.power.sleep != null) s += 2;
    if (p.links && p.links.datasheet) s += 2;
    if (p.confidence === 'high') s += 1;
    if (p.year >= 2023) s += 1;
    return s;
  }
  function sortParts(list) {
    var s = state.sort;
    return list.slice().sort(function (a, b) {
      var r = 0;
      if (s === 'freq-asc') r = cmpNum(a.freq, b.freq, 1);
      else if (s === 'freq-desc') r = cmpNum(a.freq, b.freq, -1);
      else if (s === 'sram-desc') r = cmpNum(a.sram, b.sram, -1);
      else if (s === 'flash-desc') r = cmpNum(a.flash, b.flash, -1);
      else if (s === 'run-asc') r = cmpNum(a.power ? a.power.run : null, b.power ? b.power.run : null, 1);
      else if (s === 'sleep-asc') r = cmpNum(a.power ? a.power.sleep : null, b.power ? b.power.sleep : null, 1);
      else if (s === 'standby-asc') r = cmpNum(a.power ? a.power.standby : null, b.power ? b.power.standby : null, 1);
      else if (s === 'price-asc') r = cmpNum(a.price_cny, b.price_cny, 1);
      else if (s === 'year-desc') r = cmpNum(a.year, b.year, -1);
      if (r === 0) r = score(b) - score(a);
      if (r === 0) r = cmpNum(a.freq, b.freq, 1);
      if (r === 0) r = String(a.name).localeCompare(String(b.name));
      return r;
    });
  }

  /* ---------- active chips ---------- */
  function activeChips() {
    var chips = [];
    function add(label, remove) { chips.push({ label: label, remove: remove }); }
    ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status'].forEach(function (key) {
      state[key].forEach(function (v) {
        var label = v;
        if (key === 'ipc') label = countryLabel(v);
        if (key === 'vendor') label = vendorLabel(v);
        if (key === 'ip') label = brandName(v);
        if (key === 'peri') label = PERI_LABEL[v] || v;
        if (key === 'status') label = statusLabel(v);
        if (key === 'volt') {
          var o = VOLT_OPTS.filter(function (x) { return x.value === v; })[0];
          label = o ? o.label : v;
        }
        var prefix = { vendor: txt('chipVendor', 'Vendor: '), ip: txt('chipIp', 'IP: '), ipc: txt('chipCountry', 'Country: '), isa: 'ISA: ', peri: txt('chipPeri', 'Peripheral: '), pkg: txt('chipPkg', 'Package: '), volt: txt('chipVolt', 'Voltage: '), eco: txt('chipEco', 'Ecosystem: '), status: txt('chipStatus', 'Status: ') }[key] || '';
        add(prefix + label, function () { state[key].delete(v); });
      });
    });
    [['freq', txt('chipFreq', 'Freq'), 'MHz'], ['sram', 'SRAM', 'KB'], ['flash', 'Flash', 'KB'], ['run', txt('chipRun', 'Active'), 'µA/MHz'], ['sleep', txt('chipSleep', 'Sleep'), 'µA'], ['standby', txt('chipStandby', 'Standby'), 'µA']].forEach(function (it) {
      var r = state[it[0]];
      if (r[0] != null || r[1] != null) {
        var label = r[0] != null && r[1] != null ? it[1] + ' ' + r[0] + '–' + r[1] + ' ' + it[2] : r[0] != null ? it[1] + ' ≥ ' + r[0] + ' ' + it[2] : it[1] + ' ≤ ' + r[1] + ' ' + it[2];
        add(label, function () { state[it[0]] = [null, null]; });
      }
    });
    if (state.adc) add(fmt(txt('chipAdc', 'ADC ≥ {n} bit'), { n: state.adc }), function () { state.adc = 0; });
    if (state.temp) add(fmt(txt('chipTemp', 'Temp ≥ {n} ℃'), { n: state.temp }), function () { state.temp = 0; });
    if (state.hasPower) add(txt('chipHasPower', 'Has power data'), function () { state.hasPower = false; });
    return chips;
  }

  function renderActive() {
    var box = document.getElementById('active-filters');
    if (!box) return;
    var chips = activeChips();
    box.innerHTML = chips.map(function (c, i) {
      return '<button type="button" class="chip" data-chip="' + i + '">' + esc(c.label) + ' ' + '<span aria-hidden="true">×</span></button>';
    }).join('') + (chips.length ? '<button type="button" class="chip chip--clear" id="clear-all-chips">' + esc(txt('clearAll', 'Clear all')) + '</button>' : '');
    box.querySelectorAll('[data-chip]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        chips[Number(btn.getAttribute('data-chip'))].remove();
        apply();
      });
    });
    var clear = document.getElementById('clear-all-chips');
    if (clear) clear.addEventListener('click', resetAll);
    var badge = document.getElementById('filter-count');
    if (badge) {
      badge.textContent = String(chips.length);
      badge.hidden = chips.length === 0;
    }
  }

  /* ---------- render list ---------- */
  function render() {
    var parts = sortParts(filterParts(null));
    var visible = parts.slice(0, limit);
    var tbody = document.getElementById('mcu-tbody');
    var cards = document.getElementById('mcu-cards');
    if (tbody) tbody.innerHTML = visible.map(rowHtml).join('');
    if (cards) cards.innerHTML = visible.map(cardHtml).join('');
    var empty = document.getElementById('mcu-empty');
    if (empty) empty.hidden = parts.length !== 0;
    var load = document.getElementById('load-more');
    if (load) load.hidden = parts.length <= limit;
    var count = document.getElementById('result-count');
    if (count) {
      var line = fmt(txt('resultCount', '{count}'), { count: '<b>' + parts.length + '</b>', total: DATA.length });
      if (parts.length > visible.length) line += fmt(txt('shown', ' (showing {shown})'), { shown: visible.length });
      count.innerHTML = line;
    }
    updateCompareBar();
  }

  function apply() {
    limit = PAGE_SIZE;
    render();
    updateCounts();
    renderActive();
    writeUrl();
  }

  function resetAll() {
    var keepView = state.view;
    var keepSort = state.sort;
    resetState();
    state.view = keepView;
    state.sort = keepSort;
    syncControls();
    apply();
  }

  /* ---------- compare ---------- */
  function partById(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }

  function updateCompareBar() {
    var ids = TR.readCompare().filter(function (id) { return partById(id); });
    var bar = document.getElementById('compare-bar');
    var slots = document.getElementById('compare-slots');
    var count = document.getElementById('compare-count');
    var open = document.getElementById('compare-open');
    if (count) count.textContent = String(ids.length);
    if (bar) bar.classList.toggle('is-open', ids.length > 0);
    if (slots) {
      slots.innerHTML = ids.map(function (id) {
        var p = partById(id);
        return '<span class="compare-slot">' + esc(p.name) + '<button type="button" data-remove-compare="' + esc(id) + '" aria-label="' + esc(txt('compareRemove', 'Remove')) + ' ' + esc(p.name) + '">×</button></span>';
      }).join('');
    }
    if (open) open.disabled = ids.length < 2;
    document.querySelectorAll('.cmp-check').forEach(function (input) {
      input.checked = ids.indexOf(input.getAttribute('data-id')) !== -1;
    });
  }

  function compareValue(p, key) {
    switch (key) {
      case 'freq': return p.freq;
      case 'sram': return p.sram;
      case 'flash': return p.flash;
      case 'run': return p.power ? p.power.run : null;
      case 'sleep': return p.power ? p.power.sleep : null;
      case 'price': return p.price_cny;
      case 'adc': return p.peripherals ? p.peripherals.adc_bits : null;
      default: return null;
    }
  }

  function compareRows() {
    return [
      { label: txt('detail_vendor', 'Vendor'), get: function (p) { return vendorName(p); } },
      { label: txt('table_ip_core', 'IP core'), get: function (p) { return brandName(p.ip_vendor) + ' · ' + p.core; } },
      { label: txt('compareIsa', 'ISA'), get: function (p) { return p.isa; } },
      { label: txt('detail_max_freq', 'Max frequency'), get: function (p) { return p.freq + ' MHz'; }, key: 'freq', better: 'max' },
      { label: 'SRAM', get: function (p) { return mem(p.sram); }, key: 'sram', better: 'max' },
      { label: 'Flash', get: function (p) { return mem(p.flash); }, key: 'flash', better: 'max' },
      { label: txt('detail_run_current', 'Active current'), get: function (p) { return p.power && p.power.run != null ? p.power.run + ' µA/MHz' : '—'; }, key: 'run', better: 'min' },
      { label: txt('detail_sleep_current', 'Sleep current'), get: function (p) { return p.power && p.power.sleep != null ? p.power.sleep + ' µA' : '—'; }, key: 'sleep', better: 'min' },
      { label: txt('detail_voltage', 'Voltage'), get: function (p) { return p.voltage ? p.voltage[0] + '–' + p.voltage[1] + ' V' : '—'; } },
      { label: 'ADC', get: function (p) { return p.peripherals && p.peripherals.adc_bits ? p.peripherals.adc_bits + ' ' + txt('detail_bits', 'bit') + ' / ' + (p.peripherals.adc_ch || 0) + ' ' + txt('detail_channels', 'ch') : '—'; }, key: 'adc', better: 'max' },
      { label: txt('table_periph', 'Peripherals'), get: function (p) { return PERI_ORDER.filter(function (k) { return p.peripherals && p.peripherals[k] > 0; }).map(function (k) { return PERI_LABEL[k]; }).join(', ') || '—'; } },
      { label: txt('table_package', 'Package'), get: function (p) { return (p.packages || []).join(', ') || '—'; } },
      { label: txt('detail_temp', 'Temperature'), get: function (p) { return p.temp_min + ' ~ ' + p.temp_max + ' ℃'; } },
      { label: txt('compareSecurity', 'Security'), get: function (p) { return (p.security || []).join(', ') || '—'; } },
      { label: txt('compareEco', 'Ecosystem'), get: function (p) { return (p.ecosystem || []).join(', ') || '—'; } },
      { label: txt('table_status', 'Status'), get: function (p) { return statusLabel(p.status); } },
      { label: txt('table_price', 'Price'), get: function (p) { return price(p) + (p.price_note ? ' (' + p.price_note + ')' : ''); }, key: 'price', better: 'min' },
      { label: txt('compareSources', 'Sources'), get: function (p) { return '<a href="' + esc(urlFor(p.url)) + '">' + esc(txt('compareDetails', 'Details')) + '</a> · ' + esc(txt('compareSources', 'Sources')) + ': ' + (p.sources || []).length; } }
    ];
  }

  function openCompare() {
    var ids = TR.readCompare().filter(function (id) { return partById(id); });
    if (ids.length < 2) { TR.toast(txt('compareNeed', 'Select at least 2 parts to compare')); return; }
    var parts = ids.map(partById);
    var rows = compareRows();
    var html = '<table class="compare-table"><thead><tr><th>' + esc(txt('compareParam', 'Parameter')) + '</th>' + parts.map(function (p) {
      return '<th><a href="' + esc(urlFor(p.url)) + '">' + esc(p.name) + '</a><br><span class="sub-line">' + esc(p.vendor) + '</span></th>';
    }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (row) {
      var bestVal = null;
      if (row.key) {
        var vals = parts.map(function (p) { return compareValue(p, row.key); }).filter(function (v) { return v != null; });
        if (vals.length > 1 && new Set(vals).size > 1) bestVal = row.better === 'min' ? Math.min.apply(null, vals) : Math.max.apply(null, vals);
      }
      html += '<tr><th>' + esc(row.label) + '</th>' + parts.map(function (p) {
        var raw = row.key ? compareValue(p, row.key) : null;
        var isBest = bestVal != null && raw === bestVal;
        return '<td' + (isBest ? ' class="best"' : '') + '>' + row.get(p) + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('compare-content').innerHTML = html;
    var modal = document.getElementById('compare-modal');
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCompare() {
    var modal = document.getElementById('compare-modal');
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- events ---------- */
  function bind() {
    var search = document.getElementById('mcu-search');
    var timer = null;
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { state.q = search.value.trim(); apply(); }, 180);
      });
    }
    var sort = document.getElementById('mcu-sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; apply(); });

    [['freq', 'freq'], ['sram', 'sram'], ['flash', 'flash'], ['run', 'run'], ['sleep', 'sleep'], ['standby', 'standby']].forEach(function (pair) {
      var k = pair[0];
      var min = document.getElementById(k + '-min');
      var max = document.getElementById(k + '-max');
      function upd() {
        var a = min && min.value !== '' ? Number(min.value) : null;
        var b = max && max.value !== '' ? Number(max.value) : null;
        state[k] = [isFinite(a) ? a : null, isFinite(b) ? b : null];
        apply();
      }
      if (min) min.addEventListener('change', upd);
      if (max) max.addEventListener('change', upd);
    });

    var hp = document.getElementById('has-power');
    if (hp) hp.addEventListener('change', function () { state.hasPower = hp.checked; apply(); });

    var reset = document.getElementById('reset-filters');
    if (reset) reset.addEventListener('click', resetAll);

    document.querySelectorAll('.view-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.getAttribute('data-view');
        syncControls();
        writeUrl();
      });
    });

    var load = document.getElementById('load-more');
    if (load) load.addEventListener('click', function () { limit += PAGE_SIZE; render(); });

    document.addEventListener('change', function (e) {
      var cb = e.target.closest('.cmp-check');
      if (!cb) return;
      var id = cb.getAttribute('data-id');
      if (cb.checked) {
        var res = TR.addCompare(id);
        if (!res.ok) { cb.checked = false; TR.toast(txt('compareMax', 'You can compare up to 4 parts')); }
      } else {
        TR.removeCompare(id);
      }
      updateCompareBar();
      writeUrl();
    });

    document.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-remove-compare]');
      if (rm) { TR.removeCompare(rm.getAttribute('data-remove-compare')); updateCompareBar(); writeUrl(); return; }
      if (e.target.closest('#compare-open')) { openCompare(); return; }
      if (e.target.closest('#compare-clear')) { TR.clearCompare(); updateCompareBar(); writeUrl(); return; }
      if (e.target.closest('[data-close-modal]')) { closeCompare(); return; }
      if (e.target === document.getElementById('compare-modal')) closeCompare();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modal = document.getElementById('compare-modal');
        if (modal && modal.classList.contains('is-open')) closeCompare();
      }
    });

    document.querySelectorAll('[data-preset]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (link.getAttribute('href').indexOf(location.pathname) !== 0) return;
        e.preventDefault();
        var qs = link.getAttribute('data-preset') || '';
        resetState();
        var q = new URLSearchParams(qs);
        state.q = q.get('q') || '';
        ['vendor', 'ip', 'ipc', 'isa', 'peri', 'pkg', 'volt', 'eco', 'status'].forEach(function (key) {
          if (q.get(key)) state[key] = new Set(q.get(key).split(','));
        });
        ['freq', 'sram', 'flash', 'run', 'sleep', 'standby'].forEach(function (key) {
          if (q.get(key)) state[key] = readRange(q.get(key));
        });
        state.adc = Number(q.get('adc')) || 0;
        state.temp = Number(q.get('temp')) || 0;
        state.hasPower = q.get('has_power') === '1';
        state.sort = q.get('sort') || 'recommended';
        syncControls();
        apply();
        document.getElementById('mcu-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function init() {
    if (pendingCompare.length) {
      // URL 里带过来的对比型号优先
      try { sessionStorage.setItem('tr-compare', JSON.stringify(pendingCompare)); } catch (e) {}
    }
    buildFacets();
    renderAllFacets();
    syncControls();
    bind();
    apply();
  }

  function fail(err) {
    var count = document.getElementById('result-count');
    if (count) count.innerHTML = esc(txt('loadError', 'Failed to load data. Please refresh.'));
    var empty = document.getElementById('mcu-empty');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = '<h3>' + esc(txt('loadErrorTitle', 'Failed to load data')) + '</h3><p>' + esc(txt('loadErrorDesc', 'Please refresh the page.')) + '</p>';
    }
    if (window.console) console.error(err);
  }

  readUrl();
  fetch(app.getAttribute('data-json'), { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) {
      DATA = data.parts || [];
      if (!DATA.length) throw new Error('empty dataset');
      init();
    })
    .catch(fail);
})();
