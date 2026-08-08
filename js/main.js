/* SwipeDict Landing — main.js
   Vanilla JS only. Zero library dependencies.
   ------------------------------------------- */

'use strict';

/* ── NAV SCROLL SHADOW ──────────────────────────────── */
(function initNavScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const update = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', update, { passive: true });
    update();
})();

/* ── MOBILE MENU ─────────────────────────────────────── */
(function initMobileMenu() {
    const btn  = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    let open = false;

    function toggle(force) {
        open = (force !== undefined) ? force : !open;
        btn.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open);
        menu.classList.toggle('open', open);
    }

    btn.addEventListener('click', () => toggle());

    // Close on outside click
    document.addEventListener('click', e => {
        if (open && !btn.contains(e.target) && !menu.contains(e.target)) toggle(false);
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));

    // Close on Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });
})();

/* ── SMOOTH SCROLL ─────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const id = link.getAttribute('href').slice(1);
        const target = id ? document.getElementById(id) : document.documentElement;
        if (!target) return;
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
        const top  = target.getBoundingClientRect().top + window.scrollY - (id ? navH : 0);
        window.scrollTo({ top, behavior: 'smooth' });
    });
});

/* ── SCROLL REVEAL ──────────────────────────────────── */
(function initReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-right');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
})();

/* ── COOKIE / CONSENT BANNER ────────────────────────── */
(function initConsent() {
    const KEY    = 'sd_consent_v1';
    const banner = document.getElementById('cookie-consent-banner');
    const btn    = document.getElementById('accept-consent-button');
    if (!banner) return;

    if (localStorage.getItem(KEY)) { banner.remove(); return; }

    // Show after slight delay
    setTimeout(() => banner.classList.remove('hidden'), 800);

    btn && btn.addEventListener('click', () => {
        localStorage.setItem(KEY, '1');
        banner.style.animation = 'slide-up .3s reverse forwards';
        setTimeout(() => banner.remove(), 300);
    });
})();

/* ── USER-ACTIVE REDIRECT ────────────────────────────── */
(function checkActiveUser() {
    const APP_URL = 'https://app.swipedict.com';
    // If user has visited the app, they likely want to go there directly.
    // Only redirect if they land on root with ?app query or if already activated.
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === '1' || localStorage.getItem('sd_app_visited')) {
        window.location.replace(APP_URL);
    }
})();

/* ── INTERACTIVE SWIPE CARD DEMO ─────────────────────── */
(function initCardDemo() {
    const container = document.getElementById('interactive-card-demo-container');
    if (!container) return;

    const CARDS = [
        { lang: 'RO', word: 'a \u00EEnv\u0103\u021Ba', dlang: 'DE', translation: 'lernen',    accent: ['#6366f1','#8b5cf6'] },
        { lang: 'RO', word: 'frumoas\u0103',            dlang: 'DE', translation: 'sch\u00F6n', accent: ['#ec4899','#f43f5e'] },
        { lang: 'RO', word: 'mul\u021Bumesc',            dlang: 'DE', translation: 'danke',     accent: ['#06b6d4','#6366f1'] },
        { lang: 'RO', word: 'a merge',                   dlang: 'DE', translation: 'gehen',     accent: ['#10b981','#06b6d4'] },
        { lang: 'RO', word: 'carte',                     dlang: 'DE', translation: 'Buch',      accent: ['#f59e0b','#ef4444'] },
        { lang: 'RO', word: 'cas\u0103',                 dlang: 'DE', translation: 'Haus',      accent: ['#8b5cf6','#ec4899'] },
    ];

    let stackIndex = 0;
    const VISIBLE = 3;
    let kept = 0, skipped = 0;
    let idleTimer = null;
    let isAnimating = false;

    // Counter elements
    const counter = document.createElement('div');
    counter.className = 'demo-counter';
    counter.innerHTML = '<span class="dc-kept">0 kept</span><span class="dc-skipped">0 skipped</span>';
    container.parentElement.insertBefore(counter, container.nextSibling);

    function updateCounter() {
        counter.querySelector('.dc-kept').textContent    = kept    + ' kept';
        counter.querySelector('.dc-skipped').textContent = skipped + ' skipped';
    }

    function makeCard(data, colorIndex) {
        const el = document.createElement('div');
        el.className = 'demo-card';
        const [c1, c2] = data.accent;
        el.innerHTML = `
            <div class="dc-header" style="background:linear-gradient(135deg,${c1},${c2})">
                <span class="dc-lang-badge">${data.lang}</span>
                <span class="dc-word">${data.word}</span>
            </div>
            <div class="dc-body">
                <span class="dc-lang-badge dc-lang-badge--dark">${data.dlang}</span>
                <span class="dc-translation">${data.translation}</span>
            </div>
            <span class="dc-stamp dc-stamp--keep">KEEP \u2713</span>
            <span class="dc-stamp dc-stamp--skip">SKIP \u2715</span>
        `;
        return el;
    }

    function buildStack() {
        container.innerHTML = '';
        for (let i = VISIBLE - 1; i >= 0; i--) {
            const idx  = (stackIndex + i) % CARDS.length;
            const card = makeCard(CARDS[idx], idx);
            card.style.zIndex    = VISIBLE - i;
            positionBack(card, i);
            container.appendChild(card);
            if (i === 0) attachDrag(card);
        }
        resetIdleTimer();
    }

    function positionBack(card, depth) {
        const scale = 1 - depth * 0.055;
        const ty    = depth * 12;
        const rx    = depth * -1.5;
        card.style.transition = 'transform .4s cubic-bezier(.34,1.2,.64,1), opacity .4s ease';
        card.style.transform  = `translateY(${ty}px) scale(${scale}) rotate(${rx}deg)`;
        card.style.opacity    = depth === 0 ? '1' : depth === 1 ? '0.75' : '0.45';
    }

    function flyOut(card, dir, cb) {
        card.style.transition = 'transform .4s ease, opacity .35s ease';
        card.style.transform  = `translateX(${dir * 600}px) rotate(${dir * 28}deg)`;
        card.style.opacity    = '0';
        setTimeout(cb, 420);
    }

    function swipeCard(dir) {
        if (isAnimating) return;
        isAnimating = true;
        clearTimeout(idleTimer);

        const topCard = container.lastElementChild;
        if (!topCard) return;

        // Stamp flash
        const stamp = topCard.querySelector(dir > 0 ? '.dc-stamp--keep' : '.dc-stamp--skip');
        stamp.style.transition = 'opacity .1s';
        stamp.style.opacity = '1';

        if (dir > 0) kept++; else skipped++;
        updateCounter();

        flyOut(topCard, dir, () => {
            stackIndex = (stackIndex + 1) % CARDS.length;
            isAnimating = false;
            buildStack();
        });
    }

    // Idle hint: wiggle then auto-swipe right after 3.5s
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        const topCard = container.lastElementChild;
        if (!topCard) return;
        topCard.classList.remove('demo-card--wiggle');
        idleTimer = setTimeout(() => {
            if (isAnimating) return;
            const tc = container.lastElementChild;
            if (tc) {
                tc.classList.add('demo-card--wiggle');
                // After wiggle, auto-swipe right
                setTimeout(() => swipeCard(1), 1200);
            }
        }, 3500);
    }

    function attachDrag(card) {
        let startX = 0, curX = 0, dragging = false;
        const stampKeep = card.querySelector('.dc-stamp--keep');
        const stampSkip = card.querySelector('.dc-stamp--skip');

        function onStart(x) {
            if (isAnimating) return;
            startX = x; curX = 0; dragging = true;
            clearTimeout(idleTimer);
            card.classList.remove('demo-card--wiggle');
            card.classList.add('is-dragging');
            card.style.transition = 'none';
        }
        function onMove(x) {
            if (!dragging) return;
            curX = x - startX;
            const rotate = curX * 0.07;
            card.style.transform = `translateX(${curX}px) rotate(${rotate}deg)`;
            const ratio = Math.min(Math.abs(curX) / 80, 1);
            if (curX > 15)       { stampKeep.style.opacity = ratio; stampSkip.style.opacity = 0; }
            else if (curX < -15) { stampSkip.style.opacity = ratio; stampKeep.style.opacity = 0; }
            else                 { stampKeep.style.opacity = 0;     stampSkip.style.opacity = 0; }
        }
        function onEnd() {
            if (!dragging) return;
            dragging = false;
            card.classList.remove('is-dragging');
            if (Math.abs(curX) > 80) {
                swipeCard(curX > 0 ? 1 : -1);
            } else {
                card.style.transition = 'transform .4s cubic-bezier(.34,1.4,.64,1)';
                card.style.transform  = 'translateX(0) rotate(0)';
                stampKeep.style.opacity = 0;
                stampSkip.style.opacity = 0;
                resetIdleTimer();
            }
        }

        card.addEventListener('mousedown',  e => onStart(e.clientX));
        window.addEventListener('mousemove', e => { if (dragging) onMove(e.clientX); });
        window.addEventListener('mouseup',   onEnd);

        card.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
        card.addEventListener('touchmove',  e => { if (!dragging) return; e.preventDefault(); onMove(e.touches[0].clientX); }, { passive: false });
        card.addEventListener('touchend',   onEnd);

        // Tap without drag = swipe right
        card.addEventListener('click', () => {
            if (Math.abs(curX) < 8 && !isAnimating) swipeCard(1);
        });
    }

    buildStack();
})();