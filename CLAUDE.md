# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Read Only Fridays** is a Chrome extension that enforces a "no deployments on Fridays" policy by disabling form inputs and action buttons related to pushing, merging, and deploying code — across a configurable set of developer-facing websites.

The core principle: on Fridays, destructive/irreversible production actions (merge, deploy, push, release) should be blocked or visually disabled to prevent weekend incidents.

## Extension Architecture

This is a Manifest V3 Chrome Extension with the following structure:

```
read-only-fridays/
├── manifest.json          # MV3 manifest — declares permissions, content scripts, service worker
├── background/
│   └── service-worker.js  # Checks day-of-week, broadcasts enable/disable state to tabs
├── content/
│   ├── content-script.js  # Injected into target sites — disables matched elements
│   └── selectors/         # Per-site selector configs (GitHub, GitLab, Vercel, etc.)
│       ├── github.js
│       ├── gitlab.js
│       └── ...
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Toggle override, show current status
│   └── popup.css
└── options/
    ├── options.html       # Settings page — manage site list, custom selectors
    ├── options.js
    └── options.css
```

## Key Concepts

### Day Detection
The service worker determines if today is Friday (`new Date().getDay() === 5`). This check should use the **user's local time**, not UTC. The active state is stored in `chrome.storage.session` so it resets on browser restart.

### Content Script Behavior
- On Friday: matched buttons/inputs are **disabled** (not hidden) with a tooltip explaining why.
- A banner is optionally injected at the top of the page as a visual reminder.
- The script uses **MutationObserver** to handle dynamically rendered UI (SPAs like GitHub/GitLab load content asynchronously).

### Target Sites & Selectors
Each site has its own selector module in `content/selectors/`. A selector entry looks like:

```js
export default {
  hostname: 'github.com',
  selectors: [
    { selector: 'button[data-testid="merge-button"]', label: 'Merge Pull Request' },
    { selector: '.btn-danger:contains("Delete")', label: 'Delete Branch' },
    // ...
  ]
};
```

Priority sites to support: **GitHub**, **GitLab**, **Vercel**, **Netlify**, **Heroku**, **Render**, **Railway**, **Fly.io**, **AWS Console (CodePipeline/ECS)**, **CircleCI**, **Jenkins**.

### Override Mechanism
Users can temporarily bypass the Friday lock via the popup with an **"I know what I'm doing"** override. The override is stored in `chrome.storage.session` (expires on browser close) and requires typing a confirmation phrase to reduce accidental clicks.

### Permissions Required (manifest.json)
- `storage` — persist settings and override state
- `activeTab` + `scripting` — inject content scripts
- `alarms` — re-evaluate day at midnight
- Host permissions scoped to supported site patterns

## Development Commands

> This project has no build step by default — it's plain JS/HTML/CSS loaded directly by Chrome.
> If a bundler (e.g. `esbuild`, `vite`) is added later, document the build command here.

**Load the extension locally:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `read-only-fridays/` directory

**Reload after changes:**
- Click the refresh icon on the extension card in `chrome://extensions`, or
- Use the [Extensions Reloader](https://chrome.google.com/webstore/detail/extensions-reloader) extension for one-click reloads

**Test Friday behavior on a non-Friday:**
Temporarily patch `isReadOnlyDay()` in `service-worker.js` to return `true`, or set a debug override flag in `chrome.storage.local` via the DevTools console:
```js
chrome.storage.local.set({ debugForceActive: true });
```

## Coding Conventions

- **No external runtime dependencies** — keep the extension lean and auditable. Avoid npm packages in the shipped extension.
- Selector configs per site live in isolated modules so new sites can be added without touching core logic.
- All user-facing disabled elements must include a `title` attribute explaining the block (e.g., `"🚫 Read Only Fridays: deploys disabled until Monday"`).
- The content script must be **idempotent** — safe to run multiple times on the same page due to MutationObserver re-triggers.

---
*Created by Claude claude-sonnet-4-5 via rickg@unikavaev.com*
