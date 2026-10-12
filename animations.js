// ============ CUSTOM CURSOR ============
(function(){
  var c = document.getElementById('customCursor');
  var t = document.getElementById('customTrail');
  if (!c || !t) return;

  document.addEventListener('mousemove', function(e) {
    c.style.left = e.clientX + 'px';
    c.style.top = e.clientY + 'px';
    setTimeout(function(){
      t.style.left = e.clientX + 'px';
      t.style.top = e.clientY + 'px';
    }, 80);
  });

  document.querySelectorAll('a,button,.game-card,.pricing-card,.testimonial-card,.package-option').forEach(function(el) {
    el.addEventListener('mouseenter', function(){ c.classList.add('hover'); });
    el.addEventListener('mouseleave', function(){ c.classList.remove('hover'); });
  });
})();

// ============ PARTICLES ============
function createParticles(container, count = 20) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (6 + Math.random() * 14) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    container.appendChild(p);
  }
}
const heroSection = document.querySelector('.hero');
if (heroSection) {
  const particleDiv = document.createElement('div');
  particleDiv.className = 'particles';
  heroSection.appendChild(particleDiv);
  createParticles(particleDiv, 25);
  // Add grid bg
  const grid = document.createElement('div');
  grid.className = 'hero-grid';
  heroSection.insertBefore(grid, heroSection.children[1]);
}

// ============ SCROLL REVEAL ============
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

// Convert existing animate-on-scroll to enhanced reveal
document.querySelectorAll('.animate-on-scroll').forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = (i % 4) * 0.08 + 's';
  revealObserver.observe(el);
});

// Stagger game/pricing grids
document.querySelectorAll('.games-grid, .pricing-grid, .testimonials-grid').forEach(grid => {
  grid.classList.add('stagger-children');
  revealObserver.observe(grid);
});

// ============ 3D TILT ON CARDS ============
document.querySelectorAll('.game-card, .pricing-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ============ MAGNETIC BUTTONS ============
document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta').forEach(btn => {
  btn.classList.add('btn-magnetic');
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

// ============ RIPPLE EFFECT ============
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
  btn.classList.add('ripple');
  btn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// ============ GLITCH EFFECT ON HERO TITLE ============
const heroHighlight = document.querySelector('.hero h1 .highlight');
if (heroHighlight) heroHighlight.classList.add('glitch');

// ============ NEON TOP BORDER ON SECTIONS ============
document.querySelectorAll('#pricing, #contact').forEach(sec => {
  sec.classList.add('neon-border');
});

// ============ COUNTER ANIMATION FOR STATS ============
function animateCounter(el, target, suffix = '') {
  let current = 0;
  const step = target / 40;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current) + suffix;
  }, 30);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.counted) {
      entry.target.dataset.counted = 'true';
      const text = entry.target.textContent;
      const num = parseInt(text);
      if (!isNaN(num)) {
        const suffix = text.replace(num.toString(), '');
        animateCounter(entry.target, num, suffix);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => statObserver.observe(el));

// ============ OPTIMIZED SCROLL HANDLER ============
(function(){
  var heroContent = document.querySelector('.hero-content');
  var heroBg = document.querySelector('.hero-bg');
  var nav = document.getElementById('navbar');
  var ticking = false;
  var lastScroll = 0;

  function onScroll() {
    var scrolled = window.scrollY;
    var vh = window.innerHeight;

    // Gentle parallax — hero only
    if (scrolled < vh) {
      if (heroContent) {
        heroContent.style.transform = 'translate3d(0,' + (scrolled * 0.15) + 'px,0)';
        heroContent.style.opacity = Math.max(0, 1 - scrolled / (vh * 0.8));
      }
      if (heroBg) {
        heroBg.style.transform = 'translate3d(0,' + (scrolled * 0.2) + 'px,0)';
      }
    }

    // Navbar hide/show
    if (nav) {
      if (scrolled > lastScroll && scrolled > 200) {
        nav.style.transform = 'translateY(-100%)';
      } else {
        nav.style.transform = 'translateY(0)';
      }
    }

    lastScroll = scrolled;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();

// ============ FLOATING GLOW ORBS ON GAME CARDS ============
document.querySelectorAll('.game-card').forEach((card, i) => {
  const glow = document.createElement('div');
  glow.className = 'card-glow';
  const colors = ['#00FFFF', '#A78BFA', '#F43F5E'];
  glow.style.background = colors[i % 3];
  glow.style.top = '20%';
  glow.style.left = '30%';
  glow.style.animationDelay = (i * 0.5) + 's';
  const imgDiv = card.querySelector('.game-card-image');
  if (imgDiv) {
    imgDiv.style.position = 'relative';
    imgDiv.appendChild(glow);
  }
});

// ============ TYPING EFFECT ============
function typeWriter(el, text, speed = 40) {
  el.textContent = '';
  let i = 0;
  el.classList.add('typing-cursor');
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      setTimeout(() => el.classList.remove('typing-cursor'), 1500);
    }
  }
  type();
}

const heroBadgeText = document.querySelector('.hero-badge');
if (heroBadgeText) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const pulse = heroBadgeText.querySelector('.pulse');
      const originalText = heroBadgeText.textContent.trim();
      heroBadgeText.innerHTML = '';
      if (pulse) heroBadgeText.appendChild(pulse);
      const span = document.createElement('span');
      heroBadgeText.appendChild(span);
      typeWriter(span, ' Now Open in Varanasi', 60);
      observer.disconnect();
    }
  });
  observer.observe(heroBadgeText);
}

console.log('🎮 Arcade Zone - Enhanced Animations Loaded');
