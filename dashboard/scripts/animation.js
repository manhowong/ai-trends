/* ============================================================
   animation.js — Intro tour animation on page load
   ============================================================ */

// To include the intro animation, import runIntroTour from this file into
// main.js and add `runIntroTour();` at the end of the function `initializeApp()`

import { state } from './state.js';
import { showOverview, showCurrentL1Node, showCurrentL2Node } from './app/view-coordination.js';

let introPlayed = false;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function runSteps(topL1NodeId, topL2NodeId) {
  const stepMs = 700;
  setTimeout(() => showCurrentL1Node(topL1NodeId), stepMs * 1);
  setTimeout(() => showCurrentL2Node(topL2NodeId), stepMs * 2);
  setTimeout(() => showOverview(), stepMs * 3);
}

export function runIntroTour() {
  if (introPlayed) return;
  introPlayed = true;

  // Conditions to abort intro animation
  if (prefersReducedMotion()) return;
  
  // Get the most popular area ID
  const topL1Node = [...state.activeL1Nodes].sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
  if (!topL1Node || !topL1Node.children || !topL1Node.children.length) return;
  const topL2Node = [...topL1Node.children].sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
  if (!topL2Node) return;
  
  if ('requestIdleCallback' in window) {
    // Defers to requestIdleCallback (fallback setTimeout)
    window.requestIdleCallback(() => runSteps(topL1Node.id, topL2Node.id), { timeout: 1500 });
  } else {
    setTimeout(() => runSteps(topL1Node.id, topL2Node.id), 300);
  }
}
