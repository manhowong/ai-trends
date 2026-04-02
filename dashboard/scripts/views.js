/* ============================================================
   views.js — View transitions and breadcrumb navigation
   ============================================================ */

import { state, EDGE_WIDTH_SCALE } from './state.js';
import {
  trendColor,
  themeVar, makeLabel, nodeSize, buildAdjMap,
  renderChart,
} from './chart.js';
import { updateRightPanel } from './panel.js';

function formatCountShort(n) {
  if (n >= 1000) {
    const kVal = Math.round(n / 100) / 10;
    return Number.isInteger(kVal) ? `${kVal.toFixed(0)}k` : `${kVal.toFixed(1)}k`;
  }
  return String(n);
}

function makeBreadcrumbSegment(container, label, clickable, onclickFn) {
  const segment = document.createElement('span');
  segment.textContent = label;
  segment.className = `breadcrumb-segment ${clickable ? 'clickable' : 'active'}`;
  if (clickable && onclickFn) segment.onclick = onclickFn;
  container.appendChild(segment);
}

function makeBreadcrumbSeparator(container) {
  const separator = document.createElement('span');
  separator.textContent = '>';
  separator.className = 'breadcrumb-sep';
  container.appendChild(separator);
}

export function updateTreeBreadcrumb() {
  const container = document.getElementById('treeItems');
  container.innerHTML = '';

  makeBreadcrumbSegment(container, 'Overview', state.currentView !== 'overview', goOverview);

  if (state.currentView === 'l1' || state.currentView === 'l2') {
    makeBreadcrumbSeparator(container);
    const currentL1Node = state.activeL1NodeById[state.currentL1NodeId];
    makeBreadcrumbSegment(
      container,
      currentL1Node.name,
      state.currentView === 'l2',
      () => focusL1Node(currentL1Node.id),
    );
  }

  if (state.currentView === 'l2') {
    makeBreadcrumbSeparator(container);
    const currentL2Node = state.activeL2NodeById[state.currentL2NodeId];
    makeBreadcrumbSegment(
      container,
      `${currentL2Node.name} (${formatCountShort(currentL2Node.volume || 0)})`,
      false,
      null,
    );
  }
}

export function goOverview() {
  document.getElementById('toggleIntraEdges').disabled = true;
  state.currentView = 'overview';
  state.currentL1NodeId = null;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateTreeBreadcrumb();

  const maxEdgeWidth = Math.max(...state.l1Edges.map(edge => edge.w), 1);
  state.nodeSizeMax = Math.max(...state.activeL1Nodes.map(node => node.volume), 1);
  state.nodeSizeTotal = state.activeL1Nodes.reduce((sum, node) => sum + (node.volume || 0), 0);

  const l1NodeItems = state.activeL1Nodes.map(l1Node => {
    const nodeColor = trendColor(l1Node.trend);
    const itemStyle = {
      color: nodeColor,
      borderColor: nodeColor,
      borderWidth: 2,
      opacity: 0.85,
    };

    return {
      id: l1Node.id,
      symbolSize: nodeSize(l1Node.volume, 'overview'),
      itemStyle: { ...itemStyle },
      label: {
        show: true,
        formatter: makeLabel(l1Node.name, l1Node.volume),
        rich: state.richStyles,
      },
      _l1NodeId: l1Node.id,
      _type: 'l1',
      _orig: {
        _l1NodeId: l1Node.id,
        _type: 'l1',
        trend: l1Node.trend,
        fixed: false,
        _name: l1Node.name,
        _volume: l1Node.volume,
        _l1NodeName: null,
        _badgeColor: null,
        _dim: false,
        _itemStyle: itemStyle,
      },
    };
  });

  const visibleEdges = state.showCrossEdges ? state.l1Edges : [];
  const links = visibleEdges.map(edge => ({
    source: edge.s,
    target: edge.t,
    lineStyle: {
      width: Math.max(0.5, edge.w / maxEdgeWidth * 5 * EDGE_WIDTH_SCALE),
      color: themeVar('linkCross'),
      curveness: 0.15,
    },
    _origWidth: Math.max(0.5, edge.w / maxEdgeWidth * 5 * EDGE_WIDTH_SCALE),
    _origColor: themeVar('linkCross'),
  }));

  state.curNodes = l1NodeItems;
  state.curLinks = links;
  state.curAdjMap = buildAdjMap(links);
  renderChart(l1NodeItems, links);
  updateRightPanel();
}

export function focusL1Node(l1NodeId) {
  document.getElementById('toggleIntraEdges').disabled = false;

  state.currentView = 'l1';
  state.currentL1NodeId = l1NodeId;
  state.currentL2NodeId = null;
  state.hoveredNode = null;
  updateTreeBreadcrumb();

  const currentL1Node = state.activeL1NodeById[l1NodeId];
  const currentL2NodeIds = new Set(currentL1Node.children.map(node => node.id));

  const crossEdges = state.l2Edges.filter(edge =>
    (currentL2NodeIds.has(edge.s) && !currentL2NodeIds.has(edge.t)) ||
    (currentL2NodeIds.has(edge.t) && !currentL2NodeIds.has(edge.s))
  );

  const externalL2NodeIds = new Set();
  crossEdges.forEach(edge => {
    if (!currentL2NodeIds.has(edge.s)) externalL2NodeIds.add(edge.s);
    if (!currentL2NodeIds.has(edge.t)) externalL2NodeIds.add(edge.t);
  });

  state.nodeSizeMax = Math.max(...currentL1Node.children.map(node => node.volume), 1);
  state.nodeSizeTotal = currentL1Node.children.reduce((sum, node) => sum + (node.volume || 0), 0);

  const l2NodeItems = currentL1Node.children.map(l2Node => {
    const nodeColor = trendColor(l2Node.trend);
    const itemStyle = {
      color: nodeColor,
      borderColor: nodeColor,
      borderWidth: 2,
      opacity: 0.9,
    };

    return {
      id: l2Node.id,
      symbolSize: nodeSize(l2Node.volume, 'l1'),
      itemStyle: { ...itemStyle },
      label: {
        show: true,
        formatter: makeLabel(l2Node.name, l2Node.volume, null, null, false),
        rich: state.richStyles,
      },
      _l1NodeId: l1NodeId,
      _type: 'l2',
      _orig: {
        _l1NodeId: l1NodeId,
        _type: 'l2',
        trend: l2Node.trend,
        fixed: false,
        _name: l2Node.name,
        _volume: l2Node.volume,
        _l1NodeName: currentL1Node.name,
        _badgeColor: currentL1Node.badgeColor,
        _dim: false,
        _itemStyle: itemStyle,
      },
    };
  });

  const externalL2NodeIdsByL1Id = {};
  externalL2NodeIds.forEach(l2NodeId => {
    const externalL1NodeId = state.l2ToL1NodeId[l2NodeId];
    if (!externalL1NodeId) return;
    if (!externalL2NodeIdsByL1Id[externalL1NodeId]) externalL2NodeIdsByL1Id[externalL1NodeId] = [];
    externalL2NodeIdsByL1Id[externalL1NodeId].push(l2NodeId);
  });

  if (state.showCrossEdges) {
    Object.entries(externalL2NodeIdsByL1Id).forEach(([externalL1NodeId, groupedL2NodeIds]) => {
      groupedL2NodeIds.forEach(externalL2NodeId => {
        const externalL2Node = state.activeL2NodeById[externalL2NodeId];
        const externalL1Node = state.activeL1NodeById[externalL1NodeId];
        const itemStyle = {
          color: themeVar('extNodeFill'),
          borderColor: themeVar('extNodeBorder'),
          borderWidth: 1,
          opacity: 0.35,
        };

        l2NodeItems.push({
          id: externalL2Node.id,
          symbolSize: nodeSize(externalL2Node.volume, 'l1') * 0.7,
          itemStyle: { ...itemStyle },
          label: {
            show: true,
            formatter: makeLabel(externalL2Node.name, externalL2Node.volume, null, null, true),
            rich: state.richStyles,
          },
          _l1NodeId: externalL1NodeId,
          _type: 'externalL2',
          _orig: {
            _l1NodeId: externalL1NodeId,
            _type: 'externalL2',
            trend: externalL2Node.trend,
            fixed: false,
            _name: externalL2Node.name,
            _volume: externalL2Node.volume,
            _l1NodeName: externalL1Node.name,
            _badgeColor: externalL1Node.badgeColor,
            _dim: true,
            _itemStyle: itemStyle,
          },
        });
      });
    });
  }

  const intraEdges = state.l2Edges.filter(edge => currentL2NodeIds.has(edge.s) && currentL2NodeIds.has(edge.t));
  const visibleCrossEdges = state.showCrossEdges ? crossEdges : [];
  const visibleIntraEdges = state.showIntraEdges ? intraEdges : [];
  const allVisibleEdges = [...visibleCrossEdges, ...visibleIntraEdges];
  const maxEdgeWidth = Math.max(...allVisibleEdges.map(edge => edge.w), 1);

  const links = [
    ...visibleCrossEdges.map(edge => ({
      source: edge.s,
      target: edge.t,
      lineStyle: {
        width: Math.max(0.5, edge.w / maxEdgeWidth * 3 * EDGE_WIDTH_SCALE),
        color: themeVar('linkCrossDim'),
        curveness: 0.1,
      },
      _origWidth: Math.max(0.5, edge.w / maxEdgeWidth * 3 * EDGE_WIDTH_SCALE),
      _origColor: themeVar('linkCrossDim'),
    })),
    ...visibleIntraEdges.map(edge => ({
      source: edge.s,
      target: edge.t,
      lineStyle: {
        width: Math.max(0.5, edge.w / maxEdgeWidth * 4 * EDGE_WIDTH_SCALE),
        color: themeVar('linkIntra'),
        curveness: 0.1,
      },
      _origWidth: Math.max(0.5, edge.w / maxEdgeWidth * 4 * EDGE_WIDTH_SCALE),
      _origColor: themeVar('linkIntra'),
    })),
  ];

  state.curNodes = l2NodeItems;
  state.curLinks = links;
  state.curAdjMap = buildAdjMap(links);
  renderChart(l2NodeItems, links);
  updateRightPanel();
}

export function focusL2Node(l2NodeId) {
  document.getElementById('toggleIntraEdges').disabled = false;

  state.currentView = 'l2';
  state.currentL2NodeId = l2NodeId;
  state.hoveredNode = null;

  const focusedL2Node = state.activeL2NodeById[l2NodeId];
  const currentL1Node = state.activeL1NodeById[focusedL2Node.l1NodeId];
  state.currentL1NodeId = currentL1Node.id;
  updateTreeBreadcrumb();

  const connectedL2Edges = state.l2Edges.filter(edge => edge.s === l2NodeId || edge.t === l2NodeId);
  const connectedL2NodeIds = new Set();
  connectedL2Edges.forEach(edge => {
    connectedL2NodeIds.add(edge.s);
    connectedL2NodeIds.add(edge.t);
  });
  connectedL2NodeIds.delete(l2NodeId);

  const visibleL2NodeIds = [l2NodeId, ...connectedL2NodeIds];
  state.nodeSizeMax = Math.max(...visibleL2NodeIds.map(id => state.activeL2NodeById[id]?.volume || 0), 1);
  state.nodeSizeTotal = visibleL2NodeIds.reduce((sum, id) => sum + (state.activeL2NodeById[id]?.volume || 0), 0);

  const l2NodeItems = visibleL2NodeIds.map(id => {
    const l2Node = state.activeL2NodeById[id];
    const l1Node = state.activeL1NodeById[state.l2ToL1NodeId[id]];
    const isFocusedL2Node = id === l2NodeId;
    const nodeColor = trendColor(l2Node.trend);
    const itemStyle = isFocusedL2Node
      ? { color: nodeColor, borderColor: nodeColor, borderWidth: 3, opacity: 1 }
      : { color: nodeColor, borderColor: nodeColor, borderWidth: 1.5, opacity: 0.75 };

    return {
      id: l2Node.id,
      symbolSize: nodeSize(l2Node.volume, 'l2'),
      itemStyle: { ...itemStyle },
      label: {
        show: true,
        formatter: makeLabel(l2Node.name, l2Node.volume, l1Node.name, l1Node.badgeColor, false),
        rich: state.richStyles,
      },
      _l1NodeId: state.l2ToL1NodeId[id],
      _type: isFocusedL2Node ? 'focusL2' : 'connectedL2',
      _orig: {
        _l1NodeId: state.l2ToL1NodeId[id],
        _type: isFocusedL2Node ? 'focusL2' : 'connectedL2',
        trend: l2Node.trend,
        fixed: false,
        _name: l2Node.name,
        _volume: l2Node.volume,
        _l1NodeName: l1Node.name,
        _badgeColor: l1Node.badgeColor,
        _dim: false,
        _itemStyle: itemStyle,
      },
    };
  });

  const visibleEdges = connectedL2Edges.filter(edge => {
    const sameL1Node = state.l2ToL1NodeId[edge.s] === state.l2ToL1NodeId[edge.t];
    if (sameL1Node && !state.showIntraEdges) return false;
    if (!sameL1Node && !state.showCrossEdges) return false;
    return true;
  });
  const maxEdgeWidth = Math.max(...visibleEdges.map(edge => edge.w), 1);
  const links = visibleEdges.map(edge => ({
    source: edge.s,
    target: edge.t,
    lineStyle: {
      width: Math.max(1, edge.w / maxEdgeWidth * 5 * EDGE_WIDTH_SCALE),
      color: themeVar('linkIntra'),
      curveness: 0.1,
    },
    _origWidth: Math.max(1, edge.w / maxEdgeWidth * 5 * EDGE_WIDTH_SCALE),
    _origColor: themeVar('linkIntra'),
  }));

  state.curNodes = l2NodeItems;
  state.curLinks = links;
  state.curAdjMap = buildAdjMap(links);
  renderChart(l2NodeItems, links);
  updateRightPanel();
}
