/* ============================================================
   main.js — Entry point: boot sequence and event listeners
   ============================================================ */

import { state }                    from './state.js';
import { loadDataset } from './data/load-data.js';
import { refreshGraphData } from './data/refresh-graph-data.js';
import { echart, initializeRichStyles,
         refreshThemeVars,
         applyHover, clearHover,
         fitScreen, updateFontSize, resetFontSize,
         getChartCenter }                              from './chart.js';
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

// Theme toggle ---------------------------------------------------------------

function rerenderCurrentView() {
  if (state.currentView === 'overview') return goOverview();
  if (state.currentView === 'l1') return focusL1Node(state.currentL1NodeId);
  if (state.currentView === 'l2') return focusL2Node(state.currentL2NodeId);
}

function applyTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) localStorage.setItem('theme', theme);

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  refreshThemeVars();
  if (state.activeL1Nodes.length) {
    initializeRichStyles();
    rerenderCurrentView();
  }
}

function initThemeToggle() {
  const saved = localStorage.getItem('theme');
  applyTheme(saved || 'light', false);
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark'
      ? 'light'
      : 'dark';
    applyTheme(next, true);
  });
}


// Sidebar controls ------------------------------------------------------------

document.getElementById('sidebarToggle')
  .addEventListener('click', toggleSidebar);

document.getElementById('panelToggle')
  .addEventListener('click', () => {
    
    document.getElementById('right-panel').classList.toggle('collapsed');
    
    // Shift chart center when the panel is open or closed

    // Check number of nodes in chart. If only 1 node, don't center by chart
    // (because the node sits at the edge of chart in circular layout)
    const isSingle = echart.getOption().series[0].data.length === 1;
    const cx = window.innerWidth / window.innerHeight * 0.2 * 100 ; // calculate horizontal center

    echart.setOption({ series: [{ 
        center: isSingle?[ `${cx}%`, '50%'] : getChartCenter() 
      }] 
    });
  });

document.getElementById('fitBtn')
  .addEventListener('click', fitScreen);

document.getElementById('fontSlider')
  .addEventListener('input', e => updateFontSize(e.target.value));

document.getElementById('fontSizeReset')
  .addEventListener('click', resetFontSize);


// ECharts event listeners -----------------------------------------------------

// Actions to be triggered

// --- Navigate down
function navigateDown(nodeData) {
    state.hoveredNode = null;
    if (state.currentView === 'overview' && nodeData._type === 'l1') focusL1Node(nodeData._l1NodeId || nodeData.id);
    else if (state.currentView === 'l1' && (nodeData._type === 'l2' || nodeData._type === 'externalL2')) focusL2Node(nodeData.id);
    else if (state.currentView === 'l2' && nodeData._type === 'connectedL2') focusL2Node(nodeData.id);
}

// --- Navigate up
function navigateUp() {
    state.hoveredNode = null;
    if (state.currentView === 'l2') focusL1Node(state.currentL1NodeId);
    else if (state.currentView === 'l1') goOverview();
}

// --- Mobile hint bubble (first tap on mobile)
let mobileHintTimer = 0;
let mobileHintShown = false;
function showMobileHint() {
    if (mobileHintShown) return;
    let hint = document.getElementById('mobile-hint');
    window.requestAnimationFrame(() => {
        hint.classList.add('is-visible');
    });
    mobileHintShown = true;
    clearTimeout(mobileHintTimer);
    mobileHintTimer = setTimeout(() => {
        hint.classList.remove('is-visible');
    }, 5000);
}

// Map actions to events, grouped by cursor OR touch events

const cursorActions = {
    onNodeHover: (id) => { state.hoveredNode = id; applyHover(id); },
    onNodeLeave: () => { state.hoveredNode = null; clearHover(); },
    onNodeClick: (data) => navigateDown(data),
    onCanvasDblClick: () => navigateUp()
};

const touchActions = {
    onNodeFristTap: (id) => { state.hoveredNode = id; applyHover(id); },
    onNodeSecondTap: (data) => navigateDown(data),
    onCanvasTap: () => { state.hoveredNode = null; clearHover(); },
    onCanvasLongPress: () => navigateUp(),
};

// Detect cursor events and trigger actions

// --- Hover on node (highlight node)
echart.on('mouseover', (e) => {
     if (e.dataType === 'node' && !isTouch(e)) cursorActions.onNodeHover(e.data.id);
});
// --- Move away from node (clear highlight)
echart.on('mouseout', (e) => {
     if (e.dataType === 'node' && !isTouch(e)) cursorActions.onNodeLeave();
});
// --- Click on node (navigate down 1 level)
echart.on('click', (e) => {
      if (e.dataType === 'node' && !isTouch(e)) cursorActions.onNodeClick(e.data);
});
// --- Double click on canvas (navigate up 1 level)
echart.getZr().on('dblclick', (e) => {   // use getZr()
    if (!e.target && !isTouch(e)) cursorActions.onCanvasDblClick();
});


// Detect touch events and trigger actions

// --- Tap on node
echart.on('click', (e) => {
    if ( e.dataType === 'node' && isTouch(e) ) {
        showMobileHint();
        if (state.hoveredNode != e.data.id) {
            // Tap on node first time, hightlight it
            touchActions.onNodeFristTap(e.data.id);
        } else {
            // Tap on same node again, navigate down
            touchActions.onNodeSecondTap(e.data);
        };
    }
});

// --- Long-press anywhere (navigate up 1 level)
let pressTimer = 0;
let isLongPress = false;
echart.getZr().on('mousedown', (e) => {   // use getZr()
    pressTimer = setTimeout(() => {
    touchActions.onCanvasLongPress();
    isLongPress = true;
    }, 600);
});


// --- Tap anywhere besides nodes, clear hover
//     To detect canvas events, we need to listen to both the chart events and 
//     the chart container events. This is because echart.on() does not detect 
//     canvas directly, so we use the chart events to filter the chart container events.
// ------ 1. Listen to chart events
let nodeClicked = false;
echart.on('click', (e) => {
  if (e.dataType === 'node') { // To exclude edges, add e.dataType === 'edge'
    nodeClicked = true;
  } else {
    nodeClicked = false;
  }
});
// ------ 2. Listen to chart container events
document.getElementById('chart-wrapper').addEventListener('click', (e) => {
  if (!nodeClicked && isTouch(e)) touchActions.onCanvasTap(); // Tap elsewhere
  nodeClicked = false;
});

// Helpers

// --- Determine if an event is a cursor OR touch event
const isTouch = (e) => {
    // Dig through the ECharts layers to find the native event
    const sourceEvent = e?.event?.event || e?.event || e;
    // Check for PointerEvents (modern) OR TouchEvents (legacy/specific mobile)
    const isPointerTouch = sourceEvent?.pointerType === 'touch';
    const isStandardTouch = !!(sourceEvent?.touches || sourceEvent?.targetTouches);
    return isPointerTouch || isStandardTouch;
};

// --- Cancel long-press (i.e. reset long press timer)
const cancelInteraction = () => {
  clearTimeout(pressTimer);
  isLongPress = false;
};
echart.getZr().on('mouseup', cancelInteraction); // mouse lifts
echart.getZr().on('touchend', cancelInteraction); // finger lifts
echart.getZr().on('mousemove', cancelInteraction); // finger moves too much
echart.getZr().on('globalout', cancelInteraction); // finger slides off chart area

// Responsive ------------------------------------------------------------------

window.addEventListener('resize', () => echart.resize());

// Right panel and sidebar starts collapsed with small screen
if (window.innerWidth <= 768) {
  document.getElementById('right-panel').classList.add('collapsed');
  document.getElementById('sidebar').classList.add('collapsed');
}

//Mobile: tap outside of sidebar, close it automatically
document.addEventListener('click', e => {
  if (window.innerWidth > 768) return;
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('collapsed')) return;
  if (sidebar.contains(e.target)) return;
  toggleSidebar();
});

// Boot ------------------------------------------------------------------------

async function initializeApp() {
  initThemeToggle();
  await loadDataset();
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
