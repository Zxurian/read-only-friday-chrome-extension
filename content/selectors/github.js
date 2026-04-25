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
  { selector: '.commit-form-actions button[type="submit"]',   label: 'Commit changes (form)' },
];

// Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com
