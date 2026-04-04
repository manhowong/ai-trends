/* ============================================================
   data-helpers.js - Generic pure helpers for derived data
   ============================================================ */

export function getMetricBarWidths(mode, values) {
  if (!values.length) return [];

  if (mode === 'hotness') {
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    if (maxValue === minValue) return values.map(() => 100);
    return values.map(value => Math.round((value - minValue) / (maxValue - minValue) * 100));
  }

  const maxValue = Math.max(...values, 1);
  return values.map(value => Math.round(value / maxValue * 100));
}

export function countEdgesByNodeId(nodeIds, edges) {
  const edgeCountByNodeId = {};

  nodeIds.forEach(nodeId => {
    edgeCountByNodeId[nodeId] = edges.filter(edge => edge.s === nodeId || edge.t === nodeId).length;
  });

  return edgeCountByNodeId;
}

export function collectEdgesForNode(nodeId, edges) {
  return edges.filter(edge => edge.s === nodeId || edge.t === nodeId);
}

export function groupNodeIdsByL1NodeId(l2NodeIds, l2ToL1NodeId) {
  const l2NodeIdsByL1NodeId = {};

  l2NodeIds.forEach(l2NodeId => {
    const l1NodeId = l2ToL1NodeId[l2NodeId];
    if (!l1NodeId) return;
    if (!l2NodeIdsByL1NodeId[l1NodeId]) l2NodeIdsByL1NodeId[l1NodeId] = [];
    l2NodeIdsByL1NodeId[l1NodeId].push(l2NodeId);
  });

  return l2NodeIdsByL1NodeId;
}

export function filterByNameMatch(records, query, getName = record => record.name) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const lowerQuery = trimmedQuery.toLowerCase();
  return records.filter(record => getName(record).toLowerCase().includes(lowerQuery));
}

export function sortByNameMatch(records, query, getName = record => record.name, getVolume = record => record.volume) {
  const lowerQuery = query.trim().toLowerCase();

  return [...records].sort((a, b) => {
    const aName = getName(a).toLowerCase();
    const bName = getName(b).toLowerCase();
    if (aName === lowerQuery && bName !== lowerQuery) return -1;
    if (bName === lowerQuery && aName !== lowerQuery) return 1;
    if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
    if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
    return getVolume(b) - getVolume(a);
  });
}

export function sortByMetric(items, metricName, fallbackMetricName = null) {
  return [...items].sort((a, b) => {
    const aValue = a[metricName] ?? (fallbackMetricName ? a[fallbackMetricName] : 0) ?? 0;
    const bValue = b[metricName] ?? (fallbackMetricName ? b[fallbackMetricName] : 0) ?? 0;
    return bValue - aValue;
  });
}

export function sortByMetricSelector(items, getMetricValue) {
  return [...items].sort((a, b) => getMetricValue(b) - getMetricValue(a));
}

export function buildSearchRecords(state, fallbackBadgeColor) {
  const results = [];

  state.anyL1Nodes.forEach(l1Node => {
    results.push({
      id: l1Node.id,
      name: l1Node.name,
      level: 1,
      volume: l1Node.volume,
      trend: l1Node.trend,
      badgeText: null,
      badgeColor: null,
      disabled: !!l1Node.isUnassigned,
    });
  });

  Object.values(state.anyL2NodeById).forEach(l2Node => {
    const l1Node = state.anyL1NodeById[l2Node.l1NodeId];
    results.push({
      id: l2Node.id,
      name: l2Node.name,
      level: 2,
      kind: 'l2Node',
      volume: l2Node.volume,
      thresholdVolume: l2Node.volume,
      trend: l2Node.trend,
      badgeText: l1Node ? l1Node.name : '',
      badgeColor: l1Node ? l1Node.badgeColor : fallbackBadgeColor,
      disabled: !!l2Node.isUnassigned,
    });
  });

  Object.entries(state.keywordsByNode).forEach(([l2NodeId, keywords]) => {
    const l2Node = state.anyL2NodeById[l2NodeId];
    if (!l2Node) return;

    keywords.forEach(keyword => {
      results.push({
        id: l2NodeId,
        name: keyword.name,
        level: 2,
        kind: 'keyword',
        volume: keyword.volume,
        thresholdVolume: l2Node.volume,
        trend: keyword.trend,
        badgeText: l2Node.name,
        badgeColor: l2Node.badgeColor || fallbackBadgeColor,
        disabled: !!l2Node.isUnassigned,
      });
    });
  });

  return results;
}
