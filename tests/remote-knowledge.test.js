const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createHash, webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'remote-knowledge.js'), 'utf8');
const commit = 'a'.repeat(40);
const base = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@';
const bookRoot = 'knowledge/v1/books/overgeared/';
const revision = 'og-r1';

function fixture(overrides = {}) {
  const facts = overrides.facts || [
    { id:'f-early', text:'Synthetic previously revealed fact.', revealedAt:{chapter:100,block:10}, provenance:{chapter:100,block:10,blockId:'b00010'} },
    { id:'f-later', text:'Synthetic same-chapter boundary fact.', revealedAt:{chapter:900,block:5}, provenance:{chapter:900,block:5,blockId:'b00005'} }
  ];
  const knowledge = overrides.knowledge || { schemaVersion:'nf-rk-knowledge/1', bookId:'overgeared', revision, entityId:'character:braham', facts };
  const knowledgeBytes = Buffer.from(JSON.stringify(knowledge));
  const manifest = overrides.manifest || {
    schemaVersion:'nf-rk-manifest/1', bookId:'overgeared', revision,
    entities:{ 'character:braham': { entityId:'character:braham', resourcePath:'entities/character/braham/data.json', byteLength:knowledgeBytes.length, sha256:createHash('sha256').update(knowledgeBytes).digest('hex') } }
  };
  const discovery = overrides.discovery || { schemaVersion:'nf-rk-discovery/1', bookId:'overgeared', revision, contentCommit:commit };
  const manifestUrl = `${base}${commit}/${bookRoot}entities/character/braham/manifest.json`;
  const resourceUrl = `${base}${commit}/${bookRoot}entities/character/braham/data.json`;
  const responses = new Map([
    [`${base}main/${bookRoot}latest.json`, Buffer.from(JSON.stringify(discovery))],
    [manifestUrl, Buffer.from(JSON.stringify(manifest))],
    [resourceUrl, knowledgeBytes]
  ]);
  return { responses, discovery, manifest, knowledge, knowledgeBytes, manifestUrl, resourceUrl };
}

function response(url, payload, status = 200, options = {}) {
  const bytes = Buffer.from(payload);
  let position = 0;
  const chunks = options.chunks || [bytes];
  return {
    ok: status >= 200 && status < 300, status, type: options.type || 'cors', redirected: !!options.redirected, url,
    headers: { get(name) { return name.toLowerCase() === 'content-length' ? (options.hideLength ? null : String(options.declaredLength ?? bytes.length)) : null; } },
    body: options.stream ? { getReader() { return {
      async read() { if (position >= chunks.length) return {done:true}; return {done:false,value:new Uint8Array(chunks[position++])}; },
      async cancel() { position=chunks.length; }, releaseLock() {}
    }; } } : null,
    async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
  };
}

function client(fx, options = {}) {
  const calls = [];
  const requestOptions=[];
  const fakeFetch = options.fetch || (async (url, init) => {
    calls.push(url);
    requestOptions.push(init);
    const payload = fx.responses.get(url);
    return payload ? response(url, payload) : response(url, '', 404);
  });
  const sandbox = {
    URL, Uint8Array, Uint32Array, DataView, TextDecoder, Map, Set, Number, Object, Array, String, Math, Error, TypeError,
    AbortController, fetch: fakeFetch, setTimeout: options.setTimeout || setTimeout, clearTimeout: options.clearTimeout || clearTimeout,
    // Deliberately no Web Crypto: production must exercise its JS fallback.
  };
  if (options.crypto) sandbox.crypto=options.crypto;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { api:sandbox.NovelForgeRemoteKnowledge, calls, requestOptions, sandbox };
}

const query = (api, extra = {}) => api.queryEntity({ bookId:'overgeared', entityId:'character:braham', chapter:900, block:4, ...extra });

test('remote client filters inclusively by numeric chapter/block; future facts never enter the public result', async () => {
  const fx = fixture(); const { api } = client(fx);
  const before = await query(api);
  assert.equal(before.ok, true);
  assert.deepEqual(Array.from(before.value.facts, f => f.id), ['f-early']);
  assert.equal(before.value.facts.some(f => f.id === 'f-later'), false);
  const exact = await query(api, { chapter:900, block:5 });
  assert.deepEqual(Array.from(exact.value.facts, f => f.id), ['f-early','f-later']);
  const laterChapter = await query(api, { chapter:901, block:0 });
  assert.deepEqual(Array.from(laterChapter.value.facts, f => f.id), ['f-early','f-later']);
});

test('JS SHA-256 fallback matches independent Node vectors including C5.4.1 fixture digest', () => {
  const { api } = client(fixture());
  for (const text of ['', 'abc', 'x'.repeat(56), 'novelforge'.repeat(90)]) {
    const bytes = new Uint8Array(Buffer.from(text));
    assert.equal(api.sha256Fallback(bytes), createHash('sha256').update(text).digest('hex'));
  }
  const pocBytes=fs.readFileSync(path.resolve(__dirname,'..','experiments','lnreader-remote-knowledge','fixtures','braham.json'));
  assert.equal(api.sha256Fallback(new Uint8Array(pocBytes)), '6d39b9d973b52937363e46ba50874bf356ee5dcf4d1f0c29ffca75e81c58c797');
});

test('Web Crypto path is used when available and agrees with fallback output', async () => {
  const runtime=client(fixture(),{crypto:webcrypto});
  const result=await query(runtime.api);
  assert.equal(result.ok,true);
  assert.deepEqual(Array.from(result.value.facts,f=>f.id),['f-early']);
});

test('validated data is cached only after success and filtered again at the next position', async () => {
  const fx = fixture(); const runtime = client(fx);
  const first = await query(runtime.api, { chapter:900, block:4 });
  assert.equal(first.ok, true);
  const callsAfterFirst = runtime.calls.length;
  const next = await query(runtime.api, { chapter:900, block:5 });
  assert.deepEqual(Array.from(next.value.facts, f => f.id), ['f-early','f-later']);
  assert.equal(runtime.calls.length, callsAfterFirst);
  assert.match(runtime.calls[0],/@main\/knowledge\/v1\/books\/overgeared\/latest\.json$/);
  assert.deepEqual(runtime.calls.slice(1), [fx.manifestUrl, fx.resourceUrl]);
  assert.ok(runtime.calls.slice(1).every(url=>url.includes('@'+commit+'/knowledge/v1/books/overgeared/')));
  assert.equal(Object.keys(fx.manifest.entities).length, 1, 'entity manifest must not enumerate other/future entities');
  assert.ok(runtime.requestOptions.every(options=>options.mode==='cors'&&options.credentials==='omit'&&options.redirect==='error'&&options.cache==='no-store'));
  assert.equal(runtime.api.BOOKS.overgeared.bookId, 'overgeared');
});

test('unknown book and invalid positions fail closed without network access', async () => {
  const runtime = client(fixture());
  for (const input of [{bookId:'nf-overgeared-poc'}, {chapter:'900'}, {block:-1}, {entityId:'location:castle'}]) {
    const result = await query(runtime.api, input);
    assert.equal(result.ok, false);
  }
  assert.equal(runtime.calls.length, 0);
});

test('HTTP errors, redirects, and timeout are structured failures', async t => {
  await t.test('HTTP 404', async () => {
    const fx = fixture(); const runtime = client(fx, { fetch:async url => response(url, '', 404) });
    assert.equal((await query(runtime.api)).error.code, 'HTTP_404');
  });
  await t.test('HTTP 500', async () => {
    const fx = fixture(); const runtime = client(fx, { fetch:async url => response(url, '', 500) });
    assert.equal((await query(runtime.api)).error.code, 'HTTP_500');
  });
  await t.test('redirect', async () => {
    const fx = fixture(); const runtime = client(fx, { fetch:async url => response(url, '{}', 200, { redirected:true }) });
    assert.equal((await query(runtime.api)).error.code, 'REDIRECT_REJECTED');
  });
  await t.test('timeout', async () => {
    const fx = fixture();
    const runtime = client(fx, {
      fetch:() => new Promise(() => {}),
      setTimeout(callback) { return setTimeout(callback, 1); }
    });
    assert.equal((await query(runtime.api)).error.code, 'TIMEOUT');
  });
});

test('per-entity manifest enforces schema, identity, safe resource path, size and digest', async t => {
  const invalid = [
    { manifest:{schemaVersion:'bad'} },
    { discovery:{schemaVersion:'nf-rk-discovery/1',bookId:'wrong',revision,contentCommit:commit} },
    { discovery:{schemaVersion:'nf-rk-discovery/1',bookId:'overgeared',revision,contentCommit:'main'} },
    { manifest:{schemaVersion:'nf-rk-manifest/1',bookId:'overgeared',revision,entities:{'character:braham':{entityId:'character:braham',resourcePath:'../../evil.json',byteLength:3,sha256:'0'.repeat(64)}}} },
    { manifest:{schemaVersion:'nf-rk-manifest/1',bookId:'overgeared',revision,entities:{'character:braham':{entityId:'character:braham',resourcePath:'entities/character/braham/data.json',byteLength:3,sha256:'0'.repeat(64)},'character:future':{entityId:'character:future',resourcePath:'entities/character/future/data.json',byteLength:3,sha256:'0'.repeat(64)}}} }
  ];
  for (let i=0;i<invalid.length;i++) await t.test(`invalid manifest/discovery case ${i+1}`, async () => {
    const fx=fixture(invalid[i]); const runtime=client(fx);
    assert.equal((await query(runtime.api)).ok,false);
  });
  await t.test('byteLength mismatch', async () => {
    const fx=fixture();
    const manifest=JSON.parse(Buffer.from(fx.responses.get(fx.manifestUrl)).toString());
    manifest.entities['character:braham'].byteLength++;
    fx.responses.set(fx.manifestUrl,Buffer.from(JSON.stringify(manifest)));
    const runtime=client(fx); assert.equal((await query(runtime.api)).error.code,'BYTE_LENGTH_MISMATCH');
  });
  await t.test('SHA-256 mismatch', async () => {
    const fx=fixture();
    const manifest=JSON.parse(Buffer.from(fx.responses.get(fx.manifestUrl)).toString());
    manifest.entities['character:braham'].sha256='0'.repeat(64);
    fx.responses.set(fx.manifestUrl,Buffer.from(JSON.stringify(manifest)));
    const runtime=client(fx); assert.equal((await query(runtime.api)).error.code,'SHA256_MISMATCH');
  });
});

test('entity schema, identity and temporal provenance are mandatory', async t => {
  for (const [name, mutate] of [
    ['wrong book', k => {k.bookId='other';}],
    ['wrong entity', k => {k.entityId='character:other';}],
    ['missing provenance', k => {delete k.facts[0].provenance;}],
    ['inconsistent provenance', k => {k.facts[0].provenance.block=9;}],
    ['invalid revealed position', k => {k.facts[0].revealedAt.block='10';}],
    ['future facts ordered before past', k => {k.facts.reverse();}]
  ]) await t.test(name, async () => {
    const fx=fixture(); const knowledge=JSON.parse(JSON.stringify(fx.knowledge)); mutate(knowledge);
    const bytes=Buffer.from(JSON.stringify(knowledge));
    const manifest=JSON.parse(Buffer.from(fx.responses.get(fx.manifestUrl)).toString());
    manifest.entities['character:braham'].byteLength=bytes.length;
    manifest.entities['character:braham'].sha256=createHash('sha256').update(bytes).digest('hex');
    fx.responses.set(fx.manifestUrl,Buffer.from(JSON.stringify(manifest)));
    fx.responses.set(fx.resourceUrl,bytes);
    const runtime=client(fx); assert.equal((await query(runtime.api)).ok,false);
  });
});

test('oversized manifest/resource and empty or malformed response fail closed', async t => {
  await t.test('declared oversize', async () => {
    const fx=fixture(); const runtime=client(fx,{fetch:async url=>response(url, '{}',200,{declaredLength:999999})});
    assert.equal((await query(runtime.api)).error.code,'RESPONSE_TOO_LARGE');
  });
  await t.test('invalid JSON', async () => {
    const fx=fixture(); const latest=`${base}main/${bookRoot}latest.json`;
    fx.responses.set(latest,Buffer.from('{')); const runtime=client(fx);
    assert.equal((await query(runtime.api)).error.code,'INVALID_JSON');
  });
  await t.test('empty response', async () => {
    const fx=fixture(); const latest=`${base}main/${bookRoot}latest.json`;
    fx.responses.set(latest,Buffer.alloc(0)); const runtime=client(fx);
    assert.equal((await query(runtime.api)).ok,false);
  });
  await t.test('streamed response exceeds actual byte limit', async () => {
    const fx=fixture(); const latest=`${base}main/${bookRoot}latest.json`;
    fx.responses.set(latest,Buffer.alloc(5000,0x20));
    const runtime=client(fx,{fetch:async url=>response(url,fx.responses.get(url)||Buffer.alloc(0),200,{stream:true,hideLength:true,chunks:[Buffer.alloc(5000,0x20)]})});
    assert.equal((await query(runtime.api)).error.code,'RESPONSE_TOO_LARGE');
  });
  await t.test('network rejection', async () => {
    const fx=fixture(); const runtime=client(fx,{fetch:async()=>{throw new TypeError('simulated offline');}});
    assert.equal((await query(runtime.api)).error.code,'NETWORK_ERROR');
  });
});

test('production bundle builder includes remote client only in the LNReader artifact', () => {
  const build = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'build-dist.js'), 'utf8');
  assert.match(build, /remote-knowledge\.js/);
  assert.match(build, /contextText \+ '\\n' \+ remoteText \+ '\\n' \+ embeddedSource/);
  const library = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-formatter.js'), 'utf8');
  const lnreader = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js'), 'utf8');
  assert.doesNotMatch(library, /NovelForgeRemoteKnowledge/);
  assert.match(lnreader, /NovelForgeRemoteKnowledge/);
  assert.match(lnreader, /JS_FALLBACK/);
  assert.doesNotMatch(lnreader, /\bimport\s|\bexport\s|\brequire\s*\(|\beval\s*\(|localStorage|indexedDB|innerHTML\s*=/i);
});
