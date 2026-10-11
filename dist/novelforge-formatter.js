/* NovelForge LNReader Formatter v0.5.0 | generated artifact. */
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
  // build replaces this hook with CSS text. The visual formatter stays
  // network-independent; contextual Knowledge requests are isolated in the
  // optional production client and happen only after a semantic entity tap.
  const FORMATTER_CSS = "/* Visual layer for publisher-marked NovelForge windows only. */\n.nf-chapter [data-nf-entity] {\n  color: inherit;\n  cursor: pointer;\n  text-decoration: underline;\n  text-decoration-color: currentColor;\n  -webkit-tap-highlight-color: rgba(160, 120, 32, .22);\n}\n\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] {\n  --nf-accent: #727780;\n  box-sizing: border-box;\n  margin: 1em 0;\n  padding: .9em 1.05em;\n  border: 1px solid rgba(110, 116, 124, .55);\n  border-left: 4px solid var(--nf-accent);\n  border-radius: .55em;\n  background: rgba(127, 127, 127, .08);\n  break-inside: avoid;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype]::before {\n  content: attr(data-nf-category);\n  display: block;\n  margin: 0 0 .55em;\n  color: var(--nf-accent);\n  font-size: .76em;\n  font-weight: 700;\n  letter-spacing: .08em;\n}\n\n/* Categories change the accent, never the card geometry. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-subtype] { --nf-accent: #a77b28; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SYSTEM\"][data-nf-subtype] { --nf-accent: #727780; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype] { --nf-accent: #a67b20; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SKILL\"][data-nf-subtype] { --nf-accent: #537b67; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"STATUS\"][data-nf-subtype] { --nf-accent: #52758a; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"CLASS\"][data-nf-subtype] { --nf-accent: #705f91; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"TITLE\"][data-nf-subtype] { --nf-accent: #9a7040; }\n\n/* In structured windows, the first paragraph is the heading row. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] > p:first-of-type {\n  font-weight: 700;\n}\n\n/* Put data-nf-field on the label node, not on its whole paragraph/value. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] [data-nf-field] {\n  font-weight: 700;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] strong {\n  font-weight: 700;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-subtype] [data-nf-field=\"rating\"] + strong {\n  color: var(--nf-accent);\n}\n\n/* VIS-R13: only explicitly marked delimiter nodes are visually hidden. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] .nf-delimiter {\n  display: none;\n}\n\n/* Existing rarity marker supplies color only, avoiding duplicate rarity text/badges. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-rarity=\"LEGENDARY\"] {\n  --nf-accent: #b08a35;\n}\n\n@media (prefers-color-scheme: dark) {\n  .nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] {\n    background: rgba(180, 180, 180, .10);\n  }\n}\n";

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
