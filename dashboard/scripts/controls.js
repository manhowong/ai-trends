/* ============================================================
   controls.js — Sidebar UI: date-range, dateText, toggle
   ============================================================ */

import { state } from './state.js';
import { buildViewModel, buildDerivedIndexes } from './data.js';
import { initializeRichStyles } from './chart.js';
import { goOverview, focusCategory, focusChildNode } from './views.js';
import { renderChart, buildAdjMap } from './chart.js';
import { updateRightPanel } from './panel.js';

const PAPER_THRESHOLD_STEPS = [1, 10, 50, 100, 500, 1000];


// Date-range selects ----------------------------------------------------------

/** Populate the start/end time-point <select> elements and attach handlers. */
export function buildDateRangeControls() {
  const startSelect = document.getElementById('startMonthSelect');
  const endSelect   = document.getElementById('endMonthSelect');
  if (!startSelect || !endSelect) return;

  const options = state.timePoints
    .map(m => `<option value="${m}">${m}</option>`)
    .join('');

  startSelect.innerHTML = options;
  endSelect.innerHTML   = options;
  startSelect.value     = state.selectedStartTimePoint;
  endSelect.value       = state.selectedEndTimePoint;

  startSelect.onchange = onDateRangeChange;
  endSelect.onchange   = onDateRangeChange;
}

export function onDateRangeChange() {
  const startSelect = document.getElementById('startMonthSelect');
  const endSelect   = document.getElementById('endMonthSelect');
  if (!startSelect || !endSelect) return;

  const s = state.timePoints.indexOf(startSelect.value);
  const e = state.timePoints.indexOf(endSelect.value);

  if (s <= e) {
    state.selectedStartTimePoint = startSelect.value;
    state.selectedEndTimePoint   = endSelect.value;
  } else if (startSelect === document.activeElement) {
    state.selectedStartTimePoint = startSelect.value;
    state.selectedEndTimePoint   = startSelect.value;
    endSelect.value              = state.selectedEndTimePoint;
  } else {
    state.selectedEndTimePoint   = endSelect.value;
    state.selectedStartTimePoint = endSelect.value;
    startSelect.value            = state.selectedStartTimePoint;
  }

  updateDateText();
  buildViewModel();
  buildDerivedIndexes();
  initializeRichStyles();
  goOverview();
}


// Date Text -------------------------------------------------------------------

export function updateDateText() {
  const el = document.getElementById('dateText');
  if (!el || !state.selectedStartTimePoint || !state.selectedEndTimePoint) return;
  el.textContent = state.selectedStartTimePoint === state.selectedEndTimePoint
    ? state.selectedStartTimePoint
    : `${state.selectedStartTimePoint} to ${state.selectedEndTimePoint}`;
}


// Sidebar toggles -------------------------------------------------------------

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebarToggle');
  const collapsed = sidebar.classList.toggle('collapsed');
  toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
}

export function initEdgeToggles() {
  document.getElementById('toggleIntraEdges')
    .addEventListener('change', e => {
      if (state.currentView === 'overview') {
        e.target.checked = true;  // snap it back
        return;
      }
      state.showIntraEdges = e.target.checked;
      refreshCurrentView();
    });

  document.getElementById('toggleCrossEdges')
    .addEventListener('change', e => {
      state.showCrossEdges = e.target.checked;
      refreshCurrentView();
    });
}

export function initPaperThresholdControl() {
  const slider = document.getElementById('paperThresholdSlider');
  const value  = document.getElementById('paperThresholdVal');
  if (!slider || !value) return;

  slider.min = 0;
  slider.max = PAPER_THRESHOLD_STEPS.length - 1;
  slider.step = 1;

  const initialIndex = Math.max(0, PAPER_THRESHOLD_STEPS.indexOf(state.paperThreshold));
  slider.value = String(initialIndex);
  value.textContent = `${PAPER_THRESHOLD_STEPS[initialIndex]} article(s)`;

  slider.addEventListener('input', e => {
    const idx = parseInt(e.target.value, 10);
    const next = PAPER_THRESHOLD_STEPS[idx] || PAPER_THRESHOLD_STEPS[0];
    if (next === state.paperThreshold) return;
    state.paperThreshold = next;
    value.textContent = `${next} article(s)`;
    buildViewModel();
    buildDerivedIndexes();
    initializeRichStyles();
    refreshCurrentView();
  });
}


function refreshCurrentView() {
  if (state.currentView === 'overview') return goOverview();

  if (state.currentView === 'category') {
    if (!state.activeL1NodeById[state.currentCat]) {
      state.curNodes = [];
      state.curLinks = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }
    return focusCategory(state.currentCat);
  }
  
  if (state.currentView === 'child') {
    if (!state.activeL2NodeById[state.currentChild]) {
      state.curNodes = [];
      state.curLinks = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }
    return focusChildNode(state.currentChild);
  }
}
