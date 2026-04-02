/* ============================================================
   build-graph-data.js - Build graph-facing derived data
   ============================================================ */

import {
  getEdgeVolumeInRange,
  getNodeVolume,
  getNodeVolumeInRange,
} from './extract-data.js';
import {
  computeSharePercentChange,
  getTrendDirection,
  percentChange,
} from './compute-metrics.js';

const FALLBACK_COLORS = ['#be185d', '#7c3aed', '#0d9488', '#0369a1', '#b45309'];

export function buildGraphData({
  rawMetadata,
  rawTimeseries,
  timePoints,
  selectedStartTimePoint,
  selectedEndTimePoint,
  volumeThreshold,
  trendVolumeThreshold,
  trendBoundary,
  badgeColorById,
}) {
  const nodes = (rawMetadata || {}).nodes || {};
  const timeseries = rawTimeseries || {};
  const threshold = Math.max(1, parseInt(volumeThreshold, 10) || 1);

  const startIdx = timePoints.indexOf(selectedStartTimePoint);
  const endIdx = timePoints.indexOf(selectedEndTimePoint);
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) {
    return {
      activeL1Nodes: [],
      anyL1Nodes: [],
      keywordsByNode: {},
      l2Edges: [],
    };
  }

  const l1NodeMetadata = [];
  const l2NodeMetadata = [];

  Object.entries(nodes).forEach(([id, node]) => {
    if (node.L === 1) l1NodeMetadata.push({ id, name: node.N });
    if (node.L === 2) l2NodeMetadata.push({ id, name: node.N, parentId: node.P });
  });

  const activeL2NodesByL1Id = {};
  const anyL2NodesByL1Id = {};
  l1NodeMetadata.forEach(node => {
    activeL2NodesByL1Id[node.id] = [];
    anyL2NodesByL1Id[node.id] = [];
  });

  l2NodeMetadata.forEach(node => {
    const volume = getNodeVolumeInRange(rawTimeseries, timePoints, node.id, 2, startIdx, endIdx);
    const startVolume = getNodeVolume(rawTimeseries, timePoints[startIdx], node.id, 2);
    const endVolume = getNodeVolume(rawTimeseries, timePoints[endIdx], node.id, 2);
    const hotness = computeSharePercentChange(
      rawTimeseries,
      timePoints[startIdx],
      timePoints[endIdx],
      node.id,
      2,
    );

    const l2Node = {
      id: node.id,
      name: node.name,
      volume,
      trend: getTrendDirection(hotness, volume, trendVolumeThreshold, trendBoundary),
      hotness,
      volumeChange: endVolume - startVolume,
      isUnassigned: volume <= 0,
    };

    if (!anyL2NodesByL1Id[node.parentId]) anyL2NodesByL1Id[node.parentId] = [];
    anyL2NodesByL1Id[node.parentId].push(l2Node);

    if (volume >= threshold) {
      if (!activeL2NodesByL1Id[node.parentId]) activeL2NodesByL1Id[node.parentId] = [];
      activeL2NodesByL1Id[node.parentId].push(l2Node);
    }
  });

  const anyL1Nodes = l1NodeMetadata.map((node, i) => ({
    id: node.id,
    name: node.name,
    badgeColor: badgeColorById[node.id] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    children: anyL2NodesByL1Id[node.id] || [],
  }));

  const activeL1Nodes = l1NodeMetadata
    .map((node, i) => ({
      id: node.id,
      name: node.name,
      badgeColor: badgeColorById[node.id] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      children: activeL2NodesByL1Id[node.id] || [],
    }))
    .filter(node => node.children.length > 0);

  const activeL2NodeIds = new Set();
  activeL1Nodes.forEach(node => node.children.forEach(l2Node => activeL2NodeIds.add(l2Node.id)));

  const keywordsByNode = {};
  const keywordStatsAccumulator = {};

  for (let i = startIdx; i <= endIdx; i++) {
    const timePoint = timePoints[i];
    const timePointData = (timeseries[timePoint] || {}).nodes_L2 || {};

    Object.entries(timePointData).forEach(([nodeId, nodeData]) => {
      if (!activeL2NodeIds.has(nodeId)) return;
      (nodeData.K || []).forEach(keyword => {
        if (!keywordStatsAccumulator[nodeId]) keywordStatsAccumulator[nodeId] = {};
        if (!keywordStatsAccumulator[nodeId][keyword.N]) {
          keywordStatsAccumulator[nodeId][keyword.N] = { volume: 0, startV: 0, endV: 0 };
        }

        keywordStatsAccumulator[nodeId][keyword.N].volume += (keyword.V || 0);
        if (i === startIdx) keywordStatsAccumulator[nodeId][keyword.N].startV = keyword.V || 0;
        if (i === endIdx) keywordStatsAccumulator[nodeId][keyword.N].endV = keyword.V || 0;
      });
    });
  }

  Object.entries(keywordStatsAccumulator).forEach(([nodeId, keywordMap]) => {
    Object.entries(keywordMap).forEach(([keywordName, stats]) => {
      if (stats.volume <= 0) return;
      if (!keywordsByNode[nodeId]) keywordsByNode[nodeId] = [];
      const kwHotness = percentChange(stats.startV, stats.endV);
      keywordsByNode[nodeId].push({
        id: `${nodeId}--${keywordName}`,
        name: keywordName,
        volume: stats.volume,
        trend: getTrendDirection(kwHotness, stats.volume, trendVolumeThreshold, trendBoundary),
      });
    });
  });

  const edgeKeys = new Set();
  for (let i = startIdx; i <= endIdx; i++) {
    const timePointEdges = (timeseries[timePoints[i]] || {}).links || [];
    timePointEdges.forEach(edge => {
      const s = edge.S;
      const t = edge.T;
      if (!s || !t) return;
      if (!activeL2NodeIds.has(s) || !activeL2NodeIds.has(t)) return;
      edgeKeys.add([s, t].sort().join('|'));
    });
  }

  const l2Edges = [...edgeKeys]
    .map(key => {
      const [s, t] = key.split('|');
      const cc = getEdgeVolumeInRange(rawTimeseries, timePoints, s, t, startIdx, endIdx);
      if (cc <= 0) return null;
      const volumeA = getNodeVolumeInRange(rawTimeseries, timePoints, s, 2, startIdx, endIdx);
      const volumeB = getNodeVolumeInRange(rawTimeseries, timePoints, t, 2, startIdx, endIdx);
      const denom = volumeA + volumeB;
      const dice = denom > 0 ? (2 * cc) / denom : 0;
      return { s, t, w: dice };
    })
    .filter(edge => edge && edge.w > 0);

  return {
    activeL1Nodes,
    anyL1Nodes,
    keywordsByNode,
    l2Edges,
  };
}
