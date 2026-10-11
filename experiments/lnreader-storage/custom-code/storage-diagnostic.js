/*
 * NovelForge Storage POC — paste as a JavaScript Custom Code snippet.
 * Synthetic diagnostics only: no production formatter APIs, no remote fetches,
 * no private filesystem paths, and no automatic storage deletion.
 */
(() => {
  'use strict';

  const VERSION = 'nf-storage-poc-v1';
  const STORAGE_PREFIX = 'nf-storage-poc-v1';
  const DATABASE_NAME = 'nf-storage-poc-v1';
  const STORE_NAME = 'diagnostics';
  const FETCH_TIMEOUT_MS = 4000;
  const STORAGE_TIMEOUT_MS = 5000;
  const BOOKS = {
    'nf-storage-book-a': 'BOOK_A_KNOWLEDGE',
    'nf-storage-book-b': 'BOOK_B_KNOWLEDGE',
  };

  const priorPanel = document.getElementById('nf-storage-poc-panel');
  if (priorPanel) priorPanel.remove();

  const contextNode = document.getElementById('nf-poc-chapter-context');
  const bookId = contextNode?.getAttribute('data-nf-novel') || 'UNKNOWN';
  const chapterId = contextNode?.getAttribute('data-nf-chapter') || 'UNKNOWN';
  const chapterMarker = contextNode?.getAttribute('data-nf-poc-marker') || 'UNKNOWN';
  const expectedMarker = BOOKS[bookId] || 'UNKNOWN';
  const otherBookId = bookId === 'nf-storage-book-a'
    ? 'nf-storage-book-b'
    : bookId === 'nf-storage-book-b'
      ? 'nf-storage-book-a'
      : null;

  const results = {
    environment: [],
    json: [],
    localStorage: [],
    indexedDB: [],
    carriers: [],
    chapter: [],
  };
  let panel;
  let diagnosing = false;

  const add = (section, label, status, detail = '') => {
    results[section].push({ label, status, detail: String(detail || '') });
  };

  const statusText = status => {
    if (status === 'PASS') return 'PASS';
    if (status === 'FAIL') return 'FAIL';
    if (status === 'NOT_TESTED') return 'NOT_TESTED';
    return 'UNKNOWN';
  };

  const render = () => {
    if (!panel?.isConnected) return;
    panel.querySelectorAll('[data-poc-section]').forEach(sectionNode => {
      const section = sectionNode.getAttribute('data-poc-section');
      sectionNode.replaceChildren();
      for (const item of results[section] || []) {
        const row = document.createElement('div');
        row.className = 'nf-poc-row';
        const name = document.createElement('span');
        name.className = 'nf-poc-label';
        name.textContent = item.label;
        const value = document.createElement('span');
        value.className = `nf-poc-status nf-poc-status-${statusText(item.status).toLowerCase()}`;
        value.textContent = statusText(item.status);
        row.append(name, value);
        if (item.detail) {
          const detail = document.createElement('span');
          detail.className = 'nf-poc-detail';
          detail.textContent = item.detail;
          row.append(detail);
        }
        sectionNode.append(row);
      }
    });
  };

  const redactUrl = value => {
    try {
      const url = new URL(value);
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      if (url.protocol === 'file:') {
        const parts = url.pathname.split('/').filter(Boolean);
        const last = parts.length ? parts[parts.length - 1] : '';
        url.pathname = `/…/${last}`;
      } else if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.pathname = '/…';
      }
      return url.href;
    } catch {
      return String(value).slice(0, 180);
    }
  };

  const makeReport = () => {
    const lines = [
      'NOVELFORGE STORAGE DIAGNOSTIC',
      `Version: ${VERSION}`,
      `Book: ${bookId}`,
      `Chapter: ${chapterId}`,
      `Chapter marker: ${chapterMarker}`,
      `location.href: ${redactUrl(location.href)}`,
      `location.origin: ${location.origin || 'null'}`,
      `document.baseURI: ${redactUrl(document.baseURI)}`,
      '',
    ];
    for (const [section, items] of Object.entries(results)) {
      lines.push(section.toUpperCase());
      for (const item of items) {
        lines.push(`- ${item.label}: ${statusText(item.status)}${item.detail ? ` — ${item.detail}` : ''}`);
      }
      lines.push('');
    }
    lines.push('App restart persistence is NOT_TESTED until the manual force-stop/reopen procedure is completed.');
    lines.push('Origin isolation is UNKNOWN; a distinct bookId key is only logical namespacing.');
    return lines.join('\n');
  };

  const showPanel = () => {
    panel = document.createElement('section');
    panel.id = 'nf-storage-poc-panel';
    panel.className = 'nf-poc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'NovelForge Storage Diagnostic');

    const title = document.createElement('div');
    title.className = 'nf-poc-title';
    title.textContent = 'NOVELFORGE STORAGE DIAGNOSTIC';
    panel.append(title);

    const identity = document.createElement('div');
    identity.className = 'nf-poc-identity';
    identity.textContent = `Book: ${bookId} · Chapter: ${chapterId} · Origin: ${location.origin || 'null'}`;
    panel.append(identity);

    const locationLine = document.createElement('div');
    locationLine.className = 'nf-poc-location';
    locationLine.textContent = `href: ${redactUrl(location.href)} · baseURI: ${redactUrl(document.baseURI)}`;
    panel.append(locationLine);

    const sectionNames = [
      ['environment', 'ENVIRONMENT / CHAPTER'],
      ['json', 'JSON AUXILIARY FILE'],
      ['localStorage', 'LOCALSTORAGE'],
      ['indexedDB', 'INDEXEDDB'],
      ['carriers', 'HTML CARRIERS'],
    ];
    for (const [key, label] of sectionNames) {
      const heading = document.createElement('div');
      heading.className = 'nf-poc-heading';
      heading.textContent = label;
      const sectionNode = document.createElement('div');
      sectionNode.className = 'nf-poc-section';
      sectionNode.setAttribute('data-poc-section', key);
      panel.append(heading, sectionNode);
    }

    const buttons = document.createElement('div');
    buttons.className = 'nf-poc-buttons';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copiar relatório';
    const rerun = document.createElement('button');
    rerun.type = 'button';
    rerun.textContent = 'Executar novamente';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Fechar';
    for (const button of [copy, rerun, close]) {
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => event.stopPropagation());
    }
    copy.addEventListener('click', async () => {
      const text = makeReport();
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch {
        copied = false;
      }
      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.className = 'nf-poc-copy-buffer';
        panel.append(textarea);
        textarea.select();
        try {
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
        textarea.remove();
      }
      const prior = copy.textContent;
      copy.textContent = copied ? 'Relatório copiado' : 'Cópia indisponível';
      setTimeout(() => { if (copy.isConnected) copy.textContent = prior; }, 1800);
    });
    rerun.addEventListener('click', () => {
      if (diagnosing) return;
      results.environment.length = 0;
      results.json.length = 0;
      results.localStorage.length = 0;
      results.indexedDB.length = 0;
      results.carriers.length = 0;
      diagnose();
    });
    close.addEventListener('click', () => panel.remove());
    buttons.append(copy, rerun, close);
    panel.append(buttons);
    document.body.append(panel);
    render();
  };

  const withTimeout = (promise, milliseconds, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}Timeout`)), milliseconds);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });

  const diagnoseJson = async () => {
    if (typeof URL !== 'function') {
      add('json', 'URL constructor', 'FAIL', 'API ausente');
      add('json', 'Relative URL resolution', 'UNKNOWN', 'URL indisponível');
      add('json', 'fetch', 'NOT_TESTED', 'Sem resolução de URL');
      add('json', 'Marker / bookId', 'NOT_TESTED', 'Sem resposta');
      return;
    }
    add('json', 'URL constructor', 'PASS', 'Disponível');

    let resolved;
    try {
      resolved = new URL('../novelforge/knowledge.json', document.baseURI);
      add('json', 'Relative URL resolution', 'PASS', redactUrl(resolved.href));
    } catch (error) {
      add('json', 'Relative URL resolution', 'FAIL', `URL inválida (${error?.name || 'Error'})`);
      add('json', 'fetch', 'NOT_TESTED', 'URL inválida');
      add('json', 'Marker / bookId', 'NOT_TESTED', 'Sem resposta');
      return;
    }

    if (typeof fetch !== 'function') {
      add('json', 'fetch', 'FAIL', 'API ausente');
      add('json', 'Marker / bookId', 'NOT_TESTED', 'Sem resposta');
      return;
    }
    if (resolved.protocol !== 'file:') {
      add('json', 'fetch', 'NOT_TESTED', `Bloqueado para não acessar rede/URL externa (${resolved.protocol})`);
      add('json', 'HTTP status', 'NOT_TESTED', 'Nenhuma requisição enviada');
      add('json', 'Marker / bookId', 'NOT_TESTED', 'Nenhuma resposta');
      return;
    }

    let controller;
    try {
      controller = typeof AbortController === 'function' ? new AbortController() : null;
      const request = fetch(resolved.href, controller ? { signal: controller.signal } : undefined);
      const response = await withTimeout(request, FETCH_TIMEOUT_MS, 'Fetch');
      add('json', 'HTTP / response status', response.ok ? 'PASS' : 'FAIL', `status=${response.status}`);
      if (!response.ok) {
        add('json', 'fetch', 'FAIL', `Resposta HTTP não OK (${response.status})`);
        add('json', 'Marker / bookId', 'NOT_TESTED', 'Resposta não OK');
        return;
      }
      let data;
      try {
        data = await withTimeout(response.json(), FETCH_TIMEOUT_MS, 'JSON');
      } catch (error) {
        add('json', 'fetch', 'FAIL', `Conteúdo não é JSON válido (${error?.name || 'Error'})`);
        add('json', 'Marker / bookId', 'FAIL', 'Conteúdo inesperado');
        return;
      }
      const markerOk = data?.marker === expectedMarker;
      const bookOk = data?.bookId === bookId;
      add('json', 'fetch', markerOk && bookOk ? 'PASS' : 'FAIL', markerOk && bookOk ? 'JSON diagnóstico recebido' : 'Conteúdo inesperado');
      add('json', 'Marker / bookId', markerOk && bookOk ? 'PASS' : 'FAIL', `marker=${markerOk ? 'OK' : 'mismatch'}; bookId=${bookOk ? 'OK' : 'mismatch'}`);
    } catch (error) {
      const timedOut = String(error?.message || '').includes('Timeout');
      if (timedOut) controller?.abort();
      add('json', 'fetch', 'FAIL', `${timedOut ? 'Timeout diagnóstico' : 'Requisição rejeitada'} (${error?.name || 'Error'})`);
      add('json', 'HTTP / response status', 'NOT_TESTED', 'Nenhuma resposta recebida');
      add('json', 'Marker / bookId', 'NOT_TESTED', 'Nenhuma resposta');
    }
  };

  const storageKey = id => `${STORAGE_PREFIX}:${id}`;
  const summarizeStoredRecord = (raw, expectedBook) => {
    if (raw == null) return { status: 'NOT_TESTED', detail: 'Sem valor anterior' };
    try {
      const record = JSON.parse(raw);
      if (record?.bookId !== expectedBook) return { status: 'FAIL', detail: 'Registro anterior não corresponde ao livro esperado' };
      if (record?.marker !== BOOKS[expectedBook]) return { status: 'FAIL', detail: 'Marcador anterior divergente' };
      return { status: 'PASS', detail: `Valor anterior encontrado (${record.chapterId || 'capítulo não informado'})` };
    } catch {
      return { status: 'FAIL', detail: 'Valor anterior não é registro POC válido' };
    }
  };

  const diagnoseLocalStorage = () => {
    if (typeof localStorage === 'undefined') {
      add('localStorage', 'typeof localStorage', 'FAIL', typeof localStorage);
      add('localStorage', 'Available', 'FAIL', 'API ausente');
      add('localStorage', 'Write/read', 'NOT_TESTED', '');
      add('localStorage', 'Previous value', 'NOT_TESTED', '');
      add('localStorage', 'Chapter persistence', 'NOT_TESTED', '');
      add('localStorage', 'App restart persistence', 'NOT_TESTED', 'Verificação manual necessária');
      add('localStorage', 'Namespace / cross-book probe', 'UNKNOWN', '');
      return;
    }
    add('localStorage', 'typeof localStorage', 'PASS', typeof localStorage);
    add('localStorage', 'Available', 'PASS', 'API presente');
    const key = storageKey(bookId);
    const disposableKey = `${STORAGE_PREFIX}:cleanup-probe:${bookId}`;
    try {
      const previous = localStorage.getItem(key);
      const prior = summarizeStoredRecord(previous, bookId);
      add('localStorage', 'Previous value', prior.status, prior.detail);
      const record = JSON.stringify({ bookId, marker: expectedMarker, chapterId, savedAt: new Date().toISOString() });
      localStorage.setItem(key, record);
      const readBack = localStorage.getItem(key);
      const valid = readBack === record;
      add('localStorage', 'Write/read', valid ? 'PASS' : 'FAIL', valid ? 'Registro sintético validado' : 'Divergência após gravação');
      const priorChapter = previous ? JSON.parse(previous)?.chapterId : null;
      add('localStorage', 'Chapter persistence', priorChapter && priorChapter !== chapterId ? 'PASS' : 'NOT_TESTED', priorChapter && priorChapter !== chapterId ? `Valor de ${priorChapter} visível neste capítulo` : 'Trocar capítulo e repetir');
      add('localStorage', 'App restart persistence', 'NOT_TESTED', 'Fechar/forçar parada e abrir novamente');

      localStorage.setItem(disposableKey, 'remove-probe');
      const disposableRead = localStorage.getItem(disposableKey) === 'remove-probe';
      localStorage.removeItem(disposableKey);
      const disposableRemoved = localStorage.getItem(disposableKey) === null;
      add('localStorage', 'Disposable-key cleanup', disposableRead && disposableRemoved ? 'PASS' : 'FAIL', 'Somente a chave POC descartável foi removida');

      if (otherBookId) {
        const otherRaw = localStorage.getItem(storageKey(otherBookId));
        const otherProbe = summarizeStoredRecord(otherRaw, otherBookId);
        add('localStorage', 'Other-book namespace', otherProbe.status, otherProbe.detail);
        add('localStorage', 'Origin isolation', 'UNKNOWN', otherRaw ? 'Chave do outro livro legível: namespace não é isolamento de origem' : 'Ausência de chave não prova isolamento de origem');
      } else {
        add('localStorage', 'Other-book namespace', 'NOT_TESTED', 'Contexto de livro desconhecido');
        add('localStorage', 'Origin isolation', 'UNKNOWN', '');
      }
    } catch (error) {
      add('localStorage', 'Write/read', 'FAIL', `Erro (${error?.name || 'Error'})`);
      add('localStorage', 'Chapter persistence', 'NOT_TESTED', '');
      add('localStorage', 'App restart persistence', 'NOT_TESTED', '');
      add('localStorage', 'Namespace / cross-book probe', 'UNKNOWN', '');
      add('localStorage', 'Origin isolation', 'UNKNOWN', '');
    }
  };

  const openDatabase = () => withTimeout(new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDBUnavailable'));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DATABASE_NAME, 1);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onerror = () => reject(request.error || new Error('IndexedDBOpenError'));
    request.onblocked = () => reject(new Error('IndexedDBOpenBlocked'));
    request.onsuccess = () => resolve(request.result);
  }), STORAGE_TIMEOUT_MS, 'IndexedDBOpen');

  const writeAndReadDatabase = (database, currentRecord) => withTimeout(new Promise((resolve, reject) => {
    let prior;
    let failed = false;
    const fail = error => {
      if (failed) return;
      failed = true;
      reject(error || new Error('IndexedDBTransactionError'));
    };
    let transaction;
    try {
      transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const readRequest = store.get(currentRecord.id);
      readRequest.onerror = () => fail(readRequest.error);
      readRequest.onsuccess = () => {
        prior = readRequest.result || null;
        try {
          store.put(currentRecord);
        } catch (error) {
          fail(error);
        }
      };
      transaction.onerror = () => fail(transaction.error);
      transaction.onabort = () => fail(transaction.error || new Error('IndexedDBTransactionAborted'));
      transaction.oncomplete = () => {
        if (failed) return;
        try {
          const readTransaction = database.transaction(STORE_NAME, 'readonly');
          const verify = readTransaction.objectStore(STORE_NAME).get(currentRecord.id);
          verify.onerror = () => fail(verify.error);
          verify.onsuccess = () => resolve({ prior, readBack: verify.result || null });
          readTransaction.onerror = () => fail(readTransaction.error);
          readTransaction.onabort = () => fail(readTransaction.error || new Error('IndexedDBReadAborted'));
        } catch (error) {
          fail(error);
        }
      };
    } catch (error) {
      fail(error);
    }
  }), STORAGE_TIMEOUT_MS, 'IndexedDBTransaction');

  const getDatabaseRecord = (database, id) => withTimeout(new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onerror = () => reject(request.error || new Error('IndexedDBReadError'));
      request.onsuccess = () => resolve(request.result || null);
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDBTransactionError'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDBTransactionAborted'));
    } catch (error) {
      reject(error);
    }
  }), STORAGE_TIMEOUT_MS, 'IndexedDBRead');

  const diagnoseIndexedDB = async () => {
    if (typeof indexedDB === 'undefined') {
      add('indexedDB', 'typeof indexedDB', 'FAIL', typeof indexedDB);
      add('indexedDB', 'Available', 'FAIL', 'API ausente');
      add('indexedDB', 'Open / store', 'NOT_TESTED', '');
      add('indexedDB', 'Write/read', 'NOT_TESTED', '');
      add('indexedDB', 'Previous value', 'NOT_TESTED', '');
      add('indexedDB', 'Chapter persistence', 'NOT_TESTED', '');
      add('indexedDB', 'App restart persistence', 'NOT_TESTED', 'Verificação manual necessária');
      add('indexedDB', 'Origin isolation', 'UNKNOWN', '');
      return;
    }
    add('indexedDB', 'typeof indexedDB', 'PASS', typeof indexedDB);
    add('indexedDB', 'Available', 'PASS', 'API presente');
    let database;
    try {
      database = await openDatabase();
      add('indexedDB', 'Open / object store', database.objectStoreNames.contains(STORE_NAME) ? 'PASS' : 'FAIL', database.objectStoreNames.contains(STORE_NAME) ? STORE_NAME : 'Object store ausente');
      const key = `${bookId}|${expectedMarker}`;
      const currentRecord = { id: key, bookId, marker: expectedMarker, chapterId, savedAt: new Date().toISOString() };
      const result = await writeAndReadDatabase(database, currentRecord);
      const valid = result.readBack?.bookId === bookId && result.readBack?.marker === expectedMarker && result.readBack?.chapterId === chapterId;
      add('indexedDB', 'Write/read', valid ? 'PASS' : 'FAIL', valid ? 'Registro sintético validado' : 'Divergência após gravação');
      const prior = result.prior
        ? summarizeStoredRecord(JSON.stringify(result.prior), bookId)
        : { status: 'NOT_TESTED', detail: 'Sem valor anterior' };
      add('indexedDB', 'Previous value', prior.status, prior.detail);
      add('indexedDB', 'Chapter persistence', result.prior?.chapterId && result.prior.chapterId !== chapterId ? 'PASS' : 'NOT_TESTED', result.prior?.chapterId && result.prior.chapterId !== chapterId ? `Valor de ${result.prior.chapterId} visível neste capítulo` : 'Trocar capítulo e repetir');
      add('indexedDB', 'App restart persistence', 'NOT_TESTED', 'Fechar/forçar parada e abrir novamente');

      if (otherBookId) {
        const otherId = `${otherBookId}|${BOOKS[otherBookId]}`;
        const otherRecord = await getDatabaseRecord(database, otherId);
        const otherSummary = otherRecord
          ? summarizeStoredRecord(JSON.stringify(otherRecord), otherBookId)
          : { status: 'NOT_TESTED', detail: 'Sem registro anterior do outro livro' };
        add('indexedDB', 'Other-book namespace', otherSummary.status, otherSummary.detail);
        add('indexedDB', 'Origin isolation', 'UNKNOWN', otherRecord ? 'Registro do outro livro legível: namespace não é isolamento de origem' : 'Ausência de registro não prova isolamento de origem');
      } else {
        add('indexedDB', 'Other-book namespace', 'NOT_TESTED', 'Contexto de livro desconhecido');
        add('indexedDB', 'Origin isolation', 'UNKNOWN', '');
      }
    } catch (error) {
      add('indexedDB', 'Open / write/read', 'FAIL', `Erro (${error?.name || 'Error'})`);
      add('indexedDB', 'Previous value', 'NOT_TESTED', '');
      add('indexedDB', 'Chapter persistence', 'NOT_TESTED', '');
      add('indexedDB', 'App restart persistence', 'NOT_TESTED', '');
      add('indexedDB', 'Origin isolation', 'UNKNOWN', '');
    } finally {
      try { database?.close(); } catch { /* noop */ }
    }
  };

  const diagnoseCarriers = () => {
    const scriptNode = document.getElementById('nf-poc-script');
    const hiddenNode = document.getElementById('nf-poc-hidden');
    const classNode = document.getElementById('nf-poc-class');
    const bodyText = document.body?.innerText || '';
    const hiddenStyle = hiddenNode ? getComputedStyle(hiddenNode) : null;
    const classStyle = classNode ? getComputedStyle(classNode) : null;
    add('carriers', 'SCRIPT_TEST', scriptNode ? 'PASS' : 'FAIL', scriptNode ? `type=${scriptNode.getAttribute('type')}; id=${scriptNode.id}; data=${scriptNode.getAttribute('data-nf-poc')}; text=${scriptNode.textContent.includes('SCRIPT_TEST')}; innerText=${bodyText.includes('SCRIPT_TEST')}; display=${getComputedStyle(scriptNode).display}; visibility=${getComputedStyle(scriptNode).visibility}` : 'Elemento não encontrado após sanitização');
    add('carriers', 'HIDDEN_TEST', hiddenNode ? 'PASS' : 'FAIL', hiddenNode ? `hidden=${hiddenNode.hasAttribute('hidden')}; style=${hiddenNode.hasAttribute('style')}; data=${hiddenNode.getAttribute('data-nf-poc')}; text=${hiddenNode.textContent.includes('HIDDEN_TEST')}; innerText=${bodyText.includes('HIDDEN_TEST')}; display=${hiddenStyle?.display}; visibility=${hiddenStyle?.visibility}` : 'Elemento não encontrado');
    add('carriers', 'CLASS_TEST', classNode ? 'PASS' : 'FAIL', classNode ? `class=${classNode.classList.contains('nf-poc-carrier')}; data=${classNode.getAttribute('data-nf-poc')}; text=${classNode.textContent.includes('CLASS_TEST')}; innerText=${bodyText.includes('CLASS_TEST')}; display=${classStyle?.display}; visibility=${classStyle?.visibility}` : 'Elemento não encontrado');
    add('carriers', 'Visible payload markers', bodyText.includes('SCRIPT_TEST') || bodyText.includes('HIDDEN_TEST') || bodyText.includes('CLASS_TEST') ? 'FAIL' : 'PASS', 'Somente presença booleana; nenhum JSON/texto bruto copiado');
  };

  const diagnose = async () => {
    if (diagnosing) return;
    diagnosing = true;
    try {
      add('environment', 'Book identity', expectedMarker === 'UNKNOWN' ? 'FAIL' : 'PASS', bookId);
      add('environment', 'Chapter identity', chapterId === 'UNKNOWN' ? 'FAIL' : 'PASS', chapterId);
      add('environment', 'Chapter marker', chapterMarker === 'UNKNOWN' ? 'FAIL' : 'PASS', chapterMarker);
      add('environment', 'location.href', 'PASS', redactUrl(location.href));
      add('environment', 'location.origin', 'PASS', location.origin || 'null');
      add('environment', 'document.baseURI', 'PASS', redactUrl(document.baseURI));
      add('environment', 'typeof fetch', typeof fetch === 'function' ? 'PASS' : 'FAIL', typeof fetch);
      add('environment', 'URL constructor', typeof URL === 'function' ? 'PASS' : 'FAIL', typeof URL);
      diagnoseCarriers();
      diagnoseLocalStorage();
      const jsonPromise = diagnoseJson();
      const indexedDbPromise = diagnoseIndexedDB();
      render();
      await Promise.allSettled([jsonPromise, indexedDbPromise]);
      render();
    } finally {
      diagnosing = false;
    }
  };

  showPanel();
  void diagnose();
})();
