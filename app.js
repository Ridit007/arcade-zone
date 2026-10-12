// Arcade Zone - Main Application JavaScript
const WHATSAPP_NUMBER = '919005562077';

// ⚠️ PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL BELOW
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycby2ez4D2PyATKyqTOGz_WOZ-1EHSMfE8gI5HY1Iw8PhtrdkkMq4TyufuWt5UgoU987u/exec';
// Example: 'https://script.google.com/macros/s/AKfycbx.../exec'

// Booking state
let booking = { packageId: '', package: '', basePrice: 0, price: 0, duration: '', durationValue: 1, date: '', time: '', players: 1, name: '', phone: '', email: '', notes: '', screenshotBase64: '', screenshotFilename: '' };
let currentStep = 1;
let slotData = null; // cached slot availability

const PC_INVENTORY = 4; // 4 PC stations

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
      'sim': { el: 2, name: 'Driving Simulator', price: 150, id: 'sim' },
      'pc': { el: 3, name: 'PC Gaming Station', price: 120, id: 'pc' }
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
  booking = { packageId: '', package: '', basePrice: 0, price: 0, duration: '', durationValue: 1, date: '', time: '', players: 1, name: '', phone: '', email: '', notes: '', screenshotBase64: '', screenshotFilename: '' };
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
  // Clear screenshot preview
  const previewEl = document.getElementById('screenshotPreview');
  if (previewEl) {
    previewEl.style.display = 'none';
    previewEl.innerHTML = '';
  }
  const nextBtn = document.getElementById('paymentNextBtn');
  if (nextBtn) nextBtn.disabled = true;
}

// Close on overlay click
document.getElementById('bookingOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeBooking();
});

// --- PAYMENT SCREENSHOT HANDLING ---
document.getElementById('paymentScreenshot').addEventListener('change', handleScreenshotUpload);

function handleScreenshotUpload(e) {
  const file = e.target.files[0];
  const nextBtn = document.getElementById('paymentNextBtn');
  const previewEl = document.getElementById('screenshotPreview');

  if (!file) {
    booking.screenshotBase64 = '';
    booking.screenshotFilename = '';
    nextBtn.disabled = true;
    previewEl.style.display = 'none';
    previewEl.innerHTML = '';
    return;
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    alert('Please upload a valid image file (JPG, JPEG, or PNG).');
    e.target.value = '';
    booking.screenshotBase64 = '';
    booking.screenshotFilename = '';
    nextBtn.disabled = true;
    previewEl.style.display = 'none';
    previewEl.innerHTML = '';
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB.');
    e.target.value = '';
    booking.screenshotBase64 = '';
    booking.screenshotFilename = '';
    nextBtn.disabled = true;
    previewEl.style.display = 'none';
    previewEl.innerHTML = '';
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = function(event) {
    booking.screenshotBase64 = event.target.result.split(',')[1]; // Remove data:image/... prefix
    booking.screenshotFilename = file.name;
    nextBtn.disabled = false;
    
    // Show preview
    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">
        <img src="${event.target.result}" alt="Payment screenshot preview" style="width:60px;height:60px;object-fit:cover;border-radius:6px">
        <div style="flex:1">
          <div style="font-weight:500">${file.name}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${(file.size/1024).toFixed(1)} KB</div>
        </div>
        <button type="button" onclick="clearScreenshot()" class="btn-secondary" style="padding:6px 12px;font-size:0.8rem">Remove</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function clearScreenshot() {
  const fileInput = document.getElementById('paymentScreenshot');
  const previewEl = document.getElementById('screenshotPreview');
  const nextBtn = document.getElementById('paymentNextBtn');
  
  fileInput.value = '';
  booking.screenshotBase64 = '';
  booking.screenshotFilename = '';
  nextBtn.disabled = true;
  previewEl.style.display = 'none';
  previewEl.innerHTML = '';
}

function copyUPI() {
  const upiId = document.getElementById('upiId').textContent;
  navigator.clipboard.writeText(upiId).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = 'var(--neon-green)';
    btn.style.color = 'var(--bg)';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1500);
  });
}

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
  const consoleLimits = { 'ps5': 2, 'ps4': 1, 'sim': 2, 'pc': 1 };
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
  const stepEl = document.getElementById(step === 6 ? 'bookStepSuccess' : `bookStep${step}`);
  if (stepEl) stepEl.classList.add('active');

  // Update indicators (5 steps now)
  for (let i = 1; i <= 5; i++) {
    const ind = document.getElementById(`step${i}ind`);
    ind.className = 'step-indicator';
    if (i < step) ind.classList.add('completed');
    else if (i === step) ind.classList.add('active');
  }

  // Fetch slots when entering Step 2
  if (step === 2 && booking.package) {
    fetchSlots();
  }

  // Update payment amount when entering Payment step
  if (step === 4) {
    const amountEl = document.getElementById('paymentAmount');
    if (amountEl) amountEl.textContent = `₹${booking.price}`;
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

  // Cache busting with timestamp
  const cacheBust = Date.now();
  const url = `${SHEET_API_URL}?action=getSlots&date=${date}&console=${encodeURIComponent(booking.package)}&_=${cacheBust}`;

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
      // Update last refresh time
      const refreshTimeEl = document.getElementById('slotRefreshTime');
      if (refreshTimeEl) {
        const now = new Date();
        refreshTimeEl.textContent = `Last updated: ${now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
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
  }
  if (step === 5) {
    // Validate screenshot is uploaded
    if (!booking.screenshotBase64) {
      alert('Please upload a payment screenshot before proceeding.');
      return;
    }
    renderSummary();
  }
  currentStep = step;
  showStep(step);
}

function prevStep(step) {
  // Clear screenshot when going back from payment step
  if (currentStep === 4 && step === 3) {
    clearScreenshot();
  }
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
  const confirmBtn = document.querySelector('#bookStep5 .btn-primary');
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
        totalPrice: booking.price,
        screenshotBase64: booking.screenshotBase64,
        screenshotFilename: booking.screenshotFilename
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
          showStep(6);
          // Update booking reference display
          const refCodeEl = document.getElementById('bookingRefCode');
          if (refCodeEl) refCodeEl.textContent = result.bookingId;
        } else {
          alert(result.error || 'Booking failed. Please try again.');
        }
      })
      .catch(() => {
        // API failed — still send WhatsApp as fallback
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        // Generate local booking ID for display
        booking.bookingId = 'AZ-' + Date.now().toString(36).toUpperCase();
        sendWhatsApp();
        showStep(6);
        const refCodeEl = document.getElementById('bookingRefCode');
        if (refCodeEl) refCodeEl.textContent = booking.bookingId;
      });
  } else {
    // No API — WhatsApp only mode
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
    // Generate local booking ID for display
    booking.bookingId = 'AZ-' + Date.now().toString(36).toUpperCase();
    sendWhatsApp();
    showStep(6);
    const refCodeEl = document.getElementById('bookingRefCode');
    if (refCodeEl) refCodeEl.textContent = booking.bookingId;
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

// --- BOOKING REFERENCE FUNCTIONS ---
function copyBookingRef() {
  const code = booking.bookingId;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    btn.style.background = 'var(--neon-green)';
    btn.style.color = 'var(--bg)';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  });
}

function downloadBookingRef() {
  const code = booking.bookingId;
  if (!code) return;
  
  // Create a canvas with the booking reference as an image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const padding = 40;
  const fontSize = 48;
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  const textWidth = ctx.measureText(code).width;
  canvas.width = textWidth + padding * 2;
  canvas.height = 120;
  
  // Background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0a0d12');
  gradient.addColorStop(1, '#12161e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Border
  ctx.strokeStyle = '#25D366';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Label
  ctx.fillStyle = '#25D366';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOOKING REFERENCE', canvas.width / 2, 35);
  
  // Code
  ctx.fillStyle = '#25D366';
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  ctx.fillText(code, canvas.width / 2, 85);
  
  // Footer
  ctx.fillStyle = '#7c8898';
  ctx.font = '12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Arcade Zone • Varanasi', canvas.width / 2, 105);
  
  // Download
  const link = document.createElement('a');
  link.download = `ArcadeZone-Booking-${code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  // Feedback
  const btn = event.target.closest('button');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
  btn.style.background = '#25D366';
  btn.style.color = 'var(--bg)';
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.background = '';
    btn.style.color = '';
  }, 2000);
}

// --- STATUS CHECK MODAL ---
function openStatusCheck() {
  const overlay = document.getElementById('statusCheckOverlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Reset to step 1
  document.getElementById('statusStep1').style.display = 'block';
  document.getElementById('statusStepResult').style.display = 'none';
  document.getElementById('statusBookingId').value = '';
  document.getElementById('statusError').style.display = 'none';
  document.getElementById('statusBookingId').focus();
}

function closeStatusCheck() {
  document.getElementById('statusCheckOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Close on overlay click
document.getElementById('statusCheckOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeStatusCheck();
});

// Enter key to submit
document.getElementById('statusBookingId').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkBookingStatus();
});

async function checkBookingStatus() {
  const bookingId = document.getElementById('statusBookingId').value.trim().toUpperCase();
  const errorEl = document.getElementById('statusError');
  const btnText = document.getElementById('statusCheckBtnText');
  const spinner = document.getElementById('statusCheckSpinner');
  const btn = document.querySelector('#statusStep1 .btn-primary');

  if (!bookingId) {
    errorEl.textContent = 'Please enter your booking reference code';
    errorEl.style.display = 'block';
    return;
  }

  // Validate format (AZ-XXXXXX)
  if (!/^AZ-[A-Z0-9]+$/.test(bookingId)) {
    errorEl.textContent = 'Invalid format. Use format: AZ-XXXXXX';
    errorEl.style.display = 'block';
    return;
  }

  // Loading state
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';
  errorEl.style.display = 'none';

  try {
    if (!SHEET_API_URL) {
      throw new Error('API not configured');
    }
    const url = `${SHEET_API_URL}?action=getBookingById&bookingId=${encodeURIComponent(bookingId)}`;
    const res = await fetch(url);
    const data = await res.json();

    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';

    if (data.error) {
      errorEl.textContent = data.error;
      errorEl.style.display = 'block';
      return;
    }

    if (!data.booking) {
      errorEl.textContent = 'Booking not found. Please check your code.';
      errorEl.style.display = 'block';
      return;
    }

    // Show result
    showStatusResult(data.booking);

  } catch (err) {
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    errorEl.textContent = 'Could not check status. Please try again.';
    errorEl.style.display = 'block';
    console.error('Status check error:', err);
  }
}

function showStatusResult(booking) {
  // Hide step 1, show result
  document.getElementById('statusStep1').style.display = 'none';
  document.getElementById('statusStepResult').style.display = 'block';

  const status = booking['Status'] || 'Pending';
  const statusConfig = {
    'Pending': { icon: '⏳', color: '#ffc24b', title: 'Pending Approval', subtitle: 'Your booking is under review. The owner will verify your payment soon.' },
    'Confirmed': { icon: '✅', color: '#3ed598', title: 'Confirmed!', subtitle: 'Your booking is confirmed. See you at Arcade Zone!' },
    'Rejected': { icon: '❌', color: '#ff5c7a', title: 'Rejected', subtitle: 'Unfortunately, your booking could not be confirmed. Please contact us.' },
    'Cancelled': { icon: '🚫', color: '#7c8898', title: 'Cancelled', subtitle: 'This booking has been cancelled.' }
  };

  const config = statusConfig[status] || statusConfig['Pending'];

  // Update UI
  document.getElementById('statusIcon').innerHTML = config.icon;
  document.getElementById('statusIcon').style.background = `${config.color}20`;
  document.getElementById('statusIcon').style.color = config.color;
  document.getElementById('statusTitle').textContent = config.title;
  document.getElementById('statusTitle').style.color = config.color;
  document.getElementById('statusSubtitle').textContent = config.subtitle;

  // Fill details
  document.getElementById('resultBookingId').textContent = booking['Booking ID'] || '—';
  document.getElementById('resultPackage').textContent = booking['Console'] || '—';
  
  const date = booking['Date'] || '—';
  const time = booking['Time'] || '—';
  document.getElementById('resultDateTime').textContent = `${date} at ${time}`;
  
  document.getElementById('resultPlayers').textContent = booking['Players'] || '1';
  document.getElementById('resultAmount').textContent = `₹${booking['Total Price'] || '—'}`;

  // Show details and copy button for confirmed/pending
  document.getElementById('statusDetails').style.display = 'block';
  document.getElementById('copyResultBtn').style.display = status === 'Confirmed' || status === 'Pending' ? 'flex' : 'none';
  
  // Store booking ID for copy function
  window.lastCheckedBookingId = booking['Booking ID'];
}

function copyResultBookingId() {
  const code = window.lastCheckedBookingId;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copyResultBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    btn.style.background = 'var(--neon-green)';
    btn.style.color = 'var(--bg)';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  });
}
