/* ============================================================
   main.js — Entry point: boot sequence and event listeners
   ============================================================ */

import { state }                    from './state.js';
import { loadDataset } from './data/load-data.js';
import { refreshGraphData } from './data/refresh-graph-data.js';
import { initializeAppUI } from './ui/app-ui.js';
import { initializeChartInteraction } from './chart-interaction.js';
import { echart, initializeRichStyles,
         refreshThemeVars,
         applyHover, clearHover,
         fitScreen, updateFontSize, resetFontSize }    from './chart.js';
import { goOverview, focusL1Node, focusL2Node }        from './views.js';
import { setSortMode }                                 from './panel.js';
import { buildDateRangeControls, updateDateText,
         toggleSidebar, initEdgeToggles, initVolumeThresholdControl } from './controls.js';
import { initSearch } from './search.js';
import { initHelp } from './help.js';


// Expose functions used by inline HTML event handlers -------------------------
// (panel.js generates HTML strings with onclick="..." attributes
//  that call these as globals at runtime)

window.applyHover     = applyHover;
window.clearHover     = clearHover;
window.focusL1Node    = focusL1Node;
window.focusL2Node    = focusL2Node;
window.setSortMode    = setSortMode;

function rerenderCurrentView() {
  if (state.currentView === 'overview') return goOverview();
  if (state.currentView === 'l1') return focusL1Node(state.currentL1NodeId);
  if (state.currentView === 'l2') return focusL2Node(state.currentL2NodeId);
}

document.getElementById('fitBtn')
  .addEventListener('click', fitScreen);

document.getElementById('fontSlider')
  .addEventListener('input', e => updateFontSize(e.target.value));

document.getElementById('fontSizeReset')
  .addEventListener('click', resetFontSize);

// Responsive ------------------------------------------------------------------

window.addEventListener('resize', () => echart.resize());

// Boot ------------------------------------------------------------------------

async function initializeApp() {
  await loadDataset();
  initializeAppUI({
    state,
    refreshThemeVars,
    initializeRichStyles,
    rerenderCurrentView,
    toggleSidebar,
  });
  initializeChartInteraction({
    echart,
    state,
    goOverview,
    focusL1Node,
    focusL2Node,
    applyHover,
    clearHover,
  });
  buildDateRangeControls();
  refreshGraphData(state);
  updateDateText();
  initializeRichStyles();
  goOverview();
  initEdgeToggles();
  initVolumeThresholdControl();
  initSearch();
  initHelp();
}

initializeApp().catch(err => {
  console.error(err);
  alert('Failed to load data.');
});
