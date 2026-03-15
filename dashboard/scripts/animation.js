/* ============================================================
   animation.js — Intro tour animation on page load
   ============================================================ */

import { state } from './state.js';
import { echart } from './chart.js';
import { goOverview, focusCategory, focusChildNode } from './views.js';

let introPlayed = false;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function runSteps(topCatId, topChildId) {
  const stepMs = 700;
  setTimeout(() => focusCategory(topCatId), stepMs * 1);
  setTimeout(() => focusChildNode(topChildId), stepMs * 2);
  setTimeout(() => goOverview(), stepMs * 3);
}

export function runIntroTour() {
  if (introPlayed) return;
  introPlayed = true;

  // Conditions to abort intro animation
  if (prefersReducedMotion()) return;
  
  // Get the most popular category ID
  const topCat = [...state.cats].sort((a, b) => (b.totalpapers || 0) - (a.totalpapers || 0))[0];
  if (!topCat || !topCat.children || !topCat.children.length) return;
  // Get the most popular topic ID
  const topChild = [...topCat.children].sort((a, b) => (b.papers || 0) - (a.papers || 0))[0];
  if (!topChild) return;
  
  if ('requestIdleCallback' in window) {
    // Defers to requestIdleCallback (fallback setTimeout)
    window.requestIdleCallback(() => runSteps(topCat.id, topChild.id), { timeout: 1500 });
  } else {
    setTimeout(() => runSteps(topCat.id, topChild.id), 300);
  }
}
