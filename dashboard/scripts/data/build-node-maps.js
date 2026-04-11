/* ============================================================
   build-node-maps.js - Build lookup maps and rolled-up edges
   ============================================================ */

import { getNodeVolume } from './extract-data.js';
import { computeSharePercentChange, getTrendDirection } from './compute-metrics.js';

export function buildNodeMaps({
  activeL1Nodes,
  anyL1Nodes,
  l2Edges,
  rawTimeseries,
  selectedStartTimePoint,
  selectedEndTimePoint,
  trendVolumeThreshold,
  trendBoundary,
}) {
  const activeL2NodeById = {};
  const l2ToL1NodeId = {};
  const activeL1NodeById = {};
  const anyL2NodeById = {};
  const anyL1NodeById = {};

  function populateMaps(l1Nodes, l2NodeById, l1NodeById, includeParentLookup = false) {
    l1Nodes.forEach(node => {
      node.volume = 0;

      node.children.forEach(l2Node => {
        l2Node.l1NodeId = node.id;
        l2Node.l1NodeName = node.name;
        l2Node.badgeColor = node.badgeColor;

        l2NodeById[l2Node.id] = l2Node;
        if (includeParentLookup) l2ToL1NodeId[l2Node.id] = node.id;
        node.volume += l2Node.volume;
      });

      node.volumeChange = getNodeVolume(rawTimeseries, selectedEndTimePoint, node.id, 1)
        - getNodeVolume(rawTimeseries, selectedStartTimePoint, node.id, 1);
      node.hotness = computeSharePercentChange(
        rawTimeseries,
        selectedStartTimePoint,
        selectedEndTimePoint,
        node.id,
        1,
        trendVolumeThreshold
      );
      node.trend = getTrendDirection(node.hotness, trendBoundary);
      node.isUnassigned = node.volume <= 0;

      l1NodeById[node.id] = node;
    });
  }

  populateMaps(activeL1Nodes, activeL2NodeById, activeL1NodeById, true);
  populateMaps(anyL1Nodes, anyL2NodeById, anyL1NodeById, false);

  const l1EdgeMap = {};
  l2Edges.forEach(edge => {
    const srcL1Id = l2ToL1NodeId[edge.s];
    const tgtL1Id = l2ToL1NodeId[edge.t];
    if (srcL1Id && tgtL1Id && srcL1Id !== tgtL1Id) {
      const key = [srcL1Id, tgtL1Id].sort().join('|');
      l1EdgeMap[key] = (l1EdgeMap[key] || 0) + edge.w;
    }
  });

  const l1Edges = Object.entries(l1EdgeMap).map(([key, w]) => {
    const [s, t] = key.split('|');
    return { s, t, w };
  });

  return {
    activeL2NodeById,
    l2ToL1NodeId,
    activeL1NodeById,
    l1Edges,
    anyL2NodeById,
    anyL1NodeById,
  };
}
