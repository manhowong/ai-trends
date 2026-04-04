/* ============================================================
   view-coordination.js - View state coordination
   ============================================================ */

import { state } from '../state.js';
import { buildAdjMap, renderChart } from '../chart/chart.js';
import { updateRightPanel } from '../panel.js';
import { renderBreadcrumb } from '../ui/breadcrumb.js';
import { buildL1ChartView, buildL2ChartView, buildOverviewChartView } from '../chart/chart-views.js';

function applyChartView({ nodes, edges, nodeSizeMax, nodeSizeTotal }) {
  state.nodeSizeMax = nodeSizeMax;
  state.nodeSizeTotal = nodeSizeTotal;
  state.curNodes = nodes;
  state.curEdges = edges;
  state.curAdjMap = buildAdjMap(edges);
  renderChart(nodes, edges);
  updateRightPanel();
}

function updateBreadcrumb() {
  renderBreadcrumb({
    currentView: state.currentView,
    currentL1Node: state.activeL1NodeById[state.currentL1NodeId] || null,
    currentL2Node: state.activeL2NodeById[state.currentL2NodeId] || null,
    onOverview: goOverview,
    onL1Node: focusL1Node,
  });
}

export function goOverview() {
  document.getElementById('toggleIntraEdges').disabled = true;
  state.currentView = 'overview';
  state.currentL1NodeId = null;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateBreadcrumb();
  applyChartView(buildOverviewChartView());
}

export function focusL1Node(l1NodeId) {
  document.getElementById('toggleIntraEdges').disabled = false;
  state.currentView = 'l1';
  state.currentL1NodeId = l1NodeId;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateBreadcrumb();
  applyChartView(buildL1ChartView(l1NodeId));
}

export function focusL2Node(l2NodeId) {
  document.getElementById('toggleIntraEdges').disabled = false;
  state.currentView = 'l2';
  state.currentL2NodeId = l2NodeId;
  state.hoveredNode = null;

  const chartView = buildL2ChartView(l2NodeId);
  state.currentL1NodeId = chartView.currentL1NodeId;
  updateBreadcrumb();
  applyChartView(chartView);
}

export function renderCurrentView() {
  if (state.currentView === 'overview') return goOverview();
  if (state.currentView === 'l1') return focusL1Node(state.currentL1NodeId);
  if (state.currentView === 'l2') return focusL2Node(state.currentL2NodeId);
}
