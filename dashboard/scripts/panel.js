/* ============================================================
   panel.js - Right-panel renderers and sort-control helpers
   ============================================================ */

import { state } from './state.js';
import {
  collectEdgesForNode,
  countEdgesByNodeId,
  getMetricBarWidths,
  sortByMetric,
  sortByMetricSelector,
} from './data/data-helpers.js';
import { trendColor, formatCount } from './chart/chart.js';
import { L1_NODES_LABEL, L2_NODES_LABEL } from './ui/ui-text.js';

export function setPanelContent(boxId, title, sortHTML, contentHTML) {
  document.getElementById(`${boxId}-title`).innerHTML = title;
  document.getElementById(`${boxId}-sort`).innerHTML = sortHTML;
  document.getElementById(`${boxId}-content`).innerHTML = contentHTML;
}

export function setSortMode(level, mode) {
  if (level === 1) state.level1SortMode = mode;
  if (level === 2) state.level2SortMode = mode;
  updateRightPanel();
}

export function buildSortDropdown(level, modes, activeMode) {
  const labelMap = { papers: '# articles', hotness: 'hotness', links: '# links' };
  const options = modes.map(mode => `
      <option value="${mode}" ${activeMode === mode ? 'selected' : ''}>
        ${labelMap[mode] || mode}
      </option>`).join('');

  return `
    <div class="sort-select-wrap">
      <select id="sort-select-level-${level}" class="form-select"
              onchange="setSortMode(${level}, this.value)">
        ${options}
      </select>
    </div>`;
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

export function renderOverviewPanel() {
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  const l1NodesWithMetrics = state.anyL1Nodes.map(l1Node => {
    const filteredL1Node = state.activeL1NodeById[l1Node.id];
    return {
      l1Node,
      volume: filteredL1Node ? filteredL1Node.volume : 0,
      hotness: filteredL1Node ? filteredL1Node.hotness : 0,
    };
  });

  const sorted = sortByMetric(
    l1NodesWithMetrics,
    state.level1SortMode === 'hotness' ? 'hotness' : 'volume',
  );

  const metricValues = sorted.map(item =>
    state.level1SortMode === 'hotness' ? item.hotness : item.volume
  );
  const barWidths = getMetricBarWidths(state.level1SortMode, metricValues);
  const sortDropdown = buildSortDropdown(1, ['papers', 'hotness'], state.level1SortMode);
  const sortWithHelp = `<div class="sort-with-help"><help-icon role="button" data-help="documentation" data-help-section="statistics"></help-icon>${sortDropdown}</div>`;

  const topHTML = `
    <div class="ranked-list">
      ${sorted.map((item, i) => {
        const { l1Node } = item;
        const belowThreshold = item.volume < threshold;
        const disabled = !!l1Node.isUnassigned || belowThreshold || !state.activeL1NodeById[l1Node.id];
        const rowClass = `ranked-row${disabled ? ' ranked-row--disabled' : ''}`;
        const attrs = disabled
          ? ''
          : `onmouseenter="applyHover('${l1Node.id}')" onmouseleave="clearHover()"
             onclick="focusL1Node('${l1Node.id}')" style="cursor:pointer"`;
        const countLabel = state.level1SortMode === 'papers'
          ? formatCountWithThreshold(metricValues[i])
          : formatMetricValue(state.level1SortMode, metricValues[i]);
        return `
        <div class="${rowClass}" data-id="${l1Node.id}" ${attrs}>
          <span class="rank-num">${i + 1}</span>
          <span class="rank-dot" style="background:${trendColor(l1Node.trend)}"></span>
          <span class="rank-name">${l1Node.name}</span>
          <span class="rank-count">${countLabel}</span>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${barWidths[i]}%"></div></div>
        </div>`;
      }).join('')}
    </div>`;

  const bottomHTML = `
    <div id="instructions">
      <span><i>Desktop</i></span>
      <ul class="noBullet-list">
        <li><b>Click</b> a node to go down a level.</li>
        <li><b>Double-click on empty space</b> to go up a level.</li>
      </ul>

      <span><i>Mobile</i></span>
      <ul class="noBullet-list">
        <li><b>Tap</b> a node <b>twice</b> to go down a level.</li>
        <li><b>Long-press anywhere</b> to go up a level.</li>
      </ul>

      <span>
          You can also go to a node in <b>this panel</b> or by <b>search</b>: <br /> 
          Press <span class="mockKbd">Ctrl</span> + <span class="mockKbd">K</span> or 
          "Go to ${L2_NODES_LABEL}" in
          <span class="mockToggle">
            <span class="mock-hamburger-icon">OPTIONS</span>
          </span>
      </span>

      <span>
        To see <b>trends</b>, set a range ≥ 2 months in 
        <span class="mockToggle">
          <span class="mock-hamburger-icon">OPTIONS</span>
        </span>
      </span>
    </div>`;

  setPanelContent(
    'info-top',
    `${L1_NODES_LABEL} <help-icon role="button" data-help="documentation" data-help-section="taxonomy"></help-icon>`,
    sortWithHelp,
    topHTML,
  );
  setPanelContent('info-bottom', 'How to Use', '', bottomHTML);
}

export function renderL1NodePanel() {
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  const currentL1Node = state.anyL1NodeById[state.currentL1NodeId] || state.activeL1NodeById[state.currentL1NodeId];

  const connectedEdgeCountByL2NodeId = countEdgesByNodeId(
    currentL1Node.children.map(l2Node => l2Node.id),
    state.l2Edges,
  );

  const sorted = sortByMetricSelector(currentL1Node.children, l2Node => {
    if (state.level2SortMode === 'papers') return l2Node.volume;
    if (state.level2SortMode === 'hotness') return l2Node.hotness;
    if (state.level2SortMode === 'links') return connectedEdgeCountByL2NodeId[l2Node.id] || 0;
    return 0;
  });

  const metricValues = sorted.map(l2Node => {
    if (state.level2SortMode === 'papers') return l2Node.volume;
    if (state.level2SortMode === 'hotness') return l2Node.hotness;
    if (state.level2SortMode === 'links') return connectedEdgeCountByL2NodeId[l2Node.id] || 0;
    return l2Node.volume;
  });
  const barWidths = getMetricBarWidths(state.level2SortMode, metricValues);
  const sortDropdown = buildSortDropdown(2, ['papers', 'hotness', 'links'], state.level2SortMode);
  const sortWithHelp = `<div class="sort-with-help"><help-icon role="button" data-help="documentation" data-help-section="statistics"></help-icon>${sortDropdown}</div>`;

  const topHTML = `
    <div class="ranked-list">
      ${sorted.map((l2Node, i) => {
        const belowThreshold = l2Node.volume < threshold;
        const disabled = !!l2Node.isUnassigned || belowThreshold;
        const rowClass = `ranked-row${disabled ? ' ranked-row--disabled' : ''}`;
        const attrs = disabled
          ? ''
          : `onmouseenter="applyHover('${l2Node.id}')" onmouseleave="clearHover()"
             onclick="focusL2Node('${l2Node.id}')" style="cursor:pointer"`;
        const countLabel = state.level2SortMode === 'papers'
          ? formatCountWithThreshold(l2Node.volume)
          : formatMetricValue(state.level2SortMode, metricValues[i]);
        return `
        <div class="${rowClass}" data-id="${l2Node.id}" ${attrs}>
          <span class="rank-num">${i + 1}</span>
          <span class="rank-dot" style="background:${trendColor(l2Node.trend)}"></span>
          <span class="rank-name">${l2Node.name}</span>
          <span class="rank-count">${countLabel}</span>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${barWidths[i]}%"></div></div>
        </div>`;
      }).join('')}
    </div>`;

  setPanelContent(
    'info-top',
    `${L2_NODES_LABEL} <help-icon role="button" data-help="documentation" data-help-section="classification"></help-icon>`,
    sortWithHelp,
    topHTML,
  );
  setPanelContent(
    'info-bottom',
    `Out-of-Scope ${L2_NODES_LABEL} <help-icon role="button" data-help="documentation" data-help-section="stage-2-planned-llm-review-for-ambiguous-cases"></help-icon>`,
    '<span class="rank-bar-title"># articles</span>',
    '<p class="empty-state">In development</p>',
  );
}

export function renderL2NodePanel() {
  const keywords = sortByMetric(state.keywordsByNode[state.currentL2NodeId] || [], 'volume');
  const keywordMetrics = keywords.map(keyword => keyword.volume);
  const keywordBarWidths = getMetricBarWidths('papers', keywordMetrics);

  const topHTML = keywords.length
    ? `<div class="ranked-list">
        ${keywords.map((keyword, i) => `
          <div class="ranked-row">
            <span class="rank-num">${i + 1}</span>
            <span class="rank-dot" style="background:${trendColor(keyword.trend)}"></span>
            <span class="rank-name">${keyword.name}</span>
            <span class="rank-count">${formatMetricValue('papers', keywordMetrics[i])}</span>
            <div class="rank-bar-wrap"><div class="rank-bar" style="width:${keywordBarWidths[i]}%"></div></div>
          </div>`).join('')}
       </div>`
    : '<p class="empty-state">Insufficient data.</p>';

  const connectedEdges = sortByMetric(
    collectEdgesForNode(state.currentL2NodeId, state.l2Edges),
    'w',
  );

  const maxEdgeWidth = Math.max(...connectedEdges.map(edge => edge.w), 1);

  const bottomHTML = connectedEdges.length
    ? `<div class="ranked-list">
        ${connectedEdges.map((edge, i) => {
          const connectedL2NodeId = edge.s === state.currentL2NodeId ? edge.t : edge.s;
          const connectedL2Node = state.activeL2NodeById[connectedL2NodeId];
          if (!connectedL2Node) return '';
          return `
            <div class="ranked-row" data-id="${connectedL2NodeId}"
                onmouseenter="applyHover('${connectedL2NodeId}')" onmouseleave="clearHover()"
                onclick="focusL2Node('${connectedL2NodeId}')" style="cursor:pointer">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-dot" style="background:${trendColor(connectedL2Node.trend)}"></span>
              <span class="rank-name">${connectedL2Node.name}</span>
              <span class="rank-count">${(edge.w * 100).toFixed(1)} %</span>
              <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round(edge.w / maxEdgeWidth * 100)}%"></div></div>
            </div>`;
        }).join('')}
       </div>`
    : '<p class="empty-state">No relevant topics found in selected period.</p>';

  setPanelContent(
    'info-top',
    'Frequent Terms <help-icon role="button" data-help="documentation" data-help-section="keyword-extraction"></help-icon>',
    '<span class="rank-bar-title"># articles</span>',
    topHTML,
  );
  setPanelContent(
    'info-bottom',
    `Relevant ${L2_NODES_LABEL} <help-icon role="button" data-help="documentation" data-help-section="links-and-relevance-dsc"></help-icon>`,
    '<span class="rank-bar-title">Relevance score (DSC)</span>',
    bottomHTML,
  );
}

export function updateRightPanel() {
  if (state.currentView === 'overview') renderOverviewPanel();
  if (state.currentView === 'l1') renderL1NodePanel();
  if (state.currentView === 'l2') renderL2NodePanel();
}
