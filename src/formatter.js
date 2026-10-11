/* NovelForge formatter core — C1 scaffold; no LNReader-specific API assumptions. */
(function (global) {
  'use strict';
  const WINDOW_SELECTOR = '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]';
  const STYLE_ID = 'nf-formatter-styles';
  // The source build receives CSS from src/formatter.css. The distribution
  // build replaces this global hook with the CSS text, so LNReader still gets
  // one self-contained script and no runtime import/fetch is needed.
  const FORMATTER_CSS = global.NovelForgeFormatterCSS || '';

  function isDescendantOfWindow(node) {
    let parent = node && node.parentElement;
    while (parent) {
      if (typeof parent.matches === 'function' && parent.matches(WINDOW_SELECTOR)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function inspect(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return { chapters: 0, windows: 0, categories: [] };
    const chapters = root.querySelectorAll('article.nf-chapter[data-nf-chapter]');
    const windows = root.querySelectorAll(WINDOW_SELECTOR);
    const categories = [];
    for (const win of windows) {
      // A window already annotated by the publisher owns all of its descendants.
      // Never turn a nested annotation into a second presentation window.
      if (isDescendantOfWindow(win)) continue;
      const category = win.getAttribute('data-nf-category');
      if (category && !categories.includes(category)) categories.push(category);
    }
    let topLevelWindows = 0;
    for (const win of windows) if (!isDescendantOfWindow(win)) topLevelWindows++;
    return { chapters: chapters.length, windows: topLevelWindows, categories };
  }

  function injectStyles(root) {
    const document = root && (root.nodeType === 9 ? root : root.ownerDocument);
    if (!document || typeof document.createElement !== 'function') return false;
    if (typeof document.getElementById === 'function' && document.getElementById(STYLE_ID)) return false;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.textContent = FORMATTER_CSS;
    const parent = document.head || document.documentElement || document.body;
    if (!parent || typeof parent.appendChild !== 'function') return false;
    parent.appendChild(style);
    return true;
  }

  function enhance(root) {
    // Only the formatter stylesheet is injected. Do not wrap text, add
    // SYSTEM windows, or parse bracket characters.
    injectStyles(root);
    return inspect(root);
  }
  const indexApi = global.NovelForgeContextIndex || {};
  const api = {
    inspect, enhance, injectStyles, STYLE_ID, FORMATTER_CSS,
    loadContextIndex: indexApi.loadContextIndex,
    parseContextIndex: indexApi.parseContextIndex,
    queryEntity: indexApi.queryEntity
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.NovelForgeFormatter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
