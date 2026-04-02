/* ============================================================
   search.js — Search modal: find and navigate to any node
   ============================================================ */

import { state } from './state.js';
import { filterByNameMatch, sortByNameMatch } from './data/data-helpers.js';
import { themeVar, formatCount, applyHover } from './chart.js';
import { focusL1Node, focusL2Node } from './views.js';
import { L1_NODE_LABEL } from './ui-text.js';

function getAllNodes() {
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
      badgeColor: l1Node ? l1Node.badgeColor : themeVar('trendFlat'),
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
        badgeColor: l2Node.badgeColor || themeVar('trendFlat'),
        disabled: !!l2Node.isUnassigned,
      });
    });
  });

  return results;
}

function filterNodes(query) {
  const matchedNodes = filterByNameMatch(getAllNodes(), query);
  return sortByNameMatch(matchedNodes, query).slice(0, 30);
}

function highlightMatch(name, query) {
  const matchIndex = name.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex === -1) return name;
  return (
    name.slice(0, matchIndex) +
    `<mark class="search-highlight">${name.slice(matchIndex, matchIndex + query.length)}</mark>` +
    name.slice(matchIndex + query.length)
  );
}

function navigateToNode(id, level) {
  if (level === 1) {
    focusL1Node(id);
  } else {
    focusL2Node(id);
  }

  if (level === 2) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        state.hoveredNode = id;
        applyHover(id);
      }, 500);
    });
  }
}

function renderResults(nodes, query) {
  const container = document.getElementById('search-results');
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);

  if (!query.trim()) {
    container.innerHTML = '';
    return;
  }

  if (!nodes.length) {
    container.innerHTML = '<p class="search-empty">No results in selected period.</p>';
    return;
  }

  container.innerHTML = nodes.map(node => {
    const belowThreshold = node.thresholdVolume < threshold;
    const isDisabled = node.disabled || belowThreshold;
    const countLabel = node.kind === 'keyword'
      ? 'frequent term in'
      : (node.volume === 0 ? '0' : (belowThreshold ? `&lt; ${threshold}` : formatCount(node.volume)));
    const badgeHTML = node.kind === 'keyword'
      ? `<span class="search-result-badge search-result-badge--topic">${node.badgeText}</span>`
      : (node.badgeText
          ? `<span class="search-result-badge" style="background:${node.badgeColor}">${node.badgeText}</span>`
          : `<span class="search-result-badge search-result-badge--category">${L1_NODE_LABEL}</span>`);

    return `
    <div class="search-result-row${node.kind === 'keyword' ? ' search-result-row--keyword' : ''}${isDisabled ? ' search-result-row--disabled' : ''}"
         data-id="${node.id}" data-level="${node.level}" data-disabled="${isDisabled ? '1' : '0'}">
      <span class="search-result-name">${highlightMatch(node.name, query)}</span>
      <span class="search-result-papers">${countLabel}</span>
      ${badgeHTML}
    </div>`;
  }).join('');

  container.querySelectorAll('.search-result-row').forEach(row => {
    row.addEventListener('click', () => {
      if (row.dataset.disabled === '1') return;
      const id = row.dataset.id;
      const level = parseInt(row.dataset.level, 10);
      closeSearch();
      navigateToNode(id, level);
    });
  });
}

let selectedIndex = -1;
function updateSelection(rows) {
  rows.forEach((row, index) => {
    row.classList.toggle('search-result-selected', index === selectedIndex);
    if (index === selectedIndex) row.scrollIntoView({ block: 'nearest' });
  });
}

document.getElementById('search-input').addEventListener('keydown', e => {
  const rows = [...document.querySelectorAll('.search-result-row')];
  if (!rows.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, rows.length - 1);
    updateSelection(rows);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection(rows);
  } else if (e.key === 'Enter' && selectedIndex >= 0) {
    e.preventDefault();
    rows[selectedIndex].click();
  }
});

function openSearch() {
  document.getElementById('search-overlay').classList.add('active');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch() {
  document.getElementById('search-overlay').classList.remove('active');
}

export function initSearch() {
  document.getElementById('searchBtn')
    .addEventListener('click', openSearch);

  document.getElementById('search-backdrop')
    .addEventListener('click', closeSearch);

  document.getElementById('search-input')
    .addEventListener('input', e => {
      const query = e.target.value;
      renderResults(filterNodes(query), query);
    });

  document.addEventListener('keydown', e => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.getElementById('search-overlay').classList.contains('active')
        ? closeSearch()
        : openSearch();
    }

    if (e.key === 'Escape') closeSearch();
  });
}
