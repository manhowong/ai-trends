/* ============================================================
   data.js - Data fetching, normalisation, and derived tables
   ============================================================ */

import { state, categoryColorById } from './state.js';

// Fetch ------------------------------------------------------ 

/**
 * Fetch metadata.json + timeseries.json and store raw payloads
 * in state. Does NOT process data — call buildViewModel()
 * and buildDerivedIndexes() afterwards.
 */
export async function loadDataset() {
  const [metaRes, tsRes, settingsRes] = await Promise.all([
    fetch('./data/metadata.json'),
    fetch('./data/timeseries.json'),
    fetch('./config/settings.yml'),
  ]);
  if (!metaRes.ok) throw new Error(`Failed to load metadata.json (${metaRes.status})`);
  if (!tsRes.ok)   throw new Error(`Failed to load timeseries.json (${tsRes.status})`);
  if (!settingsRes.ok) throw new Error(`Failed to load settings.yml (${settingsRes.status})`);

  state.rawMetadata   = await metaRes.json();
  state.rawTimeseries = await tsRes.json();

  const settingsText = await settingsRes.text();
  applySettings(settingsText);

  state.timePoints = Object.keys(state.rawTimeseries).sort();
  if (!state.timePoints.length) throw new Error('timeseries.json has no time points');

  state.selectedStartTimePoint = state.timePoints[0];
  state.selectedEndTimePoint   = state.timePoints[state.timePoints.length - 1];
}

function applySettings(yamlText) {
  const hotnessMatch = yamlText.match(/trend_hotness_threshold:\s*([0-9.]+)/);
  const minAbsMatch  = yamlText.match(/trend_min_abs_volume:\s*([0-9.]+)/);

  if (hotnessMatch) state.trendHotnessThreshold = parseFloat(hotnessMatch[1]);
  if (minAbsMatch)  state.trendMinAbsVolume = parseFloat(minAbsMatch[1]);
}


// Timeseries helpers ----------------------------------------- 

/** Return the cumulative volume (VC) for a node at a given time point. */
export function getNodeCumulativeVolume(timePoint, nodeId, level) {
  const timePointData = state.rawTimeseries[timePoint] || {};
  const nodesKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const nodeObj  = (timePointData[nodesKey] || {})[nodeId] || {};
  return nodeObj.VC || 0;
}

/** Return the interval volume (V) for a node at a single time point. */
export function getNodeVolume(timePoint, nodeId, level) {
  const timePointData = state.rawTimeseries[timePoint] || {};
  const nodesKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const nodeObj  = (timePointData[nodesKey] || {})[nodeId] || {};
  return nodeObj.V || 0;
}

/** Return the total interval volume (V) across all nodes at a level. */
export function getTotalVolumeByLevel(timePoint, level) {
  const timePointData = state.rawTimeseries[timePoint] || {};
  const nodesKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  return Object.values(timePointData[nodesKey] || {})
    .reduce((sum, node) => sum + (node.V || 0), 0);
}

/**
 * Sum node volume over a time-point range using VC (cumulative):
 *   volume = VC[endTimePoint] − VC[timePointBefore startTimePoint]
 */
export function getNodeVolumeInRange(nodeId, level, startIdx, endIdx) {
  const endTimePoint  = state.timePoints[endIdx];
  const previousTimePoint = startIdx > 0 ? state.timePoints[startIdx - 1] : null;
  const endVal        = getNodeCumulativeVolume(endTimePoint, nodeId, level);
  const prevVal       = previousTimePoint ? getNodeCumulativeVolume(previousTimePoint, nodeId, level) : 0;
  return endVal - prevVal;
}

/** Return the cumulative co-mentions (CC) for an edge at a given time point. */
export function getEdgeCumulativeVolume(timePoint, s, t) {
  const timePointEdges = (state.rawTimeseries[timePoint] || {}).links || [];
  const link = timePointEdges.find(l =>
    (l.S === s && l.T === t) || (l.S === t && l.T === s)
  );
  return link ? (link.CC || 0) : 0;
}

/**
 * Compute CC over a time-point range for an edge pair:
 *   CC_range = CC[endTimePoint] − CC[timePointBefore startTimePoint]
 */
export function getEdgeVolumeInRange(s, t, startIdx, endIdx) {
  const endTimePoint  = state.timePoints[endIdx];
  const previousTimePoint = startIdx > 0 ? state.timePoints[startIdx - 1] : null;
  const endVal        = getEdgeCumulativeVolume(endTimePoint, s, t);
  const prevVal       = previousTimePoint ? getEdgeCumulativeVolume(previousTimePoint, s, t) : 0;
  return endVal - prevVal;
}

export function getTrendDirection(hotness, rangeVolume) {
  const minAbs = Math.max(0, state.trendMinAbsVolume || 0);
  if (rangeVolume < minAbs) return 0;
  const threshold = Math.abs(state.trendHotnessThreshold || 0);
  if (hotness >= threshold) return  1;
  if (hotness <= -threshold) return -1;
  return 0;
}

export function percentChange(startValue, endValue) {
  if (startValue <= 0) return 0;
  return Math.round(((endValue - startValue) / startValue) * 100);
}

export function computeSharePercentChange(startTimePoint, endTimePoint, nodeId, level) {
  const startTotal = getTotalVolumeByLevel(startTimePoint, level);
  const endTotal   = getTotalVolumeByLevel(endTimePoint, level);
  if (startTotal <= 0 || endTotal <= 0) return 0;

  const startShare = getNodeVolume(startTimePoint, nodeId, level) / startTotal;
  const endShare   = getNodeVolume(endTimePoint, nodeId, level) / endTotal;
  return percentChange(startShare, endShare);
}


// Normalisation ---------------------------------------------- 

/**
 * Derive state.activeL1Nodes / state.l2Edges / state.keywordsByNode from
 * the raw JSON payloads and the selected date range.
 */
export function buildViewModel() {
  const nodes      = (state.rawMetadata || {}).nodes || {};
  const timeseries = state.rawTimeseries || {};
  const threshold  = Math.max(1, parseInt(state.paperThreshold, 10) || 1);

  const startIdx = state.timePoints.indexOf(state.selectedStartTimePoint);
  const endIdx   = state.timePoints.indexOf(state.selectedEndTimePoint);
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return;

  state.keywordsByNode = {};

  // Separate L1 (category) and L2 (topic) nodes 
  const l1NodeMetadata = [];   // { id, name }
  const l2NodeMetadata = [];   // { id, name, parentId }

  Object.entries(nodes).forEach(([id, node]) => {
    if (node.L === 1) l1NodeMetadata.push({ id, name: node.N });
    if (node.L === 2) l2NodeMetadata.push({ id, name: node.N, parentId: node.P });
  });

  // Build L2 children grouped by parent L1 node
  const activeL2NodesByL1Id = {};
  const anyL2NodesByL1Id = {};  // All data, including nodes with 0 count or below paper threshold
  l1NodeMetadata.forEach(cat => {
    activeL2NodesByL1Id[cat.id] = [];
    anyL2NodesByL1Id[cat.id] = [];
  });

  l2NodeMetadata.forEach(topic => {
    const volume = getNodeVolumeInRange(topic.id, 2, startIdx, endIdx);

    const startTimePointVolume = getNodeVolume(state.timePoints[startIdx], topic.id, 2);
    const endTimePointVolume   = getNodeVolume(state.timePoints[endIdx],   topic.id, 2);
    const volumeChange         = endTimePointVolume - startTimePointVolume;
    const hotness              = computeSharePercentChange(
      state.timePoints[startIdx],
      state.timePoints[endIdx],
      topic.id,
      2,
    );

    const child = {
      id:      topic.id,
      name:    topic.name,
      volume,
      trend:   getTrendDirection(hotness, volume),
      hotness,
      volumeChange,
      isUnassigned: volume <= 0,
    };

    if (!anyL2NodesByL1Id[topic.parentId]) anyL2NodesByL1Id[topic.parentId] = [];
    anyL2NodesByL1Id[topic.parentId].push(child); // Does not check for volume; include all topics even with 0 count

    if (volume >= threshold) {
      if (!activeL2NodesByL1Id[topic.parentId]) activeL2NodesByL1Id[topic.parentId] = [];
      activeL2NodesByL1Id[topic.parentId].push(child); // Only topics with volume >= threshold
    }
  });

  state.anyL1Nodes = l1NodeMetadata
    .map((cat, i) => ({
      id:       cat.id,
      name:     cat.name,
      color:    categoryColorById[cat.id] ||
                ['#be185d', '#7c3aed', '#0d9488', '#0369a1', '#b45309'][i % 5],
      children: anyL2NodesByL1Id[cat.id] || [],
    }));

  state.activeL1Nodes = l1NodeMetadata
    .map((cat, i) => ({
      id:       cat.id,
      name:     cat.name,
      color:    categoryColorById[cat.id] ||
                ['#be185d', '#7c3aed', '#0d9488', '#0369a1', '#b45309'][i % 5],
      children: activeL2NodesByL1Id[cat.id] || [],
    }))
    .filter(cat => cat.children.length > 0);

  const activeL2NodeIds = new Set();
  state.activeL1Nodes.forEach(cat => cat.children.forEach(ch => activeL2NodeIds.add(ch.id)));

  // Build keyword data by summing K[].V across the range
  const keywordStatsAccumulator = {};  // nodeId → kwName → { volume, startV, endV }

  for (let i = startIdx; i <= endIdx; i++) {
    const timePoint = state.timePoints[i];
    const timePointData  = (timeseries[timePoint] || {}).nodes_L2 || {};

    Object.entries(timePointData).forEach(([nodeId, nodeData]) => {
      if (!activeL2NodeIds.has(nodeId)) return;
      (nodeData.K || []).forEach(kw => {
        if (!keywordStatsAccumulator[nodeId]) keywordStatsAccumulator[nodeId] = {};
        if (!keywordStatsAccumulator[nodeId][kw.N]) keywordStatsAccumulator[nodeId][kw.N] = { volume: 0, startV: 0, endV: 0 };

        keywordStatsAccumulator[nodeId][kw.N].volume += (kw.V || 0);
        if (i === startIdx) keywordStatsAccumulator[nodeId][kw.N].startV = kw.V || 0;
        if (i === endIdx)   keywordStatsAccumulator[nodeId][kw.N].endV   = kw.V || 0;
      });
    });
  }

  Object.entries(keywordStatsAccumulator).forEach(([nodeId, kwMap]) => {
    Object.entries(kwMap).forEach(([kwName, stats]) => {
      if (stats.volume <= 0) return;
      if (!state.keywordsByNode[nodeId]) state.keywordsByNode[nodeId] = [];
      const kwHotness = percentChange(stats.startV, stats.endV);
      state.keywordsByNode[nodeId].push({
        id:     `${nodeId}--${kwName}`,
        name:   kwName,
        volume: stats.volume,
        trend:  getTrendDirection(kwHotness, stats.volume),
      });
    });
  });

  // Build child edges: Dice coefficient over the selected range
  //   Dice = 2 * CC_range / (VC_A_range + VC_B_range)
  //   Uses cumulative CC (consistent with how node volumes are computed).

  const linkPairKeys = new Set();

  for (let i = startIdx; i <= endIdx; i++) {
    const timePointEdges = (timeseries[state.timePoints[i]] || {}).links || [];
    timePointEdges.forEach(link => {
      const s = link.S, t = link.T;
      if (!s || !t) return;
      if (!activeL2NodeIds.has(s) || !activeL2NodeIds.has(t)) return;
      linkPairKeys.add([s, t].sort().join('|'));
    });
  }

  state.l2Edges = [...linkPairKeys].map(key => {
    const [s, t] = key.split('|');
    const cc     = getEdgeVolumeInRange(s, t, startIdx, endIdx);
    if (cc <= 0) return null;
    const vcA  = getNodeVolumeInRange(s, 2, startIdx, endIdx);
    const vcB  = getNodeVolumeInRange(t, 2, startIdx, endIdx);
    const denom = vcA + vcB;
    const dice  = denom > 0 ? (2 * cc) / denom : 0;
    return { s, t, w: dice };
  }).filter(e => e && e.w > 0);
}


// Derived lookup tables -------------------------------------- 

/**
 * Populate state.activeL2NodeById / state.l2ToL1NodeId / state.activeL1NodeById / state.l1Edges
 * from state.activeL1Nodes and state.l2Edges.
 * Must be called after buildViewModel().
 */
export function buildDerivedIndexes() {
  // Clear existing entries in-place
  Object.keys(state.activeL2NodeById).forEach(k => delete state.activeL2NodeById[k]);
  Object.keys(state.l2ToL1NodeId).forEach(k => delete state.l2ToL1NodeId[k]);
  Object.keys(state.activeL1NodeById).forEach(k => delete state.activeL1NodeById[k]);
  Object.keys(state.anyL2NodeById).forEach(k => delete state.anyL2NodeById[k]);
  Object.keys(state.anyL1NodeById).forEach(k => delete state.anyL1NodeById[k]);

  function buildMaps(l1Nodes, l2NodeById, l1NodeById, l2ToL1NodeId = null) {
    l1Nodes.forEach(cat => {
      cat.volume = 0;

      cat.children.forEach(child => {
        child.catId   = cat.id;
        child.catName = cat.name;
        child.color   = cat.color;

        l2NodeById[child.id] = child;
        if (l2ToL1NodeId) l2ToL1NodeId[child.id] = cat.id;
        cat.volume += child.volume;
      });

      cat.volumeChange = getNodeVolume(state.selectedEndTimePoint, cat.id, 1)
                       - getNodeVolume(state.selectedStartTimePoint, cat.id, 1);
      cat.hotness = computeSharePercentChange(
        state.selectedStartTimePoint,
        state.selectedEndTimePoint,
        cat.id,
        1,
      );
      cat.trend   = getTrendDirection(cat.hotness, cat.volume);
      cat.isUnassigned = cat.volume <= 0;

      l1NodeById[cat.id] = cat;
    });
  }

  buildMaps(state.activeL1Nodes, state.activeL2NodeById, state.activeL1NodeById, state.l2ToL1NodeId);
  buildMaps(state.anyL1Nodes, state.anyL2NodeById, state.anyL1NodeById);

  // Roll L2 edges up to category-level
  const l1EdgeMap = {};
  state.l2Edges.forEach(edge => {
    const srcCat = state.l2ToL1NodeId[edge.s];
    const tgtCat = state.l2ToL1NodeId[edge.t];
    if (srcCat && tgtCat && srcCat !== tgtCat) {
      const key = [srcCat, tgtCat].sort().join('|');
      l1EdgeMap[key] = (l1EdgeMap[key] || 0) + edge.w;
    }
  });

  state.l1Edges = Object.entries(l1EdgeMap).map(([key, w]) => {
    const [s, t] = key.split('|');
    return { s, t, w };
  });
}
