/* NovelForge C3 — contextual UI using the filtered C2 API only. */
(function (global) {
  'use strict';

  const UI_STYLE_ID = 'nf-contextual-ui-styles';
  const UI_ROOT_ID = 'nf-contextual-ui';
  const STATE_KEY = '__novelforgeContextualUIState';
  const ENTITY_SELECTOR = '[data-nf-entity]';
  const BLOCK_SELECTOR = 'p[data-nf-block]';
  const CHAPTER_SELECTOR = 'article.nf-chapter[data-nf-chapter]';
  const UI_CSS = global.NovelForgeContextualCSS || '';

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
