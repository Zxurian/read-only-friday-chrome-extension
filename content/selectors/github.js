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
//
// GitHub uses two button systems:
//   PRC (Primer React Components) — data-variant="primary|danger|invisible", CSS module class names
//   Legacy — btn-primary, btn-danger, form[type="submit"] class names
// Selectors here target both where needed.
//
// NOTE: :has() requires Chrome 105+ (released Aug 2022). Safe for MV3 extensions.

window.ROF_SELECTORS = [
  // ── Pull Request: Merge variants ────────────────────────────────────────
  // GitHub's PRC (Primer React) merge box — all merge variants (merge, squash, rebase)
  // are primary buttons inside the mergebox-border-container.
  // Validated against live GitHub DOM 2026-04-25.
  { selector: '[data-testid="mergebox-border-container"] button[data-variant="primary"]', label: 'Merge pull request' },
  // Legacy selectors (pre-PRC GitHub UI) kept as fallbacks
  { selector: 'button[data-testid="merge-button"]',           label: 'Merge pull request (legacy)' },
  { selector: '.merge-box button[type="submit"]',             label: 'Merge pull request (legacy form)' },

  // ── Pull Request: Close PR ───────────────────────────────────────────────
  { selector: 'button[name="comment_and_close"]',             label: 'Close pull request' },
  { selector: 'button[aria-label="Close pull request"]',      label: 'Close pull request' },

  // ── Pull Request: Delete branch (post-merge prompt) ─────────────────────
  { selector: '.post-merge-message button[type="submit"]',    label: 'Delete branch (post-merge)' },

  // ── Branches list: Delete branch buttons ────────────────────────────────
  // PRC UI: delete buttons use aria-labelledby (not aria-label), no data-testid.
  // Scoped to BranchActionMenu component; identified by octicon-trash icon.
  // Validated against live GitHub DOM 2026-04-25.
  { selector: '[class*="BranchActionMenu-module"] button:has(svg.octicon-trash)', label: 'Delete branch (branch list)' },
  // Legacy fallback: aria-label was used in pre-PRC branch list
  { selector: 'button[aria-label*="Delete branch"]',          label: 'Delete branch (branch list, legacy)' },

  // ── Releases: Publish release ────────────────────────────────────────────
  // Validated against live GitHub DOM 2026-04-25.
  { selector: 'button[publish-release="true"]',               label: 'Publish release' },
  // Legacy fallback
  { selector: 'button[name="release_action"][value="publish"]', label: 'Publish release (legacy)' },

  // ── Releases: Delete release ─────────────────────────────────────────────
  { selector: 'button[aria-label*="Delete release"]',         label: 'Delete release' },
  { selector: '.release .btn-danger',                         label: 'Delete release (legacy)' },

  // ── Settings: Danger zone ────────────────────────────────────────────────
  // PRC UI: danger zone elements now use Button--danger class (not btn-danger in .Box--danger).
  // Button--danger is GitHub's semantic class for all genuinely destructive actions.
  // No tag restriction — "Transfer" is an <a> element, not a <button>.
  // Pointer-events + opacity disabling is sufficient for <a> elements (mouse clicks blocked).
  // Validated against live GitHub DOM 2026-04-25.
  { selector: '.Button--danger',                              label: 'Danger zone action' },
  // Legacy: "Disable branch protection rules" and other in-dialog confirmation buttons
  // use btn-danger class (not Button--danger). Validated 2026-04-25.
  { selector: 'button.btn-danger',                            label: 'Danger zone action (legacy btn-danger)' },
  // Older legacy fallback (pre-PRC settings UI)
  { selector: '.Box--danger .btn-danger',                     label: 'Danger zone action (legacy box)' },
  { selector: '.Box--danger button[type="submit"]',           label: 'Danger zone submit (legacy)' },

  // ── Actions: Re-run / Cancel workflow ───────────────────────────────────
  { selector: 'button[aria-label*="Re-run"]',                 label: 'Re-run workflow' },
  { selector: 'button[aria-label*="Cancel workflow"]',        label: 'Cancel workflow' },

  // ── Web editor / Actions workflow: Commit changes ────────────────────────
  // PRC BlobEditor (web editor + Actions workflow configure): the "Commit changes..."
  // primary button opens the commit dialog. Disabling it blocks the full flow.
  // Uses CSS module prefix [class*="BlobEditor"] which is stable across hash changes.
  // Validated against live GitHub DOM 2026-04-25.
  { selector: '[class*="BlobEditor"] button[data-variant="primary"]', label: 'Commit changes (web editor)' },
  // Legacy fallback
  { selector: '.commit-form-actions button[type="submit"]',   label: 'Commit changes (legacy form)' },
];

// Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com
