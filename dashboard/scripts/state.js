/* ============================================================
   state.js - Single source of truth for all mutable state
   ============================================================ */

export const state = {
  // Raw data from JSON files
  activeL1Nodes:      [],   // runtime L1 node array (built by buildGraphData)
  anyL1Nodes:         [],   // all L1 nodes (including zero-volume) for lists/search
  l2Edges:            [],   // L2-level co-occurrence edges
  keywordsByNode:     {},   // nodeId : [{ id, name, volume, trend }]
  rawMetadata:        null,
  rawTimeseries:      null,
  timePoints:         [],   // sorted time-point strings, e.g. ["2024-01", ...]
  selectedStartTimePoint: null,
  selectedEndTimePoint:   null,

  // Derived lookup tables (built by buildNodeMaps)
  activeL2NodeById: {},   // nodeId : active L2 node object
  l2ToL1NodeId:     {},   // L2 id : parent L1 id
  activeL1NodeById: {},   // L1 id : active L1 node object
  l1Edges:          [],   // L1-level rolled-up edges
  anyL2NodeById:    {},   // nodeId : L2 node object (all, incl. unassigned)
  anyL1NodeById:    {},   // L1 id : L1 node object (all)

  // View state
  currentView:  'overview',  // 'overview' | 'l1' | 'l2'
  currentL1NodeId: null,
  currentL2NodeId: null,
  hoveredNode:  null,

  // Current render snapshot (used for hover diff)
  curNodes:  [],
  curLinks:  [],
  curAdjMap: {},

  // Node-size scaling inputs (set per view)
  nodeSizeMax: 0,
  nodeSizeTotal: 0,

  // Sort modes
  level1SortMode: 'papers',  // 'papers' | 'hotness'
  level2SortMode: 'papers',  // 'papers' | 'hotness' | 'links'

  // ECharts rich-label styles
  allColors:  [],
  richStyles: {},

  // Font
  currentFontSize: 12,

  // Paper count threshold
  volumeThreshold: 1,

  // Edge
  showIntraEdges: true,   // within-category links
  showCrossEdges: true,   // cross-category links

  // Trend thresholds (custom values will be loaded from config/settings.yml)
  trendBoundary: 10,  // percent
  trendVolumeThreshold: 10,      // minimum range volume (papers)
};

export const DEFAULT_FONT_SIZE = 12;

export const badgeColorById = {
  A: '#be185d',
  B: '#7c3aed',
  C: '#0d9488',
  D: '#0369a1',
  E: '#b45309',
  F: '#dc2626',
  G: '#059669',
  H: '#1d4ed8',
  I: '#a16207',
};

export const EDGE_WIDTH_SCALE = 10;
