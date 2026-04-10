/* ============================================================
   search-modal.js — Search modal: find and navigate to any node
   ============================================================ */

import { state } from '../state.js';
import { buildSearchRecords, filterByNameMatch, sortByNameMatch } from '../data/data-helpers.js';
import { closeModal, openModal, registerModal, toggleModal } from './modal-controller.js';
import { themeVar, formatCount, applyHover } from '../chart/chart.js';
import { showCurrentL1Node, showCurrentL2Node } from '../app/view-coordination.js';
import { L1_NODE_LABEL } from './ui-text.js';
import { animateScrambledText } from '../animation.js';

const RANDOM_TOPIC_ANIMATION_MS = 800;
const RANDOM_TOPIC_READ_MS = 1000;

function filterNodes(query) {
  const matchedNodes = filterByNameMatch(
    buildSearchRecords(state, themeVar('trendFlat')),
    query,
  );
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
    showCurrentL1Node(id);
  } else {
    showCurrentL2Node(id);
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

function getRandomActiveL2NodeId() {
  const l2NodeIds = Object.keys(state.activeL2NodeById || {});
  if (!l2NodeIds.length) return null;
  const randomIndex = Math.floor(Math.random() * l2NodeIds.length);
  return l2NodeIds[randomIndex];
}

let randomTopicAnimationTimer = null;
let cancelRandomTopicAnimation = null;

function getRandomTopicPreviewEl() {
  return document.getElementById('random-topic-preview');
}

function stopRandomTopicAnimation() {
  if (cancelRandomTopicAnimation) {
    cancelRandomTopicAnimation();
    cancelRandomTopicAnimation = null;
  }
  if (randomTopicAnimationTimer) {
    clearTimeout(randomTopicAnimationTimer);
    randomTopicAnimationTimer = null;
  }
}

function resetRandomTopicPreview() {
  stopRandomTopicAnimation();
  const preview = getRandomTopicPreviewEl();
  if (preview) preview.textContent = '';
  const button = document.getElementById('random-topic-btn');
  if (button) button.disabled = false;
}

function openRandomTopic() {
  const l2NodeId = getRandomActiveL2NodeId();
  const topicName = state.activeL2NodeById[l2NodeId]?.name;
  const preview = getRandomTopicPreviewEl();
  const button = document.getElementById('random-topic-btn');
  if (!l2NodeId || !topicName || !preview || !button) return;

  stopRandomTopicAnimation();
  button.disabled = true;

  cancelRandomTopicAnimation = animateScrambledText({
    text: topicName,
    duration: RANDOM_TOPIC_ANIMATION_MS,
    onUpdate: value => {
      preview.textContent = value;
    },
    onComplete: () => {
      cancelRandomTopicAnimation = null;
      randomTopicAnimationTimer = setTimeout(() => {
        randomTopicAnimationTimer = null;
        closeSearch();
        navigateToNode(l2NodeId, 2);
      }, RANDOM_TOPIC_READ_MS);
    },
  });
}

function renderResults(nodes, query) {
  const container = document.getElementById('search-results');
  const threshold = Math.max(1, parseInt(state.volumeThreshold, 10) || 1);
  if (!container) return;

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
          : `<span class="search-result-badge search-result-badge--area">${L1_NODE_LABEL}</span>`);

    return `
    <div class="search-result-row${node.kind === 'keyword' ? ' search-result-row--keyword' : ''}${isDisabled ? ' search-result-row--disabled' : ''}"
         data-id="${node.id}" data-level="${node.level}" data-disabled="${isDisabled ? '1' : '0'}">
      <span class="search-result-name">${highlightMatch(node.name, query)}</span>
      <div class="search-result-meta">
        <span class="search-result-count">${countLabel}</span>
        ${badgeHTML}
      </div>
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

function openSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
  resetRandomTopicPreview();
  selectedIndex = -1;
  openModal('search');
}

function closeSearch() {
  closeModal('search');
}

export function initSearch() {
  const overlay = document.getElementById('search-overlay');
  const backdrop = document.getElementById('search-backdrop');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  if (!overlay || !backdrop || !input || !results) return;

  registerModal({
    id: 'search',
    overlay,
    backdrop,
    getFocusTarget: () => input,
    onClose: () => {
      selectedIndex = -1;
      input.value = '';
      results.innerHTML = '';
      resetRandomTopicPreview();
    },
  });

  document.getElementById('search-btn')
    ?.addEventListener('click', openSearch);

  document.getElementById('random-topic-btn')
    ?.addEventListener('click', openRandomTopic);

  input.addEventListener('input', event => {
    const query = event.target.value;
    renderResults(filterNodes(query), query);
  });

  input.addEventListener('keydown', event => {
    const rows = [...document.querySelectorAll('.search-result-row')];
    if (!rows.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, rows.length - 1);
      updateSelection(rows);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(rows);
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      rows[selectedIndex].click();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      toggleModal('search');
    }
  });
}
