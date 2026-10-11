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
  const SECTION_NAMES = [
    'REMOTE TRANSPORT', 'MANIFEST VALIDATION', 'KNOWLEDGE VALIDATION',
    'SHA-256', 'ANTISPOILER', 'CACHE OBSERVATIONS',
  ];

  document.getElementById(panelId)?.remove();
  let panel;
  let running = false;
  let currentRun = Promise.resolve();
  let runIndex = 0;
  const results = [];

  const statusOf = value => ['PASS', 'FAIL', 'UNKNOWN', 'NOT_TESTED'].includes(value) ? value : 'UNKNOWN';
  const sectionFor = label => {
    const value = label.toLowerCase();
    if (value.includes('sha-256') || value.includes('digest') || value.includes('implementation')) return 'SHA-256';
    if (value.includes('spoiler') || value.includes('future facts')) return 'ANTISPOILER';
    if (value.includes('manifest')) return 'MANIFEST VALIDATION';
    if (value.includes('knowledge') || value.includes('schema / identity') || value.includes('entity')) return 'KNOWLEDGE VALIDATION';
    if (value.includes('cache') || value.includes('offline')) return 'CACHE OBSERVATIONS';
    return 'REMOTE TRANSPORT';
  };
  const push = (label, status, detail = '') => results.push({ section: sectionFor(label), label, status: statusOf(status), detail: String(detail || '') });
  const safeError = error => `${error?.name || 'Error'}: ${String(error?.message || 'sem detalhe').slice(0, 240)}`;

  const overallStatus = () => {
    const runResults = results.filter(item => /^Run \d+ overall$/.test(item.label));
    if (!runResults.length) return 'NOT_TESTED';
    if (runResults.some(item => item.status === 'FAIL')) return 'FAIL';
    if (runResults.length < 2 || runResults.some(item => item.status !== 'PASS')) return 'NOT_TESTED';
    const required = ['MANIFEST VALIDATION', 'KNOWLEDGE VALIDATION', 'SHA-256', 'ANTISPOILER'];
    for (const section of required) {
      const relevant = results.filter(item => item.section === section);
      if (!relevant.length || relevant.some(item => item.status !== 'PASS')) return 'NOT_TESTED';
    }
    return 'PASS';
  };

  const addText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  const render = () => {
    if (!panel?.isConnected) return;
    for (const list of panel.querySelectorAll('[data-remote-section]')) {
      const section = list.getAttribute('data-remote-section');
      list.replaceChildren();
      const items = results.filter(item => item.section === section);
      if (!items.length) addText(list, 'div', 'nf-rk-row', 'NOT_TESTED — nenhum resultado produzido nesta seção.');
      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'nf-rk-row';
        addText(row, 'span', 'nf-rk-label', item.label);
        addText(row, 'span', `nf-rk-status nf-rk-${item.status.toLowerCase()}`, item.status);
        if (item.detail) addText(row, 'span', 'nf-rk-detail', item.detail);
        list.append(row);
      }
    }
    const overall = panel.querySelector('[data-remote-overall]');
    if (overall) { overall.textContent = `Overall: ${running ? 'IN_PROGRESS' : overallStatus()}`; overall.setAttribute('data-status', running ? 'in-progress' : overallStatus().toLowerCase()); }
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
    `Overall: ${running ? 'IN_PROGRESS' : overallStatus()}`,
    `location.href: ${String(location.href).slice(0, 180)}`,
    `location.origin: ${location.origin || 'null'}`,
    `document.baseURI: ${String(document.baseURI).slice(0, 180)}`,
    `Manifest URL: ${REMOTE_MANIFEST_URL}`,
    `Knowledge URL: ${REMOTE_KNOWLEDGE_URL}`,
    '',
    ...SECTION_NAMES.flatMap(section => [
      '', section,
      ...(results.filter(item => item.section === section).length
        ? results.filter(item => item.section === section).map(item => `- ${item.label}: ${item.status}${item.detail ? ` — ${item.detail}` : ''}`)
        : ['- Section result: NOT_TESTED — nenhum resultado produzido nesta seção.']),
    ]),
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
    const overall = addText(panel, 'div', 'nf-rk-overall', 'Overall: NOT_TESTED');
    overall.setAttribute('data-remote-overall', '');
    for (const sectionName of SECTION_NAMES) {
      addText(panel, 'div', 'nf-rk-heading', sectionName);
      const output = document.createElement('div');
      output.className = 'nf-rk-results';
      output.setAttribute('data-remote-section', sectionName);
      panel.append(output);
    }
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
      if (!response.ok) {
        push(`${label} response`, 'FAIL', `type=${response.type || 'UNKNOWN'}; status=${response.status}; ok=false; redirected=${Boolean(response.redirected)}; ${Math.round(performance.now() - start)} ms; headers=${JSON.stringify(headers)}`);
        throw new Error(`HTTP ${response.status}.`);
      }
      const bytes = await readLimitedBytes(response, limit, controller);
      const elapsedMs = Math.round(performance.now() - start);
      push(`${label} response`, 'PASS', `type=${response.type || 'UNKNOWN'}; status=${response.status}; ok=true; redirected=${Boolean(response.redirected)}; bytes=${bytes.byteLength}; ${elapsedMs} ms; headers=${JSON.stringify(headers)}`);
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

  const getWebCryptoSubtle = () => {
    try { return typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function' ? crypto.subtle : null; }
    catch { return null; }
  };

  const sha256Hex = async bytes => {
    const started = performance.now();
    if (!(bytes instanceof Uint8Array)) throw new TypeError('SHA-256 requer Uint8Array com os bytes originais.');
    if (bytes.byteLength > MAX_KNOWLEDGE_BYTES) throw new RangeError(`SHA-256 input exceeds ${MAX_KNOWLEDGE_BYTES} bytes.`);
    const subtle = getWebCryptoSubtle();
    if (subtle) {
      try {
        const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
        return { hex: [...digest].map(byte => byte.toString(16).padStart(2, '0')).join(''), implementation: 'WEB_CRYPTO', elapsedMs: Math.round(performance.now() - started) };
      } catch (error) {
        try { return { hex: sha256Fallback(bytes), implementation: 'JS_FALLBACK', elapsedMs: Math.round(performance.now() - started), webCryptoError: safeError(error) }; }
        catch (fallbackError) { throw new Error(`Web Crypto failed (${safeError(error)}); JS fallback failed (${safeError(fallbackError)}).`); }
      }
    }
    try { return { hex: sha256Fallback(bytes), implementation: 'JS_FALLBACK', elapsedMs: Math.round(performance.now() - started) }; }
    catch (error) { throw new Error(`Web Crypto unavailable; JS fallback failed (${safeError(error)}).`); }
  };

  // FIPS 180-4 SHA-256 over the exact response octets; no text decode/re-encode occurs.
  const sha256Fallback = input => {
    if (!(input instanceof Uint8Array)) throw new TypeError('Expected Uint8Array bytes.');
    if (input.byteLength > MAX_KNOWLEDGE_BYTES) throw new RangeError(`Input exceeds the ${MAX_KNOWLEDGE_BYTES}-byte POC limit.`);
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
    ];
    const bitLength = input.byteLength * 8;
    const paddedLength = Math.ceil((input.byteLength + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(input);
    padded[input.byteLength] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const W = new Uint32Array(64);
    const rotr = (word, count) => (word >>> count) | (word << (32 - count));
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const x = W[i - 15], y = W[i - 2];
        const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++) {
        const sum1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const choice = (e & f) ^ (~e & g);
        const t1 = (h + sum1 + choice + K[i] + W[i]) >>> 0;
        const sum0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (sum0 + majority) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
      H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    return H.map(word => word.toString(16).padStart(8, '0')).join('');
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
    let digest;
    try { digest = await sha256Hex(response.bytes); }
    catch (error) {
      push(`Run ${runId} SHA-256 implementation`, 'FAIL', `WEB_CRYPTO/JS_FALLBACK não produziu digest: ${safeError(error)}`);
      push(`Run ${runId} SHA-256 Digest`, 'FAIL', safeError(error));
      throw error;
    }
    push(`Run ${runId} SHA-256 implementation`, 'PASS', `${digest.implementation}${digest.webCryptoError ? `; Web Crypto fallback: ${digest.webCryptoError}` : ''}`);
    push(`Run ${runId} SHA-256 Digest`, digest.hex === manifest.sha256 ? 'PASS' : 'FAIL', `${digest.hex}; ${digest.elapsedMs} ms`);
    if (digest.hex !== manifest.sha256) throw new Error('SHA-256 divergente; conhecimento bloqueado.');
    push(`Run ${runId} SHA-256 Integrity`, 'PASS', 'Hash dos bytes recebidos corresponde ao manifesto.');

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
      const denied = data.facts.map(fact => fact.id).filter(id => !ids.includes(id));
      push(`Run ${runId} spoiler filter ${query.name}`, allowed ? 'PASS' : 'FAIL', `ALLOW: ${ids.join(', ') || '(none)'}; DENY: ${denied.join(', ') || '(none)'}`);
      if (!allowed) throw new Error(`Filtro antisspoiler divergente em ${query.name}.`);
    }
    push(`Run ${runId} Future facts leaked`, 'PASS', 'NO — fatos futuros estão somente em DENY.');
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
      push('Web Crypto', getWebCryptoSubtle() ? 'PASS' : 'NOT_TESTED', getWebCryptoSubtle() ? 'crypto.subtle presente; digest será tentado' : 'Indisponível; fallback JS será usado');
      const endpoints = validateHttpsEndpoints();
      for (let attempt = 1; attempt <= 2; attempt++) {
        const started = performance.now();
        try {
          await runQuery(attempt, endpoints);
          push(`Run ${attempt} overall`, 'PASS', `${Math.round(performance.now() - started)} ms; requests independentes`);
        } catch (error) {
          const message = safeError(error);
          const status = message.includes('Timeout') ? 'FAIL' : message.includes('indisponível') ? 'NOT_TESTED' : 'FAIL';
          const hasManifest = results.some(item => item.label === `Run ${attempt} manifest validation`);
          const hasManifestBytes = results.some(item => item.label === `Run ${attempt} manifest bytes`);
          const hasKnowledgeBytes = results.some(item => item.label === `Run ${attempt} knowledge bytes`);
          const hasDigestResult = results.some(item => item.label === `Run ${attempt} SHA-256 Digest` && item.status !== 'PASS');
          const failureLabel = hasKnowledgeBytes && (message.includes('SHA-256') || hasDigestResult)
            ? `Run ${attempt} SHA-256 rejection`
            : message.includes('antisspoiler')
              ? `Run ${attempt} antisspoiler rejection`
              : hasManifest
                ? `Run ${attempt} knowledge validation rejection`
                : hasManifestBytes
                  ? `Run ${attempt} manifest validation rejection`
                  : `Run ${attempt} transport rejection`;
          push(failureLabel, status, message);
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
