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

/* NovelForge formatter core — C1 scaffold; no LNReader-specific API assumptions. */
(function (global) {
  'use strict';
  const WINDOW_SELECTOR = '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]';
  const STYLE_ID = 'nf-formatter-styles';
  // The source build receives CSS from src/formatter.css. The distribution
  // build replaces this hook with CSS text. The visual formatter stays
  // network-independent; contextual Knowledge requests are isolated in the
  // optional production client and happen only after a semantic entity tap.
  const FORMATTER_CSS = "/* Visual layer for publisher-marked NovelForge windows only. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] {\n  --nf-accent: #727780;\n  box-sizing: border-box;\n  margin: 1em 0;\n  padding: .9em 1.05em;\n  border: 1px solid rgba(110, 116, 124, .55);\n  border-left: 4px solid var(--nf-accent);\n  border-radius: .55em;\n  background: rgba(127, 127, 127, .08);\n  break-inside: avoid;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype]::before {\n  content: attr(data-nf-category);\n  display: block;\n  margin: 0 0 .55em;\n  color: var(--nf-accent);\n  font-size: .76em;\n  font-weight: 700;\n  letter-spacing: .08em;\n}\n\n/* Categories change the accent, never the card geometry. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-subtype] { --nf-accent: #a77b28; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SYSTEM\"][data-nf-subtype] { --nf-accent: #727780; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"QUEST\"][data-nf-subtype] { --nf-accent: #a67b20; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"SKILL\"][data-nf-subtype] { --nf-accent: #537b67; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"STATUS\"][data-nf-subtype] { --nf-accent: #52758a; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"CLASS\"][data-nf-subtype] { --nf-accent: #705f91; }\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"TITLE\"][data-nf-subtype] { --nf-accent: #9a7040; }\n\n/* In structured windows, the first paragraph is the heading row. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] > p:first-of-type {\n  font-weight: 700;\n}\n\n/* Put data-nf-field on the label node, not on its whole paragraph/value. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] [data-nf-field] {\n  font-weight: 700;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] strong {\n  font-weight: 700;\n}\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-subtype] [data-nf-field=\"rating\"] + strong {\n  color: var(--nf-accent);\n}\n\n/* VIS-R13: only explicitly marked delimiter nodes are visually hidden. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] .nf-delimiter {\n  display: none;\n}\n\n/* Existing rarity marker supplies color only, avoiding duplicate rarity text/badges. */\n.nf-chapter > .nf-window[data-nf-id][data-nf-category=\"ITEM\"][data-nf-rarity=\"LEGENDARY\"] {\n  --nf-accent: #b08a35;\n}\n\n@media (prefers-color-scheme: dark) {\n  .nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype] {\n    background: rgba(180, 180, 180, .10);\n  }\n}\n";

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

/* NovelForge C5.6 — the existing contextual popup, backed by the remote client in LNReader builds. */
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

    chapter.addEventListener('click', onClick);
    const state = {
      chapter,
      cleanup: function () { chapter.removeEventListener('click', onClick); closeDialog(false); }
    };
    global[STATE_KEY] = state;
    return { ok: true, chapter, mode: remoteMode ? 'remote' : 'local-test' };
  }

  global.NovelForgeContextualUI = { initialize, parsePosition };
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
