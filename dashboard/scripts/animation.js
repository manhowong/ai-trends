/* ============================================================
   animation.js — Intro tour animation on page load
   ============================================================ */

// To include the intro animation, import runIntroTour from this file into
// main.js and add `runIntroTour();` at the end of the function `initializeApp()`

import { state } from './state.js';
import { showOverview, showCurrentL1Node, showCurrentL2Node } from './app/view-coordination.js';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

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

function scrambleText(text, progress) {
  const revealCount = Math.floor(text.length * progress);
  return [...text].map((char, index) => {
    if (char === ' ') return ' ';
    if (index < revealCount) return char;
    if (!/[A-Za-z0-9]/.test(char)) return char;
    return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }).join('');
}

export function animateScrambledText({
  text,
  duration = 800,
  frameMs = 50,
  onUpdate,
  onComplete,
}) {
  if (!text || typeof onUpdate !== 'function') {
    return () => {};
  }

  const startedAt = Date.now();
  let frameId = null;
  let timeoutId = null;

  onUpdate(scrambleText(text, 0));

  frameId = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const progress = Math.min(elapsed / duration, 1);
    onUpdate(progress >= 1 ? text : scrambleText(text, progress));
  }, frameMs);

  timeoutId = setTimeout(() => {
    if (frameId) {
      clearInterval(frameId);
      frameId = null;
    }
    onUpdate(text);
    if (typeof onComplete === 'function') onComplete();
  }, duration);

  return () => {
    if (frameId) clearInterval(frameId);
    if (timeoutId) clearTimeout(timeoutId);
  };
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
