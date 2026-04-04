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
import { goOverview, focusL1Node, focusL2Node, renderCurrentView } from './app/view-coordination.js';
import { setSortMode }                                 from './panel.js';
import { initSearch } from './ui/search-modal.js';
import { initHelp } from './ui/help-modal.js';


// Expose functions used by inline HTML event handlers -------------------------
// (panel.js generates HTML strings with onclick="..." attributes
//  that call these as globals at runtime)

window.applyHover = applyHover;
window.clearHover = clearHover;
window.focusL1Node = focusL1Node;
window.focusL2Node = focusL2Node;
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
    goOverview,
    focusL1Node,
    focusL2Node,
    applyHover,
    clearHover,
  });
  refreshGraphData(state);
  initializeRichStyles();
  goOverview();
  initSearch();
  initHelp();
}

initializeApp().catch(err => {
  console.error(err);
  alert('Failed to load data.');
});
