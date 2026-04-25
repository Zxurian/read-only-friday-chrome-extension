// options/options.js
'use strict';

// Days in Mon–Sun display order.
// index = JS Date.getDay() value (0=Sunday, 1=Monday, …, 6=Saturday)
var DAYS = [
  { index: 1, label: 'Monday' },
  { index: 2, label: 'Tuesday' },
  { index: 3, label: 'Wednesday' },
  { index: 4, label: 'Thursday' },
  { index: 5, label: 'Friday' },
  { index: 6, label: 'Saturday' },
  { index: 0, label: 'Sunday' },
];

function init() {
  chrome.storage.sync.get({ readOnlyDays: [5] }, function (result) {
    var readOnlyDays = result.readOnlyDays;
    var grid = document.getElementById('days-grid');
    grid.innerHTML = '';  // clear before populating to prevent duplicates on re-init

    DAYS.forEach(function (day) {
      var labelEl = document.createElement('label');
      labelEl.className = 'day-item' + (readOnlyDays.includes(day.index) ? ' checked' : '');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(day.index);
      checkbox.checked = readOnlyDays.includes(day.index);

      checkbox.addEventListener('change', function () {
        labelEl.classList.toggle('checked', checkbox.checked);
        saveSettings();
      });

      labelEl.appendChild(checkbox);
      labelEl.appendChild(document.createTextNode(day.label));
      grid.appendChild(labelEl);
    });
  });
}

function saveSettings() {
  var checked = Array.from(
    document.querySelectorAll('#days-grid input[type="checkbox"]:checked')
  ).map(function (el) { return Number(el.value); });

  chrome.storage.sync.set({ readOnlyDays: checked }).catch(function () {
    var note = document.querySelector('.note');
    if (note) {
      note.textContent = '⚠️ Failed to save settings. Please try again.';
      note.style.color = '#ff6b6b';
    }
  });
}

init();
