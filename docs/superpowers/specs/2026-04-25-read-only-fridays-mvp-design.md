# Read Only Fridays — MVP Design Spec

## Context

Developers deploying on Fridays is the leading cause of weekend incidents and on-call misery. **Read Only Fridays** is a Chrome extension that disables destructive actions (merge, deploy, delete, release) on configurable days — defaulting to Friday — across developer-facing websites.

This MVP targets **GitHub only**, establishing the core content script engine, popup UI, and override system. The architecture is designed to support additional platforms (GitLab, Vercel, etc.) in future iterations without rewriting core logic.

## Scope

**In scope (MVP):**
- GitHub.com — all destructive actions disabled on read-only days
- Service worker with day detection, midnight alarm, message passing
- Content script with MutationObserver for GitHub's SPA behavior
- Popup with 3 states: active, sarcastic override prompt, override active
- Minimal options page for day-of-week configuration (Mon–Sun)
- Page banner injection (code comment style)
- Debug mode via `chrome.storage.local`

**Out of scope (future):**
- Additional platforms (GitLab, Vercel, Netlify, Heroku, Render, Railway, Fly.io, AWS, CircleCI, Jenkins)
- Site management in options (enable/disable per-site)
- Custom selector configuration
- Chrome Web Store publishing

## Architecture

### Approach: Hybrid — Manifest Content Script + Service Worker Gate

The content script is declared in the manifest and always loads on `github.com`. On load, it messages the service worker to ask "is today read-only?" and only activates if the answer is yes. The service worker is the single source of truth for state.

### Data Flow

```
┌─────────────────────┐     chrome.storage.session     ┌──────────────────────┐
│   Service Worker     │──────── writes state ────────▶│   Storage            │
│   (background)       │                                │   { isReadOnly,      │
│                      │◀──── alarm @ midnight ─────── │     overrideActive,  │
│  - checks day        │                                │     readOnlyDays }   │
│  - sets read-only    │                                └──────────────────────┘
│  - responds to msgs  │                                          │
└──────┬───────────────┘                                          │
       │                                                          │
  runtime.onMessage                                    storage.onChanged
       │                                                          │
       ▼                                                          ▼
┌─────────────────────┐                                ┌──────────────────────┐
│   Popup             │───── writes overrideActive ───▶│   Content Script     │
│   (dark terminal UI)│                                │   (github.com)       │
│                      │                                │                      │
│  - shows status      │                                │  - asks SW for state │
│  - sarcastic override│                                │  - disables elements │
│  - meme energy       │                                │  - injects banner    │
└─────────────────────┘                                │  - MutationObserver  │
                                                        └──────────────────────┘
```

### Flow: Page Load

1. Content script loads on `github.com` (declared in manifest)
2. Sends `chrome.runtime.sendMessage({ type: 'getState' })` to service worker
3. Service worker responds with `{ isReadOnly: true/false, overrideActive: true/false }`
4. If `isReadOnly && !overrideActive` → disable elements + show banner
5. Content script also listens to `chrome.storage.onChanged` for live updates

### Flow: Override

1. User opens popup → sees sarcastic prompt → clicks "🔥 I Choose Violence"
2. Popup writes `overrideActive: true` to `chrome.storage.session`
3. `storage.onChanged` fires in content script → re-enables elements, swaps banner to angry version
4. Override resets on browser close (session storage) — no permanent bypass

### Flow: Midnight Rollover

1. Service worker sets `chrome.alarms` for midnight (local time)
2. Alarm fires → re-evaluate current day against `readOnlyDays`
3. Update `isReadOnly` in `chrome.storage.session`
4. `storage.onChanged` propagates to all active content scripts

## Storage Schema

```js
// chrome.storage.sync — persistent, syncs across devices
{
  readOnlyDays: [5]  // Array of day numbers (0=Sun ... 6=Sat). Default: [5] (Friday)
}

// chrome.storage.session — ephemeral, resets on browser close
{
  isReadOnly: true,       // Whether today matches a read-only day
  overrideActive: false   // Whether user has activated the override
}

// chrome.storage.local — debug only
{
  debugForceActive: false  // Force read-only mode on any day (DevTools console)
}
```

## GitHub Selectors

Destructive actions to disable:

| Page | Action | Selector Strategy |
|------|--------|-------------------|
| Pull Request | Merge button (merge, squash, rebase variants) | `.merge-message .btn-group-merge .btn-primary` and related merge box buttons |
| Pull Request | Close PR button | Button containing "Close pull request" text |
| Pull Request | Delete branch (post-merge) | `.post-merge-message` delete action buttons |
| Branches | Delete branch buttons | Branch list delete buttons |
| Releases | Publish release | Release form submit button |
| Releases | Delete release | Release delete action buttons |
| Settings | Danger zone actions | `.Box--danger .btn-danger` |
| Actions | Re-run / cancel workflow | Workflow run action buttons |
| Code tab | Web editor commit buttons | Commit changes dialog submit |

**Selector validation note:** GitHub frequently updates its DOM structure. The selectors listed above are strategies, not final CSS selectors. During implementation, each selector must be validated against GitHub's current live markup using browser DevTools. Selectors should prefer stable attributes (`data-testid`, `aria-label`, role-based) over class names where possible.

### Disabling Behavior

- Elements receive `disabled` attribute + `pointer-events: none` + reduced opacity
- Original `title` is preserved; a meme-energy tooltip is set (e.g., `"🚫 Not today, Satan. It's Read Only Friday."`)
- Elements are disabled, **not hidden** — users see what's locked
- Content script is **idempotent** — safe to run multiple times

### MutationObserver Strategy

- Observe `document.body` with `{ childList: true, subtree: true }`
- On mutation batch, re-scan for target selectors and disable new matches
- Debounce mutations (100ms) to avoid thrashing on SPA navigations
- Track already-disabled elements via a `data-rof-disabled` attribute to avoid redundant processing

## UI Design

### Tone: Developer Meme Energy

All copy uses developer humor — meme references, sarcastic warnings, emoji. The extension doesn't take itself seriously, but it takes your weekend seriously.

### Popup — Dark Terminal Vibes

Three states:

**State 1: Friday Active (default)**
- Dark background (`#1a1a2e`), monospace font
- 🔒 icon, "READ ONLY FRIDAY" heading
- "It's Friday. Touch nothing."
- `🐕‍🦺 "This is fine" mode: OFF`
- Status: site name + "Destructive actions disabled"
- Subtle override button: "⚠️ Override (you sure?)"

**State 2: Sarcastic Override Prompt**
- 🫵😤 emoji header
- "Really? On a FRIDAY?"
- Guilt-trip messages: on-call engineer disturbance, weekend incidents entering the chat
- Two buttons: "🧘 Nevermind" (green) / "🔥 I Choose Violence" (red)

**State 3: Override Active**
- 🔓 icon, "THIS IS FINE 🐕‍🦺🔥" heading
- "Override active. You chose this."
- `🐕‍🦺 "This is fine" mode: ON`
- Status: "All actions re-enabled"
- Re-lock button: "🔒 Come to my senses"

**State 4: Not a Read-Only Day**
- 🟢 icon, "ALL CLEAR" heading
- "It's not a read-only day. Ship it."
- Show which days are configured as read-only

### Page Banner — Code Comment Style

Injected at the top of GitHub pages, below the navigation bar.

**Normal (read-only active):**
```
🛑 READ_ONLY_FRIDAY=true  // Fridays are for reading only!
```
- Dark background (`#1a1a2e`), red bottom border, monospace font
- Dismissible with × (dismissed state stored per-tab, not persisted)

**Override active:**
```
🔥 THIS_IS_FINE=true  // You chose violence. Deploy at your own risk.
```
- Same layout, yellow border instead of red

### Disabled Element Tooltips

Rotating meme-energy messages:
- "🚫 Not today, Satan. It's Read Only Friday."
- "🚫 This button is on PTO. Try again Monday."
- "🚫 Deploying on Friday? In THIS economy?"
- "🚫 Your on-call engineer thanks you for not clicking this."

### Options Page — Day Selector

- Same dark terminal aesthetic as popup
- 7 checkboxes (Mon–Sun), Friday checked by default
- Monospace font, dark background
- Changes save immediately to `chrome.storage.sync`

## File Structure

```
read-only-fridays/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── content-script.js
│   ├── content-style.css
│   └── selectors/
│       └── github.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

**Icons:** Do not make your own icons. Use a platform like https://composables.com/icons or https://www.svgrepo.com/ to find one that first first then export to PNG at required sizes (16, 48, 128). Minimal design — recognizable at 16px.

## Manifest Configuration

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
  "content_scripts": [{
    "matches": ["https://github.com/*"],
    "js": ["content/selectors/github.js", "content/content-script.js"],
    "css": ["content/content-style.css"],
    "run_at": "document_idle"
  }],
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

## Testing & Verification

1. **Load extension** in `chrome://extensions` (Developer mode → Load unpacked)
2. **Test Friday detection**: Set `debugForceActive: true` via DevTools console
3. **Verify GitHub disabling**: Navigate to a PR page, confirm merge/close buttons are disabled with tooltips
4. **Test MutationObserver**: Navigate between GitHub pages (SPA), confirm elements are re-disabled
5. **Test banner**: Verify code-comment-style banner appears at top of page, is dismissible
6. **Test override flow**: Click popup → confirm sarcastic prompt → click "I Choose Violence" → verify elements re-enable and banner swaps to angry version
7. **Test re-lock**: Click "Come to my senses" → verify elements re-disable
8. **Test options**: Change read-only days → verify the service worker recalculates state
9. **Test session reset**: Close and reopen browser → verify override is cleared
10. **Test midnight rollover**: Manually trigger alarm → verify state updates
