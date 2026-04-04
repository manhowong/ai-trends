/* ============================================================
   panel-ui.js - Info Panel UI behavior
   ============================================================ */

export function initializePanelUI() {
  const button = document.getElementById('panelToggle');
  if (!button) return;

  button.addEventListener('click', () => {
    document.getElementById('info-panel')?.classList.toggle('collapsed');
  });
}
