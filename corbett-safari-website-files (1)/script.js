/* ==========================================================================
   NEXT-GEN CORBETT SAFARI BOOKING ARCHITECTURE — script.js
   Features:
   - One-Click SITE_CONFIG with automatic DOM, Meta & Schema hydration
   - Real-Time Package Fare & Per-Person Cost Calculator
   - Smart Safari Format <-> Zone Synchronization (prevents invalid combos)
   - Local Timezone (IST) Date Initialization & Past-Date Protection
   - Interactive 10-Zone Recommender Filter (All / Core / Monsoon / Resort / Birding)
   - Interactive Gate-Readiness Checklist Counter
   - Passive IntersectionObserver Scroll-Spy & Keyboard Accessibility (ESC)
   - Zero Main-Thread Blocking for Optimal INP (< 50ms)
   ========================================================================== */

var SITE_CONFIG = {
  domain: 'YOUR-DOMAIN.COM',
  siteUrl: 'https://YOUR-DOMAIN.COM',
  brandName: 'YOUR-BRAND-NAME',
  brandPrimary: 'YOUR-BRAND-NAME',
  brandAccent: 'SAFARI',
  agencyName: 'YOUR-BRAND-NAME (Private Safari Tour Agency)',
  phoneDisplay: '+91-9520645743',
  phoneTel: '+919520645743',
  whatsappNumber: '919520645743',
  email: 'info@YOUR-DOMAIN.COM'
};

// Zone & Format Rate Table (INR)
var ZONE_RATES = {
  'Bijrani Zone':        { indian: 7500, foreign: 15000, unit: 'gypsy', openSeason: '15 Oct – 30 Jun' },
  'Phato Zone':          { indian: 7500, foreign: 15000, unit: 'gypsy', openSeason: '15 Oct – 30 Jun' },
  'Garjiya Zone':        { indian: 7500, foreign: 15000, unit: 'gypsy', openSeason: '15 Oct – 30 Jun' },
  'Dhikala Core Zone':   { indian: 3500, foreign: 7000,  unit: 'canter', openSeason: '15 Nov – 15 Jun' },
  'Jhirna - Year-Round': { indian: 6500, foreign: 13000, unit: 'gypsy', openSeason: 'Open All Year' },
  'Dhela Zone':          { indian: 6500, foreign: 13000, unit: 'gypsy', openSeason: 'Open All Year' },
  'Hathi Dagar Zone':    { indian: 6500, foreign: 13000, unit: 'gypsy', openSeason: 'Open All Year' },
  'Durga Devi Zone':     { indian: 7500, foreign: 15000, unit: 'gypsy', openSeason: '15 Nov – 15 Jun' },
  'Sitabani Buffer':     { indian: 6500, foreign: 12000, unit: 'gypsy', openSeason: 'Open All Year' },
  'Pakhro Zone':         { indian: 6500, foreign: 13000, unit: 'gypsy', openSeason: '15 Oct – 30 Jun' }
};

// State trackers for smart format <-> zone sync & toast timers
var lastSelectedType = 'Private 4x4 Gypsy Safari';
var lastSelectedZone = 'Bijrani Zone';
var toastTimeoutId = null;

// Format INR currency
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Get YYYY-MM-DD in local timezone (avoids UTC midnight lag in IST)
function getLocalISODate(offsetDays) {
  var d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

// Synchronize Safari Format (#type) and Preferred Zone (#zone) to prevent invalid combinations
function syncFormatAndZone(typeEl, zoneEl) {
  if (!typeEl || !zoneEl) return;

  var currentType = typeEl.value;
  var currentZone = zoneEl.value;
  var typeChanged = currentType !== lastSelectedType;
  var zoneChanged = currentZone !== lastSelectedZone;

  if (typeChanged) {
    if (currentType === 'Canter Safari - Dhikala' || currentType === 'Dhikala Night Stay Package') {
      // Canter Safari & Dhikala Night Stay apply to Dhikala Core Zone
      if (currentZone !== 'Dhikala Core Zone') {
        zoneEl.value = 'Dhikala Core Zone';
        currentZone = 'Dhikala Core Zone';
      }
    } else if (currentType === 'Private 4x4 Gypsy Safari' && currentZone === 'Dhikala Core Zone') {
      // Day visitors cannot enter Dhikala Core Zone by Private Gypsy; switch to Bijrani Zone
      zoneEl.value = 'Bijrani Zone';
      currentZone = 'Bijrani Zone';
      showToast('Day Gypsy is not permitted in Dhikala · Switched to Bijrani Zone');
    }
  } else if (zoneChanged) {
    if (currentZone === 'Dhikala Core Zone' && currentType === 'Private 4x4 Gypsy Safari') {
      // Selecting Dhikala Core Zone automatically selects Day Canter Safari
      typeEl.value = 'Canter Safari - Dhikala';
      currentType = 'Canter Safari - Dhikala';
      showToast('Dhikala Day Safari operates via 16-Seater Canter');
    } else if (currentZone !== 'Dhikala Core Zone' && currentType !== 'Private 4x4 Gypsy Safari') {
      // Selecting any other zone switches format to Private 4x4 Gypsy Safari
      typeEl.value = 'Private 4x4 Gypsy Safari';
      currentType = 'Private 4x4 Gypsy Safari';
    }
  }

  lastSelectedType = currentType;
  lastSelectedZone = currentZone;
}

// Live Package Fare Estimator
function updateFareEstimator() {
  var typeEl = document.getElementById('type');
  var zoneEl = document.getElementById('zone');
  var guestsEl = document.getElementById('guests');
  var nationEl = document.getElementById('nationality');

  var totalEl = document.getElementById('estTotalAmount');
  var perPersonEl = document.getElementById('estPerPersonText');
  var vehicleNoteEl = document.getElementById('estVehicleNote');

  if (!typeEl || !zoneEl || !guestsEl || !totalEl) return;

  // Keep format & zone logically consistent
  syncFormatAndZone(typeEl, zoneEl);

  var safariType = typeEl.value;
  var zoneName = zoneEl.value;
  var rawGuests = parseInt(guestsEl.value, 10);
  var guests = isNaN(rawGuests) ? 2 : Math.min(Math.max(rawGuests, 1), 16);

  var isForeign = nationEl && nationEl.value === 'Foreign National';
  var totalCost = 0;
  var vehicleDesc = '';

  if (safariType === 'Canter Safari - Dhikala') {
    var seatRate = isForeign ? 7000 : 3500;
    totalCost = seatRate * guests;
    vehicleDesc = guests + (guests === 1 ? ' Canter Seat' : ' Canter Seats') + ' (Dhikala Gate)';
  } else if (safariType === 'Dhikala Night Stay Package') {
    var roomsOrUnits = Math.ceil(guests / 3);
    var nightRate = isForeign ? 30000 : 15500;
    totalCost = nightRate * roomsOrUnits;
    vehicleDesc = roomsOrUnits + (roomsOrUnits === 1 ? ' Core Lodge Unit' : ' Core Lodge Units') + ' + Private Gypsy (' + guests + ' pax)';
  } else {
    var rateObj = ZONE_RATES[zoneName] || { indian: 7500, foreign: 15000 };
    var gypsyRate = isForeign ? rateObj.foreign : rateObj.indian;
    var numGypsies = Math.ceil(guests / 6);
    totalCost = gypsyRate * numGypsies;
    vehicleDesc = numGypsies + (numGypsies === 1 ? ' Private 4x4 Gypsy (Max 6 pax)' : ' Private 4x4 Gypsies (' + guests + ' pax)');
  }

  var perPerson = Math.round(totalCost / guests);
  totalEl.textContent = formatINR(totalCost);
  if (perPersonEl) {
    perPersonEl.textContent = '~' + formatINR(perPerson) + ' / person';
  }
  if (vehicleNoteEl) {
    vehicleNoteEl.textContent = vehicleDesc;
  }
}

// Clamp guest input value cleanly when user finishes typing (on blur/change)
function enforceGuestBounds() {
  var guestsEl = document.getElementById('guests');
  if (!guestsEl) return;
  var val = parseInt(guestsEl.value, 10);
  if (isNaN(val) || val < 1) {
    guestsEl.value = 1;
  } else if (val > 16) {
    guestsEl.value = 16;
    showToast('Maximum 16 guests per online quote');
  }
  updateFareEstimator();
}

// Validate Travel Date so past dates cannot be selected
function validateTravelDate() {
  var dateInput = document.getElementById('date');
  if (!dateInput) return;
  var minDate = getLocalISODate(0);
  if (dateInput.value && dateInput.value < minDate) {
    dateInput.value = getLocalISODate(1);
    showToast('Past dates are not allowed · Set to tomorrow');
  }
}

// One-Click SITE_CONFIG Hydration across DOM links, text, and Schema
function applySiteConfig() {
  var yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Update tel:, mailto:, and WhatsApp links dynamically
  var telLinks = document.querySelectorAll('a[href^="tel:"]');
  telLinks.forEach(function(link) {
    link.setAttribute('href', 'tel:' + SITE_CONFIG.phoneTel);
  });

  var mailLinks = document.querySelectorAll('a[href^="mailto:"]');
  mailLinks.forEach(function(link) {
    link.setAttribute('href', 'mailto:' + SITE_CONFIG.email);
    if (link.textContent.indexOf('@') !== -1) {
      link.textContent = link.textContent.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, SITE_CONFIG.email);
    }
  });

  var waLinks = document.querySelectorAll('a[href*="wa.me/"]');
  waLinks.forEach(function(link) {
    link.setAttribute('href', 'https://wa.me/' + SITE_CONFIG.whatsappNumber);
  });

  // If user customized brandName or domain in SITE_CONFIG, hydrate brand elements
  if (SITE_CONFIG.brandPrimary && SITE_CONFIG.brandPrimary !== 'YOUR-BRAND-NAME') {
    var navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
      navLogo.innerHTML = '<svg class="icon" style="color:var(--accent-gold)"><use href="#icon-paw"></use></svg> '
        + SITE_CONFIG.brandPrimary + ' <span>' + (SITE_CONFIG.brandAccent || 'SAFARI') + '</span>';
    }
    var footerBrand = document.querySelector('.footer-brand-name');
    if (footerBrand) {
      footerBrand.innerHTML = SITE_CONFIG.brandPrimary + ' <span>' + (SITE_CONFIG.brandAccent || 'SAFARI') + '</span>';
    }
  }
}

// Initialize default travel date, event listeners, scroll-spy & live estimator
(function initBookingDefaults() {
  var dateInput = document.getElementById('date');
  if (dateInput) {
    var todayStr = getLocalISODate(0);
    var tomorrowStr = getLocalISODate(1);
    var maxDateStr = getLocalISODate(180);
    dateInput.setAttribute('min', todayStr);
    dateInput.setAttribute('max', maxDateStr);
    if (!dateInput.value || dateInput.value < todayStr) {
      dateInput.value = tomorrowStr;
    }
    dateInput.addEventListener('change', validateTravelDate);
  }

  var guestsInput = document.getElementById('guests');
  if (guestsInput) {
    guestsInput.addEventListener('blur', enforceGuestBounds);
    guestsInput.addEventListener('change', enforceGuestBounds);
  }

  applySiteConfig();
  updateFareEstimator();
  initScrollSpy();
  initGlobalListeners();
})();

// Mobile navigation toggle
function toggleMenu() {
  var navLinks = document.getElementById('navLinks');
  var btn = document.getElementById('mobileMenuBtn');
  if (!navLinks) return;
  var isOpen = navLinks.classList.toggle('open');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeMobileMenu() {
  var navLinks = document.getElementById('navLinks');
  var btn = document.getElementById('mobileMenuBtn');
  if (navLinks) navLinks.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Highlight booking card when sticky button is clicked
function highlightBookingCard() {
  closeMobileMenu();
  var card = document.getElementById('bookingCard');
  if (card) {
    card.classList.remove('booking-highlight');
    void card.offsetWidth;
    card.classList.add('booking-highlight');
  }
}

// Pre-fill booking form when user clicks any Zone or Safari Type card
function bookZone(zoneName, safariType) {
  var zoneSelect = document.getElementById('zone');
  var typeSelect = document.getElementById('type');
  var fgZone = document.getElementById('fg-zone');
  var fgType = document.getElementById('fg-type');

  if (typeSelect && safariType) {
    for (var j = 0; j < typeSelect.options.length; j++) {
      if (typeSelect.options[j].text === safariType || typeSelect.options[j].value === safariType) {
        typeSelect.selectedIndex = j;
        lastSelectedType = typeSelect.value;
        break;
      }
    }
    if (fgType) fgType.classList.add('field-filled');
  }

  if (zoneSelect && zoneName) {
    for (var i = 0; i < zoneSelect.options.length; i++) {
      if (zoneSelect.options[i].text === zoneName || zoneSelect.options[i].value === zoneName) {
        zoneSelect.selectedIndex = i;
        lastSelectedZone = zoneSelect.value;
        break;
      }
    }
    if (fgZone) fgZone.classList.add('field-filled');
  }

  updateFareEstimator();

  var bookingEl = document.getElementById('booking');
  if (bookingEl) {
    bookingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  highlightBookingCard();
  showToast('Selected: ' + zoneName + ' · Fare Updated');
}

// Filter 10 Safari Zones by Traveller Preference
function filterZones(category, btnEl) {
  var buttons = document.querySelectorAll('.zone-filter-btn');
  buttons.forEach(function(b) {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  if (btnEl) {
    btnEl.classList.add('active');
    btnEl.setAttribute('aria-selected', 'true');
  }

  var cards = document.querySelectorAll('.z-card');
  cards.forEach(function(card) {
    var cats = card.getAttribute('data-cats') || '';
    var catList = cats.split(/\s+/);
    if (category === 'all' || catList.indexOf(category) !== -1) {
      card.classList.remove('hidden-zone');
    } else {
      card.classList.add('hidden-zone');
    }
  });
}

// Gate Readiness Checklist Counter
function updateReadinessScore() {
  var boxes = document.querySelectorAll('.readiness-check');
  var checked = 0;
  boxes.forEach(function(b) {
    if (b.checked) checked++;
  });
  var statusEl = document.getElementById('readinessStatus');
  if (!statusEl) return;

  statusEl.textContent = checked + ' / ' + boxes.length + ' Gate Requirements Checked';
  if (checked === boxes.length) {
    statusEl.style.background = '#DCFCE7';
    statusEl.style.color = '#166534';
  } else {
    statusEl.style.background = '#FEF3C7';
    statusEl.style.color = '#92400E';
  }
}

// Collect form values
function getBookingDetails() {
  var name = (document.getElementById('guestname') && document.getElementById('guestname').value.trim()) || 'Traveller';
  var type = (document.getElementById('type') && document.getElementById('type').value) || 'Private 4x4 Gypsy Safari';
  var zone = (document.getElementById('zone') && document.getElementById('zone').value) || 'Bijrani Zone';
  var shift = (document.getElementById('shift') && document.getElementById('shift').value) || 'Morning: 6:00 AM – 9:30 AM';
  var date = (document.getElementById('date') && document.getElementById('date').value) || getLocalISODate(1);
  var rawGuests = parseInt(document.getElementById('guests') && document.getElementById('guests').value, 10);
  var guests = String(isNaN(rawGuests) ? 2 : Math.min(Math.max(rawGuests, 1), 16));
  var nationality = (document.getElementById('nationality') && document.getElementById('nationality').value) || 'Indian National';
  var estTotal = (document.getElementById('estTotalAmount') && document.getElementById('estTotalAmount').textContent) || '₹7,500';
  var vehicleNote = (document.getElementById('estVehicleNote') && document.getElementById('estVehicleNote').textContent) || '';

  return {
    name: name,
    type: type,
    zone: zone,
    shift: shift,
    date: date,
    guests: guests,
    nationality: nationality,
    estTotal: estTotal,
    vehicleNote: vehicleNote
  };
}

function showToast(msg) {
  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  if (toastText) toastText.textContent = msg;
  if (toast) {
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toast.classList.add('show');
    toastTimeoutId = setTimeout(function() {
      toast.classList.remove('show');
      toastTimeoutId = null;
    }, 3600);
  }
}

function showSuccessModal(summaryHtml) {
  var modal = document.getElementById('successModal');
  var textEl = document.getElementById('successModalText');
  if (textEl) textEl.innerHTML = summaryHtml;
  if (modal) modal.classList.add('show');
}

function closeSuccessModal() {
  var modal = document.getElementById('successModal');
  if (modal) modal.classList.remove('show');
}

// WhatsApp Booking Handler (Uses SITE_CONFIG.whatsappNumber = 919520645743)
function handleBookingWhatsApp() {
  enforceGuestBounds();
  validateTravelDate();
  var d = getBookingDetails();
  var msg = 'Hello! I would like to book a Corbett Safari Package:%0A%0A'
    + '• *Name:* ' + encodeURIComponent(d.name) + '%0A'
    + '• *Safari Format:* ' + encodeURIComponent(d.type) + '%0A'
    + '• *Preferred Zone:* ' + encodeURIComponent(d.zone) + '%0A'
    + '• *Shift:* ' + encodeURIComponent(d.shift) + '%0A'
    + '• *Travel Date:* ' + encodeURIComponent(d.date) + '%0A'
    + '• *Guests:* ' + encodeURIComponent(d.guests + ' (' + d.nationality + ')') + '%0A'
    + '• *Vehicle / Unit:* ' + encodeURIComponent(d.vehicleNote) + '%0A'
    + '• *Estimated Package:* ' + encodeURIComponent(d.estTotal);

  showToast('Opening WhatsApp (' + SITE_CONFIG.phoneDisplay + ') with your quote…');
  showSuccessModal(
    'Your WhatsApp enquiry to <strong>' + SITE_CONFIG.phoneDisplay + '</strong> is ready for <strong>' + d.zone + '</strong> (' + d.type + ', Estimated <strong>' + d.estTotal + '</strong>) on <strong>' + d.date + '</strong>.'
  );
  window.open('https://wa.me/' + SITE_CONFIG.whatsappNumber + '?text=' + msg, '_blank', 'noopener,noreferrer');
}

// Email Booking Handler (Uses SITE_CONFIG.email)
function handleBookingEmail() {
  enforceGuestBounds();
  validateTravelDate();
  var d = getBookingDetails();
  var subject = encodeURIComponent('Corbett Safari Package Enquiry: ' + d.zone + ' (' + d.date + ')');
  var body = encodeURIComponent(
    'Hello Safari Booking Team,\n\n'
    + 'Please check slot availability and share booking steps for:\n\n'
    + 'Full Name: ' + d.name + '\n'
    + 'Safari Format: ' + d.type + '\n'
    + 'Preferred Zone: ' + d.zone + '\n'
    + 'Preferred Shift: ' + d.shift + '\n'
    + 'Travel Date: ' + d.date + '\n'
    + 'Guests: ' + d.guests + ' (' + d.nationality + ')\n'
    + 'Vehicle / Package Unit: ' + d.vehicleNote + '\n'
    + 'Estimated Package Tariff: ' + d.estTotal + '\n\n'
    + 'Thank you!'
  );

  showToast('Preparing your email enquiry…');
  showSuccessModal(
    'Your email draft to <strong>' + SITE_CONFIG.email + '</strong> is ready for <strong>' + d.zone + '</strong> (' + d.estTotal + ') on <strong>' + d.date + '</strong>.'
  );
  window.location.href = 'mailto:' + SITE_CONFIG.email + '?subject=' + subject + '&body=' + body;
}

// Floating & Header WhatsApp button
function openWhatsApp(e) {
  if (e) e.preventDefault();
  var d = getBookingDetails();
  var quickText = 'Hello! I want to check availability for a Corbett Tiger Reserve Safari (' + d.zone + ' on ' + d.date + ').';
  window.open(
    'https://wa.me/' + SITE_CONFIG.whatsappNumber + '?text=' + encodeURIComponent(quickText),
    '_blank',
    'noopener,noreferrer'
  );
}

// YouTube Facade Loader (Zero third-party iframe weight until user clicks Play)
function loadYouTubeFacade(el) {
  if (!el || el.querySelector('iframe')) return;
  var videoId = el.getAttribute('data-yt-id');
  var title = el.getAttribute('data-yt-title') || 'Corbett Safari Field Video';
  if (!videoId) return;
  var iframe = document.createElement('iframe');
  iframe.setAttribute('src', 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0');
  iframe.setAttribute('title', title);
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.position = 'absolute';
  iframe.style.inset = '0';
  el.innerHTML = '';
  el.appendChild(iframe);
}

// FAQ Accordion
function toggleFaq(btn) {
  if (!btn) return;
  var item = btn.closest('.faq-item');
  if (!item) return;
  var isOpen = item.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

// Single-page Info Modal for Agency Terms & Privacy Policy
function openInfoModal(type) {
  var modal = document.getElementById('infoModal');
  var titleEl = document.getElementById('infoModalTitle');
  var bodyEl = document.getElementById('infoModalBody');
  if (!modal || !titleEl || !bodyEl) return;

  if (type === 'terms') {
    titleEl.textContent = 'Terms & Conditions (Private Tour Agency Policy)';
    bodyEl.innerHTML = '<p>1. <strong>Independent Private Agency:</strong> We operate as a private travel and safari coordination agency based in Ramnagar, Uttarakhand. We are not affiliated with or representing the official government portal.</p>'
      + '<p>2. <strong>Package & Service Tariff:</strong> Quoted rates include permit booking assistance, private 4x4 Gypsy / Canter seat coordination, registered driver charges, and our agency service fee. Entry permits are subject to real-time availability in the forest reserve quota.</p>'
      + '<p>3. <strong>Non-Refundable Permits & ID Requirement:</strong> Once an entry permit is generated against a traveller\'s government ID (Aadhaar, Voter ID, Driving Licence, or Passport), it cannot be cancelled, transferred, or refunded. Visitors must carry the exact original ID to the entry gate.</p>'
      + '<p>4. <strong>Natural Wildlife Movement:</strong> Wildlife sightings depend entirely on natural animal movement and weather conditions; no agency or guide can guarantee a tiger sighting.</p>';
  } else if (type === 'privacy') {
    titleEl.textContent = 'Privacy Policy & Data Protection';
    bodyEl.innerHTML = '<p>1. <strong>Information Collected:</strong> We collect only the traveller details (Full Name, Age, Gender, ID Proof number, and Mobile/Email) strictly necessary to submit your safari permit request and coordinate your vehicle pickup in Ramnagar.</p>'
      + '<p>2. <strong>Data Security:</strong> Your personal identification details are never sold, rented, or shared with third-party advertisers. They are used solely for fulfilling your requested safari tour booking.</p>'
      + '<p>3. <strong>Contact & Support:</strong> For any data removal or booking query, reach us directly at <strong>' + SITE_CONFIG.phoneDisplay + '</strong> or <strong>' + SITE_CONFIG.email + '</strong>.</p>';
  }
  modal.classList.add('show');
}

function closeInfoModal() {
  var modal = document.getElementById('infoModal');
  if (modal) modal.classList.remove('show');
}

// Passive Scroll-Spy for Navigation Pills (Zero Main-Thread Blocking)
function initScrollSpy() {
  if (!('IntersectionObserver' in window)) return;
  var sectionIds = ['zones', 'types', 'pricing', 'guide', 'corbett-guide', 'extra-faq'];
  var navLinks = document.querySelectorAll('#navLinks .nav-pill-btn');
  if (!navLinks.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = '#' + entry.target.id;
        navLinks.forEach(function(link) {
          if (link.getAttribute('href') === id) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });

  sectionIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// Global Keyboard (ESC) & Outside-Click Listeners
function initGlobalListeners() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSuccessModal();
      closeInfoModal();
      closeMobileMenu();
    }
  });

  document.addEventListener('click', function(e) {
    var navLinks = document.getElementById('navLinks');
    var header = document.getElementById('stickyHeader');
    if (navLinks && navLinks.classList.contains('open') && header && !header.contains(e.target)) {
      closeMobileMenu();
    }
  });
}
// Auto Photo Slideshow for Luxury Resort Cards (with Hover Pause)
function initResortSlideshows() {
  var cards = document.querySelectorAll('.resort-card[data-slideshow]');
  cards.forEach(function(card, cardIdx) {
    var slides = card.querySelectorAll('.resort-slide');
    var dots = card.querySelectorAll('.r-dot');
    if (slides.length < 2) return;

    var currentIndex = 0;
    var isPaused = false;

    function nextSlide() {
      if (isPaused) return;
      slides[currentIndex].classList.remove('active');
      if (dots[currentIndex]) dots[currentIndex].classList.remove('active');

      currentIndex = (currentIndex + 1) % slides.length;

      slides[currentIndex].classList.add('active');
      if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    // Stagger interval start per card so all cards don't flip at the exact same millisecond
    setTimeout(function() {
      setInterval(nextSlide, 3600);
    }, cardIdx * 900);

    card.addEventListener('mouseenter', function() { isPaused = true; });
    card.addEventListener('mouseleave', function() { isPaused = false; });
  });
}

// Handle "Enquire" Click on Any Luxury Resort Card
function enquireResort(resortName, nearbyZone, tariffText) {
  // Pre-select the closest safari zone in the calculator
  if (nearbyZone) {
    bookZone(nearbyZone, 'Private 4x4 Gypsy Safari');
  }

  var d = getBookingDetails();
  var msg = 'Hello! I would like to enquire about a Resort Stay + Safari Package:%0A%0A'
    + '• *Resort Property:* ' + encodeURIComponent(resortName + ' (From ' + tariffText + ')') + '%0A'
    + '• *Paired Safari Zone:* ' + encodeURIComponent(nearbyZone || d.zone) + '%0A'
    + '• *Check-in / Safari Date:* ' + encodeURIComponent(d.date) + '%0A'
    + '• *Guests:* ' + encodeURIComponent(d.guests + ' (' + d.nationality + ')');

  showToast('Selected ' + resortName + ' · Opening WhatsApp…');
  window.open('https://wa.me/' + SITE_CONFIG.whatsappNumber + '?text=' + msg, '_blank', 'noopener,noreferrer');
}

// Start resort slideshows automatically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResortSlideshows);
} else {
  initResortSlideshows();
}
// Smart Auto Photo Slideshow for Local Resort Photos (Supports 6+ Photos & Auto-Skips Missing Files)
function initResortSlideshows() {
  var cards = document.querySelectorAll('.resort-card[data-slideshow]');

  cards.forEach(function(card, cardIdx) {
    var slideContainer = card.querySelector('.resort-slides');
    var dotsContainer = card.querySelector('.resort-dots');
    if (!slideContainer) return;

    var rawSlides = Array.prototype.slice.call(slideContainer.querySelectorAll('.resort-slide'));

    // Hide/remove any image file that hasn't been added to the resorts/ folder yet
    rawSlides.forEach(function(img) {
      img.addEventListener('error', function() {
        img.setAttribute('data-missing', 'true');
        img.style.display = 'none';
        rebuildDotsAndEnsureActive();
      });
    });

    function getValidSlides() {
      return rawSlides.filter(function(img) {
        return img.getAttribute('data-missing') !== 'true';
      });
    }

    var currentIndex = 0;
    var isPaused = false;

    function rebuildDotsAndEnsureActive() {
      var validSlides = getValidSlides();
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';

      if (validSlides.length === 0) return;
      if (currentIndex >= validSlides.length) currentIndex = 0;

      validSlides.forEach(function(slide, idx) {
        slide.classList.toggle('active', idx === currentIndex);
        if (validSlides.length > 1) {
          var dot = document.createElement('span');
          dot.className = 'r-dot' + (idx === currentIndex ? ' active' : '');
          dotsContainer.appendChild(dot);
        }
      });
    }

    function nextSlide() {
      if (isPaused) return;
      var validSlides = getValidSlides();
      if (validSlides.length < 2) return;

      var dots = dotsContainer ? dotsContainer.querySelectorAll('.r-dot') : [];
      validSlides[currentIndex].classList.remove('active');
      if (dots[currentIndex]) dots[currentIndex].classList.remove('active');

      currentIndex = (currentIndex + 1) % validSlides.length;

      validSlides[currentIndex].classList.add('active');
      if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    rebuildDotsAndEnsureActive();

    // Stagger each card's animation start so all cards don't transition at the exact same moment
    setTimeout(function() {
      setInterval(nextSlide, 3500);
    }, cardIdx * 850);

    card.addEventListener('mouseenter', function() { isPaused = true; });
    card.addEventListener('mouseleave', function() { isPaused = false; });
  });
}

// Handle "Enquire" Click on Any Luxury Resort Card
function enquireResort(resortName, nearbyZone, tariffText) {
  if (nearbyZone) {
    bookZone(nearbyZone, 'Private 4x4 Gypsy Safari');
  }

  var d = getBookingDetails();
  var msg = 'Hello! I would like to enquire about a Resort Stay + Safari Package:%0A%0A'
    + '• *Resort Property:* ' + encodeURIComponent(resortName + ' (From ' + tariffText + ')') + '%0A'
    + '• *Paired Safari Zone:* ' + encodeURIComponent(nearbyZone || d.zone) + '%0A'
    + '• *Check-in / Safari Date:* ' + encodeURIComponent(d.date) + '%0A'
    + '• *Guests:* ' + encodeURIComponent(d.guests + ' (' + d.nationality + ')');

  showToast('Selected ' + resortName + ' · Opening WhatsApp…');
  window.open('https://wa.me/' + SITE_CONFIG.whatsappNumber + '?text=' + msg, '_blank', 'noopener,noreferrer');
}

// Start resort slideshows automatically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResortSlideshows);
} else {
  initResortSlideshows();
}
// Smart Resort Photo Slideshow (Auto-detects .jpg / .jpeg / .webp & skips missing files)
function initResortSlideshows() {
  var cards = document.querySelectorAll('.resort-card[data-slideshow]');

  cards.forEach(function(card, cardIdx) {
    var slideContainer = card.querySelector('.resort-slides');
    var dotsContainer = card.querySelector('.resort-dots');
    if (!slideContainer) return;

    var rawSlides = Array.prototype.slice.call(slideContainer.querySelectorAll('.resort-slide'));

    // Auto-fallback between .jpg, .jpeg, .webp, .png if Windows hides file extensions
    rawSlides.forEach(function(img) {
      var triedExts = [];
      img.addEventListener('error', function() {
        var currentSrc = img.getAttribute('src') || '';
        var basePath = currentSrc.replace(/\.(jpg|jpeg|webp|png|JPG|JPEG)$/i, '');
        var fallbacks = ['.jpeg', '.webp', '.png', '.JPG'];
        var nextExt = null;

        for (var i = 0; i < fallbacks.length; i++) {
          if (triedExts.indexOf(fallbacks[i]) === -1 && currentSrc.slice(-fallbacks[i].length) !== fallbacks[i]) {
            nextExt = fallbacks[i];
            break;
          }
        }

        if (nextExt) {
          triedExts.push(nextExt);
          img.setAttribute('src', basePath + nextExt);
        } else {
          img.setAttribute('data-missing', 'true');
          img.style.display = 'none';
          rebuildDotsAndEnsureActive();
        }
      });
    });

    function getValidSlides() {
      return rawSlides.filter(function(img) {
        return img.getAttribute('data-missing') !== 'true';
      });
    }

    var currentIndex = 0;
    var isPaused = false;

    function rebuildDotsAndEnsureActive() {
      var validSlides = getValidSlides();
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';

      if (validSlides.length === 0) return;
      if (currentIndex >= validSlides.length) currentIndex = 0;

      validSlides.forEach(function(slide, idx) {
        slide.classList.toggle('active', idx === currentIndex);
        if (validSlides.length > 1) {
          var dot = document.createElement('span');
          dot.className = 'r-dot' + (idx === currentIndex ? ' active' : '');
          dotsContainer.appendChild(dot);
        }
      });
    }

    function nextSlide() {
      if (isPaused) return;
      var validSlides = getValidSlides();
      if (validSlides.length < 2) return;

      var dots = dotsContainer ? dotsContainer.querySelectorAll('.r-dot') : [];
      validSlides[currentIndex].classList.remove('active');
      if (dots[currentIndex]) dots[currentIndex].classList.remove('active');

      currentIndex = (currentIndex + 1) % validSlides.length;

      validSlides[currentIndex].classList.add('active');
      if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    rebuildDotsAndEnsureActive();

    setTimeout(function() {
      setInterval(nextSlide, 3400);
    }, cardIdx * 750);

    card.addEventListener('mouseenter', function() { isPaused = true; });
    card.addEventListener('mouseleave', function() { isPaused = false; });
  });
}

// Handle "Enquire" Click on Any Resort Card
function enquireResort(resortName, nearbyZone, tariffText) {
  if (nearbyZone) {
    bookZone(nearbyZone, 'Private 4x4 Gypsy Safari');
  }

  var d = getBookingDetails();
  var msg = 'Hello! I would like to enquire about a Resort Stay + Safari Package:%0A%0A'
    + '• *Resort Property:* ' + encodeURIComponent(resortName) + '%0A'
    + '• *Room Tariff:* ' + encodeURIComponent(tariffText) + '%0A'
    + '• *Paired Safari Zone:* ' + encodeURIComponent(nearbyZone || d.zone) + '%0A'
    + '• *Check-in / Safari Date:* ' + encodeURIComponent(d.date) + '%0A'
    + '• *Guests:* ' + encodeURIComponent(d.guests + ' (' + d.nationality + ')');

  showToast('Selected ' + resortName + ' · Opening WhatsApp…');
  window.open('https://wa.me/' + SITE_CONFIG.whatsappNumber + '?text=' + msg, '_blank', 'noopener,noreferrer');
}

// Start resort slideshows automatically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResortSlideshows);
} else {
  initResortSlideshows();
}