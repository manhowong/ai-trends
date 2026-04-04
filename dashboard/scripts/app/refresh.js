/* ============================================================
   refresh.js - App refresh helpers
   ============================================================ */

import { state } from '../state.js';
import { buildAdjMap, renderChart } from '../chart/chart.js';
import { updateRightPanel } from '../panel.js';
import { focusL1Node, focusL2Node, goOverview } from './view-coordination.js';

export function refreshCurrentView() {
  if (state.currentView === 'overview') return goOverview();

  if (state.currentView === 'l1') {
    if (!state.activeL1NodeById[state.currentL1NodeId]) {
      state.curNodes = [];
      state.curEdges = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }

    return focusL1Node(state.currentL1NodeId);
  }

  if (state.currentView === 'l2') {
    if (!state.activeL2NodeById[state.currentL2NodeId]) {
      state.curNodes = [];
      state.curEdges = [];
      state.curAdjMap = buildAdjMap([]);
      renderChart([], []);
      return updateRightPanel();
    }

    return focusL2Node(state.currentL2NodeId);
  }
}
