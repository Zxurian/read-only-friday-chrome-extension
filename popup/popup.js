// popup/popup.js
'use strict';

var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Screen helpers ────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

// ── Initialization ────────────────────────────────────────────────────────

function init() {
  // Fill in the real current day name — the HTML ships with a placeholder.
  var todayName = DAY_NAMES[new Date().getDay()];
  document.getElementById('day-name-heading').textContent = todayName.toUpperCase();
  document.getElementById('day-name-tagline').textContent = todayName;

  Promise.all([
    chrome.runtime.sendMessage({ type: 'getState' }),
    chrome.storage.sync.get({ readOnlyDays: [5] }),
  ]).then(function (results) {
    var state = results[0];
    var syncResult = results[1];

    if (!state) {
      // Service worker returned undefined — fail closed (locked)
      showScreen('screen-active');
      return;
    }

    var isReadOnly = state.isReadOnly;
    var overrideActive = state.overrideActive;
    var readOnlyDays = syncResult.readOnlyDays;

    if (!isReadOnly) {
      var names = readOnlyDays.length
        ? readOnlyDays.map(function (d) { return DAY_NAMES[d]; }).join(', ')
        : 'none';
      document.getElementById('days-info').textContent = 'Read-only days: ' + names;
      showScreen('screen-clear');
      return;
    }

    if (overrideActive) {
      showScreen('screen-overridden');
    } else {
      showScreen('screen-active');
    }
  }).catch(function () {
    // Fail closed — show locked state if state can't be read
    showScreen('screen-active');
  });
}

// ── Button handlers ───────────────────────────────────────────────────────

// State 1 → State 2
document.getElementById('btn-show-prompt').addEventListener('click', function () {
  showScreen('screen-prompt');
  document.getElementById('btn-nevermind').focus();
});

// State 2 → State 1 (changed mind)
document.getElementById('btn-nevermind').addEventListener('click', function () {
  showScreen('screen-active');
});

// Notify the content script on the active tab that override state changed.
// chrome.storage.session onChanged doesn't reliably fire in content script
// contexts, so we message directly. Errors are suppressed — the tab may not
// have the content script injected (e.g. a non-GitHub tab).
function notifyActiveTab(changes) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'rofStateChanged', ...changes }, function () {
      void chrome.runtime.lastError; // suppress "no receiving end" error
    });
  });
}

// State 2 → State 3 (confirmed override)
document.getElementById('btn-choose-violence').addEventListener('click', function () {
  chrome.storage.session.set({ overrideActive: true })
    .then(function () {
      notifyActiveTab({ overrideActive: true });
      showScreen('screen-overridden');
    })
    .catch(function () { showScreen('screen-active'); });
});

// State 3 → State 1 (re-lock)
document.getElementById('btn-relock').addEventListener('click', function () {
  chrome.storage.session.set({ overrideActive: false })
    .then(function () {
      notifyActiveTab({ overrideActive: false });
      showScreen('screen-active');
    })
    .catch(function () { showScreen('screen-overridden'); });
});

// ── Start ─────────────────────────────────────────────────────────────────

init();

// Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com
