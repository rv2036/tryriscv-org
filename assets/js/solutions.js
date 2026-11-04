/* solution category filter */
(function () {
  'use strict';
  var list = document.getElementById('solution-list');
  var bar = document.getElementById('solution-filters');
  if (!list || !bar) return;
  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-category]');
    if (!btn) return;
    var cat = btn.getAttribute('data-category');
    bar.querySelectorAll('[data-category]').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
    list.querySelectorAll('.solution-card').forEach(function (card) {
      card.hidden = cat !== 'all' && card.getAttribute('data-category') !== cat;
    });
  });
})();
