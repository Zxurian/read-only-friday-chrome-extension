# Read Only Fridays — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension that disables destructive GitHub actions (merge, deploy, delete) on configurable days, defaulting to Friday, with a dark-terminal popup UI and sarcastic override flow.

**Architecture:** A service worker acts as the single source of truth for read-only state, persisted in `chrome.storage.session`. A content script declared in the manifest loads on every `github.com` page, queries the service worker on load, disables matched elements via a selector module, and listens to `chrome.storage.onChanged` for live updates. The popup reads/writes session storage directly and drives override state.

**Tech Stack:** Manifest V3, plain JS/HTML/CSS (no build step, no npm), Chrome Extension APIs (`storage`, `alarms`, `scripting`, `activeTab`), `chrome.storage.session` (Chrome 102+), `MutationObserver`.

---

## File Map

| File | Responsibility |
|------|---------------|
| `manifest.json` | MV3 manifest — permissions, content scripts, service worker, popup, options |
| `background/service-worker.js` | Day detection, midnight alarm, session state writes, message handler for `getState` |
| `content/selectors/github.js` | Sets `window.ROF_SELECTORS` — GitHub-specific CSS selector list. Loaded before content script. |
| `content/content-script.js` | Queries service worker, disables/enables elements, injects banner, MutationObserver, storage change listener |
| `content/content-style.css` | Banner layout/color (active vs override), disabled element visual treatment |
| `popup/popup.html` | Popup markup — 4 screen divs, only one visible at a time |
| `popup/popup.css` | Dark terminal aesthetic — `#1a1a2e` background, monospace, purple accents |
| `popup/popup.js` | Reads state on open, drives 4-state UI, writes `overrideActive` to session storage |
| `options/options.html` | Options page markup — 7 day checkboxes |
| `options/options.css` | Same dark terminal theme as popup |
| `options/options.js` | Loads `readOnlyDays` from sync storage, renders checkboxes, saves on change |
| `icons/icon-16.png` | Extension icon at 16px |
| `icons/icon-48.png` | Extension icon at 48px |
| `icons/icon-128.png` | Extension icon at 128px |
| `tools/generate-icons.html` | Opens in Chrome — draws lock icon via Canvas, downloads 3 PNGs |

---

## Task 1: Project Scaffold

**Files:**
- Create: `manifest.json`
- Create: `background/service-worker.js` (stub)
- Create: `content/selectors/github.js` (stub)
- Create: `content/content-script.js` (stub)
- Create: `content/content-style.css` (stub)
- Create: `popup/popup.html` (stub)
- Create: `popup/popup.css` (stub)
- Create: `popup/popup.js` (stub)
- Create: `options/options.html` (stub)
- Create: `options/options.css` (stub)
- Create: `options/options.js` (stub)
- Create: `tools/generate-icons.html`
- Create: `icons/` directory (placeholder icons follow from tool)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p background content/selectors popup options icons tools
```

- [ ] **Step 2: Create `tools/generate-icons.html`**

Open this file in Chrome to generate placeholder icons. It draws a purple lock on a dark background using Canvas — recognizable at 16px and stylistically consistent with the popup.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Generate Read Only Fridays Icons</title>
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #e8e8e8; padding: 24px; }
    button { background: #6e40c9; color: #fff; border: none; padding: 12px 24px; font-size: 16px; cursor: pointer; border-radius: 4px; }
    canvas { display: block; margin: 8px 0; image-rendering: pixelated; }
  </style>
</head>
<body>
  <h2>// generate_icons.html</h2>
  <button onclick="generateAll()">Generate + Download Icons</button>
  <div id="canvases"></div>
  <script>
    function drawLock(canvas, size) {
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, size, size);
      // Shackle (top arc of lock)
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.42, size * 0.22, Math.PI, 0);
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#6e40c9';
      ctx.lineCap = 'round';
      ctx.stroke();
      // Body (rounded rectangle)
      const bx = size * 0.22, by = size * 0.48;
      const bw = size * 0.56, bh = size * 0.42, br = size * 0.08;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, br);
      ctx.fillStyle = '#6e40c9';
      ctx.fill();
      // Keyhole circle
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.65, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
    }

    function downloadCanvas(canvas, filename) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = filename;
      a.click();
    }

    function generateAll() {
      const container = document.getElementById('canvases');
      container.innerHTML = '';
      [16, 48, 128].forEach(size => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.style.width = canvas.style.height = Math.max(size, 64) + 'px';
        drawLock(canvas, size);
        const label = document.createElement('p');
        label.textContent = `icon-${size}.png`;
        container.appendChild(label);
        container.appendChild(canvas);
        downloadCanvas(canvas, `icon-${size}.png`);
      });
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Generate icons**

1. Open `tools/generate-icons.html` in Chrome (drag into address bar or `File > Open`).
2. Click **"Generate + Download Icons"** — Chrome downloads `icon-16.png`, `icon-48.png`, `icon-128.png`.
3. Move all three downloaded files into the `icons/` directory.

- [ ] **Step 4: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Read Only Fridays",
  "description": "Disables destructive actions on configurable days. Because Fridays are for reading only.",
  "version": "0.1.0",
  "permissions": ["storage", "activeTab", "scripting", "alarms"],
  "host_permissions": ["https://github.com/*"],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["content/selectors/github.js", "content/content-script.js"],
      "css": ["content/content-style.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_page": "options/options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 5: Create empty stub files so Chrome loads without errors**

Create each file with a single comment — these will be replaced in subsequent tasks:

`background/service-worker.js`:
```js
// Read Only Fridays — service worker (stub)
```

`content/selectors/github.js`:
```js
// Read Only Fridays — GitHub selectors (stub)
window.ROF_SELECTORS = [];
```

`content/content-script.js`:
```js
// Read Only Fridays — content script (stub)
```

`content/content-style.css`:
```css
/* Read Only Fridays — content styles (stub) */
```

`popup/popup.html`:
```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>ROF</title></head>
<body><p>Loading...</p></body></html>
```

`popup/popup.css`:
```css
/* stub */
```

`popup/popup.js`:
```js
// stub
```

`options/options.html`:
```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>ROF Options</title></head>
<body><p>Loading...</p></body></html>
```

`options/options.css`:
```css
/* stub */
```

`options/options.js`:
```js
// stub
```

- [ ] **Step 6: Load extension in Chrome and verify it loads without errors**

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `read-only-fridays/` directory (the one containing `manifest.json`)
4. Expected: extension card appears, no errors shown, lock icon appears in toolbar

- [ ] **Step 7: Commit**

```bash
git add manifest.json background/ content/ popup/ options/ icons/ tools/
git commit -m "feat: scaffold extension — manifest, stubs, icons"
```

---

## Task 2: Service Worker

**Files:**
- Modify: `background/service-worker.js`

- [ ] **Step 1: Replace service-worker.js with full implementation**

```js
// background/service-worker.js
'use strict';

const DEFAULT_READ_ONLY_DAYS = [5]; // Friday

// --- State helpers ---

async function getReadOnlyDays() {
  const result = await chrome.storage.sync.get({ readOnlyDays: DEFAULT_READ_ONLY_DAYS });
  return result.readOnlyDays;
}

async function isDebugForceActive() {
  const result = await chrome.storage.local.get({ debugForceActive: false });
  return result.debugForceActive;
}

/**
 * Evaluate whether today is a read-only day and persist to session storage.
 * Resets overrideActive so midnight rollover clears any active override.
 * Returns the new isReadOnly value.
 */
async function checkAndSetState() {
  const [readOnlyDays, debugForce] = await Promise.all([
    getReadOnlyDays(),
    isDebugForceActive(),
  ]);
  const today = new Date().getDay(); // 0=Sun … 6=Sat, local time
  const isReadOnly = debugForce || readOnlyDays.includes(today);
  await chrome.storage.session.set({ isReadOnly, overrideActive: false });
  return isReadOnly;
}

// --- Alarm: fires at midnight local time ---

function scheduleMidnightAlarm() {
  const now = new Date();
  // Next midnight in local time (getDate()+1 with hour/min/sec = 0)
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 1 // 1 second past midnight to avoid edge cases
  );
  chrome.alarms.create('midnight-check', { when: midnight.getTime() });
}

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(async () => {
  await checkAndSetState();
  scheduleMidnightAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await checkAndSetState();
  scheduleMidnightAlarm();
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'midnight-check') {
    await checkAndSetState();
    scheduleMidnightAlarm(); // reschedule for next midnight
  }
});

// --- Message handler ---
// Content script and popup send { type: 'getState' } to read current state.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'getState') {
    chrome.storage.session
      .get({ isReadOnly: false, overrideActive: false })
      .then(sendResponse);
    return true; // keep message channel open for async response
  }
  return false;
});

// --- React to settings changes ---
// If the user changes readOnlyDays in options, or toggles debugForceActive
// via DevTools console, re-evaluate state immediately.

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.readOnlyDays) {
    await checkAndSetState();
  }
  if (area === 'local' && changes.debugForceActive) {
    await checkAndSetState();
  }
});
```

- [ ] **Step 2: Verify service worker in Chrome**

1. Reload the extension in `chrome://extensions` (click the refresh ↺ icon).
2. Click **"Service Worker"** link on the extension card — this opens DevTools for the service worker.
3. In the **Console** tab, run:
   ```js
   chrome.storage.session.get(null, console.log)
   ```
   Expected output: `{ isReadOnly: false, overrideActive: false }` (or `isReadOnly: true` if today is Friday).

4. Test debug override: in the same console, run:
   ```js
   chrome.storage.local.set({ debugForceActive: true })
   ```
   Then run `chrome.storage.session.get(null, console.log)` again.
   Expected: `{ isReadOnly: true, overrideActive: false }`

5. Reset: `chrome.storage.local.set({ debugForceActive: false })`

- [ ] **Step 3: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: add service worker — day detection, midnight alarm, state management"
```

---

## Task 3: GitHub Selectors

**Files:**
- Modify: `content/selectors/github.js`

- [ ] **Step 1: Replace github.js with full selector list**

This file sets `window.ROF_SELECTORS` (a global read by `content-script.js`). The selectors use stable `aria-label`, `name`, and `data-*` attributes where possible. GitHub's DOM changes frequently — each selector includes a comment describing the target action so they can be updated when GitHub's markup changes.

```js
// content/selectors/github.js
// Loaded before content-script.js. Sets window.ROF_SELECTORS.
// Each entry: { selector: string, label: string }
// selector — CSS selector targeting the destructive button/input
// label    — human-readable description (used in future logging/UI)
//
// MAINTENANCE NOTE: GitHub updates its DOM structure regularly.
// When a selector stops matching, open GitHub DevTools, find the button,
// and update the selector. Prefer aria-label, data-testid, and name
// attributes over class names — they are more stable across redesigns.

window.ROF_SELECTORS = [
  // ── Pull Request: Merge variants ────────────────────────────────────────
  // The main merge button (may be split-button trigger or direct submit)
  { selector: 'button[data-testid="merge-button"]',           label: 'Merge pull request' },
  { selector: 'button[aria-label="Merge pull request"]',      label: 'Merge pull request' },
  { selector: '.merge-box button[type="submit"]',             label: 'Merge pull request (form submit)' },
  // Squash and rebase variants inside the split-button dropdown
  { selector: 'button[data-testid="squash-merge-button"]',    label: 'Squash and merge' },
  { selector: 'button[data-testid="rebase-merge-button"]',    label: 'Rebase and merge' },
  { selector: 'button[aria-label="Squash and merge"]',        label: 'Squash and merge' },
  { selector: 'button[aria-label="Rebase and merge"]',        label: 'Rebase and merge' },

  // ── Pull Request: Close PR ───────────────────────────────────────────────
  { selector: 'button[name="comment_and_close"]',             label: 'Close pull request' },
  { selector: 'button[aria-label="Close pull request"]',      label: 'Close pull request' },

  // ── Pull Request: Delete branch (post-merge prompt) ─────────────────────
  { selector: '.post-merge-message button[type="submit"]',    label: 'Delete branch (post-merge)' },
  { selector: 'button[aria-label="Delete branch"]',           label: 'Delete branch' },

  // ── Branches list: Delete branch buttons ────────────────────────────────
  { selector: 'button[aria-label*="Delete branch"]',          label: 'Delete branch (branch list)' },

  // ── Releases: Publish release ────────────────────────────────────────────
  { selector: 'button[name="release_action"][value="publish"]', label: 'Publish release' },
  // Legacy releases page submit
  { selector: 'form.new_release button[type="submit"]',       label: 'Publish release (form)' },

  // ── Releases: Delete release ─────────────────────────────────────────────
  { selector: '.release .btn-danger',                         label: 'Delete release' },
  { selector: 'button[aria-label*="Delete release"]',         label: 'Delete release' },

  // ── Settings: Danger zone ────────────────────────────────────────────────
  { selector: '.Box--danger .btn-danger',                     label: 'Danger zone action' },
  { selector: '.Box--danger button[type="submit"]',           label: 'Danger zone submit' },

  // ── Actions: Re-run / Cancel workflow ───────────────────────────────────
  { selector: 'button[aria-label*="Re-run"]',                 label: 'Re-run workflow' },
  { selector: 'button[aria-label*="Cancel workflow"]',        label: 'Cancel workflow' },

  // ── Web editor: Commit changes ───────────────────────────────────────────
  // Dialog "Commit changes" button (web editor)
  { selector: 'button[data-hotkey="Meta+Enter"]',             label: 'Commit changes (web editor)' },
  { selector: '.commit-form-actions button[type="submit"]',   label: 'Commit changes (form)' },
];
```

- [ ] **Step 2: Validate selectors against live GitHub**

For each selector category, open the corresponding GitHub page and verify the selector matches the intended button:

1. Open a GitHub PR page → open DevTools Console → run:
   ```js
   document.querySelectorAll('button[data-testid="merge-button"]')
   ```
   Expected: NodeList containing the merge button (if PR is mergeable).

2. Test the close PR selector:
   ```js
   document.querySelectorAll('button[name="comment_and_close"]')
   ```
   Expected: NodeList containing the close button.

3. Test the danger zone selector on a repo Settings page:
   ```js
   document.querySelectorAll('.Box--danger .btn-danger')
   ```
   Expected: NodeList containing danger zone buttons (e.g., "Delete this repository").

4. **If a selector returns an empty NodeList**: use the DevTools Elements panel to inspect the actual button, find a stable attribute (`aria-label`, `data-testid`, `name`), and update `content/selectors/github.js` before proceeding.

- [ ] **Step 3: Commit**

```bash
git add content/selectors/github.js
git commit -m "feat: add GitHub selector config for destructive actions"
```

---

## Task 4: Content Script

**Files:**
- Modify: `content/content-script.js`

- [ ] **Step 1: Replace content-script.js with full implementation**

```js
// content/content-script.js
// Wrapped in IIFE to avoid polluting the page's global scope.
(function () {
  'use strict';

  // Attribute set on disabled elements so we can: (a) skip re-processing,
  // (b) restore original title on re-enable.
  const DISABLED_ATTR = 'data-rof-disabled';

  // Tooltip messages rotated across disabled elements.
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

  // Current state — updated by storage.onChanged listener.
  let isReadOnly = false;
  let overrideActive = false;

  // Reference to the injected banner element (or null if not present).
  let bannerEl = null;

  // Debounce timer for MutationObserver.
  let mutationTimer = null;

  // ── Element disable / enable ──────────────────────────────────────────────

  function disableElements() {
    const selectors = window.ROF_SELECTORS || [];
    selectors.forEach(({ selector }) => {
      document.querySelectorAll(selector).forEach((el) => {
        // Idempotent: skip elements already processed this session.
        if (el.hasAttribute(DISABLED_ATTR)) return;

        // Persist original title so we can restore it on re-enable.
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
    document.querySelectorAll(`[${DISABLED_ATTR}]`).forEach((el) => {
      const originalTitle = el.getAttribute(DISABLED_ATTR);

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
    // Remove existing banner before re-injecting.
    removeBanner();

    bannerEl = document.createElement('div');
    bannerEl.id = 'rof-banner';
    bannerEl.className = override ? 'rof-banner--override' : 'rof-banner--active';

    const message = override
      ? '🔥 THIS_IS_FINE=true  // You chose violence. Deploy at your own risk.'
      : '🛑 READ_ONLY_FRIDAY=true  // Fridays are for reading only!';

    bannerEl.innerHTML =
      '<span class="rof-banner__text">' + message + '</span>' +
      '<button class="rof-banner__close" aria-label="Dismiss banner">&times;</button>';

    bannerEl.querySelector('.rof-banner__close').addEventListener('click', () => {
      removeBanner();
    });

    // Insert immediately after GitHub's main header so it doesn't break layout.
    const header = document.querySelector('.Header, [role="banner"]');
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
      // Not a read-only day — ensure nothing is blocked.
      enableElements();
      removeBanner();
    }
  }

  // ── MutationObserver ──────────────────────────────────────────────────────
  // GitHub is a SPA. New buttons render after navigation without a page reload.
  // We re-scan on DOM mutations, debounced to 100 ms to avoid thrashing.

  const observer = new MutationObserver(() => {
    if (!isReadOnly || overrideActive) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(disableElements, 100);
  });

  function startObserver() {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Storage change listener ───────────────────────────────────────────────
  // Popup writes overrideActive; service worker writes isReadOnly.
  // Both changes propagate here for live updates without page reload.

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'session') return;

    if (changes.isReadOnly !== undefined) {
      isReadOnly = changes.isReadOnly.newValue;
    }
    if (changes.overrideActive !== undefined) {
      overrideActive = changes.overrideActive.newValue;
    }

    applyState();
  });

  // ── Initialization ────────────────────────────────────────────────────────
  // Ask the service worker for the current state, then apply it.

  chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
    if (chrome.runtime.lastError) {
      // Extension context not ready (e.g. immediately after install).
      // The storage.onChanged listener will catch the first state write.
      return;
    }
    isReadOnly = response.isReadOnly;
    overrideActive = response.overrideActive;
    applyState();
    startObserver();
  });
})();
```

- [ ] **Step 2: Reload extension and verify content script loads without errors**

1. Reload extension in `chrome://extensions`.
2. Navigate to any `https://github.com` page.
3. Open DevTools (F12) → **Console** tab.
4. Expected: no errors related to `ROF` or `content-script.js`.
5. Run: `document.querySelectorAll('[data-rof-disabled]')` → Expected: empty NodeList (since debug force is off).

- [ ] **Step 3: Test disabling with debug mode**

1. Open DevTools → **Application** → **Extension Storage** → find your extension → **Local** storage.
2. Add key `debugForceActive` with value `true`. (Or run in Service Worker console: `chrome.storage.local.set({ debugForceActive: true })`)
3. The service worker `storage.onChanged` listener will update session state automatically.
4. Hard-reload the GitHub page (Ctrl+Shift+R).
5. Expected: merge/close buttons on a PR page are visually dimmed (opacity 0.5) and show the meme tooltip on hover.
6. Run: `document.querySelectorAll('[data-rof-disabled]')` → Expected: NodeList with matched buttons.

- [ ] **Step 4: Reset debug mode**

In service worker console: `chrome.storage.local.set({ debugForceActive: false })`

- [ ] **Step 5: Commit**

```bash
git add content/content-script.js
git commit -m "feat: add content script — element disabling, MutationObserver, banner, live state sync"
```

---

## Task 5: Content Styles

**Files:**
- Modify: `content/content-style.css`

- [ ] **Step 1: Replace content-style.css with full styles**

```css
/* content/content-style.css */

/* ── Banner ──────────────────────────────────────────────────────────────── */

#rof-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  z-index: 10000;
  box-sizing: border-box;
  width: 100%;
}

/* Friday / read-only active — red bottom border */
#rof-banner.rof-banner--active {
  background-color: #1a1a2e;
  color: #e8e8e8;
  border-bottom: 2px solid #dc3545;
}

/* Override active — yellow bottom border (danger, but chosen) */
#rof-banner.rof-banner--override {
  background-color: #1a1a2e;
  color: #e8e8e8;
  border-bottom: 2px solid #ffc107;
}

.rof-banner__text {
  flex: 1;
  letter-spacing: 0.02em;
}

.rof-banner__close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 0 12px;
  transition: color 0.15s;
}

.rof-banner__close:hover {
  color: #e8e8e8;
}
```

- [ ] **Step 2: Verify banner appearance**

1. Ensure `debugForceActive: true` is set (see Task 4 Step 3).
2. Reload a GitHub page.
3. Expected: dark banner with red bottom border appears at the top of the page, below GitHub's header. Banner contains `🛑 READ_ONLY_FRIDAY=true  // Fridays are for reading only!`
4. Click `×` → banner dismisses.

- [ ] **Step 3: Commit**

```bash
git add content/content-style.css
git commit -m "feat: add content styles — banner (active + override variants)"
```

---

## Task 6: Popup

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.css`
- Modify: `popup/popup.js`

- [ ] **Step 1: Replace `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Read Only Fridays</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>

  <!-- State 1: Read-only day, no override -->
  <div id="screen-active" class="screen hidden">
    <div class="icon">🔒</div>
    <h1>READ ONLY FRIDAY</h1>
    <p class="tagline">It's Friday. Touch nothing.</p>
    <div class="status-badge status-badge--off">🐕‍🦺 &ldquo;This is fine&rdquo; mode: <strong>OFF</strong></div>
    <div class="site-status">github.com — Destructive actions disabled</div>
    <button id="btn-show-prompt" class="btn btn--subtle">⚠️ Override (you sure?)</button>
  </div>

  <!-- State 2: Sarcastic override prompt -->
  <div id="screen-prompt" class="screen hidden">
    <div class="icon">🫵😤</div>
    <h1>Really? On a FRIDAY?</h1>
    <p class="guilt">An on-call engineer is about to have their weekend ruined.</p>
    <p class="guilt">A weekend incident is entering the chat.</p>
    <div class="btn-row">
      <button id="btn-nevermind" class="btn btn--green">🧘 Nevermind</button>
      <button id="btn-choose-violence" class="btn btn--red">🔥 I Choose Violence</button>
    </div>
  </div>

  <!-- State 3: Override active -->
  <div id="screen-overridden" class="screen hidden">
    <div class="icon">🔓</div>
    <h1>THIS IS FINE 🐕‍🦺🔥</h1>
    <p class="tagline">Override active. You chose this.</p>
    <div class="status-badge status-badge--on">🐕‍🦺 &ldquo;This is fine&rdquo; mode: <strong>ON</strong></div>
    <div class="site-status">All actions re-enabled</div>
    <button id="btn-relock" class="btn btn--subtle">🔒 Come to my senses</button>
  </div>

  <!-- State 4: Not a read-only day -->
  <div id="screen-clear" class="screen hidden">
    <div class="icon">🟢</div>
    <h1>ALL CLEAR</h1>
    <p class="tagline">It's not a read-only day. Ship it.</p>
    <div class="days-info" id="days-info"></div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace `popup/popup.css`**

```css
/* popup/popup.css */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 300px;
  min-height: 160px;
  background: #1a1a2e;
  color: #e8e8e8;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  padding: 20px 18px 18px;
  user-select: none;
}

/* ── Screen management ───────────────────────────────────────────────────── */

.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.screen.hidden {
  display: none;
}

/* ── Common elements ─────────────────────────────────────────────────────── */

.icon {
  font-size: 32px;
  line-height: 1;
}

h1 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #c792ea;
}

.tagline {
  font-size: 12px;
  color: #a9b7c6;
}

.guilt {
  font-size: 12px;
  color: #ffcb6b;
  max-width: 240px;
}

.site-status {
  font-size: 11px;
  color: #546e7a;
  margin-top: 2px;
}

/* ── Status badge ────────────────────────────────────────────────────────── */

.status-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 3px;
  letter-spacing: 0.02em;
}

.status-badge--off {
  background: #12122a;
  color: #546e7a;
  border: 1px solid #2a2a4a;
}

.status-badge--on {
  background: #12122a;
  color: #ffc107;
  border: 1px solid #ffc107;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

.btn {
  font-family: inherit;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  letter-spacing: 0.03em;
}

.btn:hover {
  opacity: 0.85;
}

.btn:active {
  transform: scale(0.97);
}

.btn--subtle {
  background: #12122a;
  color: #546e7a;
  border: 1px solid #2a2a4a;
  margin-top: 4px;
}

.btn--subtle:hover {
  color: #a9b7c6;
  border-color: #4a4a6a;
  opacity: 1;
}

.btn--green {
  background: #1b5e20;
  color: #a5d6a7;
}

.btn--red {
  background: #b71c1c;
  color: #ffcdd2;
}

.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* ── All Clear — day info ────────────────────────────────────────────────── */

.days-info {
  font-size: 11px;
  color: #546e7a;
  margin-top: 2px;
}
```

- [ ] **Step 3: Replace `popup/popup.js`**

```js
// popup/popup.js
'use strict';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Screen helpers ────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ── Initialization ────────────────────────────────────────────────────────

async function init() {
  const [state, syncResult] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'getState' }),
    chrome.storage.sync.get({ readOnlyDays: [5] }),
  ]);

  const { isReadOnly, overrideActive } = state;
  const { readOnlyDays } = syncResult;

  if (!isReadOnly) {
    // State 4: not a read-only day
    const names = readOnlyDays.length
      ? readOnlyDays.map((d) => DAY_NAMES[d]).join(', ')
      : 'none';
    document.getElementById('days-info').textContent = 'Read-only days: ' + names;
    showScreen('screen-clear');
    return;
  }

  if (overrideActive) {
    // State 3: override is active
    showScreen('screen-overridden');
  } else {
    // State 1: read-only, no override
    showScreen('screen-active');
  }
}

// ── Button handlers ───────────────────────────────────────────────────────

// State 1 → State 2
document.getElementById('btn-show-prompt').addEventListener('click', () => {
  showScreen('screen-prompt');
});

// State 2 → State 1 (changed mind)
document.getElementById('btn-nevermind').addEventListener('click', () => {
  showScreen('screen-active');
});

// State 2 → State 3 (confirmed override)
document.getElementById('btn-choose-violence').addEventListener('click', async () => {
  await chrome.storage.session.set({ overrideActive: true });
  showScreen('screen-overridden');
});

// State 3 → State 1 (re-lock)
document.getElementById('btn-relock').addEventListener('click', async () => {
  await chrome.storage.session.set({ overrideActive: false });
  showScreen('screen-active');
});

// ── Start ─────────────────────────────────────────────────────────────────

init();
```

- [ ] **Step 4: Verify popup — State 4 (not read-only day)**

Today is Saturday 2026-04-25, so without debug mode, `isReadOnly` is false.

1. Reload extension. Click the extension icon in the toolbar.
2. Expected: popup shows 🟢 **ALL CLEAR**, "It's not a read-only day. Ship it.", "Read-only days: Friday".

- [ ] **Step 5: Verify popup — States 1, 2, 3**

1. Enable debug mode in service worker console: `chrome.storage.local.set({ debugForceActive: true })`
2. Close and reopen popup.
3. Expected: 🔒 **READ ONLY FRIDAY**, "It's Friday. Touch nothing.", "This is fine mode: OFF", subtle override button.
4. Click **"⚠️ Override (you sure?)"** → Expected: sarcastic screen with 🫵😤, guilt-trip messages, two buttons.
5. Click **"🧘 Nevermind"** → Expected: returns to State 1.
6. Click **"⚠️ Override"** again → click **"🔥 I Choose Violence"** → Expected: 🔓 **THIS IS FINE**, "Override active. You chose this.", "This is fine mode: ON".
7. Click **"🔒 Come to my senses"** → Expected: returns to State 1.

- [ ] **Step 6: Commit**

```bash
git add popup/popup.html popup/popup.css popup/popup.js
git commit -m "feat: add popup — 4-state dark terminal UI with sarcastic override flow"
```

---

## Task 7: Options Page

**Files:**
- Modify: `options/options.html`
- Modify: `options/options.css`
- Modify: `options/options.js`

- [ ] **Step 1: Replace `options/options.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Read Only Fridays — Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="prompt">$</span> read_only_fridays <span class="cursor">_</span>
    </div>
    <h1>// Settings</h1>
    <p class="subtitle">Which days of the week should be read-only? Changes save instantly.</p>

    <div class="section">
      <h2>Read-only days</h2>
      <div class="days-grid" id="days-grid">
        <!-- Populated by options.js -->
      </div>
    </div>

    <p class="note">
      State updates at midnight or when the browser starts.<br>
      To force an immediate update: open the service worker DevTools console and run<br>
      <code>chrome.storage.local.set({ debugForceActive: true })</code>
    </p>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace `options/options.css`**

```css
/* options/options.css */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #1a1a2e;
  color: #e8e8e8;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  min-height: 100vh;
  padding: 40px;
}

.container {
  max-width: 480px;
}

.header {
  font-size: 12px;
  color: #546e7a;
  margin-bottom: 20px;
  letter-spacing: 0.04em;
}

.prompt {
  color: #6e40c9;
}

.cursor {
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

h1 {
  font-size: 20px;
  color: #c792ea;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 13px;
  color: #a9b7c6;
  margin-bottom: 28px;
  line-height: 1.6;
}

.section {
  margin-bottom: 28px;
}

h2 {
  font-size: 12px;
  color: #546e7a;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 14px;
}

/* Days grid: Mon–Sun in a single row */
.days-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.day-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #12122a;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 8px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: #a9b7c6;
  transition: border-color 0.15s, color 0.15s;
  user-select: none;
}

.day-item:hover {
  border-color: #6e40c9;
  color: #e8e8e8;
}

.day-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #6e40c9;
  cursor: pointer;
}

.day-item.checked {
  border-color: #6e40c9;
  color: #c792ea;
}

.note {
  font-size: 11px;
  color: #546e7a;
  line-height: 1.8;
  border-top: 1px solid #2a2a4a;
  padding-top: 16px;
}

code {
  color: #ffcb6b;
  font-family: inherit;
}
```

- [ ] **Step 3: Replace `options/options.js`**

```js
// options/options.js
'use strict';

// Days rendered in Mon–Sun order (matching the spec).
// index is the JS getDay() value (0 = Sunday).
const DAYS = [
  { index: 1, label: 'Monday' },
  { index: 2, label: 'Tuesday' },
  { index: 3, label: 'Wednesday' },
  { index: 4, label: 'Thursday' },
  { index: 5, label: 'Friday' },
  { index: 6, label: 'Saturday' },
  { index: 0, label: 'Sunday' },
];

async function init() {
  const { readOnlyDays } = await chrome.storage.sync.get({ readOnlyDays: [5] });
  const grid = document.getElementById('days-grid');

  DAYS.forEach(({ index, label }) => {
    const labelEl = document.createElement('label');
    labelEl.className = 'day-item' + (readOnlyDays.includes(index) ? ' checked' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(index);
    checkbox.checked = readOnlyDays.includes(index);

    checkbox.addEventListener('change', () => {
      // Toggle .checked class for styling
      labelEl.classList.toggle('checked', checkbox.checked);
      saveSettings();
    });

    labelEl.appendChild(checkbox);
    labelEl.appendChild(document.createTextNode(label));
    grid.appendChild(labelEl);
  });
}

async function saveSettings() {
  const checked = [...document.querySelectorAll('#days-grid input[type="checkbox"]:checked')]
    .map((el) => Number(el.value));
  await chrome.storage.sync.set({ readOnlyDays: checked });
}

init();
```

- [ ] **Step 4: Verify options page**

1. Right-click the extension icon → **Options** (or go to `chrome://extensions` → Details → Extension options).
2. Expected: dark terminal UI with 7 day checkboxes, Friday pre-checked.
3. Uncheck Friday, check Thursday. Expected: changes save immediately.
4. Open service worker console: `chrome.storage.sync.get(null, console.log)`
   Expected: `{ readOnlyDays: [4] }`
5. Re-check Friday, uncheck Thursday. Verify storage returns `{ readOnlyDays: [5] }`.

- [ ] **Step 5: Verify options → service worker round-trip**

1. In options, check Saturday (6) in addition to Friday (5).
2. Expected: service worker's `storage.onChanged` listener fires and recalculates `isReadOnly`.
3. In service worker console: `chrome.storage.session.get(null, console.log)`
   Expected: `{ isReadOnly: false, overrideActive: false }` (today is Saturday 2026-04-25).
   After checking Saturday, expected: `{ isReadOnly: true, overrideActive: false }`.
4. Restore options to Friday only.

- [ ] **Step 6: Commit**

```bash
git add options/options.html options/options.css options/options.js
git commit -m "feat: add options page — day-of-week selector with immediate sync storage save"
```

---

## Task 8: Integration Verification

Full end-to-end test of all spec requirements. Run through each numbered item.

**Setup:** Reload extension. Enable debug mode in service worker console:
```js
chrome.storage.local.set({ debugForceActive: true })
```

- [ ] **Test 1: Extension loads cleanly**

Go to `chrome://extensions`. Expected: no errors on the extension card. Service worker shows as active.

- [ ] **Test 2: Friday detection / debug mode**

In service worker console:
```js
chrome.storage.session.get(null, console.log)
```
Expected: `{ isReadOnly: true, overrideActive: false }`

- [ ] **Test 3: GitHub elements disabled**

Navigate to a GitHub PR that has a merge button (e.g., any open PR on your account or a public repo).
Expected:
- Merge button is visually dimmed (opacity ~0.5)
- Hovering shows a meme tooltip (e.g., "🚫 Not today, Satan...")
- Button has `disabled` attribute
- Banner appears at top: `🛑 READ_ONLY_FRIDAY=true  // Fridays are for reading only!`

- [ ] **Test 4: MutationObserver / SPA navigation**

On GitHub, click through the PR list → open a different PR → navigate to the Settings page.
Expected: elements on each new page are disabled without a full page reload (MutationObserver is working).

- [ ] **Test 5: Banner dismissal**

Click `×` on the banner. Expected: banner disappears. Refresh the page. Expected: banner reappears (dismissal is per-tab-session, not persisted).

- [ ] **Test 6: Override flow — activate**

1. Click the extension icon. Expected: State 1 popup (🔒 READ ONLY FRIDAY).
2. Click **"⚠️ Override (you sure?)"**. Expected: State 2 sarcastic prompt.
3. Click **"🔥 I Choose Violence"**.
4. Expected:
   - Popup shows State 3: 🔓 THIS IS FINE 🐕‍🦺🔥
   - On GitHub page: elements are re-enabled, banner changes to `🔥 THIS_IS_FINE=true` with yellow border
   - `[data-rof-disabled]` attributes removed from all buttons

- [ ] **Test 7: Re-lock**

1. In popup, click **"🔒 Come to my senses"**.
2. Expected:
   - Popup shows State 1 (🔒 READ ONLY FRIDAY)
   - GitHub elements are disabled again, banner returns to red-bordered active version

- [ ] **Test 8: Options — change read-only days**

1. Open Options page. Uncheck Friday, check Monday.
2. Reload a GitHub page.
3. In service worker console: `chrome.storage.session.get(null, console.log)`
   Expected: `{ isReadOnly: false, overrideActive: false }` (today is Saturday, not Monday)
4. GitHub elements should now be enabled (banner not showing).
5. Restore to Friday only.

- [ ] **Test 9: Session reset clears override**

1. Enable debug mode and activate override.
2. Close Chrome completely (all windows). Reopen Chrome.
3. Open the extension popup.
4. Expected: override is gone (State 1 or State 4 — session storage cleared on browser close).

- [ ] **Test 10: Midnight alarm scheduling**

In service worker console:
```js
chrome.alarms.getAll(console.log)
```
Expected: Array containing `{ name: 'midnight-check', scheduledTime: <timestamp for next midnight> }`.

Manually trigger it (sets the alarm to fire immediately):
```js
chrome.alarms.create('midnight-check', { when: Date.now() + 1000 })
```
Wait 2 seconds. Then:
```js
chrome.storage.session.get(null, console.log)
```
Expected: state has been re-evaluated and a new midnight alarm has been scheduled.

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: integration verification complete — MVP ready"
```

---

## Post-MVP Notes

- **Selector drift:** GitHub updates its DOM. If buttons stop being disabled, open DevTools on the GitHub page, inspect the target button, and update `content/selectors/github.js` with the new stable selector.
- **Adding new platforms:** Create `content/selectors/<platform>.js` following the same `window.ROF_<PLATFORM>_SELECTORS` pattern, add the host permission to `manifest.json`, and update the content script to merge selector arrays.
- **Chrome Web Store:** Before publishing, replace placeholder icons (`tools/generate-icons.html`) with professionally designed icons at 16/48/128px per Chrome Web Store guidelines.

---

*Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com*
