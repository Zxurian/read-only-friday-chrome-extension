// content/content-script.js
(function () {
  'use strict';

  // Attribute set on disabled elements to:
  //   (a) prevent re-processing (idempotency check)
  //   (b) store the original title so it can be restored on re-enable
  const DISABLED_ATTR = 'data-rof-disabled';

  // Rotating meme tooltips shown on disabled elements
  const TOOLTIPS = [
    '🚫 Not today, Satan. It\'s Read Only Friday.',
    '🚫 This button is on PTO. Try again Monday.',
    '🚫 Deploying on Friday? In THIS economy?',
    '🚫 Your on-call engineer thanks you for not clicking this.',
  ];

  let tooltipIndex = 0;
  function nextTooltip() {
    return TOOLTIPS[tooltipIndex++ % TOOLTIPS.length];
  }

  // Current state — updated by storage.onChanged listener
  let isReadOnly = false;
  let overrideActive = false;

  // Reference to the injected banner element (null when not present)
  let bannerEl = null;

  // Debounce timer handle for MutationObserver
  let mutationTimer = null;

  // Tracks whether the MutationObserver has been started
  var observerStarted = false;

  // ── Element disable / enable ──────────────────────────────────────────────

  function disableElements() {
    const selectors = window.ROF_SELECTORS || [];
    selectors.forEach(function (entry) {
      document.querySelectorAll(entry.selector).forEach(function (el) {
        if (el.hasAttribute(DISABLED_ATTR)) return; // already processed

        el.setAttribute(DISABLED_ATTR, el.getAttribute('title') || '');
        el.setAttribute('disabled', '');
        el.setAttribute('title', nextTooltip());
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('opacity', '0.5', 'important');
        el.style.setProperty('cursor', 'not-allowed', 'important');
      });
    });
  }

  function enableElements() {
    document.querySelectorAll('[' + DISABLED_ATTR + ']').forEach(function (el) {
      var originalTitle = el.getAttribute(DISABLED_ATTR);
      el.removeAttribute(DISABLED_ATTR);
      el.removeAttribute('disabled');
      if (originalTitle) {
        el.setAttribute('title', originalTitle);
      } else {
        el.removeAttribute('title');
      }
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
      el.style.removeProperty('cursor');
    });
  }

  // ── Banner ────────────────────────────────────────────────────────────────

  function injectBanner(override) {
    removeBanner();

    bannerEl = document.createElement('div');
    bannerEl.id = 'rof-banner';
    bannerEl.className = override ? 'rof-banner--override' : 'rof-banner--active';

    var message = override
      ? '🔥 THIS_IS_FINE=true  // You chose violence. Deploy at your own risk.'
      : '🛑 READ_ONLY_FRIDAY=true  // Fridays are for reading only!';

    var span = document.createElement('span');
    span.className = 'rof-banner__text';
    span.textContent = message;

    var btn = document.createElement('button');
    btn.className = 'rof-banner__close';
    btn.setAttribute('aria-label', 'Dismiss banner');
    btn.textContent = '×';
    btn.addEventListener('click', function () {
      removeBanner();
    });

    bannerEl.appendChild(span);
    bannerEl.appendChild(btn);

    // Insert immediately after GitHub's main header
    var header = document.querySelector('.Header, [role="banner"]');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(bannerEl, header.nextSibling);
    } else {
      document.body.prepend(bannerEl);
    }
  }

  function removeBanner() {
    if (bannerEl) {
      bannerEl.remove();
      bannerEl = null;
    }
  }

  // ── State application ─────────────────────────────────────────────────────

  function applyState() {
    if (isReadOnly && !overrideActive) {
      disableElements();
      injectBanner(false);
    } else if (isReadOnly && overrideActive) {
      enableElements();
      injectBanner(true);
    } else {
      enableElements();
      removeBanner();
    }
  }

  // ── MutationObserver ──────────────────────────────────────────────────────
  // GitHub is a SPA — new buttons appear after client-side navigation.
  // Re-scan on DOM mutations, debounced to 100ms to avoid thrashing.

  var observer = new MutationObserver(function () {
    if (!isReadOnly || overrideActive) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(disableElements, 100);
  });

  function startObserver() {
    observer.observe(document.body, { childList: true, subtree: true });
    observerStarted = true;
  }

  // ── Storage change listener ───────────────────────────────────────────────
  // Popup writes overrideActive; service worker writes isReadOnly.
  // Both fire storage.onChanged in the 'session' area.

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'session') return;
    if (changes.isReadOnly !== undefined) {
      isReadOnly = changes.isReadOnly.newValue;
    }
    if (changes.overrideActive !== undefined) {
      overrideActive = changes.overrideActive.newValue;
    }
    if (!observerStarted) { startObserver(); }
    applyState();
  });

  // ── Initialization ────────────────────────────────────────────────────────

  chrome.runtime.sendMessage({ type: 'getState' }, function (response) {
    if (chrome.runtime.lastError) {
      // Extension context unavailable (e.g. immediately after install before SW is ready).
      // The storage.onChanged listener will catch the first state write.
      return;
    }
    if (!response) return;
    isReadOnly = response.isReadOnly;
    overrideActive = response.overrideActive;
    applyState();
    startObserver();
  });

})();

// Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com
