/* LNReader adapter. Uses only the user-confirmed chapter container selector. */
(function (global) {
  'use strict';

  const CHAPTER_SELECTOR = '#LNReader-chapter';
  const SEMANTIC_CHAPTER_SELECTOR = 'article.nf-chapter[data-nf-chapter]';
  const MAX_ATTEMPTS = 20;
  const RETRY_DELAY_MS = 100;
  const STATE_KEY = '__novelforgeLNReaderAdapterState';

  function getState() {
    if (!global[STATE_KEY]) global[STATE_KEY] = { timer: null, listener: null };
    return global[STATE_KEY];
  }

  function start() {
    const document = global.document;
    const formatter = global.NovelForgeFormatter;
    if (!document || !formatter || typeof formatter.enhance !== 'function') return false;
    const state = getState();
    if (state.timer !== null) {
      global.clearTimeout(state.timer);
      state.timer = null;
    }

    function initialize() {
      let root;
      try {
        root = document.querySelector(CHAPTER_SELECTOR);
        if (!root && typeof document.querySelectorAll === 'function') {
          const chapters = document.querySelectorAll(SEMANTIC_CHAPTER_SELECTOR);
          if (chapters.length === 1) root = chapters[0];
        }
      } catch (error) { return false; }
      if (!root) return false;
      formatter.enhance(root);
      const ui = global.NovelForgeContextualUI;
      if (ui && typeof ui.initialize === 'function') ui.initialize(root);
      return true;
    }

    if (initialize()) return true;
    if (document.readyState === 'loading' && !state.listener && typeof document.addEventListener === 'function') {
      state.listener = function onReady() {
        state.listener = null;
        if (typeof document.removeEventListener === 'function') document.removeEventListener('DOMContentLoaded', onReady);
        start();
      };
      document.addEventListener('DOMContentLoaded', state.listener, { once: true });
    }

    // Finite startup grace period only; chapter changes are handled when the
    // host executes Custom Code again, not by continuous DOM monitoring.
    let attempts = 0;
    function retry() {
      if (initialize()) { state.timer = null; return; }
      if (++attempts >= MAX_ATTEMPTS) { state.timer = null; return; }
      state.timer = global.setTimeout(retry, RETRY_DELAY_MS);
    }
    state.timer = global.setTimeout(retry, RETRY_DELAY_MS);
    return false;
  }

  global.NovelForgeLNReaderAdapter = { start, CHAPTER_SELECTOR, SEMANTIC_CHAPTER_SELECTOR, MAX_ATTEMPTS, RETRY_DELAY_MS };
  start();
})(typeof window !== 'undefined' ? window : globalThis);
