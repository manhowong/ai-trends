/* ============================================================
   refresh.js - App refresh helpers
   ============================================================ */

import { state } from '../state.js';
import { buildAdjMap, renderChart } from '../chart/chart.js';
import { updateRightPanel } from '../info-panel.js';
import { showCurrentL1Node, showCurrentL2Node, showOverview } from './view-coordination.js';

export function refreshCurrentView() {
  if (state.currentView === 'overview') return showOverview();

  if (state.currentView === 'l1') {
    if (!state.activeL1NodeById[state.currentL1NodeId]) {
      state.curNodes = [];
      state.curEdges = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }

    return showCurrentL1Node(state.currentL1NodeId);
  }

  if (state.currentView === 'l2') {
    if (!state.activeL2NodeById[state.currentL2NodeId]) {
      state.curNodes = [];
      state.curEdges = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }

    return showCurrentL2Node(state.currentL2NodeId);
  }
}
