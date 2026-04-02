/* ============================================================
   extract-data.js - Raw timepoint access helpers
   ============================================================ */

export function getNodeVolume(rawTimeseries, timePoint, nodeId, level) {
  const timePointData = rawTimeseries[timePoint] || {};
  const levelKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const node = (timePointData[levelKey] || {})[nodeId] || {};
  return node.V || 0;
}

export function getNodeCumulativeVolume(rawTimeseries, timePoint, nodeId, level) {
  const timePointData = rawTimeseries[timePoint] || {};
  const levelKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const node = (timePointData[levelKey] || {})[nodeId] || {};
  return node.VC || 0;
}

export function getTotalVolumeByLevel(rawTimeseries, timePoint, level) {
  const timePointData = rawTimeseries[timePoint] || {};
  const levelKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  return Object.values(timePointData[levelKey] || {})
    .reduce((sum, node) => sum + (node.V || 0), 0);
}

export function getNodeVolumeInRange(rawTimeseries, timePoints, nodeId, level, startIdx, endIdx) {
  const endTimePoint = timePoints[endIdx];
  const baseTimePoint = startIdx > 0 ? timePoints[startIdx - 1] : null;
  const endVal = getNodeCumulativeVolume(rawTimeseries, endTimePoint, nodeId, level);
  const baseVal = baseTimePoint
    ? getNodeCumulativeVolume(rawTimeseries, baseTimePoint, nodeId, level)
    : 0;
  return endVal - baseVal;
}

export function getEdgeCumulativeVolume(rawTimeseries, timePoint, s, t) {
  const timePointEdges = (rawTimeseries[timePoint] || {}).links || [];
  const edge = timePointEdges.find(link =>
    (link.S === s && link.T === t) || (link.S === t && link.T === s)
  );
  return edge ? (edge.CC || 0) : 0;
}

export function getEdgeVolumeInRange(rawTimeseries, timePoints, s, t, startIdx, endIdx) {
  const endTimePoint = timePoints[endIdx];
  const baseTimePoint = startIdx > 0 ? timePoints[startIdx - 1] : null;
  const endVal = getEdgeCumulativeVolume(rawTimeseries, endTimePoint, s, t);
  const baseVal = baseTimePoint
    ? getEdgeCumulativeVolume(rawTimeseries, baseTimePoint, s, t)
    : 0;
  return endVal - baseVal;
}
