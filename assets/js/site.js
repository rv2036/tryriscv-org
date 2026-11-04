/* tryriscv.org — shared UI helpers */
(function () {
  'use strict';

  var COMPARE_KEY = 'tr-compare';
  var MAX_COMPARE = 4;

  function readCompare() {
    try {
      var raw = sessionStorage.getItem(COMPARE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }

  function writeCompare(ids) {
    try { sessionStorage.setItem(COMPARE_KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('tr:compare-change', { detail: ids }));
  }

  function addCompare(id) {
    var ids = readCompare();
    if (ids.indexOf(id) !== -1) return { ok: true, duplicate: true, ids: ids };
    if (ids.length >= MAX_COMPARE) return { ok: false, reason: 'max', ids: ids };
    ids.push(id);
    writeCompare(ids);
    return { ok: true, ids: ids };
  }

  function removeCompare(id) {
    var ids = readCompare().filter(function (x) { return x !== id; });
    writeCompare(ids);
    return ids;
  }

  function clearCompare() { writeCompare([]); }

  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  /* ---------- nav ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- filter drawer ---------- */
  var filters = document.getElementById('mcu-filters');
  var scrim = document.getElementById('filter-scrim');
  var openBtn = document.getElementById('open-filters');
  var closeBtn = document.getElementById('close-filters');

  function setDrawer(open) {
    if (!filters) return;
    filters.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    document.body.classList.toggle('filter-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
  }
  if (openBtn) openBtn.addEventListener('click', function () { setDrawer(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
  if (scrim) scrim.addEventListener('click', function () { setDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setDrawer(false);
      var m = document.getElementById('compare-modal');
      if (m && m.classList.contains('is-open')) {
        m.classList.remove('is-open');
        m.hidden = true;
      }
    }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setDrawer(false);
  });

  /* ---------- add-to-compare buttons (detail page) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-compare-add]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-compare-add');
    var res = addCompare(id);
    if (!res.ok) { toast('最多同时对比 ' + MAX_COMPARE + ' 款，请先移除一款'); return; }
    toast(res.duplicate ? '已在对比列表中' : '已加入对比，去 MCU 页勾选更多型号');
    btn.classList.add('is-added');
    var label = btn.querySelector('.js-label');
    if (label) label.textContent = '已加入对比';
  });

  window.TR = {
    MAX_COMPARE: MAX_COMPARE,
    readCompare: readCompare,
    addCompare: addCompare,
    removeCompare: removeCompare,
    clearCompare: clearCompare,
    toast: toast,
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };
})();
