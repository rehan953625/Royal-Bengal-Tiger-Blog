/* ==========================================================================
   Royal Bengal Tiger India — booking.js
   Booking-form logic for Corbett-tiger-safari-booking-india.html only.
   Loaded with `defer`. Behaviour is unchanged from the previous inline
   version — only its location and a few guard clauses differ.
   ========================================================================== */

function getBookingDetails() {
  var guestName = document.getElementById('guestname').value.trim();
  var type  = document.getElementById('type').value;
  var zone  = document.getElementById('zone').value;
  var shift = document.getElementById('shift').value;
  var date  = document.getElementById('date').value;
  var pax   = document.getElementById('guests').value;

  if (!date || !pax) {
    alert('Please select a travel date and enter the number of guests before checking availability.');
    return null;
  }
  return { guestName: guestName, type: type, zone: zone, shift: shift, date: date, pax: pax };
}

function handleBookingWhatsApp() {
  var d = getBookingDetails();
  if (!d) return;
  var phone = '919536256640';
  var lines = [
    '*New Safari Booking Enquiry 2026-27*',
    d.guestName ? 'Name: ' + d.guestName : null,
    'Safari Type: ' + d.type,
    'Zone: ' + d.zone,
    'Shift: ' + d.shift,
    'Travel Date: ' + d.date,
    'No. of Guests: ' + d.pax
  ].filter(Boolean);
  var msg = encodeURIComponent(lines.join('\n'));
  showSuccessModal('whatsapp');
  setTimeout(function () {
    window.open('https://wa.me/' + phone + '?text=' + msg, '_blank');
  }, 900);
}

function handleBookingEmail() {
  var d = getBookingDetails();
  if (!d) return;
  var subject = encodeURIComponent('New Safari Booking Enquiry 2026-27');
  var greeting = d.guestName
    ? 'Hello Royal Bengal Tiger India,\n\nMy name is ' + d.guestName + ", and I'd like to enquire about a Jim Corbett safari with the following details:\n\n"
    : "Hello Royal Bengal Tiger India,\n\nI'd like to enquire about a Jim Corbett safari with the following details:\n\n";
  var details = [
    '  Safari Type      :  ' + d.type,
    '  Safari Zone      :  ' + d.zone,
    '  Safari Shift     :  ' + d.shift,
    '  Travel Date      :  ' + d.date,
    '  No. of Guests    :  ' + d.pax,
    '  Contact/WhatsApp Number (optional):  '
  ].join('\n');
  var closing = '\n\nPlease confirm availability and let me know the next steps.\n\nThank you!';
  var body = encodeURIComponent(greeting + details + closing);
  showSuccessModal('email');
  setTimeout(function () {
    window.location.href = 'mailto:info@royalbengaltigerindia.com?subject=' + subject + '&body=' + body;
  }, 900);
}

/* Zone card click → jump to the booking form with that zone pre-filled */
function bookZone(zoneValue, typeValue) {
  var zoneField = document.getElementById('zone');
  var typeField = document.getElementById('type');
  if (zoneField) zoneField.value = zoneValue;
  if (typeField) typeField.value = typeValue;

  var bookingSection = document.getElementById('booking');
  if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

  var card = document.querySelector('.booking-card');
  if (card) {
    card.classList.add('booking-highlight');
    setTimeout(function () { card.classList.remove('booking-highlight'); }, 1600);
  }
  [zoneField, typeField].forEach(function (field) {
    var group = field && field.closest('.field-group');
    if (!group) return;
    group.classList.add('field-filled');
    setTimeout(function () { group.classList.remove('field-filled'); }, 1600);
  });
}

/* Toast */
function showToast(message) {
  var t = document.getElementById('toast');
  if (!t) return;
  if (message) document.getElementById('toast-text').textContent = message;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3500);
}

function showSuccessModal(channel) {
  var text = channel === 'email'
    ? "We've opened your email app with all your safari details filled in — just hit Send. Once we receive it, our team typically replies within a few hours."
    : "We've opened WhatsApp with all your safari details filled in — just hit Send. Our team typically replies within a few hours.";
  var el = document.getElementById('successModalText');
  if (el) el.textContent = text;
  var modal = document.getElementById('successModal');
  if (modal) modal.classList.add('show');
}

function closeSuccessModal() {
  var modal = document.getElementById('successModal');
  if (modal) modal.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function () {
  var dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
  }
});
