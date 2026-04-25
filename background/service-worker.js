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

// Created by Claude claude-sonnet-4-6 via rickg@unikavaev.com
