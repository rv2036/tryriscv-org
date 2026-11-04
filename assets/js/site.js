/* tryriscv.org — shared UI helpers */
(function () {
  'use strict';

  var COMPARE_KEY = 'tr-compare';
  var MAX_COMPARE = 4;
  var I18N = window.__TR_I18N__ || {};
  var TXT = I18N.text || {};
  function t(k, fallback) { return TXT[k] || fallback; }

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var themeBtn = document.querySelector('.theme-toggle');
  function themeAria(theme) {
    return theme === 'dark' ? t('themeLight', 'Switch to light') : t('themeDark', 'Switch to dark');
  }
  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem('tr-theme', theme); } catch (e) { /* ignore */ }
    }
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', themeAria(theme));
      themeBtn.setAttribute('title', themeAria(theme));
    }
  }
  if (themeBtn) {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    themeBtn.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

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
    if (!res.ok) { toast(t('compareMax', 'You can compare up to ' + MAX_COMPARE + ' parts')); return; }
    toast(res.duplicate ? t('compareExists', 'Already in the comparison list') : t('compareAdded', 'Added to comparison'));
    btn.classList.add('is-added');
    var label = btn.querySelector('.js-label');
    if (label) label.textContent = t('compareAddedLabel', 'Added');
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
