const STEPS = [
  {
    target: '#site-banner',
    text: 'The title shows the current date range of data being visualised.',
    side: 'right',
  },
  {
    target: '#sidebar',
    text: 'Graph controls: adjust the date range, toggle edge types, change font size, or fit the graph to screen.',
    side: 'right',
  },
  {
    target: '#edgeToggleControl',
    text: 'Toggle cross-category and within-category links independently.',
    side: 'right',
  },
  {
    target: '#right-panel',
    text: 'The node list shows ranked topics or categories. Click any row to navigate to it.',
    side: 'left',
  },
  {
    target: '#panel-breadcrumb',
    text: 'Breadcrumb shows where you are. Click any segment to navigate back up.',
    side: 'left',
  },
  {
    target: '#chart',
    text: 'The graph: node size = paper count, link width = topic similarity. Click a node to explore it. Double-click (or long-press) empty space to go back.',
    side: 'top',
  },
  {
    target: '#legend',
    text: 'Red = growing topic, blue = shrinking, grey = stable or insufficient data.',
    side: 'right',
  },
];

let currentStep = 0;

function getRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function placeTooltip(rect, side) {
  const tooltip = document.getElementById('help-tooltip');
  const tw = tooltip.offsetWidth  || 260;
  const th = tooltip.offsetHeight || 120;
  const pad = 20;
  let top, left;

  if (side === 'right') {
    top  = rect.top + rect.height / 2 - th / 2;
    left = rect.right + pad;
  } else if (side === 'left') {
    top  = rect.top + rect.height / 2 - th / 2;
    left = rect.left - tw - pad;
  } else if (side === 'top') {
    top  = rect.top - th - pad;
    left = rect.left + rect.width / 2 - tw / 2;
  } else {
    top  = rect.bottom + pad;
    left = rect.left + rect.width / 2 - tw / 2;
  }

  // Clamp to viewport
  top  = Math.max(8, Math.min(top,  window.innerHeight - th - 8));
  left = Math.max(8, Math.min(left, window.innerWidth  - tw - 8));

  tooltip.style.top  = top  + 'px';
  tooltip.style.left = left + 'px';

  return { top, left, width: tw, height: th };
}

function drawArrow(fromRect, toRect) {
  const svg = document.getElementById('help-arrow');

  // Ensure arrowhead marker exists
  if (!svg.querySelector('defs')) {
    svg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8"
                refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#b3a369"/>
        </marker>
      </defs>`;
  } else {
    svg.querySelectorAll('path').forEach(p => p.remove());
  }

  // Arrow from tooltip centre-edge to target centre
  const x1 = fromRect.left + fromRect.width  / 2;
  const y1 = fromRect.top  + fromRect.height / 2;
  const x2 = toRect.left   + toRect.width    / 2;
  const y2 = toRect.top    + toRect.height   / 2;

  // Cubic bezier for a nice curve
  const cx1 = x1 + (x2 - x1) * 0.4;
  const cy1 = y1;
  const cx2 = x1 + (x2 - x1) * 0.6;
  const cy2 = y2;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`);
  path.setAttribute('stroke', '#b3a369');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  path.setAttribute('marker-end', 'url(#arrowhead)');
  svg.appendChild(path);
}

function showStep(i) {
  const step    = STEPS[i];
  const total   = STEPS.length;
  const targRect = getRect(step.target);
  if (!targRect) return;

  document.getElementById('help-text').textContent = step.text;
  document.getElementById('help-step').textContent = `${i + 1} / ${total}`;
  document.getElementById('help-prev').disabled = i === 0;
  document.getElementById('help-next').disabled = i === total - 1;

  // Place tooltip first (needs to be in DOM to measure)
  const tooltip = document.getElementById('help-tooltip');
  tooltip.style.visibility = 'hidden';

  requestAnimationFrame(() => {
    const tipRect = placeTooltip(targRect, step.side);
    tooltip.style.visibility = 'visible';
    drawArrow(
      { left: tipRect.left, top: tipRect.top, width: tipRect.width, height: tipRect.height },
      targRect
    );
  });
}

function openHelp() {
  currentStep = 0;
  document.getElementById('help-overlay').classList.add('active');
  showStep(0);
}

function closeHelp() {
  document.getElementById('help-overlay').classList.remove('active');
  document.getElementById('help-arrow').querySelectorAll('path').forEach(p => p.remove());
}

export function initHelp() {
  document.getElementById('helpBtn').addEventListener('click', openHelp);
  document.getElementById('help-close').addEventListener('click', closeHelp);
  document.getElementById('help-backdrop').addEventListener('click', closeHelp);

  document.getElementById('help-next').addEventListener('click', () => {
    if (currentStep < STEPS.length - 1) showStep(++currentStep);
  });

  document.getElementById('help-prev').addEventListener('click', () => {
    if (currentStep > 0) showStep(--currentStep);
  });
}