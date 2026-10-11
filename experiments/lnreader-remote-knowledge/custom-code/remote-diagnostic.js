/*
 * NovelForge C5.4 — standalone LNReader Custom Code diagnostic.
 * Edit only the two HTTPS constants below to test a pinned public revision.
 * Remote responses are untrusted data; no remote script is ever executed.
 */
(() => {
  'use strict';

  const VERSION = 'nf-remote-knowledge-poc-v1';
  const REMOTE_MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/manifest.json';
  const REMOTE_KNOWLEDGE_URL = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/braham.json';
  const EXPECTED_BOOK_ID = 'nf-overgeared-poc';
  const EXPECTED_ENTITY_ID = 'character:braham';
  const MAX_MANIFEST_BYTES = 4096;
  const MAX_KNOWLEDGE_BYTES = 65536;
  const MAX_FACTS = 100;
  const MAX_STRING_LENGTH = 1000;
  const FETCH_TIMEOUT_MS = 12000;
  const panelId = 'nf-remote-knowledge-poc-panel';

  document.getElementById(panelId)?.remove();
  let panel;
  let running = false;
  let currentRun = Promise.resolve();
  let runIndex = 0;
  const results = [];

  const statusOf = value => ['PASS', 'FAIL', 'UNKNOWN', 'NOT_TESTED'].includes(value) ? value : 'UNKNOWN';
  const push = (label, status, detail = '') => results.push({ label, status: statusOf(status), detail: String(detail || '') });
  const safeError = error => `${error?.name || 'Error'}: ${String(error?.message || 'sem detalhe').slice(0, 240)}`;

  const addText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  const render = () => {
    if (!panel?.isConnected) return;
    const list = panel.querySelector('[data-remote-results]');
    list.replaceChildren();
    if (!results.length) addText(list, 'div', 'nf-rk-row', 'NOT_TESTED — aguardando execução');
    for (const item of results) {
      const row = document.createElement('div');
      row.className = 'nf-rk-row';
      addText(row, 'span', 'nf-rk-label', item.label);
      addText(row, 'span', `nf-rk-status nf-rk-${item.status.toLowerCase()}`, item.status);
      if (item.detail) addText(row, 'span', 'nf-rk-detail', item.detail);
      list.append(row);
    }
  };

  const setState = (state, detail = '') => {
    const node = panel?.querySelector('[data-remote-state]');
    if (node) {
      node.textContent = detail ? `${state} — ${detail}` : state;
      node.setAttribute('data-state', state.toLowerCase().replace(/[^a-z]+/g, '-'));
    }
  };

  const report = () => [
    'NOVELFORGE REMOTE KNOWLEDGE DIAGNOSTIC',
    `Version: ${VERSION}`,
    `Execution: ${running ? 'IN_PROGRESS' : 'COMPLETE'}`,
    `location.href: ${String(location.href).slice(0, 180)}`,
    `location.origin: ${location.origin || 'null'}`,
    `document.baseURI: ${String(document.baseURI).slice(0, 180)}`,
    `Manifest URL: ${REMOTE_MANIFEST_URL}`,
    `Knowledge URL: ${REMOTE_KNOWLEDGE_URL}`,
    '',
    ...results.map(item => `- ${item.label}: ${item.status}${item.detail ? ` — ${item.detail}` : ''}`),
    '',
    'SHA-256 validates byte integrity against this manifest, not publisher authenticity.',
    'Timing alone does not establish HTTP cache reuse; no persistent cache is implemented.',
  ].join('\n');

  const makePanel = () => {
    panel = document.createElement('section');
    panel.id = panelId;
    panel.className = 'nf-rk-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'NovelForge Remote Knowledge Diagnostic');
    addText(panel, 'div', 'nf-rk-title', 'NOVELFORGE REMOTE KNOWLEDGE DIAGNOSTIC');
    addText(panel, 'div', 'nf-rk-meta', `Version: ${VERSION}`);
    addText(panel, 'div', 'nf-rk-meta', `href=${String(location.href).slice(0, 140)} · origin=${location.origin || 'null'}`);
    addText(panel, 'div', 'nf-rk-meta', `baseURI=${String(document.baseURI).slice(0, 140)}`);
    addText(panel, 'div', 'nf-rk-meta', `URL=${REMOTE_MANIFEST_URL}`);
    addText(panel, 'div', 'nf-rk-meta', `Knowledge URL=${REMOTE_KNOWLEDGE_URL}`);
    const state = addText(panel, 'div', 'nf-rk-state', 'AGUARDANDO');
    state.setAttribute('data-remote-state', '');
    state.setAttribute('role', 'status');
    state.setAttribute('aria-live', 'polite');
    const output = document.createElement('div');
    output.className = 'nf-rk-results';
    output.setAttribute('data-remote-results', '');
    panel.append(output);
    const buttons = document.createElement('div');
    buttons.className = 'nf-rk-buttons';
    const run = document.createElement('button');
    run.type = 'button';
    run.textContent = 'Executar diagnóstico';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copiar relatório';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Fechar';
    run.addEventListener('click', () => { if (!running) currentRun = execute(); });
    copy.addEventListener('click', async () => {
      if (running) {
        copy.disabled = true;
        copy.textContent = 'Aguardando conclusão…';
        await currentRun;
        if (!copy.isConnected) return;
        copy.disabled = false;
        copy.textContent = 'Copiar relatório';
      }
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(report()); copied = true; }
      } catch { /* Clipboard can be denied by the WebView. */ }
      if (!copied) {
        const buffer = document.createElement('textarea');
        buffer.value = report();
        buffer.setAttribute('readonly', 'readonly');
        panel.append(buffer);
        buffer.select();
        try { copied = document.execCommand('copy'); } catch { copied = false; }
        buffer.remove();
      }
      copy.textContent = copied ? 'Relatório copiado' : 'Cópia indisponível';
      setTimeout(() => { if (copy.isConnected) copy.textContent = 'Copiar relatório'; }, 1800);
    });
    close.addEventListener('click', () => panel.remove());
    for (const button of [run, copy, close]) {
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => event.stopPropagation());
    }
    buttons.append(run, copy, close);
    panel.append(buttons);
    document.body.append(panel);
    render();
  };

  const validateHttpsEndpoints = () => {
    const manifest = new URL(REMOTE_MANIFEST_URL);
    const knowledge = new URL(REMOTE_KNOWLEDGE_URL);
    if (manifest.protocol !== 'https:' || knowledge.protocol !== 'https:') throw new Error('Somente endpoints HTTPS são aceitos.');
    if (manifest.origin !== knowledge.origin) throw new Error('Manifesto e JSON devem usar a mesma origem configurada.');
    return { manifest, knowledge };
  };

  const readLimitedBytes = async (response, limit, controller) => {
    const declared = Number(response.headers?.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) throw new Error(`Content-Length excede o limite (${declared} > ${limit}).`);
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > limit) {
            controller?.abort();
            await reader.cancel().catch(() => {});
            throw new Error(`Resposta excedeu o limite real de bytes (${total} > ${limit}).`);
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock?.(); }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    }
    // WebViews without a readable stream can allocate before this post-read size guard.
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw new Error(`Resposta excedeu o limite (${bytes.byteLength} > ${limit}); este WebView não expõe stream legível.`);
    return bytes;
  };

  const timedFetch = async (url, limit, label) => {
    if (typeof fetch !== 'function') throw new Error('fetch indisponível.');
    if (typeof AbortController !== 'function') throw new Error('AbortController indisponível; fetch não iniciado pois não há cancelamento garantido no timeout.');
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller?.abort(); reject(new Error(`${label}Timeout após ${FETCH_TIMEOUT_MS} ms.`)); }, FETCH_TIMEOUT_MS); });
    const operation = (async () => {
      const start = performance.now();
      const response = await fetch(url.href, { method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'error', signal: controller?.signal });
      const elapsedMs = Math.round(performance.now() - start);
      if (response.type === 'opaque') throw new Error('Resposta opaque: JSON não pode ser lido; no-cors não é usado.');
      if (response.redirected) throw new Error('Redirecionamento detectado e rejeitado.');
      if (response.url) {
        const finalUrl = new URL(response.url);
        if (finalUrl.origin !== url.origin || finalUrl.href !== url.href) throw new Error('URL final diverge do endpoint HTTPS configurado.');
      }
      const headers = {};
      for (const name of ['content-type', 'access-control-allow-origin', 'cache-control', 'etag', 'age']) {
        try { headers[name] = response.headers?.get(name) || 'NOT_EXPOSED'; } catch { headers[name] = 'UNKNOWN'; }
      }
      push(`${label} response`, response.ok ? 'PASS' : 'FAIL', `type=${response.type || 'UNKNOWN'}; status=${response.status}; ok=${Boolean(response.ok)}; redirected=${Boolean(response.redirected)}; ${elapsedMs} ms; headers=${JSON.stringify(headers)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}.`);
      const bytes = await readLimitedBytes(response, limit, controller);
      return { bytes, elapsedMs, status: response.status, byteLength: bytes.byteLength };
    })();
    try { return await Promise.race([operation, timeout]); }
    finally { clearTimeout(timer); }
  };

  const parseJsonBytes = bytes => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const validateManifest = (manifest, knowledgeUrl) => {
    if (!manifest || manifest.schema !== 'nf-knowledge-manifest-poc-v1') throw new Error('Schema do manifesto incompatível.');
    if (manifest.bookId !== EXPECTED_BOOK_ID) throw new Error('bookId do manifesto divergente.');
    if (typeof manifest.revision !== 'string' || !/^[a-zA-Z0-9._-]{1,40}$/.test(manifest.revision)) throw new Error('revision inválida.');
    if (manifest.knowledgePath !== 'braham.json') throw new Error('knowledgePath deve ser exatamente braham.json nesta POC.');
    if (!Number.isInteger(manifest.byteLength) || manifest.byteLength < 1 || manifest.byteLength > MAX_KNOWLEDGE_BYTES) throw new Error('byteLength inválido ou acima do limite.');
    if (typeof manifest.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('SHA-256 do manifesto inválido.');
    const fromManifest = new URL(manifest.knowledgePath, REMOTE_MANIFEST_URL);
    if (fromManifest.href !== knowledgeUrl.href) throw new Error('knowledgePath do manifesto não corresponde ao endpoint configurado.');
    return true;
  };

  const validateKnowledge = documentValue => {
    if (!documentValue || documentValue.schema !== 'nf-knowledge-poc-v1') throw new Error('Schema de conhecimento incompatível.');
    if (documentValue.bookId !== EXPECTED_BOOK_ID) throw new Error('bookId divergente.');
    if (documentValue.entityId !== EXPECTED_ENTITY_ID) throw new Error('entityId divergente.');
    if (typeof documentValue.name !== 'string' || documentValue.name.length > MAX_STRING_LENGTH) throw new Error('name inválido ou longo demais.');
    if (!Array.isArray(documentValue.facts) || documentValue.facts.length > MAX_FACTS) throw new Error('facts ausentes ou acima do limite.');
    let previous = null;
    const ids = new Set();
    for (const fact of documentValue.facts) {
      if (!fact || typeof fact.id !== 'string' || fact.id.length > 80 || ids.has(fact.id)) throw new Error('ID de fato ausente, longo ou duplicado.');
      ids.add(fact.id);
      if (typeof fact.text !== 'string' || fact.text.length > MAX_STRING_LENGTH) throw new Error(`Texto inválido/longo no fato ${fact.id}.`);
      const point = fact.revealedAt;
      if (!point || !Number.isSafeInteger(point.chapter) || point.chapter < 0 || !Number.isSafeInteger(point.block) || point.block < 0) throw new Error(`Proveniência chapter/block inválida no fato ${fact.id}.`);
      if (previous && (point.chapter < previous.chapter || (point.chapter === previous.chapter && point.block < previous.block))) throw new Error('Fatos fora de ordem temporal.');
      previous = point;
    }
    return true;
  };

  const filterFacts = (facts, position) => {
    if (!position || !Number.isSafeInteger(position.chapter) || position.chapter < 0 || !Number.isSafeInteger(position.block) || position.block < 0) throw new Error('Posição de consulta chapter/block inválida.');
    return facts.filter(fact => fact.revealedAt.chapter < position.chapter || (fact.revealedAt.chapter === position.chapter && fact.revealedAt.block <= position.block));
  };

  const sha256Hex = async bytes => {
    if (typeof crypto === 'undefined' || !crypto.subtle || typeof crypto.subtle.digest !== 'function') throw new Error('Web Crypto SHA-256 indisponível; integridade NOT_TESTED.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const runQuery = async (runId, endpoints) => {
    const manifestResponse = await timedFetch(endpoints.manifest, MAX_MANIFEST_BYTES, `Run ${runId} manifest`);
    push(`Run ${runId} manifest bytes`, 'PASS', `${manifestResponse.byteLength} bytes; ${manifestResponse.elapsedMs} ms`);
    const manifest = parseJsonBytes(manifestResponse.bytes);
    validateManifest(manifest, endpoints.knowledge);
    push(`Run ${runId} manifest validation`, 'PASS', `revision=${manifest.revision}; bookId=${manifest.bookId}`);

    const response = await timedFetch(endpoints.knowledge, MAX_KNOWLEDGE_BYTES, `Run ${runId} knowledge`);
    push(`Run ${runId} knowledge bytes`, response.byteLength === manifest.byteLength ? 'PASS' : 'FAIL', `received=${response.byteLength}; expected=${manifest.byteLength}; ${response.elapsedMs} ms`);
    if (response.byteLength !== manifest.byteLength) throw new Error('byteLength não corresponde ao manifesto.');
    let hash;
    try { hash = await sha256Hex(response.bytes); }
    catch (error) {
      if (String(error?.message || '').includes('indisponível')) push(`Run ${runId} SHA-256`, 'NOT_TESTED', safeError(error));
      throw error;
    }
    push(`Run ${runId} SHA-256`, hash === manifest.sha256 ? 'PASS' : 'FAIL', hash === manifest.sha256 ? 'Bytes correspondem ao hash do manifesto.' : 'Hash divergente; JSON não será usado.');
    if (hash !== manifest.sha256) throw new Error('SHA-256 divergente.');

    const data = parseJsonBytes(response.bytes);
    validateKnowledge(data);
    push(`Run ${runId} schema / identity`, 'PASS', `${data.bookId} / ${data.entityId}`);
    const queries = [
      { name: 'chapter 889 block 42', position: { chapter: 889, block: 42 }, expected: ['fact-001', 'fact-002'] },
      { name: 'chapter 900 block 4', position: { chapter: 900, block: 4 }, expected: ['fact-001', 'fact-002'] },
      { name: 'chapter 900 block 5', position: { chapter: 900, block: 5 }, expected: ['fact-001', 'fact-002', 'fact-003'] },
    ];
    for (const query of queries) {
      const ids = filterFacts(data.facts, query.position).map(fact => fact.id);
      const allowed = ids.join(',') === query.expected.join(',');
      push(`Run ${runId} spoiler filter ${query.name}`, allowed ? 'PASS' : 'FAIL', `allowed IDs=${ids.join(',') || '(none)'}`);
      if (!allowed) throw new Error(`Filtro antisspoiler divergente em ${query.name}.`);
    }
    return true;
  };

  const execute = async () => {
    if (running) return;
    running = true;
    const thisRun = ++runIndex;
    results.length = 0;
    setState('EM ANDAMENTO', `rodada ${thisRun}; sem reutilizar objeto JSON em memória`);
    render();
    try {
      push('fetch', typeof fetch === 'function' ? 'PASS' : 'FAIL', typeof fetch);
      push('AbortController', typeof AbortController === 'function' ? 'PASS' : 'NOT_TESTED', typeof AbortController);
      push('Response', typeof Response === 'function' ? 'PASS' : 'NOT_TESTED', typeof Response);
      push('Web Crypto', typeof crypto !== 'undefined' && crypto.subtle ? 'PASS' : 'NOT_TESTED', typeof crypto !== 'undefined' && crypto.subtle ? 'crypto.subtle presente' : 'SHA-256 pode ficar NOT_TESTED');
      const endpoints = validateHttpsEndpoints();
      for (let attempt = 1; attempt <= 2; attempt++) {
        const started = performance.now();
        try {
          await runQuery(attempt, endpoints);
          push(`Run ${attempt} overall`, 'PASS', `${Math.round(performance.now() - started)} ms; requests independentes`);
        } catch (error) {
          const message = safeError(error);
          const status = message.includes('Timeout') ? 'FAIL' : message.includes('indisponível') ? 'NOT_TESTED' : 'FAIL';
          push(`Run ${attempt} overall`, status, message);
        }
        render();
      }
      push('HTTP cache conclusion', 'UNKNOWN', 'Headers observados quando expostos; duração não prova cache WebView nem novo download.');
      push('Offline support', 'NOT_TESTED', 'Exige executar o procedimento manual online/offline no Android.');
    } catch (error) {
      push('Diagnostic setup', 'FAIL', safeError(error));
    } finally {
      running = false;
      render();
      setState('CONCLUÍDO', `rodada ${thisRun}; relatório finalizado`);
    }
  };

  makePanel();
  // No automatic network request: user starts the explicit diagnostic with the button.
})();
