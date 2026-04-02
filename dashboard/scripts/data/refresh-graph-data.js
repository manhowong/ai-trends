/* ============================================================
   refresh-graph-data.js - Rebuild graph-derived runtime state
   ============================================================ */

import { badgeColorById } from '../state.js';
import { buildGraphData } from './build-graph-data.js';
import { buildNodeMaps } from './build-node-maps.js';

export function refreshGraphData(state) {
  Object.assign(state, buildGraphData({
    rawMetadata: state.rawMetadata,
    rawTimeseries: state.rawTimeseries,
    timePoints: state.timePoints,
    selectedStartTimePoint: state.selectedStartTimePoint,
    selectedEndTimePoint: state.selectedEndTimePoint,
    volumeThreshold: state.volumeThreshold,
    trendVolumeThreshold: state.trendVolumeThreshold,
    trendBoundary: state.trendBoundary,
    badgeColorById,
  }));

  Object.assign(state, buildNodeMaps({
    activeL1Nodes: state.activeL1Nodes,
    anyL1Nodes: state.anyL1Nodes,
    l2Edges: state.l2Edges,
    rawTimeseries: state.rawTimeseries,
    selectedStartTimePoint: state.selectedStartTimePoint,
    selectedEndTimePoint: state.selectedEndTimePoint,
    trendVolumeThreshold: state.trendVolumeThreshold,
    trendBoundary: state.trendBoundary,
  }));
}
