# Read Only Fridays 🔒

A Chrome extension that disables destructive actions (merge, deploy, delete, release) on configurable days — defaulting to Friday.

## Why

Deploying on Fridays is the leading cause of weekend incidents and on-call misery. This extension blocks the buttons so you don't have to rely on willpower.

## What it blocks (GitHub)

- Merge pull request (merge, squash, rebase)
- Close pull request
- Delete branch
- Publish / delete release
- Settings danger zone actions
- Cancel workflow runs
- Web editor commit changes

## Install

1. Clone this repo
2. Go to `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select this directory

## Usage

- **Friday:** Destructive buttons are automatically disabled with a meme tooltip and a banner appears at the top of GitHub pages
- **Override:** Click the extension icon → "⚠️ Override (you sure?)" → "🔥 I Choose Violence"
- **Re-lock:** Click the extension icon → "🔒 Come to my senses"

## Configuration

Click the extension icon → right-click → **Options** to configure which days of the week are read-only (default: Friday only).

## Debug (non-Friday testing)

In the service worker DevTools console (`chrome://extensions` → Details → Service worker):

```js
chrome.storage.local.set({ debugForceActive: true })
```

---

*Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com*
