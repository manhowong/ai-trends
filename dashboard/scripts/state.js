/* ============================================================
   state.js — Single source of truth for all mutable state
   ============================================================ */

export const state = {
  // ── Raw data from JSON files ──
  cats:               [],   // runtime category array (built by applyNormalizedData)
  childEdges:         [],   // L2-level co-occurrence edges
  keywordData:        {},   // topicId → [{ id, name, papers, trend }]
  rawMetadata:        null,
  rawTimeseries:      null,
  dataMonths:         [],   // sorted month strings, e.g. ["2024-01", ...]
  selectedStartMonth: null,
  selectedEndMonth:   null,

  // ── Derived lookup tables (built by initializeDerivedData) ──
  childMap:    {},   // nodeId   → L2 node object
  childToCat:  {},   // L2 id   → parent category id
  catMap:      {},   // cat id  → category object
  parentEdges: [],   // category-level rolled-up edges

  // ── View state ──
  currentView:  'overview',  // 'overview' | 'category' | 'child'
  currentCat:   null,
  currentChild: null,
  hoveredNode:  null,

  // ── Current render snapshot (used for hover diff) ──
  curNodes:  [],
  curLinks:  [],
  curAdjMap: {},

  // ── Sort modes ──
  level1SortMode: 'papers',  // 'papers' | 'hotness'
  level2SortMode: 'papers',  // 'papers' | 'hotness' | 'links'

  // ── ECharts rich-label styles ──
  allColors:  [],
  richStyles: {},

  // ── Font ──
  currentFontSize: 10,

  // ── Edge ──
  showIntraEdges: true,   // within-category links
  showCrossEdges: true,   // cross-category links
};

export const DEFAULT_FONT_SIZE = 10;

export const categoryColorById = {
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