/* ============================================================
   help.js — Help modal: load content pages into overlay
   ============================================================ */

export function initHelp() {
  const overlay = document.getElementById('help-overlay');
  const backdrop = document.getElementById('help-backdrop');
  const modal = document.getElementById('help-modal');
  const titleEl = document.getElementById('help-title');
  const contentEl = document.getElementById('help-content');
  const closeBtn = document.getElementById('help-close');

  if (!overlay || !backdrop || !modal || !titleEl || !contentEl || !closeBtn) return;

  const clearHighlights = () => {
    contentEl.querySelectorAll('.help-highlight').forEach(el => {
      el.classList.remove('help-highlight');
    });
  };

  const highlightTarget = target => {
    if (!target) return;
    clearHighlights();
    target.classList.remove('help-highlight');
    void target.offsetWidth;
    target.classList.add('help-highlight');
    window.setTimeout(() => target.classList.remove('help-highlight'), 1600);
  };

  const scrollToSection = sectionId => {
    if (!sectionId) {
      contentEl.scrollTop = 0;
      return;
    }
    const escapedId = window.CSS?.escape ? CSS.escape(sectionId) : sectionId;
    const selector = `#${escapedId}`;
    const target = contentEl.querySelector(selector);
    if (!target) {
      contentEl.scrollTop = 0;
      return;
    }
    target.scrollIntoView({ block: 'start' });
    highlightTarget(target);
  };

  const openHelp = async (helpId, sectionId) => {
    if (!helpId) return;
    overlay.classList.add('active');
    titleEl.textContent = 'Help';
    contentEl.innerHTML = '<p class="empty-state">Loading...</p>';

    try {
      const res = await fetch(`./docs/html/${helpId}.html`);
      if (!res.ok) throw new Error(`Failed to load ${helpId}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      contentEl.innerHTML = doc.body ? doc.body.innerHTML : html;
      if (window.MathJax?.typesetPromise) {
        await window.MathJax.typesetPromise([contentEl]);
      }
      scrollToSection(sectionId);
    } catch (err) {
      contentEl.innerHTML = '<p class="empty-state">Unable to load help content.</p>';
    }
  };

  const closeHelp = () => {
    overlay.classList.remove('active');
    contentEl.innerHTML = '';
  };

  document.addEventListener('click', e => {
    const icon = e.target.closest('help-icon');
    if (icon) {
      openHelp(icon.dataset.help, icon.dataset.helpSection);
      return;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeHelp();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target?.tagName?.toLowerCase() === 'help-icon') {
      e.preventDefault();
      const icon = e.target;
      openHelp(icon.dataset.help, icon.dataset.helpSection);
    }
  });

  backdrop.addEventListener('click', closeHelp);
  closeBtn.addEventListener('click', closeHelp);
}
