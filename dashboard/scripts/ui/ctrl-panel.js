/* ============================================================
   ctrl-panel.js - Control panel components and related UI behavior
   ============================================================ */

import { state } from '../state.js';
import { refreshGraphData } from '../data/refresh-graph-data.js';
import { fitScreen, initializeRichStyles, resetFontSize, updateFontSize } from '../chart/chart.js';
import { refreshCurrentView } from '../app/refresh.js';
import { showOverview } from '../app/view-coordination.js';

const VOLUME_THRESHOLD_STEPS = [1, 10, 50, 100, 200, 300, 400, 500, 1000];
const EDGE_THRESHOLD_STEPS = [0, 0.01, 0.05, 0.1, 0.15, 0.2, 0.5];

export function toggleCtrlPanel() {
  const ctrlPanel = document.getElementById('ctrl-panel');
  const button = document.getElementById('ctrl-panel-toggle');
  if (!ctrlPanel || !button) return;

  const collapsed = ctrlPanel.classList.toggle('collapsed');
  button.title = collapsed ? 'Expand control panel' : 'Collapse control panel';
}

export function updateDateDisplay() {
  const element = document.getElementById('date-display');
  if (!element || !state.selectedStartTimePoint || !state.selectedEndTimePoint) return;

  element.textContent = state.selectedStartTimePoint === state.selectedEndTimePoint
    ? state.selectedStartTimePoint
    : `${state.selectedStartTimePoint} to ${state.selectedEndTimePoint}`;
}

function initCtrlPanelToggle() {
  document.getElementById('ctrl-panel-toggle')
    ?.addEventListener('click', toggleCtrlPanel);
}

function initResponsiveCtrlPanelBehavior() {
  if (window.innerWidth <= 768) {
    document.getElementById('info-panel')?.classList.add('collapsed');
    document.getElementById('ctrl-panel')?.classList.add('collapsed');
  }

  document.addEventListener('click', event => {
    if (window.innerWidth > 768) return;

    const ctrlPanel = document.getElementById('ctrl-panel');
    if (!ctrlPanel || ctrlPanel.classList.contains('collapsed')) return;
    if (ctrlPanel.contains(event.target)) return;

    toggleCtrlPanel();
  });
}

function initDateControl() {
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

  updateDateDisplay();
  refreshGraphData(state);
  initializeRichStyles();
  showOverview();
}

function initVolumeControl() {
  const slider = document.getElementById('volumeThresholdSlider');
  const value = document.getElementById('volume-control-val');
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

function initEdgeWidthControl() {
  const slider = document.getElementById('edgeThresholdSlider');
  const value = document.getElementById('edge-width-control-val');
  if (!slider || !value) return;

  const updateEdgeWidthValue = threshold => {
    value.dataset.prefix = threshold === 0 ? '>' : '\u2265';
    value.textContent = `${threshold * 100}%`;
  };

  slider.min = 0;
  slider.max = EDGE_THRESHOLD_STEPS.length - 1;
  slider.step = 1;

  const initialIndex = Math.max(0, EDGE_THRESHOLD_STEPS.indexOf(state.edgeThreshold));
  slider.value = String(initialIndex);
  updateEdgeWidthValue(EDGE_THRESHOLD_STEPS[initialIndex]);

  slider.addEventListener('input', event => {
    const index = parseInt(event.target.value, 10);
    const nextThreshold = EDGE_THRESHOLD_STEPS[index] || EDGE_THRESHOLD_STEPS[0];
    if (nextThreshold === state.edgeThreshold) return;

    state.edgeThreshold = nextThreshold;
    updateEdgeWidthValue(nextThreshold);
    refreshGraphData(state);
    initializeRichStyles();
    refreshCurrentView();
  });
}

function initEdgeTypeControl() {
  document.getElementById('toggleIntraEdges')
    ?.addEventListener('change', event => {
      if (state.currentView === 'overview') {
        event.target.checked = true;
        return;
      }

      state.showIntraEdges = event.target.checked;
      refreshCurrentView();
    });

  document.getElementById('toggleInterEdges')
    ?.addEventListener('change', event => {
      state.showInterEdges = event.target.checked;
      refreshCurrentView();
    });
}

function initFontControl() {
  document.getElementById('fit-btn')
    ?.addEventListener('click', fitScreen);

  document.getElementById('fontSlider')
    ?.addEventListener('input', event => updateFontSize(event.target.value));

  document.getElementById('font-reset')
    ?.addEventListener('click', resetFontSize);
}

export function initializeCtrlPanelUI() {
  initDateControl();
  updateDateDisplay();
  initCtrlPanelToggle();
  initVolumeControl();
  initEdgeWidthControl();
  initEdgeTypeControl();
  initFontControl();
  initResponsiveCtrlPanelBehavior();
}
