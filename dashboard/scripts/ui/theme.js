/* ============================================================
   theme.js - Theme UI behavior
   ============================================================ */

export function initializeThemeUI({
  state,
  refreshThemeVars,
  initializeRichStyles,
  rerenderCurrentView,
}) {
  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) localStorage.setItem('theme', theme);

    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    refreshThemeVars();
    if (state.activeL1Nodes.length) {
      initializeRichStyles();
      rerenderCurrentView();
    }
  }

  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme || 'light', false);

  const button = document.getElementById('theme-toggle');
  if (!button) return;

  button.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true);
  });
}
