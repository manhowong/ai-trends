/* ============================================================
   breadcrumb.js - Breadcrumb UI rendering
   ============================================================ */

function formatCountShort(value) {
  if (value >= 1000) {
    const kValue = Math.round(value / 100) / 10;
    return Number.isInteger(kValue) ? `${kValue.toFixed(0)}k` : `${kValue.toFixed(1)}k`;
  }

  return String(value);
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

export function renderBreadcrumb({
  currentView,
  currentL1Node,
  currentL2Node,
  onOverview,
  onL1Node,
}) {
  const container = document.getElementById('breadcrumb');
  if (!container) return;

  container.innerHTML = '';
  makeBreadcrumbSegment(container, 'Overview', currentView !== 'overview', onOverview);

  if ((currentView === 'l1' || currentView === 'l2') && currentL1Node) {
    makeBreadcrumbSeparator(container);
    makeBreadcrumbSegment(
      container,
      currentL1Node.name,
      currentView === 'l2',
      () => onL1Node(currentL1Node.id),
    );
  }

  if (currentView === 'l2' && currentL2Node) {
    makeBreadcrumbSeparator(container);
    makeBreadcrumbSegment(
      container,
      `${currentL2Node.name} (${formatCountShort(currentL2Node.volume || 0)})`,
      false,
      null,
    );
  }
}
