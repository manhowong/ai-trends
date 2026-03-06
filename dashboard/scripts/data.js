/* ============================================================
   data.js — Data fetching, normalisation, and derived tables
   ============================================================ */

import { state, categoryColorById } from './state.js';

// ── Fetch ────────────────────────────────────────────────────

/**
 * Fetch metadata.json + timeseries.json and store raw payloads
 * in state. Does NOT process data — call applyNormalizedData()
 * and initializeDerivedData() afterwards.
 */
export async function loadData() {
  const [metaRes, tsRes] = await Promise.all([
    fetch('./data/metadata.json'),
    fetch('./data/timeseries.json'),
  ]);
  if (!metaRes.ok) throw new Error(`Failed to load metadata.json (${metaRes.status})`);
  if (!tsRes.ok)   throw new Error(`Failed to load timeseries.json (${tsRes.status})`);

  state.rawMetadata   = await metaRes.json();
  state.rawTimeseries = await tsRes.json();

  state.dataMonths = Object.keys(state.rawTimeseries).sort();
  if (!state.dataMonths.length) throw new Error('timeseries.json has no months');

  state.selectedStartMonth = state.dataMonths[0];
  state.selectedEndMonth   = state.dataMonths[state.dataMonths.length - 1];
}


// ── Timeseries helpers ───────────────────────────────────────

/** Return the cumulative volume (VC) for a node at a given month. */
export function nodeVC(monthId, nodeId, level) {
  const monthObj = state.rawTimeseries[monthId] || {};
  const nodesKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const nodeObj  = (monthObj[nodesKey] || {})[nodeId] || {};
  return nodeObj.VC || 0;
}

/** Return the monthly volume (V) for a node at a single month. */
export function nodeMonthlyVolume(monthId, nodeId, level) {
  const monthObj = state.rawTimeseries[monthId] || {};
  const nodesKey = level === 1 ? 'nodes_L1' : 'nodes_L2';
  const nodeObj  = (monthObj[nodesKey] || {})[nodeId] || {};
  return nodeObj.V || 0;
}

/**
 * Sum node volume over a month range using VC (cumulative):
 *   volume = VC[endMonth] − VC[monthBefore startMonth]
 */
export function nodeRangeVolume(nodeId, level, startIdx, endIdx) {
  const endMonth  = state.dataMonths[endIdx];
  const prevMonth = startIdx > 0 ? state.dataMonths[startIdx - 1] : null;
  const endVal    = nodeVC(endMonth, nodeId, level);
  const prevVal   = prevMonth ? nodeVC(prevMonth, nodeId, level) : 0;
  return endVal - prevVal;
}

export function toTrend(delta) {
  if (delta > 0) return  1;
  if (delta < 0) return -1;
  return 0;
}

export function toHotness(startValue, endValue) {
  if (startValue <= 0) return endValue > 0 ? 100 : 0;
  return Math.round(((endValue - startValue) / startValue) * 100);
}


// ── Normalisation ────────────────────────────────────────────

/**
 * Derive state.cats / state.childEdges / state.keywordData from
 * the raw JSON payloads and the selected date range.
 */
export function applyNormalizedData() {
  const nodes      = (state.rawMetadata || {}).nodes || {};
  const timeseries = state.rawTimeseries || {};

  const startIdx = state.dataMonths.indexOf(state.selectedStartMonth);
  const endIdx   = state.dataMonths.indexOf(state.selectedEndMonth);
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return;

  state.keywordData = {};

  // ── Separate L1 (category) and L2 (topic) nodes ──
  const categoryMeta = [];   // { id, name }
  const topicMeta    = [];   // { id, name, parentId }

  Object.entries(nodes).forEach(([id, node]) => {
    if (node.L === 1) categoryMeta.push({ id, name: node.N });
    if (node.L === 2) topicMeta.push({ id, name: node.N, parentId: node.P });
  });

  // ── Build L2 children grouped by parent category ──
  const childrenByCategory = {};
  categoryMeta.forEach(cat => { childrenByCategory[cat.id] = []; });

  topicMeta.forEach(topic => {
    const papers = nodeRangeVolume(topic.id, 2, startIdx, endIdx);
    if (papers <= 0) return;

    const startVal = nodeMonthlyVolume(state.dataMonths[startIdx], topic.id, 2);
    const endVal   = nodeMonthlyVolume(state.dataMonths[endIdx],   topic.id, 2);
    const delta    = endVal - startVal;

    const child = {
      id:      topic.id,
      name:    topic.name,
      papers,
      trend:   toTrend(delta),
      hotness: toHotness(startVal, endVal),
      delta,
    };

    if (!childrenByCategory[topic.parentId]) childrenByCategory[topic.parentId] = [];
    childrenByCategory[topic.parentId].push(child);
  });

  state.cats = categoryMeta
    .map((cat, i) => ({
      id:       cat.id,
      name:     cat.name,
      color:    categoryColorById[cat.id] ||
                ['#be185d', '#7c3aed', '#0d9488', '#0369a1', '#b45309'][i % 5],
      children: childrenByCategory[cat.id] || [],
    }))
    .filter(cat => cat.children.length > 0);

  const visibleTopicIds = new Set();
  state.cats.forEach(cat => cat.children.forEach(ch => visibleTopicIds.add(ch.id)));

  // ── Build keyword data by summing K[].V across the range ──
  const kwAccumulator = {};  // topicId → kwName → { papers, startV, endV }

  for (let i = startIdx; i <= endIdx; i++) {
    const monthStr = state.dataMonths[i];
    const monthL2  = (timeseries[monthStr] || {}).nodes_L2 || {};

    Object.entries(monthL2).forEach(([nodeId, nodeData]) => {
      if (!visibleTopicIds.has(nodeId)) return;
      (nodeData.K || []).forEach(kw => {
        if (!kwAccumulator[nodeId])       kwAccumulator[nodeId]       = {};
        if (!kwAccumulator[nodeId][kw.N]) kwAccumulator[nodeId][kw.N] = { papers: 0, startV: 0, endV: 0 };

        kwAccumulator[nodeId][kw.N].papers += (kw.V || 0);
        if (i === startIdx) kwAccumulator[nodeId][kw.N].startV = kw.V || 0;
        if (i === endIdx)   kwAccumulator[nodeId][kw.N].endV   = kw.V || 0;
      });
    });
  }

  Object.entries(kwAccumulator).forEach(([topicId, kwMap]) => {
    Object.entries(kwMap).forEach(([kwName, stats]) => {
      if (stats.papers <= 0) return;
      if (!state.keywordData[topicId]) state.keywordData[topicId] = [];
      state.keywordData[topicId].push({
        id:     `${topicId}--${kwName}`,
        name:   kwName,
        papers: stats.papers,
        trend:  toTrend(stats.endV - stats.startV),
      });
    });
  });

  // ── Build child edges: average Jaccard per pair over range ──
  const edgeAccumulator = {};  // "S|T" sorted → { s, t, jSum, count }

  for (let i = startIdx; i <= endIdx; i++) {
    const monthLinks = (timeseries[state.dataMonths[i]] || {}).links || [];
    monthLinks.forEach(link => {
      const s = link.S, t = link.T, j = link.J || 0;
      if (!s || !t || j <= 0) return;
      if (!visibleTopicIds.has(s) || !visibleTopicIds.has(t)) return;
      const key = [s, t].sort().join('|');
      if (!edgeAccumulator[key]) edgeAccumulator[key] = { s, t, jSum: 0, count: 0 };
      edgeAccumulator[key].jSum  += j;
      edgeAccumulator[key].count += 1;
    });
  }

  state.childEdges = Object.values(edgeAccumulator).map(edge => ({
    s: edge.s,
    t: edge.t,
    w: edge.jSum / edge.count,
  }));
}


// ── Derived lookup tables ────────────────────────────────────

/**
 * Populate state.childMap / childToCat / catMap / parentEdges
 * from state.cats and state.childEdges.
 * Must be called after applyNormalizedData().
 */
export function initializeDerivedData() {
  // Clear existing entries in-place
  Object.keys(state.childMap).forEach(k => delete state.childMap[k]);
  Object.keys(state.childToCat).forEach(k => delete state.childToCat[k]);
  Object.keys(state.catMap).forEach(k => delete state.catMap[k]);

  state.cats.forEach(cat => {
    cat.totalpapers = 0;

    cat.children.forEach(child => {
      child.catId  = cat.id;
      child.catName = cat.name;
      child.color  = cat.color;

      state.childMap[child.id]   = child;
      state.childToCat[child.id] = cat.id;
      cat.totalpapers           += child.papers;
    });

    const netDelta = cat.children.reduce((sum, ch) => sum + (ch.delta || 0), 0);
    cat.trend   = toTrend(netDelta);
    cat.hotness = toHotness(
      cat.children.reduce((sum, ch) => sum + (ch.papers - (ch.delta || 0)), 0),
      cat.children.reduce((sum, ch) => sum + ch.papers, 0),
    );

    state.catMap[cat.id] = cat;
  });

  // Roll L2 edges up to category-level
  const parentEdgeMap = {};
  state.childEdges.forEach(edge => {
    const srcCat = state.childToCat[edge.s];
    const tgtCat = state.childToCat[edge.t];
    if (srcCat && tgtCat && srcCat !== tgtCat) {
      const key = [srcCat, tgtCat].sort().join('|');
      parentEdgeMap[key] = (parentEdgeMap[key] || 0) + edge.w;
    }
  });

  state.parentEdges = Object.entries(parentEdgeMap).map(([key, w]) => {
    const [s, t] = key.split('|');
    return { s, t, w };
  });
}