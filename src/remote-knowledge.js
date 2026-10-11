/* NovelForge C5.6 — NF-RK-001 remote knowledge client. */
(function (global) {
  'use strict';

  const SCHEMAS = {
    discovery: 'nf-rk-discovery/1',
    manifest: 'nf-rk-manifest/1',
    knowledge: 'nf-rk-knowledge/1'
  };
  const REPOSITORY = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@';
  const BOOKS = {
    overgeared: {
      bookId: 'overgeared',
      discoveryUrl: REPOSITORY + 'main/knowledge/v1/books/overgeared/latest.json',
      relativeRoot: 'knowledge/v1/books/overgeared/'
    }
  };
  const LIMITS = { discovery: 4096, manifest: 32768, knowledge: 65536, entities: 10000, facts: 2000, text: 4000, timeoutMs: 12000 };
  const revisionHeads = new Map();
  const entityCache = new Map();

  function fail(code, message) { return { ok: false, error: { code, message } }; }
  function ok(value) { return { ok: true, value }; }
  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function isSafeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
  function checkedUrl(value, expected) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.origin !== 'https://cdn.jsdelivr.net') throw new Error('ENDPOINT_REJECTED');
    if (expected && url.href !== expected) throw new Error('ENDPOINT_MISMATCH');
    return url;
  }
  function createError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  async function fetchBytes(urlString, maxBytes, callerSignal) {
    if (typeof global.fetch !== 'function') throw createError('FETCH_UNAVAILABLE');
    if (typeof global.AbortController !== 'function') throw createError('ABORT_UNAVAILABLE');
    const url = checkedUrl(urlString);
    const controller = new global.AbortController();
    let timer = null;
    let callerAbort = null;
    if (callerSignal) {
      if (callerSignal.aborted) throw createError('ABORTED');
      callerAbort = function () { controller.abort(); };
      callerSignal.addEventListener('abort', callerAbort, { once: true });
    }
    const operation = (async function () {
      const response = await global.fetch(url.href, {
        method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (response.type === 'opaque' || response.redirected) throw createError('REDIRECT_REJECTED');
      if (response.url) checkedUrl(response.url, url.href);
      if (!response.ok) throw createError('HTTP_' + String(response.status));
      const declaredLength = Number(response.headers && response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw createError('RESPONSE_TOO_LARGE');
      let bytes;
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            total += part.value.byteLength;
            if (total > maxBytes) {
              controller.abort();
              try { await reader.cancel(); } catch (_) { /* The reader may already be closed. */ }
              throw createError('RESPONSE_TOO_LARGE');
            }
            chunks.push(part.value);
          }
        } finally {
          if (reader.releaseLock) reader.releaseLock();
        }
        bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      } else {
        // WebViews without a readable stream allocate before this post-read limit check.
        bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maxBytes) throw createError('RESPONSE_TOO_LARGE');
      }
      return bytes;
    })();
    const timeout = new Promise(function (_, reject) {
      timer = global.setTimeout(function () {
        controller.abort();
        reject(createError('TIMEOUT'));
      }, LIMITS.timeoutMs);
    });
    try {
      const bytes = await Promise.race([operation, timeout]);
      if (callerSignal && callerSignal.aborted) throw createError('ABORTED');
      return bytes;
    } catch (error) {
      if (error && error.code) throw error;
      if (callerSignal && callerSignal.aborted) throw createError('ABORTED');
      throw createError('NETWORK_ERROR');
    } finally {
      if (timer !== null) global.clearTimeout(timer);
      if (callerSignal && callerAbort) callerSignal.removeEventListener('abort', callerAbort);
    }
  }

  function parseJson(bytes) {
    try { return JSON.parse(new global.TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch (_) { throw createError('INVALID_JSON'); }
  }

  function validateDiscovery(discovery, bookId) {
    if (!isRecord(discovery) || discovery.schemaVersion !== SCHEMAS.discovery || discovery.bookId !== bookId) throw createError('INVALID_DISCOVERY');
    if (typeof discovery.revision !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(discovery.revision)) throw createError('INVALID_REVISION');
    if (typeof discovery.contentCommit !== 'string' || !/^[a-f0-9]{40}$/.test(discovery.contentCommit)) throw createError('INVALID_CONTENT_COMMIT');
    return discovery;
  }

  function entityDirectory(entityId) {
    const match = /^(character|event):([A-Za-z0-9][A-Za-z0-9._-]{0,79})$/.exec(entityId);
    if (!match) throw createError('INVALID_ENTITY_ID');
    return 'entities/' + match[1] + '/' + match[2] + '/';
  }

  function validateManifest(manifest, bookId, revision, entityId) {
    if (!isRecord(manifest) || manifest.schemaVersion !== SCHEMAS.manifest || manifest.bookId !== bookId || manifest.revision !== revision) throw createError('INVALID_MANIFEST');
    if (!isRecord(manifest.entities) || Object.keys(manifest.entities).length !== 1 || !Object.prototype.hasOwnProperty.call(manifest.entities, entityId)) throw createError('INVALID_MANIFEST_ENTITIES');
    const entry = manifest.entities[entityId];
    if (!isRecord(entry) || entry.entityId !== entityId || entry.resourcePath !== entityDirectory(entityId) + 'data.json') throw createError('INVALID_RESOURCE_PATH');
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 1 || entry.byteLength > LIMITS.knowledge) throw createError('INVALID_BYTE_LENGTH');
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw createError('INVALID_SHA256');
    return manifest;
  }

  function validateKnowledge(data, bookId, revision, entityId) {
    if (!isRecord(data) || data.schemaVersion !== SCHEMAS.knowledge || data.bookId !== bookId || data.revision !== revision || data.entityId !== entityId) throw createError('IDENTITY_OR_SCHEMA_MISMATCH');
    if (!Array.isArray(data.facts) || data.facts.length > LIMITS.facts) throw createError('INVALID_FACTS');
    const ids = new Set();
    let previous = null;
    for (const fact of data.facts) {
      if (!isRecord(fact) || typeof fact.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(fact.id) || ids.has(fact.id)) throw createError('INVALID_FACT_ID');
      ids.add(fact.id);
      if (typeof fact.text !== 'string' || fact.text.length < 1 || fact.text.length > LIMITS.text) throw createError('INVALID_FACT_TEXT');
      const point = fact.revealedAt, source = fact.provenance;
      if (!isRecord(point) || !isSafeInteger(point.chapter) || !isSafeInteger(point.block)) throw createError('INVALID_REVEAL_POSITION');
      if (!isRecord(source) || !isSafeInteger(source.chapter) || !isSafeInteger(source.block) || typeof source.blockId !== 'string') throw createError('MISSING_PROVENANCE');
      const block = /^b([0-9]{1,9})$/.exec(source.blockId);
      if (source.chapter !== point.chapter || source.block !== point.block || !block || Number(block[1]) !== point.block) throw createError('INCONSISTENT_PROVENANCE');
      if (previous && (point.chapter < previous.chapter || (point.chapter === previous.chapter && point.block < previous.block))) throw createError('FACTS_OUT_OF_ORDER');
      previous = point;
    }
    return data;
  }

  function sha256Fallback(input) {
    if (!(input instanceof Uint8Array)) throw new TypeError('Expected Uint8Array bytes.');
    if (input.byteLength > LIMITS.knowledge) throw createError('HASH_INPUT_TOO_LARGE');
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const bitLength = input.byteLength * 8;
    const paddedLength = Math.ceil((input.byteLength + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(input); padded[input.byteLength] = 0x80;
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
        const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3), s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++) {
        const sum1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), choice = (e & f) ^ (~e & g);
        const t1 = (h + sum1 + choice + K[i] + W[i]) >>> 0;
        const sum0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), majority = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (sum0 + majority) >>> 0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
      H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    return H.map(word => word.toString(16).padStart(8, '0')).join('');
  }

  async function sha256(bytes) {
    try {
      const subtle = global.crypto && global.crypto.subtle;
      if (subtle && typeof subtle.digest === 'function') {
        const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
        return { hex: Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join(''), implementation: 'WEB_CRYPTO' };
      }
    } catch (_) { /* Use the audited C5.4.1-compatible fallback below. */ }
    return { hex: sha256Fallback(bytes), implementation: 'JS_FALLBACK' };
  }

  async function loadValidatedEntity(book, entityId, signal) {
    const headKey = book.bookId;
    let head = revisionHeads.get(headKey);
    if (!head) {
      const discoveryBytes = await fetchBytes(book.discoveryUrl, LIMITS.discovery, signal);
      const discovery = validateDiscovery(parseJson(discoveryBytes), book.bookId);
      head = { revision: discovery.revision, contentCommit: discovery.contentCommit };
    }
    const cacheKey = [book.bookId, head.revision, head.contentCommit, entityId].join('|');
    if (entityCache.has(cacheKey)) return { data: entityCache.get(cacheKey), revision: head.revision, cache: 'MEMORY' };
    const manifestUrl = REPOSITORY + head.contentCommit + '/' + book.relativeRoot + entityDirectory(entityId) + 'manifest.json';
    const manifestBytes = await fetchBytes(manifestUrl, LIMITS.manifest, signal);
    const entityManifest = validateManifest(parseJson(manifestBytes), book.bookId, head.revision, entityId);
    const entry = entityManifest.entities[entityId];
    if (!entry) throw createError('ENTITY_NOT_PUBLISHED');
    const expectedPath = entityDirectory(entityId) + 'data.json';
    if (entry.resourcePath !== expectedPath) throw createError('INVALID_RESOURCE_PATH');
    const resourceUrl = REPOSITORY + head.contentCommit + '/' + book.relativeRoot + entry.resourcePath;
    const bytes = await fetchBytes(resourceUrl, LIMITS.knowledge, signal);
    if (bytes.byteLength !== entry.byteLength) throw createError('BYTE_LENGTH_MISMATCH');
    const digest = await sha256(bytes);
    if (digest.hex !== entry.sha256) throw createError('SHA256_MISMATCH');
    const data = validateKnowledge(parseJson(bytes), book.bookId, head.revision, entityId);
    if (signal && signal.aborted) throw createError('ABORTED');
    // Only fully validated resources and their manifest/revision are cached.
    entityCache.set(cacheKey, data);
    revisionHeads.set(headKey, head);
    return { data, revision: head.revision, cache: 'NETWORK' };
  }

  function validateContext(context) {
    if (!isRecord(context)) throw createError('INVALID_CONTEXT');
    if (typeof context.bookId !== 'string' || !context.bookId) throw createError('BOOK_ID_REQUIRED');
    const book = BOOKS[context.bookId];
    if (!book) throw createError('BOOK_NOT_CONFIGURED');
    if (context.bookId !== book.bookId) throw createError('BOOK_ID_MISMATCH');
    if (!isSafeInteger(context.chapter) || !isSafeInteger(context.block)) throw createError('INVALID_POSITION');
    entityDirectory(context.entityId);
    return { book, entityId: context.entityId, chapter: context.chapter, block: context.block };
  }

  async function queryEntity(context, options) {
    try {
      if (options && options.signal && options.signal.aborted) throw createError('ABORTED');
      const request = validateContext(context);
      const result = await loadValidatedEntity(request.book, request.entityId, options && options.signal);
      if (options && options.signal && options.signal.aborted) throw createError('ABORTED');
      const allowed = result.data.facts.filter(fact => fact.revealedAt.chapter < request.chapter ||
        (fact.revealedAt.chapter === request.chapter && fact.revealedAt.block <= request.block));
      return ok({
        schemaVersion: SCHEMAS.knowledge, bookId: request.book.bookId, revision: result.revision,
        entityId: request.entityId, facts: allowed.map(fact => ({
          id: fact.id, text: fact.text, revealedAt: { chapter: fact.revealedAt.chapter, block: fact.revealedAt.block },
          provenance: { chapter: fact.provenance.chapter, block: fact.provenance.block, blockId: fact.provenance.blockId }
        }))
      });
    } catch (error) {
      const code = error && error.code ? error.code : 'REMOTE_ERROR';
      const messages = {
        BOOK_NOT_CONFIGURED: 'Este livro ainda não possui uma fonte remota configurada.',
        ENTITY_NOT_PUBLISHED: 'Não há conhecimento publicado para esta entidade.',
        INVALID_POSITION: 'A posição de leitura não é válida para consulta remota.',
        TIMEOUT: 'A consulta remota excedeu o tempo limite.',
        ABORTED: 'Consulta cancelada.',
        NETWORK_ERROR: 'Não foi possível acessar a enciclopédia remota.',
        FETCH_UNAVAILABLE: 'A consulta remota não está disponível neste ambiente.'
      };
      return fail(code, messages[code] || 'A enciclopédia está indisponível ou os dados não passaram pela validação.');
    }
  }

  const api = { queryEntity, sha256Fallback, SCHEMAS, BOOKS };
  global.NovelForgeRemoteKnowledge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
