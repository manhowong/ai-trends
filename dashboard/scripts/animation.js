/* ============================================================
   animation.js — Intro tour animation on page load
   ============================================================ */

// To include the intro animation, import runIntroTour from this file into
// main.js and add `runIntroTour();` at the end of the function `initializeApp()`

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
  const topCat = [...state.activeL1Nodes].sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
  if (!topCat || !topCat.children || !topCat.children.length) return;
  // Get the most popular topic ID
  const topChild = [...topCat.children].sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
  if (!topChild) return;
  
  if ('requestIdleCallback' in window) {
    // Defers to requestIdleCallback (fallback setTimeout)
    window.requestIdleCallback(() => runSteps(topCat.id, topChild.id), { timeout: 1500 });
  } else {
    setTimeout(() => runSteps(topCat.id, topChild.id), 300);
  }
}
