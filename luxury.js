/* ==========================================================================
   Royal Bengal Tiger India — luxury.js
   Page-only behaviour for luxury-jim-corbett-safari-package.html:
   the itinerary tab switcher. Loaded with `defer`.
   ========================================================================== */

function showItin(which, btn) {
  document.querySelectorAll('.itin-tab-btn').forEach(function (b) {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.itin-panel').forEach(function (p) { p.classList.remove('active'); });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  var panel = document.getElementById('itin-' + which);
  if (panel) panel.classList.add('active');
}
