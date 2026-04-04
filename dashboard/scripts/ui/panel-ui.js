/* ============================================================
   panel-ui.js - Panel UI behavior
   ============================================================ */

export function initializePanelUI() {
  const button = document.getElementById('panelToggle');
  if (!button) return;

  button.addEventListener('click', () => {
    document.getElementById('right-panel')?.classList.toggle('collapsed');
  });
}
