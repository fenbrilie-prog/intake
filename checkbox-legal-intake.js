/*!
 * Checkbox — Legal Intake landing page — SCRIPTS
 * Host on GitHub and serve via jsDelivr, then add to
 * Webflow > Project Settings > Custom Code > Footer (before </body>):
 *   <script src="https://cdn.jsdelivr.net/gh/USER/REPO@main/checkbox-legal-intake.js"></script>
 * Must load AFTER both HTML embeds are on the page (footer placement does this).
 * Contains: demo form handler, hero request-tunnel + Front Door flow player,
 * tabbed showcase, problem-section toggle, FAQ, and other interactions.
 */

/*!
 * Checkbox — Legal Intake landing page
 *
 * Self-contained JS file. No external dependencies.
 *
 * Handles:
 *   1. Smooth scroll for in-page anchor links
 *   2. Single-open behaviour on the FAQ accordion
 *   3. "Book a demo" modal: open / close / Escape / outside-click
 *   4. Interactive lifecycle player in §3 (5-stage walkthrough with
 *      play / pause / prev / next / replay controls)
 *
 * Pair with: checkbox-legal-intake-page.css
 * Used by:   /solution/legal-intake page on checkbox.ai
 */

/* ============================================================
   PART 1 — Shared page behaviours (scroll, accordion, modal)
   ============================================================ */

(function() {
  var anchors = document.querySelectorAll('.cbx-r a[href^="#"]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  anchors.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  // Problem section: enforce only one open at a time
  var problemItems = document.querySelectorAll('.cbx-r__problem-item');
  problemItems.forEach(function(item) {
    item.addEventListener('toggle', function() {
      if (item.open) {
        problemItems.forEach(function(other) {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });

  // Book a demo modal: open / close / Escape / outside-click
  var modal = document.querySelector('[data-cbx-r-modal]');
  var openTriggers = document.querySelectorAll('[data-cbx-r-open-modal]');
  var closeTrigger = modal ? modal.querySelector('[data-cbx-r-close-modal]') : null;
  var lastFocused = null;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.dataset.open = 'true';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cbx-r-modal-open');
    if (closeTrigger) closeTrigger.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal) return;
    modal.dataset.open = 'false';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cbx-r-modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  openTriggers.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });
  });
  if (closeTrigger) closeTrigger.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.dataset.open === 'true') closeModal();
  });
})();


/* ============================================================
   PART 2 — Lifecycle track player (§3 interactive walkthrough)
   ============================================================ */

(function () {
  'use strict';

  // Each stage gets 5 seconds — comfortable reading window for the description.
  // Users who need more time can pause. Users who want to skip can use prev/next.
  var STAGE_DURATION_MS = 5000;

  var STAGES = [
    {
      title: 'Every request lands in Checkbox first',
      desc:  '100 requests come in this week — across email, Slack, Teams, the legal portal, and intake forms. They all arrive in one queue.'
    },
    {
      title: '62 are resolved without a lawyer',
      desc:  'Self-serve answers, AI legal assistant, guided templates, or automation. Most requests never need to become a formal matter.'
    },
    {
      title: 'The other 38 become matters',
      desc:  'These need legal judgement. Checkbox classifies each one — matter type, urgency, business unit — and tags them for handoff.'
    },
    {
      title: 'The integration creates each matter in NetDocs',
      desc:  'Checkbox connects to NetDocuments. Matter types, folder templates, security profiles, and owner assignments are all set automatically.'
    },
    {
      title: '38 structured matters now live in NetDocuments',
      desc:  'Every matter arrives with the right folders, the right type, and the right owner. The lawyer just opens it and starts work.'
    }
  ];

  var track       = document.querySelector('[data-cbx-r-track]');
  if (!track) return;

  var overlay     = track.querySelector('[data-cbx-r-track-play]');
  var annotation  = document.querySelector('[data-cbx-r-track-annotation]');
  if (!annotation) return;

  var stepEl      = annotation.querySelector('[data-cbx-r-track-step]');
  var bodyEl      = annotation.querySelector('[data-cbx-r-track-body]');
  var titleEl     = annotation.querySelector('[data-cbx-r-track-title]');
  var descEl      = annotation.querySelector('[data-cbx-r-track-desc]');
  var progressBars = annotation.querySelectorAll('[data-cbx-r-track-progress] span');
  var prevBtn     = annotation.querySelector('[data-cbx-r-track-prev]');
  var playPauseBtn = annotation.querySelector('[data-cbx-r-track-playpause]');
  var nextBtn     = annotation.querySelector('[data-cbx-r-track-next]');

  // Playback state
  var currentStage = 0;        // 1-based; 0 = not started
  var isPaused = false;
  var hasStarted = false;
  var stageTimerId = null;
  var stageStartedAt = 0;
  var stageRemainingMs = STAGE_DURATION_MS;

  // ----- Stage rendering -----
  function setStageClass(stageIndex) {
    for (var i = 1; i <= 5; i++) {
      track.classList.remove('is-stage-' + i);
    }
    track.classList.remove('is-paused-final');
    if (stageIndex >= 1 && stageIndex <= 5) {
      track.classList.add('is-stage-' + stageIndex);
    }
  }

  function setProgress(stageIndex) {
    for (var i = 0; i < progressBars.length; i++) {
      progressBars[i].classList.remove('is-active', 'is-done');
      if (i < stageIndex - 1) progressBars[i].classList.add('is-done');
      if (i === stageIndex - 1) progressBars[i].classList.add('is-active');
    }
  }

  // ----- Counter animations -----
  // Each [data-cbx-r-counter] element declares its own target value and
  // the stage at which it should start counting. When that stage fires,
  // we animate 0 -> target. Going below that stage resets to 0.
  var counterEls = document.querySelectorAll('[data-cbx-r-counter]');
  var counters = [];
  for (var ci = 0; ci < counterEls.length; ci++) {
    var el = counterEls[ci];
    counters.push({
      el: el,
      target: parseInt(el.getAttribute('data-cbx-r-counter-target'), 10) || 0,
      triggerStage: parseInt(el.getAttribute('data-cbx-r-counter-stage'), 10) || 1,
      rafId: null,
      hasFired: false
    });
  }

  function animateCounter(counter) {
    cancelAnimationFrame(counter.rafId);
    var startTime = null;
    var duration = 1100; // ms — feels confident, not slow
    var fromVal = 0;
    var toVal = counter.target;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic — fast start, gentle landing
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(fromVal + (toVal - fromVal) * eased);
      counter.el.textContent = current;
      if (progress < 1) {
        counter.rafId = requestAnimationFrame(step);
      } else {
        counter.el.textContent = toVal;
      }
    }
    counter.rafId = requestAnimationFrame(step);
  }

  function resetCounter(counter) {
    cancelAnimationFrame(counter.rafId);
    counter.el.textContent = '0';
  }

  function updateCountersForStage(stageIndex) {
    for (var i = 0; i < counters.length; i++) {
      var c = counters[i];
      if (stageIndex >= c.triggerStage) {
        if (!c.hasFired) {
          // Small delay so any CSS fade-in lands before digits start spinning
          (function (counter) {
            setTimeout(function () { animateCounter(counter); }, 300);
          })(c);
          c.hasFired = true;
        }
      } else {
        resetCounter(c);
        c.hasFired = false;
      }
    }
  }

  function renderStage(stageIndex) {
    var stage = STAGES[stageIndex - 1];
    if (!stage) return;

    // Quick fade-out for content swap (only if content is actually changing)
    bodyEl.classList.add('cbx-r__nd-track-annotation-body--switching');
    setTimeout(function () {
      stepEl.innerHTML = '<b>' + stageIndex + '</b> / 5';
      titleEl.textContent = stage.title;
      descEl.textContent = stage.desc;
      bodyEl.classList.remove('cbx-r__nd-track-annotation-body--switching');
    }, 180);

    setStageClass(stageIndex);
    setProgress(stageIndex);
    updateCountersForStage(stageIndex);

    // Update prev/next button enabled states
    if (prevBtn) prevBtn.disabled = (stageIndex <= 1);
    if (nextBtn) nextBtn.disabled = (stageIndex >= 5);
  }

  // ----- Playback control -----
  function startStageTimer(durationMs) {
    clearTimeout(stageTimerId);
    stageStartedAt = Date.now();
    stageRemainingMs = durationMs;
    stageTimerId = setTimeout(advanceToNextStage, durationMs);
  }

  function advanceToNextStage() {
    if (currentStage < STAGES.length) {
      currentStage++;
      renderStage(currentStage);
      startStageTimer(STAGE_DURATION_MS);
    } else {
      endPlayback();
    }
  }

  function endPlayback() {
    clearTimeout(stageTimerId);
    track.classList.remove('is-playing', 'is-paused-anim');
    for (var i = 1; i <= 5; i++) track.classList.remove('is-stage-' + i);
    track.classList.add('is-paused-final');
    annotation.classList.add('cbx-r__nd-track-annotation--ended');
    annotation.classList.remove('is-playing-active', 'is-paused-state');
    // Update accessibility labels
    if (playPauseBtn) {
      playPauseBtn.setAttribute('aria-label', 'Replay');
      playPauseBtn.setAttribute('title', 'Replay');
    }
    if (prevBtn) prevBtn.disabled = false;  // allow user to step back from final
    if (nextBtn) nextBtn.disabled = true;
    isPaused = false;
  }

  function pausePlayback() {
    if (isPaused || !hasStarted) return;
    clearTimeout(stageTimerId);
    // Record how much time is left in the current stage
    var elapsed = Date.now() - stageStartedAt;
    stageRemainingMs = Math.max(0, stageRemainingMs - elapsed);
    isPaused = true;
    track.classList.add('is-paused-anim');
    annotation.classList.remove('is-playing-active');
    annotation.classList.add('is-paused-state');
    if (playPauseBtn) {
      playPauseBtn.setAttribute('aria-label', 'Resume');
      playPauseBtn.setAttribute('title', 'Resume');
    }
  }

  function resumePlayback() {
    if (!isPaused) return;
    isPaused = false;
    track.classList.remove('is-paused-anim');
    annotation.classList.add('is-playing-active');
    annotation.classList.remove('is-paused-state');
    if (playPauseBtn) {
      playPauseBtn.setAttribute('aria-label', 'Pause');
      playPauseBtn.setAttribute('title', 'Pause');
    }
    startStageTimer(stageRemainingMs);
  }

  function jumpToStage(stageIndex) {
    if (stageIndex < 1 || stageIndex > STAGES.length) return;
    clearTimeout(stageTimerId);
    currentStage = stageIndex;
    // Clear "ended" state if user navigates back from end
    annotation.classList.remove('cbx-r__nd-track-annotation--ended');
    if (playPauseBtn) {
      playPauseBtn.setAttribute('aria-label', isPaused ? 'Resume' : 'Pause');
      playPauseBtn.setAttribute('title', isPaused ? 'Resume' : 'Pause');
    }
    renderStage(stageIndex);
    // Reset the per-stage clock and respect paused state
    stageRemainingMs = STAGE_DURATION_MS;
    if (!isPaused) {
      startStageTimer(STAGE_DURATION_MS);
    }
  }

  function startFromBeginning() {
    hasStarted = true;
    overlay.classList.add('cbx-r__nd-track-overlay--hidden');
    annotation.classList.add('is-visible', 'is-playing-active');
    annotation.classList.remove('is-paused-state', 'cbx-r__nd-track-annotation--ended');
    track.classList.remove('is-resting', 'is-paused-final', 'is-paused-anim');
    track.classList.add('is-playing');
    currentStage = 1;
    isPaused = false;
    renderStage(currentStage);
    startStageTimer(STAGE_DURATION_MS);
  }

  function replay() {
    // Force a clean reset before replay so animations restart
    clearTimeout(stageTimerId);
    track.classList.remove('is-playing', 'is-paused-final', 'is-paused-anim');
    for (var i = 1; i <= 5; i++) track.classList.remove('is-stage-' + i);
    annotation.classList.remove('cbx-r__nd-track-annotation--ended', 'is-paused-state');
    track.classList.add('is-resting');
    void track.offsetWidth; // force reflow
    track.classList.remove('is-resting');
    setTimeout(startFromBeginning, 80);
  }

  // ----- Events -----
  if (overlay) {
    overlay.addEventListener('click', startFromBeginning);
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startFromBeginning();
      }
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', function () {
      // 3 modes: paused → resume, playing → pause, ended → replay
      if (annotation.classList.contains('cbx-r__nd-track-annotation--ended')) {
        replay();
      } else if (isPaused) {
        resumePlayback();
      } else {
        pausePlayback();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentStage > 1) jumpToStage(currentStage - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentStage < STAGES.length) {
        jumpToStage(currentStage + 1);
      } else {
        endPlayback();
      }
    });
  }
})();


/* ============================================================
   PART 3 — Tabbed showcase ("What legal teams can now do")
   Three tabs, one panel visible at a time. Clean ARIA toggling.
   ============================================================ */
(function () {
  var section = document.querySelector('[data-cbx-r-tabs]');
  if (!section) return;

  var tabs = section.querySelectorAll('.cbx-r__nd-tab');
  var panels = section.querySelectorAll('.cbx-r__nd-panel');
  if (!tabs.length || !panels.length) return;

  function activate(tabIndex) {
    // tabIndex is 1-based to match data-tab attribute
    var idStr = String(tabIndex);
    section.setAttribute('data-active', idStr);

    tabs.forEach(function (t) {
      var isActive = t.getAttribute('data-tab') === idStr;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panels.forEach(function (p) {
      var isActive = p.getAttribute('data-panel') === idStr;
      p.setAttribute('data-panel-active', isActive ? 'true' : 'false');
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var id = tab.getAttribute('data-tab');
      activate(parseInt(id, 10));
    });

    // Keyboard arrow navigation (left/right)
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var current = parseInt(tab.getAttribute('data-tab'), 10);
      var next = e.key === 'ArrowRight' ? current + 1 : current - 1;
      if (next < 1) next = tabs.length;
      if (next > tabs.length) next = 1;
      activate(next);
      var nextTab = section.querySelector('.cbx-r__nd-tab[data-tab="' + next + '"]');
      if (nextTab) nextTab.focus();
    });
  });
})();


/* ============================================================
   PART 4 — Legal Front Door (request → record) selectable journeys
   ============================================================ */

/* ============================================================
   LEGAL FRONT DOOR - selectable request journeys
   Pick a channel card, watch that request play out step by step
   to its outcome (self-serve / deflected, or becomes a matter).
   ============================================================ */
(function () {
  var root = document.querySelector('[data-cbx-r-fd]');
  if (!root) return;

  var STEP_MS = 2600;

  // ----- Icons (stroke glyphs) -----
  var IC = {
    email:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
    teams:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    slack:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    forms:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
    aichat:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    capture:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    triage:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4z"/></svg>',
    search:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    route:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="4" x2="6" y2="14"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M18 8.5a8 8 0 0 1-8 8"/></svg>',
    check:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    template: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>',
    resolved: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
    lawyer:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    handoff:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    matter:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    funnel:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>',
    door:     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V4a1 1 0 0 1 1-1h7l4 4v14"/><circle cx="14" cy="12" r="0.9" fill="currentColor"/></svg>'
  };

  // ----- The three journeys -----
  var PATHS = {
    email: {
      tile: 'cbx-r__fd-tile--email', tileIcon: IC.email,
      reqText: '<b>Email</b> &middot; &ldquo;Do I need an NDA for this vendor?&rdquo;',
      outcome: 'resolved',
      badge: { cls: 'cbx-r__fd-ob--resolved', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-5"/></svg>', label: 'Resolved automatically' },
      payoffText: '<b>Resolved automatically.</b> An approved answer is returned instantly and recorded, without creating legal work.',
      steps: [
        { ic: 'email', title: 'Email received', desc: 'The email hits the Legal Front Door, caught from Outlook. No shared inbox, no lost thread.' },
        { ic: 'triage', title: 'AI understands the intent', desc: 'Checkbox reads the request and recognises a standard policy question, low risk.' },
        { ic: 'search', title: 'Approved guidance found', desc: 'It answers from your approved policies and clause library, not the open internet.' },
        { ic: 'aichat', title: 'Answer returned automatically', desc: 'The requester gets a clear, sourced answer in seconds, no lawyer involved.' },
        { ic: 'resolved', title: 'Logged and reported', desc: 'Closed and captured in the audit trail, visible in reporting.',  isOutcome: true }
      ]
    },
    slack: {
      tile: 'cbx-r__fd-tile--slack', tileIcon: IC.slack,
      reqText: '<b>Slack</b> &middot; &ldquo;Need legal review on this supplier agreement&rdquo;',
      outcome: 'matter',
      badge: { cls: 'cbx-r__fd-ob--matter', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', label: 'Matter created' },
      payoffText: '<b>Matter created automatically.</b> The request is routed, assigned, and tracked without manual intake.',
      steps: [
        { ic: 'slack', title: 'Slack message arrives', desc: 'The Slack message hits the Legal Front Door instead of a lawyer&rsquo;s DMs.' },
        { ic: 'triage', title: 'Request type identified', desc: 'Checkbox classifies it: a supplier agreement that needs real legal review.' },
        { ic: 'capture', title: 'Information captured', desc: 'All the context is captured as structured intake, nothing re&#8209;keyed.' },
        { ic: 'handoff', title: 'Matter created automatically', desc: 'Checkbox opens the matter: type, folders, owner, and security profile all set.' },
        { ic: 'lawyer', title: 'Assigned to legal', desc: 'Routed to the right lawyer with full context, ready to action.' },
        { ic: 'matter', title: 'Tracked to completion', desc: 'A structured matter, tracked end to end and reported on.',  isOutcome: true }
      ]
    },
    teams: {
      tile: 'cbx-r__fd-tile--teams', tileIcon: IC.teams,
      reqText: '<b>Microsoft Teams</b> &middot; &ldquo;Can marketing use this customer logo?&rdquo;',
      outcome: 'workflow',
      badge: { cls: 'cbx-r__fd-ob--workflow', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"/></svg>', label: 'Workflow automated' },
      payoffText: '<b>Workflow automated.</b> The request follows the approved process from start to finish without manual coordination.',
      steps: [
        { ic: 'teams', title: 'Teams message arrives', desc: 'The Teams message hits the Legal Front Door where the work already happens.' },
        { ic: 'triage', title: 'Request type identified', desc: 'Checkbox recognises a brand and marketing approval, a known workflow.' },
        { ic: 'route', title: 'Routed to the correct workflow', desc: 'It kicks off the matching approval workflow automatically.' },
        { ic: 'check', title: 'Approval collected automatically', desc: 'The workflow runs its steps and completes, no lawyer drafting from scratch.' },
        { ic: 'resolved', title: 'Logged and reported', desc: 'Captured in the audit trail and visible in reporting.',  isOutcome: true }
      ]
    },
    forms: {
      tile: 'cbx-r__fd-tile--forms', tileIcon: IC.forms,
      reqText: '<b>Forms</b> &middot; &ldquo;New vendor onboarding request&rdquo;',
      outcome: 'matter',
      badge: { cls: 'cbx-r__fd-ob--matter', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', label: 'Matter created' },
      payoffText: '<b>Matter created automatically.</b> Everything needed is captured upfront so work can begin immediately.',
      steps: [
        { ic: 'forms', title: 'Form submitted', desc: 'A request comes in through a branded intake form, structured from the start.' },
        { ic: 'check', title: 'Information validated', desc: 'Checkbox checks the submission is complete and routes it correctly.' },
        { ic: 'handoff', title: 'Matter created automatically', desc: 'A matter opens automatically with the form data attached.' },
        { ic: 'lawyer', title: 'Assigned to owner', desc: 'Routed to the right owner, ready to action.' },
        { ic: 'matter', title: 'Tracked to completion', desc: 'A structured matter, tracked to completion and reported on.',  isOutcome: true }
      ]
    },
    aichat: {
      tile: 'cbx-r__fd-tile--aichat', tileIcon: IC.aichat,
      reqText: '<b>AI Chatbot</b> &middot; &ldquo;What&rsquo;s our signing authority policy?&rdquo;',
      outcome: 'ai',
      badge: { cls: 'cbx-r__fd-ob--ai', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.8L18.5 9l-4.9 1.2L12 15l-1.6-4.8L5.5 9l4.9-1.2z"/></svg>', label: 'Answered by AI' },
      payoffText: '<b>Answered instantly.</b> Employees get trusted answers without creating work for legal.',
      steps: [
        { ic: 'aichat', title: 'Question asked', desc: 'An employee asks the assistant a policy question in plain language.' },
        { ic: 'search', title: 'AI finds approved guidance', desc: 'Checkbox searches your approved policies and playbooks, not the open web.' },
        { ic: 'aichat', title: 'Instant answer returned', desc: 'A clear, sourced answer comes back in seconds.' },
        { ic: 'resolved', title: 'Logged', desc: 'Captured in the audit trail, so legal keeps full visibility.',  isOutcome: true }
      ]
    },
    door: {
      tile: 'cbx-r__fd-tile--door', tileIcon: IC.door,
      reqText: '<b>Legal Front Door</b> &middot; one way in for every request',
      outcome: 'matter',
      badge: { cls: 'cbx-r__fd-ob--matter', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V4a1 1 0 0 1 1-1h7l4 4v14"/></svg>', label: 'One front door for legal' },
      payoffText: '<b>One front door for legal.</b> However work arrives, it is captured, triaged, routed, and tracked consistently, giving legal complete visibility into demand.',
      steps: [
        { ic: 'funnel', title: 'Every request, one intake process', desc: 'Email, Slack, Teams, forms, and AI all flow through the same intake layer, giving legal one place to manage demand.' },
        { ic: 'capture', title: 'Captured consistently', desc: 'Each request arrives with the context legal needs, captured once and never re&#8209;keyed.' },
        { ic: 'triage', title: 'Triaged automatically', desc: 'Checkbox reads the intent, type, and urgency, then decides the right path for each one.' },
        { ic: 'route', title: 'Resolved, routed, or escalated', desc: 'Routine asks are answered instantly. The rest open as structured matters, routed to the right owner.' },
        { ic: 'resolved', title: 'Tracked and reported', desc: 'Everything is logged, tracked to completion, and visible to the GC in real time.',  isOutcome: true }
      ]
    }
  };

  // ----- Elements -----
  var cards      = root.querySelectorAll('[data-cbx-r-fd-card]');
  var journey    = root.querySelector('[data-cbx-r-fd-journey]');
  var reqTile    = root.querySelector('[data-cbx-r-fd-reqtile]');
  var reqText    = root.querySelector('[data-cbx-r-fd-reqtext]');
  var timelineEl = root.querySelector('[data-cbx-r-fd-timeline]');
  var payoff     = root.querySelector('[data-cbx-r-fd-payoff]');
  var badge      = root.querySelector('[data-cbx-r-fd-badge]');
  var payoffText = root.querySelector('[data-cbx-r-fd-payoff-text]');
  var progressEl = root.querySelector('[data-cbx-r-fd-progress]');
  var prevBtn    = root.querySelector('[data-cbx-r-fd-prev]');
  var playBtn    = root.querySelector('[data-cbx-r-fd-playpause]');
  var nextBtn    = root.querySelector('[data-cbx-r-fd-next]');

  // ----- State -----
  var pathKey = 'email';
  var step = 1;        // 1-based active step
  var playing = false;
  var ended = false;
  var timer = null;

  function path() { return PATHS[pathKey]; }
  function stepCount() { return path().steps.length; }

  // Build the timeline DOM + req chip + payoff text for a path
  function renderPath() {
    var p = path();
    journey.setAttribute('data-outcome', p.outcome);

    reqTile.className = 'cbx-r__fd-reqchip-tile ' + p.tile;
    reqTile.innerHTML = p.tileIcon;
    reqText.innerHTML = p.reqText;

    badge.className = 'cbx-r__fd-ob ' + p.badge.cls;
    badge.innerHTML = p.badge.icon + p.badge.label;
    payoffText.innerHTML = p.payoffText;

    // Timeline rows
    var html = '';
    for (var i = 0; i < p.steps.length; i++) {
      var s = p.steps[i];
      html += '<li class="cbx-r__fd-tl-step' + (s.isOutcome ? ' is-outcome' : '') + '">' +
                '<span class="cbx-r__fd-tl-dot" aria-hidden="true">' + IC[s.ic] + '</span>' +
                '<div class="cbx-r__fd-tl-body">' +
                  '<div class="cbx-r__fd-tl-title">' + s.title + '</div>' +
                  '<div class="cbx-r__fd-tl-desc">' + s.desc + '</div>' +
                '</div>' +
              '</li>';
    }
    timelineEl.innerHTML = html;

    // Progress dots
    var pg = '';
    for (var j = 0; j < p.steps.length; j++) pg += '<span></span>';
    progressEl.innerHTML = pg;
  }

  function renderStep() {
    var rows = timelineEl.querySelectorAll('.cbx-r__fd-tl-step');
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove('is-active', 'is-done');
      if (i + 1 < step) rows[i].classList.add('is-done');
      else if (i + 1 === step) rows[i].classList.add('is-active');
    }
    var dots = progressEl.querySelectorAll('span');
    for (var k = 0; k < dots.length; k++) {
      if (k < step) dots[k].classList.add('is-on');
      else dots[k].classList.remove('is-on');
    }
    // Reveal payoff on the final step
    if (step >= stepCount()) payoff.classList.add('is-revealed');
    else payoff.classList.remove('is-revealed');

    prevBtn.disabled = (step <= 1) && !playing;
    setPlayIcon();
  }

  function setPlayIcon() {
    var state = ended ? 'replay' : (playing ? 'pause' : 'play');
    playBtn.setAttribute('data-state', state);
    var labels = { play: 'Play walkthrough', pause: 'Pause', replay: 'Replay' };
    playBtn.setAttribute('aria-label', labels[state]);
    playBtn.setAttribute('title', labels[state]);
  }

  function goToStep(n, keepPlaying) {
    step = Math.max(1, Math.min(stepCount(), n));
    if (step >= stepCount()) { ended = true; playing = false; clearTimeout(timer); }
    renderStep();
    if (keepPlaying && playing && step < stepCount()) {
      timer = setTimeout(function () { goToStep(step + 1, true); }, STEP_MS);
    }
  }

  function selectPath(key) {
    if (!PATHS[key]) return;
    pathKey = key;
    cards.forEach(function (c) {
      c.setAttribute('aria-selected', c.getAttribute('data-cbx-r-fd-card') === key ? 'true' : 'false');
    });
    clearTimeout(timer);
    playing = false;
    ended = false;
    step = 1;
    renderPath();
    renderStep();
  }

  function play() {
    if (ended) { // replay
      ended = false;
      step = 1;
      renderStep();
    }
    playing = true;
    setPlayIcon();
    if (step >= stepCount()) { goToStep(stepCount()); return; }
    timer = setTimeout(function () { goToStep(step + 1, true); }, STEP_MS);
  }

  function pause() {
    playing = false;
    clearTimeout(timer);
    setPlayIcon();
    renderStep();
  }

  // ----- Events -----
  cards.forEach(function (c) {
    c.addEventListener('click', function () {
      selectPath(c.getAttribute('data-cbx-r-fd-card'));
      // On mobile the player stacks below a tall channel list, so the update is off-screen.
      // Bring the journey into view so the selected channel's flow is visible.
      if (journey && window.matchMedia('(max-width: 879.98px)').matches) {
        var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var y  = journey.getBoundingClientRect().top + window.pageYOffset - 72;
        window.scrollTo({ top: y < 0 ? 0 : y, behavior: rm ? 'auto' : 'smooth' });
      }
    });
  });

  playBtn.addEventListener('click', function () {
    if (playing) pause(); else play();
  });
  prevBtn.addEventListener('click', function () {
    pause();
    ended = false;
    goToStep(step - 1);
  });
  nextBtn.addEventListener('click', function () {
    pause();
    if (step < stepCount()) goToStep(step + 1);
    else { ended = true; goToStep(stepCount()); }
  });

  // ----- Init ----- (default to the first channel)
  selectPath('email');
})();


/* ============================================================
   PART 5 — Problem section: collapsible channel cards
   ============================================================ */
(function () {
  var heads = document.querySelectorAll('[data-cbx-pb-toggle]');
  if (!heads.length) return;
  heads.forEach(function (h) {
    h.addEventListener('click', function () {
      var card = h.closest('[data-cbx-pb-card]');
      if (!card) return;
      var open = card.getAttribute('data-open') === 'true';
      card.setAttribute('data-open', open ? 'false' : 'true');
      h.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });
})();




/* ============================================================
   PART 7 — Problem section: "See the better way" reveal toggle
   ============================================================ */
(function () {
  var sec = document.querySelector('.cbx-r__pb[data-cbx-pb-mode]');
  if (!sec) return;
  var btn = sec.querySelector('[data-cbx-pb-switch]');
  if (!btn) return;
  var label  = btn.querySelector('.cbx-r__pb-switch-label');
  var h3     = sec.querySelector('.cbx-r__pb-banner-h3');
  var p      = sec.querySelector('.cbx-r__pb-banner-p');
  var bic    = sec.querySelector('.cbx-r__pb-door');
  var stage  = sec.querySelector('.cbx-r__pb-stage');
  var flow   = sec.querySelector('.cbx-r__pb-flow');
  var door   = sec.querySelector('.cbx-r__pb-door-card');
  var team   = sec.querySelector('.cbx-r__pb-result--solution');
  var sheets = sec.querySelector('[data-cbx-pb-optional]');
  var lineCards = [].slice.call(sec.querySelectorAll('[data-cbx-pb-card]'))
                    .filter(function (c) { return c !== sheets; });
  var COLORS = ['#E5484D', '#F76B15', '#F5A623', '#8B5CF6'];
  var drawTimer = null, rzTimer = null;

  var TXT = {
    problem: {
      h3: 'Different channels. Same problem:<span>Legal has no front door.</span>',
      p: 'Requests are scattered across systems, lawyers become the routing layer, and leadership loses visibility into incoming work.',
      label: 'See the better way'
    },
    solution: {
      h3: 'One front door.<span>Legal back in control.</span>',
      p: 'Every request is captured, triaged, and routed automatically, so nothing slips and legal stays in control.',
      label: 'Show the problem'
    }
  };

  /* banner icon tracks the state: scattered inbound (problem) vs one door (solution) */
  var BIC = {
    problem: '<svg viewBox="0 0 24 24" width="52" height="52" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M12 3V8.5"/><path d="M9.6 6.1 12 8.5 14.4 6.1"/><path d="M21 12H15.5"/><path d="M18.1 9.6 15.5 12 18.1 14.4"/><path d="M12 21V15.5"/><path d="M9.6 17.9 12 15.5 14.4 17.9"/><path d="M3 12H8.5"/><path d="M5.9 9.6 8.5 12 5.9 14.4"/><path d="M12 12h.01"/></svg>',
    solution: '<svg viewBox="0 0 24 24" width="52" height="52" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M2 20h3"/><path d="M14.5 20H22"/><path d="M14.5 3.5 5.5 5.2A1 1 0 0 0 4.7 6.2v12.6a1 1 0 0 0 .8 1l9 1.7a1 1 0 0 0 1.2-1V4.5a1 1 0 0 0-1.2-1z"/><path d="M11.5 12.2v.01"/></svg>'
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function n(v) { return v.toFixed(1); }

  function drawFlow() {
    if (!flow || !stage || !door || !team) return;
    if (sec.getAttribute('data-cbx-pb-mode') !== 'solution') { flow.innerHTML = ''; return; }
    var sb = stage.getBoundingClientRect();
    var W = stage.clientWidth, H = stage.clientHeight;
    flow.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var d = door.getBoundingClientRect();
    var t = team.getBoundingClientRect();
    var doorLx = d.left - sb.left, doorRx = d.right - sb.left, doorCy = (d.top - sb.top) + d.height / 2;
    var teamLx = t.left - sb.left, teamCy = (t.top - sb.top) + t.height / 2;
    var html = '';
    for (var i = 0; i < lineCards.length; i++) {
      var r = lineCards[i].getBoundingClientRect();
      var sx = r.right - sb.left, sy = (r.top - sb.top) + r.height / 2;
      var cx = lerp(sx, doorLx, 0.55);
      html += '<path class="cbx-r__pb-line" style="--lc:' + COLORS[i % COLORS.length] + ';animation-delay:' + (i * -0.5) + 's" d="M ' + n(sx) + ' ' + n(sy) + ' C ' + n(cx) + ' ' + n(sy) + ', ' + n(cx) + ' ' + n(doorCy) + ', ' + n(doorLx) + ' ' + n(doorCy) + '"/>';
    }
    var mx = lerp(doorRx, teamLx, 0.5);
    html += '<path class="cbx-r__pb-line" style="--lc:#0BB870;animation-delay:-0.3s" d="M ' + n(doorRx) + ' ' + n(doorCy) + ' C ' + n(mx) + ' ' + n(doorCy) + ', ' + n(mx) + ' ' + n(teamCy) + ', ' + n(teamLx - 3) + ' ' + n(teamCy) + '"/>';
    html += '<path class="cbx-r__pb-arrow" d="M ' + n(teamLx - 10) + ' ' + n(teamCy - 6) + ' L ' + n(teamLx - 1) + ' ' + n(teamCy) + ' L ' + n(teamLx - 10) + ' ' + n(teamCy + 6) + '"/>';
    flow.innerHTML = html;
  }

  function set(mode) {
    sec.setAttribute('data-cbx-pb-mode', mode);
    btn.setAttribute('aria-pressed', mode === 'solution' ? 'true' : 'false');
    if (label) label.textContent = TXT[mode].label;
    if (h3) h3.innerHTML = TXT[mode].h3;
    if (p) p.textContent = TXT[mode].p;
    if (bic) bic.innerHTML = BIC[mode];
    clearTimeout(drawTimer);
    if (mode === 'solution') {
      drawTimer = setTimeout(function () {
        if (sheets) sheets.style.display = 'none';
        setTimeout(drawFlow, 260);
      }, 300);
    } else {
      if (flow) flow.innerHTML = '';
      if (sheets) sheets.style.display = '';
    }
  }

  if (bic) bic.innerHTML = BIC[sec.getAttribute('data-cbx-pb-mode')] || BIC.problem;
  btn.addEventListener('click', function () {
    set(sec.getAttribute('data-cbx-pb-mode') === 'solution' ? 'problem' : 'solution');
    // On mobile the toggle sits below a tall diagram, so the change happens off-screen.
    // Bring the top of the diagram into view so the user can see what changed.
    if (window.matchMedia('(max-width: 760px)').matches) {
      var stage = sec.querySelector('.cbx-r__pb-stage');
      if (stage) {
        var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(function () {
          var y = stage.getBoundingClientRect().top + window.pageYOffset - 72;
          window.scrollTo({ top: y < 0 ? 0 : y, behavior: rm ? 'auto' : 'smooth' });
        });
      }
    }
  });
  window.addEventListener('resize', function () {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(drawFlow, 150);
  });
})();



/* ============================================================
   HERO — REQUEST TUNNEL (decorative)
   Builds the streaming field of legal-request cards (each tagged with
   its source channel) and runs the canvas streak-ray tunnel whose
   vanishing point sits on the right. No deps. Respects reduced motion,
   pauses offscreen.
   ============================================================ */
(function () {
  var root = document.querySelector('[data-cbx-r-gravity]');
  if (!root) return;
  var field = root.querySelector('[data-cbx-r-gravity-field]');
  var canvas = root.querySelector('.cbx-r__hg-fx');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- inline stroke icons (generic, monochrome — no brand logos) ---- */
  var ICONS = {
    doc:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    contract: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h5"/><path d="M8 16.5h3"/>',
    check:    '<path d="M20 6 9 17l-5-5"/>',
    user:     '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    shield:   '<path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z"/><path d="m9.5 12 1.8 1.8 3.4-3.6"/>',
    cart:     '<circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h7.7a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6.2"/>',
    mail:     '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    hash:     '<path d="M9 4 7.5 20M16.5 4 15 20M4 8.5h16M3.5 15.5h16"/>',
    people:   '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 7.2a3 3 0 0 1 0 5.6"/><path d="M17.5 19a5.5 5.5 0 0 0-2.3-4.5"/>',
    form:     '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    grid:     '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M3.5 15h17M9 4v16M15 4v16"/>'
  };
  function ic(key) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
           'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[key] || '') + '</svg>';
  }
  /* official Checkbox channel icons (CDN) for the source tag */
  var CH_ICON = {
    mail:   'https://cdn.prod.website-files.com/61b9653424ac8d76d7cfd5db/65c1b857f39a41111dba79e4_Email%20Intake%20-%20Icon.svg',
    hash:   'https://cdn.prod.website-files.com/61b9653424ac8d76d7cfd5db/65c2b91bed17d0219fda3e5c_Slack%20Intake%20-%20Icon.svg',
    people: 'https://cdn.prod.website-files.com/61b9653424ac8d76d7cfd5db/65c2b92d6db6c469c7ad04e3_Microsoft%20Teams%20-%20Icon.svg',
    form:   'https://cdn.prod.website-files.com/61b9653424ac8d76d7cfd5db/65c2b93ae79aa35deba352e9_Forms%20Intake%20-%20Icon.svg'
  };
  function srcIc(key) {
    return CH_ICON[key] ? '<img src="' + CH_ICON[key] + '" alt="" />' : ic(key);
  }

  /* ---- the cast: real intake requests [team, question, sourceChannel, urgency] ---- */
  var REQUESTS = [
    ['Sales',          'Can Legal review this customer contract?', 'hash',   'med'],
    ['Procurement',    'We need a vendor agreement approved.',     'mail',   'med'],
    ['HR',             'Can you review this employee policy?',      'form',   'low'],
    ['Marketing',      'Can we use this campaign claim?',           'people', 'low'],
    ['Product',        'Does this feature create privacy risks?',   'hash',   'high'],
    ['Executive Team', 'Can you assess this regulatory issue?',     'mail',   'high']
  ];

  /* depth tiers → perspective parallax.
     foreground = large, starts far off-axis, drifts slower;
     far = small, starts near the VP, plunges quicker. */
  var TIERS = [
    { s: 1.06, z: 6, r: [42, 60], dur: [9.5, 13.5] },  // foreground
    { s: 0.82, z: 4, r: [30, 46], dur: [8.0, 11.0] },  // mid
    { s: 0.60, z: 2, r: [18, 32], dur: [6.5, 9.0] }    // far
  ];

  /* vertical spread of the card field; tightened on narrow containers so
     foreground cards don't start below the frame and clip at the bottom */
  var VFAC = 0.82;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeItem(team, question, srcKey, urgency, tier) {
    var d = TIERS[tier];
    var phi = Math.PI + (Math.random() * 2 - 1) * 1.45;     // left-biased approach toward the right VP
    var r0 = rand(d.r[0], d.r[1]);
    var dx0 = Math.cos(phi) * r0;                           // cqmin offset from the VP
    var dy0 = Math.sin(phi) * r0 * VFAC;                    // gently flattened vertically
    var dur = rand(d.dur[0], d.dur[1]);
    var delay = -rand(0.3, dur);

    var el = document.createElement('div');
    el.className = 'cbx-r__hg-item';
    el.style.cssText =
      '--dx0:' + dx0.toFixed(1) + 'cqmin;' +
      '--dy0:' + dy0.toFixed(1) + 'cqmin;' +
      '--dur:' + dur.toFixed(2) + 's;' +
      '--delay:' + delay.toFixed(2) + 's;' +
      '--s-max:' + d.s + ';' +
      '--z:' + d.z + ';';
    el.innerHTML =
      '<div class="cbx-r__hg-card-in">' +
        '<div class="cbx-r__hg-head">' +
          '<span class="cbx-r__hg-dot" data-u="' + urgency + '" title="urgency"></span>' +
          '<span class="cbx-r__hg-dept">' + team + '</span>' +
          '<span class="cbx-r__hg-src" title="source">' + srcIc(srcKey) + '</span>' +
        '</div>' +
        '<div class="cbx-r__hg-q">' + question + '</div>' +
      '</div>';
    return el;
  }

  /* Every flying object is a real legal-intake request: a requesting team, the
     question they asked, the channel it arrived through, and an urgency level. */
  function build() {
    if (!field) return;
    var hw = root.getBoundingClientRect().width;
    VFAC = (hw && hw < 460) ? 0.5 : 0.82;
    var items = [];
    var n = 0;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < REQUESTS.length; i++) {
        var r = REQUESTS[i];
        items.push(makeItem(r[0], r[1], r[2], r[3], n % 3));
        n++;
      }
    }
    var frag = document.createDocumentFragment();
    items.forEach(function (it) { frag.appendChild(it); });
    field.appendChild(frag);
  }

  /* ---- Canvas: streak-ray tunnel converging on the VP ---- */
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var W = 0, H = 0, DPR = 1, vx = 0, vy = 0, Rmax = 1, coreR = 1;
  var SQUASH = 0.92;
  var parts = [], raf = 0, visible = true;

  function resize() {
    if (!ctx) return;
    var rect = root.getBoundingClientRect();
    W = rect.width; H = rect.height;
    if (W === 0 || H === 0) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    vx = W * 0.84; vy = H * 0.48;            // mirrors --vx / --vy
    Rmax = Math.hypot(vx, H * 0.55) * 1.06;
    coreR = Math.min(W, H) * 0.05;
  }

  function spawn(p, atRim) {
    p.phi = Math.PI + (Math.random() * 2 - 1) * 1.5;        // left-biased
    p.r = atRim ? Rmax * rand(0.7, 1.06) : Rmax * Math.random();
    p.green = Math.random() < 0.20;
    p.w = rand(0.7, 1.7);
    p.spd = rand(0.6, 1.2);
  }

  function initParticles() {
    parts = [];
    var n = reduce ? 80 : 116;
    for (var i = 0; i < n; i++) { var p = {}; spawn(p, false); parts.push(p); }
  }

  function drawStreak(p) {
    var f = 1 - p.r / Rmax;                                 // 0 at rim → 1 at VP
    var nr = p.r - (0.9 + f * f * 5.0) * p.spd;             // accelerate toward the VP
    var c = Math.cos(p.phi), s = Math.sin(p.phi);
    var x1 = vx + c * p.r,  y1 = vy + s * p.r * SQUASH;
    var x2 = vx + c * nr,   y2 = vy + s * nr * SQUASH;
    p.r = nr;
    if (p.r <= coreR) { spawn(p, true); return; }
    var edge = Math.min(1, (p.r - coreR) / (coreR * 2.2));  // fade into the mouth
    var a = Math.max(0, Math.min(0.55, (0.10 + f * 1.0) * edge));
    ctx.strokeStyle = p.green ? 'rgba(11,184,112,' + a + ')' : 'rgba(120,122,132,' + (a * 0.8) + ')';
    ctx.lineWidth = p.w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function step() {
    if (!ctx || W === 0) return;
    ctx.globalCompositeOperation = 'destination-out';       // fade prior frame → soft streaks
    ctx.fillStyle = 'rgba(0,0,0,0.075)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    for (var i = 0; i < parts.length; i++) drawStreak(parts[i]);
  }

  function loop() { step(); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && visible) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function staticFrame() {
    if (!ctx || W === 0) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.r = Rmax * rand(0.12, 0.95);
      drawStreak(p);
    }
  }

  /* ---- boot ---- */
  build();
  if (ctx) {
    resize();
    initParticles();

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { resize(); if (reduce) staticFrame(); }).observe(root);
    } else {
      window.addEventListener('resize', function () { resize(); if (reduce) staticFrame(); });
    }

    if (reduce) {
      staticFrame();
    } else if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else stop(); });
      }, { threshold: 0.01 }).observe(root);
    } else {
      start();
    }
  }
})();
