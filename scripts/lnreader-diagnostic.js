/* Standalone, removable LNReader diagnostic. Not part of the production bundle. */
(function (global) {
  'use strict';
  const doc = global.document;
  if (!doc || typeof doc.querySelector !== 'function' || typeof doc.createElement !== 'function') return;

  const KEY = '__novelforgeLNReaderDiagnostic';
  const BADGE_ID = 'nf-lnreader-diagnostic';
  const previous = global[KEY];
  const root = doc.querySelector('#LNReader-chapter');
  const article = root && (root.matches && root.matches('article.nf-chapter[data-nf-chapter]')
    ? root : root.querySelector('article.nf-chapter[data-nf-chapter]'));

  function snapshot() {
    const currentRoot = doc.querySelector('#LNReader-chapter');
    const currentArticle = currentRoot && (currentRoot.matches && currentRoot.matches('article.nf-chapter[data-nf-chapter]')
      ? currentRoot : currentRoot.querySelector('article.nf-chapter[data-nf-chapter]'));
    const count = function (selector, scope) { return scope && scope.querySelectorAll ? scope.querySelectorAll(selector).length : 0; };
    return {
      root: currentRoot,
      chapter: currentArticle && currentArticle.getAttribute('data-nf-chapter'),
      blocks: count('p[data-nf-block]', currentArticle),
      entities: count('[data-nf-entity]', currentArticle),
      windows: count('.nf-window[data-nf-id][data-nf-category][data-nf-subtype]', currentArticle),
      indexes: count('#nf-context-index', doc),
      semanticAttrs: count('[data-nf-novel][data-nf-chapter][data-nf-schema]', currentRoot)
    };
  }

  function describe(sample, state) {
    const sameRoot = state.runRoot && sample.root ? state.runRoot === sample.root : null;
    const changedSinceSample = state.lastSample ?
      state.lastSample.chapter !== sample.chapter || state.lastSample.blocks !== sample.blocks ||
      state.lastSample.entities !== sample.entities || state.lastSample.windows !== sample.windows ||
      state.lastSample.indexes !== sample.indexes || state.lastSample.semanticAttrs !== sample.semanticAttrs : null;
    return [
      'NovelForge diagnostic (removível)',
      'Custom Code executions in this JS context: ' + state.runs,
      'JS context persisted from prior execution: ' + (state.runs > 1 ? 'yes' : 'unknown'),
      '#LNReader-chapter present now: ' + (sample.root ? 'yes' : 'no'),
      'Same root as last script execution: ' + (sameRoot === null ? 'unknown' : sameRoot ? 'yes' : 'no'),
      'Chapter id: ' + (sample.chapter || 'unavailable'),
      'Semantic chapter attrs found: ' + sample.semanticAttrs,
      'Blocks / entities / windows: ' + sample.blocks + ' / ' + sample.entities + ' / ' + sample.windows,
      '#nf-context-index count in rendered DOM: ' + sample.indexes,
      'DOM summary changed since previous sample: ' + (changedSinceSample === null ? 'not sampled yet' : changedSinceSample ? 'yes' : 'no'),
      'No narrative text is collected. A missing badge alone does not prove WebView recreation.'
    ].join('\n');
  }

  const state = {
    runs: previous && Number.isInteger(previous.runs) ? previous.runs + 1 : 1,
    runRoot: root,
    lastSample: previous && previous.lastSample || null,
    badge: null
  };
  global[KEY] = state;

  const oldBadge = doc.getElementById && doc.getElementById(BADGE_ID);
  if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
  const badge = doc.createElement('aside');
  badge.id = BADGE_ID;
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.style.cssText = 'position:fixed;z-index:2147483647;right:8px;bottom:8px;max-width:min(92vw,420px);max-height:55vh;overflow:auto;padding:10px;background:#fff;color:#111;border:2px solid #725b2c;border-radius:8px;box-shadow:0 2px 12px #0005;font:12px/1.4 monospace;white-space:pre-wrap';
  const output = doc.createElement('pre');
  output.style.cssText = 'margin:0 0 8px;white-space:pre-wrap';
  const actions = doc.createElement('div');
  const check = doc.createElement('button');
  check.type = 'button';
  check.textContent = 'Sample current DOM';
  const remove = doc.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove diagnostic';
  function refresh() {
    const current = snapshot();
    output.textContent = describe(current, state);
    state.lastSample = current;
  }
  check.addEventListener('click', refresh);
  remove.addEventListener('click', function () {
    if (badge.parentNode) badge.parentNode.removeChild(badge);
  });
  actions.appendChild(check);
  actions.appendChild(remove);
  badge.appendChild(output);
  badge.appendChild(actions);
  (doc.body || doc.documentElement).appendChild(badge);
  state.badge = badge;
  refresh();
})(typeof window !== 'undefined' ? window : globalThis);
