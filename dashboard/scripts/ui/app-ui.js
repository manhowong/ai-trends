/* ============================================================
   app-ui.js - Non-chart application UI behavior
   ============================================================ */

export function initializeAppUI({
  state,
  refreshThemeVars,
  initializeRichStyles,
  rerenderCurrentView,
  toggleSidebar,
}) {
  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) localStorage.setItem('theme', theme);

    const button = document.getElementById('themeToggle');
    if (button) {
      button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    refreshThemeVars();
    if (state.activeL1Nodes.length) {
      initializeRichStyles();
      rerenderCurrentView();
    }
  }

  function initThemeToggle() {
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme || 'light', false);

    const button = document.getElementById('themeToggle');
    if (!button) return;

    button.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true);
    });
  }

  function initSidebarToggle() {
    const button = document.getElementById('sidebarToggle');
    if (!button) return;
    button.addEventListener('click', toggleSidebar);
  }

  function initPanelToggle() {
    const button = document.getElementById('panelToggle');
    if (!button) return;

    button.addEventListener('click', () => {
      document.getElementById('right-panel')?.classList.toggle('collapsed');
    });
  }

  function initResponsiveSidebarBehavior() {
    if (window.innerWidth <= 768) {
      document.getElementById('right-panel')?.classList.add('collapsed');
      document.getElementById('sidebar')?.classList.add('collapsed');
    }

    document.addEventListener('click', event => {
      if (window.innerWidth > 768) return;

      const sidebar = document.getElementById('sidebar');
      if (!sidebar || sidebar.classList.contains('collapsed')) return;
      if (sidebar.contains(event.target)) return;

      toggleSidebar();
    });
  }

  initThemeToggle();
  initSidebarToggle();
  initPanelToggle();
  initResponsiveSidebarBehavior();
}
