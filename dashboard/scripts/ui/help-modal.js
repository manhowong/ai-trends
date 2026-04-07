/* ============================================================
   help-modal.js — Help modal: load content pages into overlay
   ============================================================ */

import { closeModal, openModal, registerModal } from './modal-controller.js';
import { LEGEND_HTML } from './ui-text.js';

export function initHelp() {
  const overlay = document.getElementById('help-overlay');
  const backdrop = document.getElementById('help-backdrop');
  const titleEl = document.getElementById('help-title');
  const contentEl = document.getElementById('help-content');
  const closeBtn = document.getElementById('help-close');
  const topBtn = document.getElementById('help-top');

  if (!overlay || !backdrop || !titleEl || !contentEl || !closeBtn || !topBtn) return;

  const HIGHLIGHT_CLASS = 'help-highlight';
  const HIGHLIGHT_MS = 1600;
  const SCROLL_HIGHLIGHT_DELAY_MS = 200;
  const SCROLL_OFFSET_PX = 8;
  let helpRequestToken = 0;

  titleEl.textContent = 'Help';

  const openInlineContent = ({ title, html, scrollToTop = true } = {}) => {
    helpRequestToken += 1;
    titleEl.textContent = title || 'Help';
    contentEl.innerHTML = html || '';
    topBtn.classList.remove('is-visible');
    if (scrollToTop) {
      contentEl.scrollTop = 0;
    }
    openModal('help');
  };

  const clearHighlights = () => {
    contentEl.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(element => {
      element.classList.remove(HIGHLIGHT_CLASS);
    });
  };

  const highlightTarget = target => {
    if (!target) return;
    clearHighlights();
    target.classList.remove(HIGHLIGHT_CLASS);
    void target.offsetWidth;
    target.classList.add(HIGHLIGHT_CLASS);
    window.setTimeout(() => target.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
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

    const headerHeight = document.getElementById('help-header')?.offsetHeight || 0;
    const top = Math.max(0, target.offsetTop - headerHeight - SCROLL_OFFSET_PX);
    contentEl.scrollTo({ top, behavior: 'smooth' });
    window.setTimeout(() => highlightTarget(target), SCROLL_HIGHLIGHT_DELAY_MS);
  };

  const openHelp = async (helpId, sectionId) => {
    if (!helpId) return;

    helpRequestToken += 1;
    const requestToken = helpRequestToken;
    titleEl.textContent = 'Help';
    openModal('help');
    contentEl.innerHTML = '<p class="empty-state">Loading...</p>';
    topBtn.classList.remove('is-visible');

    try {
      const response = await fetch(`./docs/html/${helpId}.html`);
      if (!response.ok) throw new Error(`Failed to load ${helpId}`);
      const html = await response.text();
      if (requestToken !== helpRequestToken) return;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      contentEl.innerHTML = doc.body ? doc.body.innerHTML : html;

      if (window.MathJax?.typesetPromise) {
        await window.MathJax.typesetPromise([contentEl]);
        if (requestToken !== helpRequestToken) return;
      }

      scrollToSection(sectionId);
    } catch (error) {
      if (requestToken !== helpRequestToken) return;
      contentEl.innerHTML = '<p class="empty-state">Unable to load help content.</p>';
    }
  };

  const closeHelp = () => {
    closeModal('help');
  };

  const extractHashId = link => {
    if (!link) return null;

    const href = link.getAttribute('href');
    if (!href) return null;
    if (href.startsWith('#')) return href.slice(1);

    try {
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname && url.hash) {
        return url.hash.slice(1);
      }
    } catch {
      return null;
    }

    return null;
  };

  const handleHelpIcon = icon => {
    if (!icon) return;
    openHelp(icon.dataset.help, icon.dataset.helpSection);
  };

  contentEl.addEventListener('click', event => {
    const link = event.target.closest('a');
    const sectionId = extractHashId(link);
    if (!sectionId) return;
    event.preventDefault();
    scrollToSection(sectionId);
  });

  contentEl.addEventListener('scroll', () => {
    if (contentEl.scrollTop > 120) {
      topBtn.classList.add('is-visible');
    } else {
      topBtn.classList.remove('is-visible');
    }
  });

  topBtn.addEventListener('click', () => {
    contentEl.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('legend-btn')?.addEventListener('click', () => {
    openInlineContent({
      title: 'Legend',
      html: LEGEND_HTML,
    });
  });

  document.addEventListener('click', event => {
    const icon = event.target.closest('help-icon');
    handleHelpIcon(icon);
  });

  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target?.tagName?.toLowerCase() === 'help-icon') {
      event.preventDefault();
      handleHelpIcon(event.target);
    }
  });

  registerModal({
    id: 'help',
    overlay,
    backdrop,
    onClose: () => {
      helpRequestToken += 1;
      titleEl.textContent = 'Help';
      contentEl.innerHTML = '';
      topBtn.classList.remove('is-visible');
    },
  });

  closeBtn.addEventListener('click', closeHelp);
}
