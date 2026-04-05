/* ============================================================
   info-panel.js - info-panel renderers and sort-control helpers
   ============================================================ */

import { state } from './state.js';
import {
  getEdgesByNodeId,
  countEdgesByNodeId,
  getConnectedNodeId,
  getMetricBarWidths,
  sortByValue,
} from './data/data-helpers.js';
import { trendColor, formatCount } from './chart/chart.js';
import {
  FREQUENT_TERMS_TITLE,
  INSTRUCTIONS_TITLE,
  DEVELOPMENT_TEXT,
  INSUFFICIENT_DATA_TEXT,
  NO_RELEVANT_NODES_TEXT,
  INSTRUCTIONS_HTML,
  SORT_LABELS,
  L1_LABEL,
  L2_LABEL,
} from './ui/ui-text.js';

export function setPanelContent(boxId, title, sortHTML, contentHTML) {
  document.getElementById(`${boxId}-title`).innerHTML = title;
  document.getElementById(`${boxId}-sort`).innerHTML = sortHTML;
  document.getElementById(`${boxId}-content`).innerHTML = contentHTML;
}

export function setSortMode(mode) {
  state.sortMode = mode;
  updateInfoPanel();
}

function buildHelpButton(helpSection = '') {
  const sectionAttr = helpSection ? ` data-help-section="${helpSection}"` : '';
  return `<help-icon role="button" data-help="documentation"${sectionAttr}></help-icon>`;
}

function buildContentTitle(title, { showHelp = false, helpSection = '' } = {}) {
  return showHelp ? `${title} ${buildHelpButton(helpSection)}` : title;
}

function buildSortControl({
  modes = [],
  activeSortMode = '',
  sortLabel = '',
  showHelp = false,
  helpSection = '',
} = {}) {
  if (modes.length) {
    const options = modes.map(mode => `
        <option value="${mode}" ${activeSortMode === mode ? 'selected' : ''}>
          ${SORT_LABELS[mode] || mode}
        </option>`).join('');

    const helpHtml = showHelp ? buildHelpButton(helpSection) : '';

    return `
      <div class="sort-with-help">
        ${helpHtml}
        <div class="sort-select-wrap">
          <select class="form-select" onchange="setSortMode(this.value)">
            ${options}
          </select>
        </div>
      </div>`;
  }

  if (sortLabel) {
    return `<span class="rank-bar-title">${sortLabel}</span>`;
  }

  return '';
}

export function formatMetricValue(mode, value) {
  if (mode === 'hotness') return value > 0 ? `+${value}` : String(value);
  return formatCount(value);
}

function formatCountWithThreshold(value) {
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  if (value === 0) return '0';
  if (value < threshold) return `< ${threshold}`;
  return formatCount(value);
}

function renderEmptyState(message) {
  return `<p class="empty-state">${message}</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildRankedRow({
  rank,
  name,
  valueLabel,
  widthPercent,
  trend,
  id = null,
  disabled = false,
  onclick = '',
  extraClass = '',
}) {
  const safeName = escapeHtml(name);
  const rowClass = `ranked-row${extraClass ? ` ${extraClass}` : ''}${disabled ? ' ranked-row--disabled' : ''}`;
  const attrs = disabled || !id
    ? `data-full-name="${safeName}"`
    : `data-id="${id}" data-full-name="${safeName}" onmouseenter="applyHover('${id}')" onmouseleave="clearHover()" onclick="${onclick}" style="cursor:pointer"`;

  return `
    <div class="${rowClass}" ${attrs}>
      <span class="rank-num">${rank}</span>
      <span class="rank-dot" style="background:${trendColor(trend)}"></span>
      <span class="rank-name">${safeName}</span>
      <span class="rank-count">${valueLabel}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${widthPercent}%"></div></div>
    </div>`;
}

export function renderOverviewPanel() {
  const allowedSortModes = ['volume', 'hotness'];
  const activeSortMode = state.sortMode;
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  const sortTargets = state.anyL1Nodes.map(l1Node => {
    const filteredL1Node = state.activeL1NodeById[l1Node.id];
    const volume = filteredL1Node ? filteredL1Node.volume : 0;
    const hotness = filteredL1Node ? filteredL1Node.hotness : 0;
    return {
      l1Node,
      volume,
      hotness,
      value: activeSortMode === 'hotness' ? hotness : volume,
    };
  });

  const sortedTargets = sortByValue(sortTargets);

  const sortedValues = sortedTargets.map(item => item.value);
  const barWidths = getMetricBarWidths(activeSortMode, sortedValues);
  const topContentTitle = buildContentTitle(L1_LABEL, {showHelp: true, helpSection: 'taxonomy'});
  const topSortControl = buildSortControl({
    modes: allowedSortModes,
    activeSortMode,
    showHelp: true,
    helpSection: 'statistics',
  });

  const topHTML = `
    <div class="ranked-list">
      ${sortedTargets.map((item, i) => {
        const { l1Node } = item;
        const belowThreshold = item.volume < threshold;
        const disabled = !!l1Node.isUnassigned || belowThreshold || !state.activeL1NodeById[l1Node.id];
        const valueLabel = activeSortMode === 'volume'
          ? formatCountWithThreshold(sortedValues[i])
          : formatMetricValue(activeSortMode, sortedValues[i]);
        return buildRankedRow({
          rank: i + 1,
          id: l1Node.id,
          name: l1Node.name,
          valueLabel,
          widthPercent: barWidths[i],
          trend: l1Node.trend,
          disabled,
          onclick: `showCurrentL1Node('${l1Node.id}')`,
        });
      }).join('')}
    </div>`;

  setPanelContent('info-top', topContentTitle, topSortControl, topHTML);
  setPanelContent('info-bottom', INSTRUCTIONS_TITLE, '', INSTRUCTIONS_HTML);
}

export function renderL1NodePanel() {
  const allowedSortModes = ['volume', 'hotness', 'links'];
  const activeSortMode = state.sortMode;
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  const currentL1Node = state.anyL1NodeById[state.currentL1NodeId] || state.activeL1NodeById[state.currentL1NodeId];

  const edgeCountByNodeId = countEdgesByNodeId(
    currentL1Node.children.map(l2Node => l2Node.id),
    state.l2Edges,
  );

  const sortTargets = currentL1Node.children.map(l2Node => ({
    ...l2Node,
    value: activeSortMode === 'volume'
      ? l2Node.volume
      : activeSortMode === 'hotness'
        ? l2Node.hotness
        : edgeCountByNodeId[l2Node.id] || 0,
  }));

  const sortedTargets = sortByValue(sortTargets);

  const sortedValues = sortedTargets.map(item => item.value);
  const barWidths = getMetricBarWidths(activeSortMode, sortedValues);
  const topContentTitle = buildContentTitle(L2_LABEL, {showHelp: true, helpSection: 'classification'});
  const topSortControl = buildSortControl({
    modes: allowedSortModes,
    activeSortMode,
    showHelp: true,
    helpSection: 'statistics',
  });

  const topHTML = `
    <div class="ranked-list">
      ${sortedTargets.map((l2Node, i) => {
        const belowThreshold = l2Node.volume < threshold;
        const disabled = !!l2Node.isUnassigned || belowThreshold;
        const valueLabel = activeSortMode === 'volume'
          ? formatCountWithThreshold(l2Node.volume)
          : formatMetricValue(activeSortMode, sortedValues[i]);
        return buildRankedRow({
          rank: i + 1,
          id: l2Node.id,
          name: l2Node.name,
          valueLabel,
          widthPercent: barWidths[i],
          trend: l2Node.trend,
          disabled,
          onclick: `showCurrentL2Node('${l2Node.id}')`,
        });
      }).join('')}
    </div>`;


  const bottomContentTitle = buildContentTitle(`Out-of-Scope ${L2_LABEL}`, {showHelp: true, helpSection: 'stage-2-planned-llm-review-for-ambiguous-cases'});
  const bottomSortControl = buildSortControl({ sortLabel: '# articles' });
  const bottomHtml = renderEmptyState(DEVELOPMENT_TEXT);

  setPanelContent('info-top', topContentTitle, topSortControl, topHTML);
  setPanelContent('info-bottom', bottomContentTitle, bottomSortControl, bottomHtml);
}

export function renderL2NodePanel() {
  const sortTargets = (state.keywordsByNode[state.currentL2NodeId] || []).map(keyword => ({
    ...keyword,
    value: keyword.volume,
  }));
  const sortedTargets = sortByValue(sortTargets);
  const sortedValues = sortedTargets.map(keyword => keyword.value);
  const keywordBarWidths = getMetricBarWidths('volume', sortedValues);
  const topContentTitle = buildContentTitle(FREQUENT_TERMS_TITLE, {showHelp: true, helpSection: 'keyword-extraction'});
  const topSortControl = buildSortControl({ sortLabel: '# articles' });

  const topHTML = sortedTargets.length
    ? `<div class="ranked-list">
        ${sortedTargets.map((keyword, i) => `
          ${buildRankedRow({
            rank: i + 1,
            name: keyword.name,
            valueLabel: formatMetricValue('volume', sortedValues[i]),
            widthPercent: keywordBarWidths[i],
            trend: keyword.trend,
          })}`).join('')}
       </div>`
    : renderEmptyState(INSUFFICIENT_DATA_TEXT);

  const bottomContentTitle = buildContentTitle(`Relevant ${L2_LABEL}`, {showHelp: true, helpSection: 'links-and-relevance-dsc'});
  const bottomSortControl = buildSortControl({ sortLabel: 'Relevance score (DSC)' });

  const edgeSortTargets = getEdgesByNodeId(state.currentL2NodeId, state.l2Edges).map(edge => ({
    ...edge,
    value: edge.w,
  }));
  const edgeSortedTargets = sortByValue(edgeSortTargets);
  const maxEdgeWidth = Math.max(...edgeSortedTargets.map(edge => edge.value), 1);
  const bottomHTML = edgeSortedTargets.length
    ? `<div class="ranked-list">
        ${edgeSortedTargets.map((edge, i) => {
          const connectedNodeId = getConnectedNodeId(edge, state.currentL2NodeId);
          const connectedNode = state.activeL2NodeById[connectedNodeId];
          if (!connectedNode) return '';
          return buildRankedRow({
            rank: i + 1,
            id: connectedNodeId,
            name: connectedNode.name,
            valueLabel: `${(edge.value * 100).toFixed(1)} %`,
            widthPercent: Math.round(edge.value / maxEdgeWidth * 100),
            trend: connectedNode.trend,
            onclick: `showCurrentL2Node('${connectedNodeId}')`,
          });
        }).join('')}
       </div>`
    : renderEmptyState(NO_RELEVANT_NODES_TEXT);

  setPanelContent('info-top', topContentTitle, topSortControl, topHTML);
  setPanelContent('info-bottom', bottomContentTitle, bottomSortControl, bottomHTML);
}

export function updateInfoPanel() {
  if (state.currentView === 'overview') renderOverviewPanel();
  if (state.currentView === 'l1') renderL1NodePanel();
  if (state.currentView === 'l2') renderL2NodePanel();
}
