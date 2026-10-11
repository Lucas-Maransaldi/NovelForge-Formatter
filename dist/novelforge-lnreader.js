/* NovelForge LNReader Formatter v0.4.0 | generated artifact. */
/* NovelForge C2 — offline contextual index reader. */
(function (global) {
  'use strict';

  const SUPPORTED_ENTITY_TYPES = ['character', 'event'];

  function error(code, message, details) {
    return { code, message, details: details || null };
  }

  function failure(code, message, details) {
    return { ok: false, error: error(code, message, details) };
  }

  function success(value) {
    return { ok: true, value };
  }

  function validateIndex(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return failure('INVALID_INDEX', 'Context index must be an object.');
    if (typeof value.schemaVersion !== 'string' || !value.schemaVersion) return failure('INVALID_SCHEMA', 'Context index schemaVersion is required.');
    if (typeof value.novelId !== 'string' || !value.novelId || typeof value.chapterId !== 'string' || !value.chapterId) return failure('INVALID_SCHEMA', 'Context index novelId and chapterId are required.');
    if (!value.entities || typeof value.entities !== 'object' || Array.isArray(value.entities)) return failure('INVALID_SCHEMA', 'Context index entities must be an object.');
    return success(value);
  }

  function parseContextIndex(text) {
    if (typeof text !== 'string' || !text.trim()) return failure('INDEX_MISSING', 'Context index is missing.');
    let value;
    try {
      value = JSON.parse(text);
    } catch (parseError) {
      return failure('INVALID_JSON', 'Context index JSON is invalid.');
    }
    return validateIndex(value);
  }

  function semanticChapter(root) {
    if (!root) return null;
    if (typeof root.matches === 'function' && root.matches('article.nf-chapter[data-nf-chapter]')) return root;
    if (typeof root.querySelectorAll !== 'function') return null;
    const chapters = root.querySelectorAll('article.nf-chapter[data-nf-chapter]');
    return chapters.length === 1 ? chapters[0] : null;
  }

  function indexElements(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    const elements = Array.from(root.querySelectorAll('#nf-context-index'));
    if (!elements.length && typeof root.querySelector === 'function') {
      const element = root.querySelector('#nf-context-index');
      if (element) elements.push(element);
    }
    return elements;
  }

  function selectIndex(root, chapterId) {
    let candidates = indexElements(root);
    const document = root && (root.nodeType === 9 ? root : root.ownerDocument);
    if (!candidates.length && document && document !== root) candidates = indexElements(document);
    if (!candidates.length) return failure('INDEX_MISSING', 'Embedded context index was not found.');

    const explicitlyAssociated = candidates.filter(element => element.getAttribute && element.getAttribute('data-nf-chapter') === chapterId);
    if (explicitlyAssociated.length === 1) return success(explicitlyAssociated[0]);
    if (explicitlyAssociated.length > 1) return failure('INDEX_AMBIGUOUS', 'Multiple indexes claim the active chapter.');

    if (candidates.length === 1) {
      const parsed = parseContextIndex(candidates[0].textContent || '');
      if (!parsed.ok) return parsed;
      if (chapterId && parsed.value.chapterId !== chapterId) return failure('CHAPTER_MISMATCH', 'Embedded index does not match the active chapter.');
      return success(candidates[0]);
    }

    if (!chapterId) return failure('INDEX_AMBIGUOUS', 'Multiple indexes cannot be associated with an active chapter.');
    const matching = [];
    for (const candidate of candidates) {
      const parsed = parseContextIndex(candidate.textContent || '');
      if (parsed.ok && parsed.value.chapterId === chapterId) matching.push(candidate);
      else if (!parsed.ok) return failure('INDEX_AMBIGUOUS', 'A malformed index prevents unambiguous chapter association.');
    }
    if (matching.length !== 1) return failure(matching.length ? 'INDEX_AMBIGUOUS' : 'INDEX_MISSING', 'No unique index matches the active chapter.');
    return success(matching[0]);
  }

  function getBlockOrder(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    const blocks = root.querySelectorAll('p[data-nf-block]');
    const order = [];
    for (const block of blocks) {
      const id = block.getAttribute('data-nf-block');
      if (id) order.push(id);
    }
    return order;
  }

  function validateBlockOrder(order) {
    if (!Array.isArray(order) || order.length === 0) return failure('INVALID_BLOCK_ORDER', 'A non-empty block order is required.');
    const seen = Object.create(null);
    for (const block of order) {
      if (typeof block !== 'string' || !block || seen[block]) return failure('INVALID_BLOCK_ORDER', 'Block order contains invalid or duplicate IDs.');
      seen[block] = true;
    }
    return success(order);
  }

  function loadContextIndex(root) {
    if (!root) return failure('INDEX_MISSING', 'An active chapter or document is required.');
    const chapter = semanticChapter(root);
    const chapterId = chapter && chapter.getAttribute('data-nf-chapter');
    const selected = selectIndex(root, chapterId);
    if (!selected.ok) return selected;
    const parsed = parseContextIndex(selected.value.textContent || '');
    if (!parsed.ok) return parsed;
    const index = parsed.value;
    if (chapterId && index.chapterId !== chapterId) return failure('CHAPTER_MISMATCH', 'Embedded index does not match the active chapter.');
    const blockOrder = getBlockOrder(chapter || root);
    const orderValidation = validateBlockOrder(blockOrder);
    return success({ index, blockOrder, orderValid: orderValidation.ok, source: 'embedded-dom' });
  }

  function isSupportedEntityId(entityId) {
    return typeof entityId === 'string' && SUPPORTED_ENTITY_TYPES.some(type => entityId.indexOf(type + ':') === 0);
  }

  function comparePosition(revealedAt, position, blockOrder) {
    if (!revealedAt || !position || typeof revealedAt.chapter !== 'string' || typeof revealedAt.block !== 'string') return false;
    if (revealedAt.chapter !== position.chapter) return false;
    const order = Array.isArray(blockOrder) ? blockOrder : [];
    const revealedIndex = order.indexOf(revealedAt.block);
    const positionIndex = order.indexOf(position.block);
    if (revealedIndex < 0 || positionIndex < 0) return false;
    return revealedIndex >= 0 && positionIndex >= 0 && revealedIndex <= positionIndex;
  }

  function hasSufficientProvenance(fact) {
    return !!fact && typeof fact.text === 'string' && fact.text.length > 0 &&
      typeof fact.sourceChapter === 'string' && typeof fact.sourceBlock === 'string' &&
      !!fact.revealedAt && fact.sourceChapter === fact.revealedAt.chapter && fact.sourceBlock === fact.revealedAt.block;
  }

  function queryEntity(loaded, entityId, position) {
    if (!loaded || !loaded.index) return failure('INDEX_UNAVAILABLE', 'A loaded context index is required.');
    if (!isSupportedEntityId(entityId)) return failure('UNSUPPORTED_ENTITY', 'Only character and event entity IDs are supported.');
    if (!position || typeof position.chapter !== 'string' || typeof position.block !== 'string') return failure('POSITION_REQUIRED', 'Chapter and block position are required.');
    if (position.chapter !== loaded.index.chapterId) return failure('CHAPTER_MISMATCH', 'Query chapter does not match the loaded context index.');
    if (!loaded.orderValid) return failure('INVALID_BLOCK_ORDER', 'The loaded block order is unavailable or invalid.');
    const positionIndex = loaded.blockOrder.indexOf(position.block);
    if (positionIndex < 0) return failure('BLOCK_NOT_FOUND', 'Query block is not present in the validated block order.');
    const entity = loaded.index.entities[entityId];
    if (!entity) return failure('ENTITY_NOT_FOUND', 'Entity was not found in the contextual index.');
    const facts = Array.isArray(entity.facts) ? entity.facts : [];
    const permittedFacts = facts.filter(fact => hasSufficientProvenance(fact) && comparePosition(fact.revealedAt, position, loaded.blockOrder));
    return success({
      id: entityId,
      entity: { displayName: entity.displayName || null },
      facts: permittedFacts.map(fact => ({
        id: fact.id || null,
        text: fact.text,
        sourceChapter: fact.sourceChapter,
        sourceBlock: fact.sourceBlock,
        revealedAt: fact.revealedAt
      }))
    });
  }

  const api = { loadContextIndex, parseContextIndex, queryEntity, comparePosition, SUPPORTED_ENTITY_TYPES };
  global.NovelForgeContextIndex = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* NovelForge formatter core — C1 scaffold; no LNReader-specific API assumptions. */
(function (global) {
  'use strict';
  const WINDOW_SELECTOR = '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]';
  const STYLE_ID = 'nf-formatter-styles';
  // The source build receives CSS from src/formatter.css. The distribution
  // build replaces this global hook with the CSS text, so LNReader still gets
  // one self-contained script and no runtime import/fetch is needed.
  const FORMATTER_CSS = "/* NovelForge C1.1: presentation only; semantic EPUB markup remains authoritative. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype] {\n  margin: 1.2em 0; padding: 1em 1.15em; border: 2px solid #a77b28;\n  border-left: 5px solid #d6ab4d; border-radius: .65em;\n  background: rgba(160, 120, 32, .10); break-inside: avoid;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype]::before {\n  content: \"QUEST\"; display: block; font-weight: 700;\n  letter-spacing: .08em; color: #a67b20; margin-bottom: .65em;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SYSTEM\"][data-nf-subtype] {\n  margin: 1em 0; padding: .85em 1em; border: 1px solid #777;\n  border-left: 4px solid #555; border-radius: .4em;\n  background: rgba(127, 127, 127, .10); break-inside: avoid;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SYSTEM\"][data-nf-subtype]::before {\n  content: \"SYSTEM\"; display: block; font-weight: 700;\n  letter-spacing: .08em; opacity: .8; margin-bottom: .5em;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"] .nf-delimiter { display: none; }\n@media (prefers-color-scheme: dark) {\n  .nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype] {\n    background: rgba(208, 160, 54, .13); border-color: #cba24d;\n  }\n  .nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype]::before { color: #e5bd67; }\n}\n";

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

/* NovelForge C3 — contextual UI using the filtered C2 API only. */
(function (global) {
  'use strict';

  const UI_STYLE_ID = 'nf-contextual-ui-styles';
  const UI_ROOT_ID = 'nf-contextual-ui';
  const STATE_KEY = '__novelforgeContextualUIState';
  const ENTITY_SELECTOR = '[data-nf-entity]';
  const BLOCK_SELECTOR = 'p[data-nf-block]';
  const CHAPTER_SELECTOR = 'article.nf-chapter[data-nf-chapter]';
  const UI_CSS = ".nf-context-overlay {\n  position: fixed; z-index: 2147483000; inset: 0; display: flex;\n  align-items: flex-end; justify-content: center; padding: 1rem;\n  background: rgba(0, 0, 0, .48); color: #222;\n}\n.nf-context-panel {\n  box-sizing: border-box; width: min(100%, 42rem); max-height: 82vh;\n  overflow: auto; padding: 1rem; border: 1px solid #a77b28;\n  border-radius: .8rem; background: #fff; box-shadow: 0 .5rem 2rem rgba(0,0,0,.3);\n  font: inherit; line-height: 1.5;\n}\n.nf-context-header h2 { margin: 0; font-size: 1.25rem; }\n.nf-context-type { margin: .2rem 0 .8rem; opacity: .72; }\n.nf-context-content { overflow-wrap: anywhere; }\n.nf-context-facts { margin: 0; padding-left: 1.3rem; }\n.nf-context-fact { margin: .65rem 0; }\n.nf-context-fact p { margin: 0 0 .2rem; }\n.nf-context-source { opacity: .72; }\n.nf-context-empty { margin: .5rem 0; }\n.nf-context-actions { display: flex; gap: .65rem; justify-content: flex-end; margin-top: 1rem; }\n.nf-context-button { min-height: 44px; min-width: 44px; padding: .55rem .9rem; border: 1px solid #777; border-radius: .45rem; background: transparent; color: inherit; font: inherit; }\n.nf-context-primary { border-color: #a77b28; background: #a77b28; color: #fff; }\n@media (prefers-color-scheme: dark) {\n  .nf-context-overlay { color: #eee; }\n  .nf-context-panel { border-color: #cba24d; background: #222; }\n  .nf-context-primary { border-color: #cba24d; background: #9b7423; color: #fff; }\n}\n@media (min-width: 40rem) {\n  .nf-context-overlay { align-items: center; }\n}\n";

  function findAncestor(node, selector, stop) {
    let current = node;
    while (current && current !== stop) {
      if (typeof current.matches === 'function' && current.matches(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function findChapter(root) {
    if (!root) return null;
    if (typeof root.matches === 'function' && root.matches(CHAPTER_SELECTOR)) return root;
    if (typeof root.querySelectorAll !== 'function') return null;
    const chapters = root.querySelectorAll(CHAPTER_SELECTOR);
    return chapters.length === 1 ? chapters[0] : null;
  }

  function injectUIStyles(document) {
    if (!document || !document.createElement || (document.getElementById && document.getElementById(UI_STYLE_ID))) return;
    const style = document.createElement('style');
    style.id = UI_STYLE_ID;
    style.type = 'text/css';
    style.textContent = UI_CSS;
    const parent = document.head || document.documentElement || document.body;
    if (parent && parent.appendChild) parent.appendChild(style);
  }

  function removeElement(element) {
    if (element && element.parentNode && element.parentNode.removeChild) element.parentNode.removeChild(element);
  }

  function makeElement(document, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function initialize(root) {
    const previous = global[STATE_KEY];
    if (previous && typeof previous.cleanup === 'function') previous.cleanup();
    global[STATE_KEY] = null;

    const formatter = global.NovelForgeFormatter;
    const document = root && (root.nodeType === 9 ? root : root.ownerDocument);
    const chapter = findChapter(root);
    if (!formatter || !document || !chapter || typeof formatter.loadContextIndex !== 'function' || typeof formatter.queryEntity !== 'function') return false;

    const loaded = formatter.loadContextIndex(chapter);
    if (!loaded.ok) return false;
    injectUIStyles(document);

    let activeDialog = null;
    let activeTrigger = null;
    let activeResult = null;
    let activeType = null;
    let view = 'quick';

    function closeDialog(restoreFocus) {
      if (!activeDialog) return;
      document.removeEventListener('keydown', onKeyDown, true);
      removeElement(activeDialog);
      activeDialog = null;
      activeResult = null;
      if (restoreFocus) {
        if (activeTrigger && activeTrigger.isConnected !== false && typeof activeTrigger.focus === 'function') {
          activeTrigger.focus();
        } else if (chapter.isConnected !== false && typeof chapter.focus === 'function') {
          const oldTabindex = chapter.getAttribute('tabindex');
          if (oldTabindex === null) chapter.setAttribute('tabindex', '-1');
          chapter.focus();
          if (oldTabindex === null) chapter.removeAttribute('tabindex');
        }
      }
      activeTrigger = null;
    }

    function appendFacts(container, facts, limit) {
      const shown = typeof limit === 'number' ? facts.slice(0, limit) : facts;
      if (!shown.length) {
        container.appendChild(makeElement(document, 'p', 'nf-context-empty', 'Nenhuma informação contextual disponível neste ponto.'));
        return;
      }
      const list = makeElement(document, 'ul', 'nf-context-facts');
      for (const fact of shown) {
        const item = makeElement(document, 'li', 'nf-context-fact');
        item.appendChild(makeElement(document, 'p', '', fact.text));
        if (fact.sourceChapter && fact.sourceBlock) {
          item.appendChild(makeElement(document, 'small', 'nf-context-source', 'Fonte: ' + fact.sourceChapter + ' · ' + fact.sourceBlock));
        }
        list.appendChild(item);
      }
      container.appendChild(list);
    }

    function render() {
      if (activeDialog) removeElement(activeDialog);
      const facts = Array.isArray(activeResult.facts) ? activeResult.facts : [];
      // The visible label is already present at this narrative position. Do
      // not expose an unversioned index displayName that may describe a later identity.
      const name = activeTrigger.textContent;
      const typeLabel = activeType === 'character' ? 'Personagem' : 'Evento';
      activeDialog = makeElement(document, 'section', 'nf-context-overlay');
      activeDialog.id = UI_ROOT_ID;
      activeDialog.setAttribute('role', 'dialog');
      activeDialog.setAttribute('aria-modal', 'true');
      activeDialog.setAttribute('aria-labelledby', 'nf-context-title');
      activeDialog.setAttribute('tabindex', '-1');

      const panel = makeElement(document, 'div', 'nf-context-panel');
      const header = makeElement(document, 'header', 'nf-context-header');
      const title = makeElement(document, 'h2', '', name || 'Informação contextual');
      title.id = 'nf-context-title';
      header.appendChild(title);
      header.appendChild(makeElement(document, 'p', 'nf-context-type', typeLabel));
      panel.appendChild(header);

      const content = makeElement(document, 'div', 'nf-context-content');
      if (view === 'quick') appendFacts(content, facts, 2);
      else appendFacts(content, facts);
      panel.appendChild(content);

      const actions = makeElement(document, 'footer', 'nf-context-actions');
      if (view === 'quick') {
        const profile = makeElement(document, 'button', 'nf-context-button nf-context-primary', 'Ver perfil');
        profile.type = 'button';
        profile.addEventListener('click', function () { view = 'detail'; render(); });
        actions.appendChild(profile);
      } else {
        const back = makeElement(document, 'button', 'nf-context-button', 'Voltar à consulta');
        back.type = 'button';
        back.addEventListener('click', function () { view = 'quick'; render(); });
        actions.appendChild(back);
      }
      const close = makeElement(document, 'button', 'nf-context-button', 'Fechar');
      close.type = 'button';
      close.addEventListener('click', function () { closeDialog(true); });
      actions.appendChild(close);
      panel.appendChild(actions);
      activeDialog.appendChild(panel);
      (document.body || document.documentElement).appendChild(activeDialog);
      if (typeof activeDialog.focus === 'function') activeDialog.focus();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        closeDialog(true);
        return;
      }
      if (event.key === 'Tab' && activeDialog) {
        const focusable = activeDialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const items = Array.prototype.filter.call(focusable, function (item) {
          return !item.disabled && item.getAttribute('aria-hidden') !== 'true';
        });
        if (!items.length) {
          event.preventDefault();
          activeDialog.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }

    function onClick(event) {
      const target = event.target;
      if (chapter.isConnected === false || !root.contains(chapter)) return;
      const entityElement = findAncestor(target, ENTITY_SELECTOR, chapter.parentElement);
      if (!entityElement || !chapter.contains(entityElement)) return;
      const entityId = entityElement.getAttribute('data-nf-entity');
      if (typeof entityId !== 'string' || !/^(character|event):[^\s:]+$/.test(entityId)) return;
      const block = findAncestor(entityElement, BLOCK_SELECTOR, chapter);
      const chapterId = chapter.getAttribute('data-nf-chapter');
      const blockId = block && block.getAttribute('data-nf-block');
      if (!chapterId || !blockId) return;
      // Reload on interaction: the same article/container may have been
      // repopulated since initialization. Never query a cached old index.
      const currentLoaded = formatter.loadContextIndex(chapter);
      if (!currentLoaded.ok || currentLoaded.value.index.chapterId !== chapterId) return;
      const result = formatter.queryEntity(currentLoaded.value, entityId, { chapter: chapterId, block: blockId });
      if (!result || !result.ok || !result.value || !result.value.entity) return;

      // Preserve the XHTML link unless the filtered query can be presented.
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      closeDialog(false);
      activeTrigger = entityElement;
      activeResult = result.value;
      activeType = entityId.slice(0, entityId.indexOf(':'));
      view = 'quick';
      document.addEventListener('keydown', onKeyDown, true);
      render();
    }

    chapter.addEventListener('click', onClick);
    const state = {
      chapter,
      cleanup: function () {
        chapter.removeEventListener('click', onClick);
        closeDialog(false);
      }
    };
    global[STATE_KEY] = state;
    return { ok: true, chapter };
  }

  global.NovelForgeContextualUI = { initialize };
})(typeof window !== 'undefined' ? window : globalThis);

/* LNReader adapter. Uses only the user-confirmed chapter container selector. */
(function (global) {
  'use strict';

  const CHAPTER_SELECTOR = '#LNReader-chapter';
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
      try { root = document.querySelector(CHAPTER_SELECTOR); } catch (error) { return false; }
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

  global.NovelForgeLNReaderAdapter = { start, CHAPTER_SELECTOR, MAX_ATTEMPTS, RETRY_DELAY_MS };
  start();
})(typeof window !== 'undefined' ? window : globalThis);
