/* ============================================================
   modal-controller.js - Shared overlay modal lifecycle
   ============================================================ */

const modalRegistry = new Map();
let activeModalId = null;
let escapeHandlerBound = false;

function ensureEscapeHandler() {
  if (escapeHandlerBound) return;

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !activeModalId) return;
    closeModal(activeModalId);
  });

  escapeHandlerBound = true;
}

export function registerModal({ id, overlay, backdrop, activeClass = 'active', onClose = null, getFocusTarget = null }) {
  if (!id || !overlay || !backdrop) return;

  ensureEscapeHandler();

  backdrop.addEventListener('click', () => closeModal(id));

  modalRegistry.set(id, {
    overlay,
    activeClass,
    onClose,
    getFocusTarget,
  });
}

export function isModalOpen(id) {
  return activeModalId === id;
}

export function openModal(id) {
  const modal = modalRegistry.get(id);
  if (!modal) return;

  if (activeModalId && activeModalId !== id) {
    closeModal(activeModalId);
  }

  activeModalId = id;
  modal.overlay.classList.add(modal.activeClass);

  if (typeof modal.getFocusTarget === 'function') {
    const focusTarget = modal.getFocusTarget();
    if (focusTarget) {
      window.requestAnimationFrame(() => focusTarget.focus());
    }
  }
}

export function closeModal(id) {
  const modal = modalRegistry.get(id);
  if (!modal) return;

  modal.overlay.classList.remove(modal.activeClass);

  if (activeModalId === id) {
    activeModalId = null;
  }

  if (typeof modal.onClose === 'function') {
    modal.onClose();
  }
}

export function toggleModal(id) {
  if (isModalOpen(id)) {
    closeModal(id);
    return;
  }

  openModal(id);
}
