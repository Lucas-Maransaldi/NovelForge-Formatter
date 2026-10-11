/* NovelForge C5.6 — the existing contextual popup, backed by the remote client in LNReader builds. */
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
    style.id = UI_STYLE_ID; style.type = 'text/css'; style.textContent = UI_CSS;
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
  function parsePosition(chapter, entityElement) {
    const bookId = chapter.getAttribute('data-nf-novel');
    const chapterRaw = chapter.getAttribute('data-nf-chapter');
    const blockElement = findAncestor(entityElement, BLOCK_SELECTOR, chapter);
    const blockRaw = blockElement && blockElement.getAttribute('data-nf-block');
    const chapterMatch = typeof chapterRaw === 'string' && /^[0-9]{1,9}$/.test(chapterRaw) ? Number(chapterRaw) : NaN;
    const blockMatch = typeof blockRaw === 'string' && /^b[0-9]{1,9}$/.test(blockRaw) ? Number(blockRaw.slice(1)) : NaN;
    if (!bookId || !Number.isSafeInteger(chapterMatch) || !Number.isSafeInteger(blockMatch) || !blockElement || !chapter.contains(blockElement)) {
      throw new Error('READING_POSITION_INVALID');
    }
    return { bookId, chapter: chapterMatch, block: blockMatch };
  }

  function initialize(root) {
    const previous = global[STATE_KEY];
    if (previous && typeof previous.cleanup === 'function') previous.cleanup();
    global[STATE_KEY] = null;

    const formatter = global.NovelForgeFormatter;
    const remote = global.NovelForgeRemoteKnowledge;
    const remoteMode = !!(remote && typeof remote.queryEntity === 'function');
    const document = root && (root.nodeType === 9 ? root : root.ownerDocument);
    const chapter = findChapter(root);
    if (!document || !chapter || (!remoteMode && (!formatter || typeof formatter.loadContextIndex !== 'function' || typeof formatter.queryEntity !== 'function'))) return false;
    if (!remoteMode) {
      const loaded = formatter.loadContextIndex(chapter);
      if (!loaded.ok) return false;
    }
    injectUIStyles(document);

    let activeDialog = null;
    let activeTrigger = null;
    let activeResult = null;
    let activeType = null;
    let view = 'quick';
    let requestController = null;
    let requestGeneration = 0;

    function closeDialog(restoreFocus) {
      requestGeneration++;
      if (requestController) requestController.abort();
      requestController = null;
      if (!activeDialog) { activeTrigger = null; activeResult = null; return; }
      document.removeEventListener('keydown', onKeyDown, true);
      removeElement(activeDialog);
      activeDialog = null;
      activeResult = null;
      if (restoreFocus) {
        if (activeTrigger && activeTrigger.isConnected !== false && typeof activeTrigger.focus === 'function') activeTrigger.focus();
        else if (chapter.isConnected !== false && typeof chapter.focus === 'function') {
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
        if (fact.provenance && Number.isSafeInteger(fact.provenance.chapter) && typeof fact.provenance.blockId === 'string') {
          item.appendChild(makeElement(document, 'small', 'nf-context-source', `Fonte: ${fact.provenance.chapter} · ${fact.provenance.blockId}`));
        } else if (fact.sourceChapter && fact.sourceBlock) {
          item.appendChild(makeElement(document, 'small', 'nf-context-source', 'Fonte: ' + fact.sourceChapter + ' · ' + fact.sourceBlock));
        }
        list.appendChild(item);
      }
      container.appendChild(list);
    }

    function render() {
      if (!activeResult || !activeTrigger) return;
      if (activeDialog) {
        document.removeEventListener('keydown', onKeyDown, true);
        removeElement(activeDialog);
      }
      const facts = Array.isArray(activeResult.facts) ? activeResult.facts : [];
      const state = activeResult.state || 'READY';
      const name = activeTrigger.textContent;
      const typeLabel = activeType === 'character' ? 'Personagem' : 'Evento';
      activeDialog = makeElement(document, 'section', 'nf-context-overlay');
      activeDialog.id = UI_ROOT_ID;
      activeDialog.setAttribute('role', 'dialog'); activeDialog.setAttribute('aria-modal', 'true');
      activeDialog.setAttribute('aria-labelledby', 'nf-context-title'); activeDialog.setAttribute('tabindex', '-1');
      const panel = makeElement(document, 'div', 'nf-context-panel');
      const header = makeElement(document, 'header', 'nf-context-header');
      const title = makeElement(document, 'h2', '', name || 'Informação contextual');
      title.id = 'nf-context-title'; header.appendChild(title);
      header.appendChild(makeElement(document, 'p', 'nf-context-type', typeLabel)); panel.appendChild(header);
      const content = makeElement(document, 'div', 'nf-context-content');
      if (state === 'LOADING') {
        const loading = makeElement(document, 'p', 'nf-context-loading', 'Consultando a enciclopédia…');
        loading.setAttribute('role', 'status'); loading.setAttribute('aria-live', 'polite'); content.appendChild(loading);
      } else if (state === 'ERROR') {
        content.appendChild(makeElement(document, 'p', 'nf-context-error', 'Enciclopédia indisponível. Verifique sua conexão e tente novamente.'));
      } else if (state === 'EMPTY') {
        content.appendChild(makeElement(document, 'p', 'nf-context-empty', 'Não há informações disponíveis até este ponto da leitura.'));
      } else {
        if (activeResult.revision) content.appendChild(makeElement(document, 'p', 'nf-context-source', `REMOTE KNOWLEDGE · Revisão ${activeResult.revision}`));
        if (view === 'quick') appendFacts(content, facts, 2);
        else appendFacts(content, facts);
      }
      panel.appendChild(content);
      const actions = makeElement(document, 'footer', 'nf-context-actions');
      if (state === 'READY' && view === 'quick') {
        const profile = makeElement(document, 'button', 'nf-context-button nf-context-primary', 'Ver perfil');
        profile.type = 'button'; profile.addEventListener('click', function () { view = 'detail'; render(); }); actions.appendChild(profile);
      } else if (state === 'READY' && view === 'detail') {
        const back = makeElement(document, 'button', 'nf-context-button', 'Voltar à consulta');
        back.type = 'button'; back.addEventListener('click', function () { view = 'quick'; render(); }); actions.appendChild(back);
      }
      const close = makeElement(document, 'button', 'nf-context-button', 'Fechar');
      close.type = 'button'; close.addEventListener('click', function () { closeDialog(true); }); actions.appendChild(close);
      panel.appendChild(actions); activeDialog.appendChild(panel);
      (document.body || document.documentElement).appendChild(activeDialog);
      document.addEventListener('keydown', onKeyDown, true);
      if (typeof activeDialog.focus === 'function') activeDialog.focus();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Esc') { event.preventDefault(); closeDialog(true); return; }
      if (event.key === 'Tab' && activeDialog) {
        const focusable = activeDialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const items = Array.prototype.filter.call(focusable, item => !item.disabled && item.getAttribute('aria-hidden') !== 'true');
        if (!items.length) { event.preventDefault(); activeDialog.focus(); return; }
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    }

    function openRemote(event, entityElement, entityId) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      closeDialog(false);
      activeTrigger = entityElement; activeType = entityId.slice(0, entityId.indexOf(':')); view = 'quick';
      activeResult = { state: 'LOADING', facts: [] };
      const current = requestGeneration;
      requestController = typeof global.AbortController === 'function' ? new global.AbortController() : null;
      render();
      let position;
      try { position = parsePosition(chapter, entityElement); }
      catch (_) {
        activeResult = { state: 'ERROR', facts: [] }; render(); return;
      }
      Promise.resolve().then(() => remote.queryEntity({
        bookId: position.bookId, entityId, chapter: position.chapter, block: position.block
      }, { signal: requestController && requestController.signal })).then(result => {
        if (current !== requestGeneration || !activeDialog) return;
        if (!root.contains(chapter) || !chapter.contains(entityElement)) { closeDialog(false); return; }
        let latestPosition;
        try { latestPosition = parsePosition(chapter, entityElement); }
        catch (_) { closeDialog(false); return; }
        if (latestPosition.bookId !== position.bookId || latestPosition.chapter !== position.chapter || latestPosition.block !== position.block) { closeDialog(false); return; }
        if (!result || !result.ok || !result.value || !Array.isArray(result.value.facts)) {
          activeResult = { state: 'ERROR', facts: [] };
        } else {
          activeResult = {
            state: result.value.facts.length ? 'READY' : 'EMPTY',
            facts: result.value.facts, revision: result.value.revision || ''
          };
        }
        render();
      }).catch(() => {
        if (current !== requestGeneration || !activeDialog) return;
        activeResult = { state: 'ERROR', facts: [] }; render();
      });
    }

    function onClick(event) {
      const target = event.target;
      if (chapter.isConnected === false || !root.contains(chapter)) return;
      const entityElement = findAncestor(target, ENTITY_SELECTOR, chapter.parentElement);
      if (!entityElement || !chapter.contains(entityElement)) return;
      const entityId = entityElement.getAttribute('data-nf-entity');
      if (typeof entityId !== 'string' || !/^(character|event):[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(entityId)) return;
      if (remoteMode) { openRemote(event, entityElement, entityId); return; }
      const block = findAncestor(entityElement, BLOCK_SELECTOR, chapter);
      const chapterId = chapter.getAttribute('data-nf-chapter');
      const blockId = block && block.getAttribute('data-nf-block');
      if (!chapterId || !blockId) return;
      const currentLoaded = formatter.loadContextIndex(chapter);
      if (!currentLoaded.ok || currentLoaded.value.index.chapterId !== chapterId) return;
      const result = formatter.queryEntity(currentLoaded.value, entityId, { chapter: chapterId, block: blockId });
      if (!result || !result.ok || !result.value || !result.value.entity) return;
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      closeDialog(false); activeTrigger = entityElement; activeResult = { state: 'READY', facts: result.value.facts };
      activeType = entityId.slice(0, entityId.indexOf(':')); view = 'quick'; render();
    }

    // Capture phase lets NovelForge handle entity taps before the reader's
    // delegated anchor handler can consume the event.
    chapter.addEventListener('click', onClick, true);
    const state = {
      chapter,
      cleanup: function () { chapter.removeEventListener('click', onClick, true); closeDialog(false); }
    };
    global[STATE_KEY] = state;
    return { ok: true, chapter, mode: remoteMode ? 'remote' : 'local-test' };
  }

  global.NovelForgeContextualUI = { initialize, parsePosition };
})(typeof window !== 'undefined' ? window : globalThis);
