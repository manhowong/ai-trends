/* ============================================================
   panel-ui.js - Info Panel UI behavior
   ============================================================ */

export function initializePanelUI() {
  const button = document.getElementById('panel-toggle');
  if (!button) return;

  button.addEventListener('click', () => {
    document.getElementById('info-panel')?.classList.toggle('collapsed');
  });
}
