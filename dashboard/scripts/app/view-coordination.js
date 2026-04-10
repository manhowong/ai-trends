/* ============================================================
   view-coordination.js - View state coordination
   ============================================================ */

import { state } from '../state.js';
import { buildAdjMap, renderChart } from '../chart/chart.js';
import { updateInfoPanel } from '../info-panel.js';
import { renderBreadcrumb } from '../ui/breadcrumb.js';
import { buildL1ChartView, buildL2ChartView, buildOverviewChartView } from '../chart/chart-views.js';

function isEdgeSortMode(mode) {
  return mode === 'edges_all' || mode === 'edges_inter' || mode === 'edges_intra';
}

function applyChartView({ nodes, edges, nodeSizeMax, nodeSizeTotal }) {
  state.nodeSizeMax = nodeSizeMax;
  state.nodeSizeTotal = nodeSizeTotal;
  state.curNodes = nodes;
  state.curEdges = edges;
  state.curAdjMap = buildAdjMap(edges);
  renderChart(nodes, edges);
  updateInfoPanel();
}

function updateBreadcrumb() {
  renderBreadcrumb({
    currentView: state.currentView,
    currentL1Node: state.activeL1NodeById[state.currentL1NodeId] || null,
    currentL2Node: state.activeL2NodeById[state.currentL2NodeId] || null,
    onOverview: showOverview,
    onL1Node: showCurrentL1Node,
  });
}

export function showOverview() {
  document.getElementById('control-disabled-message').style.display = "block";
  document.getElementById('volumeThresholdSlider').style.display = "none";
  document.getElementById('edgeThresholdSlider').style.display = "none";
  document.getElementById('edge-type-control').style.display = "none";

  // There are no true edges at L1 (only aggregated L2 edges)
  if (isEdgeSortMode(state.sortMode)) state.sortMode = 'volume';
  
  state.currentView = 'overview';
  state.currentL1NodeId = null;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateBreadcrumb();
  applyChartView(buildOverviewChartView());
}

export function showCurrentL1Node(l1NodeId) {
  document.getElementById('control-disabled-message').style.display = "none";
  document.getElementById('volumeThresholdSlider').style.display = "inline-block";
  document.getElementById('edgeThresholdSlider').style.display = "inline-block";
  document.getElementById('edge-type-control').style.display = "block";
  state.currentView = 'l1';
  state.currentL1NodeId = l1NodeId;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateBreadcrumb();
  applyChartView(buildL1ChartView(l1NodeId));
}

export function showCurrentL2Node(l2NodeId) {
  document.getElementById('control-disabled-message').style.display = "none";
  document.getElementById('volumeThresholdSlider').style.display = "inline-block";
  document.getElementById('edgeThresholdSlider').style.display = "inline-block";
  document.getElementById('edge-type-control').style.display = "block";
  state.currentView = 'l2';
  state.currentL2NodeId = l2NodeId;
  state.hoveredNode = null;

  const chartView = buildL2ChartView(l2NodeId);
  state.currentL1NodeId = chartView.currentL1NodeId;
  updateBreadcrumb();
  applyChartView(chartView);
}

export function renderCurrentView() {
  if (state.currentView === 'overview') return showOverview();
  if (state.currentView === 'l1') return showCurrentL1Node(state.currentL1NodeId);
  if (state.currentView === 'l2') return showCurrentL2Node(state.currentL2NodeId);
}
