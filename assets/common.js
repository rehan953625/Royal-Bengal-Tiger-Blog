/* ==========================================================================
   Royal Bengal Tiger India — common.js
   Shared behaviour for every page: mobile nav, sticky-nav state, FAQ
   accordion, photo slideshows, deferred hero images, YouTube click-to-play.

   Loaded with `defer`, so it never blocks parsing or first paint and it
   still runs before DOMContentLoaded fires.
   ========================================================================== */

/* ---------- Mobile navigation ---------- */
function toggleMenu() {
  var links = document.querySelector('.nav-links');
  if (!links) return;
  var open = links.classList.toggle('active');
  var btn = document.querySelector('.mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/* ---------- Sticky nav background ----------
   Previously each page wrote navEl.style.background on every scroll tick.
   Now we only toggle a class and let CSS (.nav.is-scrolled) do the work —
   the read/write is batched into rAF so scrolling never forces a synchronous
   layout, which is what INP measures. */
(function () {
  var navEl = document.querySelector('.nav');
  if (!navEl) return;
  var isScrolled = false;
  var ticking = false;

  function apply() {
    ticking = false;
    var scrolled = window.scrollY > 60;
    if (scrolled === isScrolled) return;
    isScrolled = scrolled;
    navEl.classList.toggle('is-scrolled', scrolled);
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }, { passive: true });

  apply();
})();

/* ---------- FAQ accordion ---------- */
function toggleFaq(btn) {
  var item = btn.closest('.faq-item');
  if (!item) return;
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(function (el) {
    el.classList.remove('open');
    var b = el.querySelector('.faq-q');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

/* ---------- Photo slideshow ----------
   Used by the hero banner, zone cards and resort cards. It only rotates
   through images that actually finished loading, so a missing or broken
   photo is skipped instead of leaving a blank frame. */
function setupSlideshow(container, selector, intervalMs) {
  if (!container) return;
  var items = Array.prototype.slice.call(container.querySelectorAll(selector));
  if (!items.length) return;

  var getImg = function (el) { return el.tagName === 'IMG' ? el : el.querySelector('img'); };
  var isLoaded = function (el) {
    var img = getImg(el);
    return !!img && img.complete && img.naturalWidth > 0;
  };

  var current = -1;
  var started = false;
  var timer = null;

  function activate(el) {
    items.forEach(function (it) { it.classList.remove('active'); });
    el.classList.add('active');
    current = items.indexOf(el);
  }

  function step() {
    var next = current;
    for (var i = 0; i < items.length; i++) {
      next = (next + 1) % items.length;
      if (isLoaded(items[next])) break;
    }
    if (next !== current && isLoaded(items[next])) activate(items[next]);
  }

  function tryStart() {
    if (started) return;
    var first = items.filter(isLoaded)[0];
    if (!first) return;
    started = true;
    activate(first);
    if (items.length > 1 && !timer) timer = setInterval(step, intervalMs);
  }

  items.forEach(function (el) {
    var img = getImg(el);
    if (!img) return;
    img.addEventListener('load', tryStart, { once: true });
    if (img.complete) tryStart();
  });
  tryStart();
  setTimeout(tryStart, 1200);

  /* Stop burning CPU (and INP budget) while the tab is hidden. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (timer) { clearInterval(timer); timer = null; }
    } else if (started && items.length > 1 && !timer) {
      timer = setInterval(step, intervalMs);
    }
  });
}

/* ---------- Deferred hero slides ----------
   Slides 2..n carry data-src instead of src so they never compete with
   slide 1 — the real LCP image — for early bandwidth and connections. */
function loadDeferredHeroSlides() {
  document.querySelectorAll('.hero-slideshow .slide img[data-src], .lux-hero-slideshow .slide img[data-src]')
    .forEach(function (img) {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    });
}

/* ---------- YouTube click-to-play facade ----------
   Keeps YouTube's player JS (and its ~1 MB of third-party payload) out of
   the page entirely until someone actually wants to watch. */
function loadYouTubeFacade(el) {
  if (!el || el.dataset.loaded) return;
  var id = el.getAttribute('data-yt-id');
  if (!id) return;
  el.dataset.loaded = '1';
  var title = el.getAttribute('data-yt-title') || 'YouTube video';
  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1';
  iframe.title = title;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.loading = 'lazy';
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
  el.innerHTML = '';
  el.removeAttribute('role');
  el.removeAttribute('tabindex');
  el.onclick = null;
  el.onkeydown = null;
  el.appendChild(iframe);
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', function () {
  setupSlideshow(document.querySelector('.hero-slideshow'), '.slide', 5000);
  setupSlideshow(document.querySelector('.lux-hero-slideshow'), '.slide', 5000);
  document.querySelectorAll('.zone-slideshow').forEach(function (el) { setupSlideshow(el, 'img', 4000); });
  document.querySelectorAll('.resort-slideshow').forEach(function (el) { setupSlideshow(el, 'img', 3800); });

  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadDeferredHeroSlides, { timeout: 3000 });
  } else {
    window.addEventListener('load', loadDeferredHeroSlides);
  }
});
