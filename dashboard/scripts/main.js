/* ============================================================
   main.js — Entry point: boot sequence and event listeners
   ============================================================ */

import { state }                    from './state.js';
import { loadDataset } from './data/load-data.js';
import { refreshGraphData } from './data/refresh-graph-data.js';
import { initializeThemeUI } from './ui/theme.js';
import { initializeSidebarUI } from './ui/sidebar.js';
import { initializePanelUI } from './ui/panel-ui.js';
import { initializeChartInteraction } from './chart/chart-interaction.js';
import { echart, initializeRichStyles,
         refreshThemeVars,
         applyHover, clearHover }                      from './chart/chart.js';
import { showOverview, showCurrentL1Node, showCurrentL2Node, renderCurrentView } from './app/view-coordination.js';
import { setSortMode }                                 from './info-panel.js';
import { initSearch } from './ui/search-modal.js';
import { initHelp } from './ui/help-modal.js';


// Expose functions used by inline HTML event handlers -------------------------
// (info-panel.js generates HTML strings with onclick="..." attributes
//  that call these as globals at runtime)

window.applyHover = applyHover;
window.clearHover = clearHover;
window.showCurrentL1Node = showCurrentL1Node;
window.showCurrentL2Node = showCurrentL2Node;
window.setSortMode = setSortMode;

// Responsive ------------------------------------------------------------------

window.addEventListener('resize', () => echart.resize());

// Boot ------------------------------------------------------------------------

async function initializeApp() {
  await loadDataset();
  initializeThemeUI({
    state,
    refreshThemeVars,
    initializeRichStyles,
    rerenderCurrentView: renderCurrentView,
  });
  initializeSidebarUI();
  initializePanelUI();
  initializeChartInteraction({
    echart,
    state,
    showOverview,
    showCurrentL1Node,
    showCurrentL2Node,
    applyHover,
    clearHover,
  });
  refreshGraphData(state);
  initializeRichStyles();
  showOverview();
  initSearch();
  initHelp();
}

initializeApp().catch(err => {
  console.error(err);
  alert('Failed to load data.');
});
