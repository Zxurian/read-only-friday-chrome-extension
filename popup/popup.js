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
  Promise.all([
    chrome.runtime.sendMessage({ type: 'getState' }),
    chrome.storage.sync.get({ readOnlyDays: [5] }),
  ]).then(function (results) {
    var state = results[0];
    var syncResult = results[1];
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
  }).catch(function (err) {
    // Fallback: show clear state if we can't read state
    document.getElementById('days-info').textContent = 'Unable to read state.';
    showScreen('screen-clear');
  });
}

// ── Button handlers ───────────────────────────────────────────────────────

// State 1 → State 2
document.getElementById('btn-show-prompt').addEventListener('click', function () {
  showScreen('screen-prompt');
});

// State 2 → State 1 (changed mind)
document.getElementById('btn-nevermind').addEventListener('click', function () {
  showScreen('screen-active');
});

// State 2 → State 3 (confirmed override)
document.getElementById('btn-choose-violence').addEventListener('click', function () {
  chrome.storage.session.set({ overrideActive: true }).then(function () {
    showScreen('screen-overridden');
  });
});

// State 3 → State 1 (re-lock)
document.getElementById('btn-relock').addEventListener('click', function () {
  chrome.storage.session.set({ overrideActive: false }).then(function () {
    showScreen('screen-active');
  });
});

// ── Start ─────────────────────────────────────────────────────────────────

init();
