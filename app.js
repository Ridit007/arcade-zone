// Arcade Zone - Main Application JavaScript
const WHATSAPP_NUMBER = '918851822791';

// ⚠️ PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL BELOW
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyprErQIJCi9oF5Oh1ZsIQdG8a2RQa73yzKy_R0ninsZwDjMnaTINpYIE0Xy_kT7ybp/exec';
// Example: 'https://script.google.com/macros/s/AKfycbx.../exec'

// Booking state
let booking = { packageId: '', package: '', basePrice: 0, price: 0, duration: '', durationValue: 1, date: '', time: '', players: 1, name: '', phone: '', email: '', notes: '' };
let currentStep = 1;
let slotData = null; // cached slot availability

// --- NAVBAR ---
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

function toggleNav() {
  document.getElementById('navLinks').classList.toggle('active');
}

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('active');
  });
});

// --- SCROLL ANIMATIONS ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

// --- SET MIN DATE ---
const dateInput = document.getElementById('bookDate');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
  dateInput.value = today;

  // Fetch slots when date changes
  dateInput.addEventListener('change', () => {
    if (booking.package) fetchSlots();
  });
}

// --- BOOKING SYSTEM ---
function openBooking(preselect) {
  const overlay = document.getElementById('bookingOverlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  currentStep = 1;
  slotData = null;
  showStep(1);

  // Preselect package if specified
  if (preselect) {
    const map = {
      'ps5': { el: 0, name: 'PlayStation 5', price: 150, id: 'ps5' },
      'ps4': { el: 1, name: 'PlayStation 4', price: 80, id: 'ps4' },
      'sim': { el: 2, name: 'Driving Simulator', price: 150, id: 'sim' }
    };
    const pkg = map[preselect];
    if (pkg) {
      const options = document.querySelectorAll('.package-option');
      selectPackage(options[pkg.el], pkg.name, pkg.price, pkg.id);
    }
  }
}

function closeBooking() {
  document.getElementById('bookingOverlay').classList.remove('active');
  document.body.style.overflow = '';
  // Reset
  booking = { packageId: '', package: '', basePrice: 0, price: 0, duration: '', durationValue: 1, date: '', time: '', players: 1, name: '', phone: '', email: '', notes: '' };
  currentStep = 1;
  slotData = null;
  showStep(1);
  document.querySelectorAll('.package-option').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('.booking-step input, .booking-step select').forEach(el => {
    if (el.type !== 'radio' && el.type !== 'date') el.value = '';
  });
  // Reset time slot styles
  const timeSelect = document.getElementById('bookTime');
  if (timeSelect) {
    Array.from(timeSelect.options).forEach(opt => {
      opt.disabled = false;
      opt.textContent = opt.textContent.replace(/ — .+$/, '');
    });
  }
}

// Close on overlay click
document.getElementById('bookingOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeBooking();
});

function selectPackage(el, name, price, id) {
  document.querySelectorAll('.package-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  booking.package = name;
  booking.basePrice = parseInt(price);
  booking.packageId = id;
  updateDurationOptions();
}

function updateDurationOptions() {
  const durSelect = document.getElementById('bookDuration');
  if (!durSelect) return;
  durSelect.innerHTML = '';

  if (booking.packageId === 'sim') {
    durSelect.innerHTML = `
      <option value="1">30 Minutes</option>
      <option value="2">1 Hour</option>
      <option value="3">1.5 Hours</option>
      <option value="4">2 Hours</option>
    `;
  } else {
    durSelect.innerHTML = `
      <option value="1">1 Hour</option>
      <option value="2">2 Hours</option>
      <option value="3">3 Hours</option>
      <option value="4">4 Hours</option>
    `;
  }
}

function updatePlayersDropdown(time) {
  const playersSelect = document.getElementById('bookPlayers');
  if (!playersSelect) return;

  let maxAllowed = 4; // Default max
  // Console strict capacity limits
  const consoleLimits = { 'ps5': 2, 'ps4': 1, 'sim': 2 };
  maxAllowed = consoleLimits[booking.packageId] || 4;

  if (slotData && time && slotData[time]) {
    const remaining = slotData[time].total - slotData[time].booked;
    maxAllowed = Math.min(maxAllowed, remaining);
  }

  if (maxAllowed < 1) maxAllowed = 1; // Fallback if 0

  let optionsHTML = '';
  for (let i = 1; i <= maxAllowed; i++) {
    optionsHTML += `<option value="${i}">${i} Player${i > 1 ? 's' : ''}</option>`;
  }

  // Maintain current selection if possible, otherwise reset to 1
  const currentVal = parseInt(playersSelect.value) || 1;
  playersSelect.innerHTML = optionsHTML;
  if (currentVal <= maxAllowed) {
    playersSelect.value = currentVal;
    booking.players = currentVal;
  } else {
    playersSelect.value = 1;
    booking.players = 1;
  }
}

document.getElementById('bookTime').addEventListener('change', (e) => {
  updatePlayersDropdown(e.target.value);
});

function showStep(step) {
  document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
  const stepEl = document.getElementById(step === 5 ? 'bookStepSuccess' : `bookStep${step}`);
  if (stepEl) stepEl.classList.add('active');

  // Update indicators
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`step${i}ind`);
    ind.className = 'step-indicator';
    if (i < step) ind.classList.add('completed');
    else if (i === step) ind.classList.add('active');
  }

  // Fetch slots when entering Step 2
  if (step === 2 && booking.package) {
    fetchSlots();
  }
}

// =============================================
// GOOGLE SHEETS SLOT MANAGEMENT
// =============================================

function fetchSlots() {
  if (!SHEET_API_URL) {
    // No API configured — skip slot checking (WhatsApp-only mode)
    return;
  }

  const date = document.getElementById('bookDate').value;
  if (!date || !booking.package) return;

  // Show loading
  const timeSelect = document.getElementById('bookTime');
  const slotStatus = document.getElementById('slotStatus');
  if (slotStatus) {
    slotStatus.className = 'slot-status loading';
    slotStatus.textContent = 'Checking availability...';
  }

  const url = `${SHEET_API_URL}?action=getSlots&date=${date}&console=${encodeURIComponent(booking.package)}`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        if (slotStatus) {
          slotStatus.className = 'slot-status error';
          slotStatus.textContent = 'Could not check slots';
        }
        return;
      }

      slotData = data.slots;
      updateTimeSlotUI();

      if (slotStatus) {
        slotStatus.className = 'slot-status success';
        slotStatus.textContent = `Showing availability for ${booking.package}`;
      }
    })
    .catch(() => {
      // Offline fallback — allow booking anyway
      if (slotStatus) {
        slotStatus.className = 'slot-status';
        slotStatus.textContent = '';
      }
      slotData = null;
    });
}

function updateTimeSlotUI() {
  const timeSelect = document.getElementById('bookTime');
  if (!timeSelect || !slotData) return;

  Array.from(timeSelect.options).forEach(opt => {
    const time = opt.value;
    if (!time) return; // skip placeholder

    const slot = slotData[time];
    if (slot) {
      const remaining = slot.total - slot.booked;
      if (remaining > 0) {
        opt.disabled = false;
        opt.textContent = `${time} — ${remaining} slot${remaining > 1 ? 's' : ''} left`;
        opt.className = '';
      } else {
        opt.disabled = true;
        opt.textContent = `${time} — FULL`;
        opt.className = 'slot-full';
      }
    }
  });

  // Also update players dropdown for the currently selected time (if any)
  updatePlayersDropdown(timeSelect.value);
}

// =============================================
// STEP NAVIGATION
// =============================================

function nextStep(step) {
  // Validate current step
  if (step === 2 && !booking.package) {
    alert('Please select a gaming package.');
    return;
  }
  if (step === 3) {
    booking.date = document.getElementById('bookDate').value;
    booking.time = document.getElementById('bookTime').value;
    booking.players = parseInt(document.getElementById('bookPlayers').value);

    const durSelect = document.getElementById('bookDuration');
    booking.durationValue = parseInt(durSelect.value);
    booking.duration = durSelect.options[durSelect.selectedIndex].text;

    // Calculate final price: basePrice * duration multiplier * number of players
    booking.price = booking.basePrice * booking.durationValue * booking.players;

    if (!booking.date || !booking.time) {
      alert('Please select date and time.');
      return;
    }

    // Check if slot is full (if we have data)
    if (slotData && slotData[booking.time] && !slotData[booking.time].available) {
      alert('Sorry! This time slot is fully booked. Please choose a different time.');
      return;
    }
  }
  if (step === 4) {
    booking.name = document.getElementById('bookName').value.trim();
    booking.phone = document.getElementById('bookPhone').value.trim();
    booking.email = document.getElementById('bookEmail').value.trim();
    booking.notes = document.getElementById('bookNotes').value.trim();
    if (!booking.name || !booking.phone) {
      alert('Please enter your name and phone number.');
      return;
    }
    if (booking.phone.length < 10) {
      alert('Please enter a valid phone number.');
      return;
    }
    renderSummary();
  }
  currentStep = step;
  showStep(step);
}

function prevStep(step) {
  currentStep = step;
  showStep(step);
}

function renderSummary() {
  const dateFormatted = new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('bookingSummary').innerHTML = `
    <div class="summary-row"><span class="label">Package</span><span class="value">${booking.package}</span></div>
    <div class="summary-row"><span class="label">Duration</span><span class="value">${booking.duration}</span></div>
    <div class="summary-row"><span class="label">Date</span><span class="value">${dateFormatted}</span></div>
    <div class="summary-row"><span class="label">Time</span><span class="value">${booking.time}</span></div>
    <div class="summary-row"><span class="label">Players</span><span class="value">${booking.players}</span></div>
    <div class="summary-row"><span class="label">Name</span><span class="value">${booking.name}</span></div>
    <div class="summary-row"><span class="label">Phone</span><span class="value">${booking.phone}</span></div>
    ${booking.email ? `<div class="summary-row"><span class="label">Email</span><span class="value">${booking.email}</span></div>` : ''}
    ${booking.notes ? `<div class="summary-row"><span class="label">Notes</span><span class="value">${booking.notes}</span></div>` : ''}
    <div class="summary-total"><span class="label">Total Amount</span><span class="value">₹${booking.price}</span></div>
  `;
}

function submitBooking() {
  const confirmBtn = document.querySelector('#bookStep4 .btn-primary');
  const originalText = confirmBtn.innerHTML;

  // Show loading state
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="btn-spinner"></span> Confirming...';

  // If API is configured, save to Google Sheet first
  if (SHEET_API_URL) {
    fetch(SHEET_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'book',
        console: booking.package,
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        players: booking.players,
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        notes: booking.notes,
        totalPrice: booking.price
      })
    })
      .then(r => r.json())
      .then(result => {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;

        if (result.success) {
          // Save booking ID for the success message
          booking.bookingId = result.bookingId;
          sendWhatsApp();
          showStep(5);
          // Update success message with booking ID
          const successEl = document.querySelector('.booking-success p');
          if (successEl && result.bookingId) {
            successEl.innerHTML = `Your booking <strong>${result.bookingId}</strong> has been saved and sent via WhatsApp.`;
          }
        } else {
          alert(result.error || 'Booking failed. Please try again.');
        }
      })
      .catch(() => {
        // API failed — still send WhatsApp as fallback
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        sendWhatsApp();
        showStep(5);
      });
  } else {
    // No API — WhatsApp only mode
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
    sendWhatsApp();
    showStep(5);
  }
}

function sendWhatsApp() {
  const dateFormatted = new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const message = `🎮 *NEW BOOKING - ARCADE ZONE*\n\n` +
    `📋 *Package:* ${booking.package}\n` +
    `⏱ *Duration:* ${booking.duration}\n` +
    `📅 *Date:* ${dateFormatted}\n` +
    `🕐 *Time:* ${booking.time}\n` +
    `👥 *Players:* ${booking.players}\n` +
    `💰 *Total:* ₹${booking.price}\n` +
    `${booking.bookingId ? `🆔 *Booking ID:* ${booking.bookingId}\n` : ''}\n` +
    `👤 *Customer Details:*\n` +
    `• Name: ${booking.name}\n` +
    `• Phone: ${booking.phone}\n` +
    `${booking.email ? `• Email: ${booking.email}\n` : ''}` +
    `${booking.notes ? `\n📝 *Notes:* ${booking.notes}\n` : ''}\n` +
    `---\nBooked via ArcadeZone.com`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  window.open(whatsappURL, '_blank');
}

// --- SMOOTH SCROLL ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// --- KEYBOARD: ESC TO CLOSE ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeBooking();
});
