/* ============================================================
   sidebar.js - Sidebar controls and related UI behavior
   ============================================================ */

import { state } from '../state.js';
import { refreshGraphData } from '../data/refresh-graph-data.js';
import { fitScreen, initializeRichStyles, resetFontSize, updateFontSize } from '../chart/chart.js';
import { refreshCurrentView } from '../app/refresh.js';
import { showOverview } from '../app/view-coordination.js';

const VOLUME_THRESHOLD_STEPS = [1, 10, 50, 100, 200, 300, 400, 500, 1000];
const EDGE_THRESHOLD_STEPS = [0, 0.01, 0.05, 0.1, 0.15, 0.2, 0.5];

export function updateDateText() {
  const element = document.getElementById('dateText');
  if (!element || !state.selectedStartTimePoint || !state.selectedEndTimePoint) return;

  element.textContent = state.selectedStartTimePoint === state.selectedEndTimePoint
    ? state.selectedStartTimePoint
    : `${state.selectedStartTimePoint} to ${state.selectedEndTimePoint}`;
}

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const button = document.getElementById('sidebarToggle');
  if (!sidebar || !button) return;

  const collapsed = sidebar.classList.toggle('collapsed');
  button.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
}

function buildDateRangeControls() {
  const startSelect = document.getElementById('startMonthSelect');
  const endSelect = document.getElementById('endMonthSelect');
  if (!startSelect || !endSelect) return;

  const options = state.timePoints
    .map(timePoint => `<option value="${timePoint}">${timePoint}</option>`)
    .join('');

  startSelect.innerHTML = options;
  endSelect.innerHTML = options;
  startSelect.value = state.selectedStartTimePoint;
  endSelect.value = state.selectedEndTimePoint;

  startSelect.onchange = onDateRangeChange;
  endSelect.onchange = onDateRangeChange;
}

function onDateRangeChange() {
  const startSelect = document.getElementById('startMonthSelect');
  const endSelect = document.getElementById('endMonthSelect');
  if (!startSelect || !endSelect) return;

  const startIndex = state.timePoints.indexOf(startSelect.value);
  const endIndex = state.timePoints.indexOf(endSelect.value);

  if (startIndex <= endIndex) {
    state.selectedStartTimePoint = startSelect.value;
    state.selectedEndTimePoint = endSelect.value;
  } else if (startSelect === document.activeElement) {
    state.selectedStartTimePoint = startSelect.value;
    state.selectedEndTimePoint = startSelect.value;
    endSelect.value = state.selectedEndTimePoint;
  } else {
    state.selectedEndTimePoint = endSelect.value;
    state.selectedStartTimePoint = endSelect.value;
    startSelect.value = state.selectedStartTimePoint;
  }

  updateDateText();
  refreshGraphData(state);
  initializeRichStyles();
  showOverview();
}

function initEdgeToggles() {
  document.getElementById('toggleIntraEdges')
    ?.addEventListener('change', event => {
      if (state.currentView === 'overview') {
        event.target.checked = true;
        return;
      }

      state.showIntraEdges = event.target.checked;
      refreshCurrentView();
    });

  document.getElementById('toggleCrossEdges')
    ?.addEventListener('change', event => {
      state.showCrossEdges = event.target.checked;
      refreshCurrentView();
    });
}

function initVolumeThresholdControl() {
  const slider = document.getElementById('volumeThresholdSlider');
  const value = document.getElementById('volumeThresholdVal');
  if (!slider || !value) return;

  slider.min = 0;
  slider.max = VOLUME_THRESHOLD_STEPS.length - 1;
  slider.step = 1;

  const initialIndex = Math.max(0, VOLUME_THRESHOLD_STEPS.indexOf(state.volumeThreshold));
  slider.value = String(initialIndex);
  value.textContent = `${VOLUME_THRESHOLD_STEPS[initialIndex]}`;

  slider.addEventListener('input', event => {
    const index = parseInt(event.target.value, 10);
    const nextThreshold = VOLUME_THRESHOLD_STEPS[index] || VOLUME_THRESHOLD_STEPS[0];
    if (nextThreshold === state.volumeThreshold) return;

    state.volumeThreshold = nextThreshold;
    value.textContent = `${nextThreshold}`;
    refreshGraphData(state);
    initializeRichStyles();
    refreshCurrentView();
  });
}

function initEdgeThresholdControl() {
  const slider = document.getElementById('edgeThresholdSlider');
  const value = document.getElementById('edgeThresholdVal');
  if (!slider || !value) return;

  slider.min = 0;
  slider.max = EDGE_THRESHOLD_STEPS.length - 1;
  slider.step = 1;

  const initialIndex = Math.max(0, EDGE_THRESHOLD_STEPS.indexOf(state.edgeThreshold));
  slider.value = String(initialIndex);
  value.textContent = `${EDGE_THRESHOLD_STEPS[initialIndex] * 100}%`;

  slider.addEventListener('input', event => {
    const index = parseInt(event.target.value, 10);
    const nextThreshold = EDGE_THRESHOLD_STEPS[index] || EDGE_THRESHOLD_STEPS[0];
    if (nextThreshold === state.edgeThreshold) return;

    state.edgeThreshold = nextThreshold;
    value.textContent = `${nextThreshold * 100}%`;
    refreshGraphData(state);
    initializeRichStyles();
    refreshCurrentView();
  });
}

function initSidebarToggle() {
  document.getElementById('sidebarToggle')
    ?.addEventListener('click', toggleSidebar);
}

function initResponsiveSidebarBehavior() {
  if (window.innerWidth <= 768) {
    document.getElementById('info-panel')?.classList.add('collapsed');
    document.getElementById('sidebar')?.classList.add('collapsed');
  }

  document.addEventListener('click', event => {
    if (window.innerWidth > 768) return;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.classList.contains('collapsed')) return;
    if (sidebar.contains(event.target)) return;

    toggleSidebar();
  });
}

function initFontControls() {
  document.getElementById('fitBtn')
    ?.addEventListener('click', fitScreen);

  document.getElementById('fontSlider')
    ?.addEventListener('input', event => updateFontSize(event.target.value));

  document.getElementById('fontSizeReset')
    ?.addEventListener('click', resetFontSize);
}

export function initializeSidebarUI() {
  buildDateRangeControls();
  updateDateText();
  initSidebarToggle();
  initEdgeToggles();
  initVolumeThresholdControl();
  initEdgeThresholdControl();
  initResponsiveSidebarBehavior();
  initFontControls();
}
