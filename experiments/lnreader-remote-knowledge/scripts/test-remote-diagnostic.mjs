import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = (await readFile(resolve(ROOT, 'custom-code', 'remote-diagnostic.js'), 'utf8'))
  .replace('const FETCH_TIMEOUT_MS = 12000;', 'const FETCH_TIMEOUT_MS = 25;')
  .replace('  makePanel();', '  globalThis.__testApi = { sha256Fallback, sha256Hex, filterFacts, validateKnowledge, Uint8Array };\n  makePanel();');
const manifestBytes = await readFile(resolve(ROOT, 'fixtures', 'manifest.json'));
const knowledgeBytes = await readFile(resolve(ROOT, 'fixtures', 'braham.json'));

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.parentNode = null; this._text = ''; this.isConnected = false; this.id = ''; this.value = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; node.isConnected = this.isConnected; const mark = (item, connected) => { item.isConnected = connected; item.children.forEach(child => mark(child, connected)); }; mark(node, this.isConnected); this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; this.isConnected = false; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  async click() { for (const fn of this.listeners.click || []) await fn({ stopPropagation() {} }); }
  querySelector(selector) {
    const key = selector === '[data-remote-state]' ? 'data-remote-state' : selector === '[data-remote-overall]' ? 'data-remote-overall' : null;
    if (!key) return null;
    return this.children.find(child => Object.hasOwn(child.attributes, key)) || this.children.map(child => child.querySelector(selector)).find(Boolean) || null;
  }
  querySelectorAll(selector) {
    const key = selector === '[data-remote-section]' ? 'data-remote-section' : null;
    if (!key) return [];
    return this.children.flatMap(child => [Object.hasOwn(child.attributes, key) ? child : null, ...child.querySelectorAll(selector)]).filter(Boolean);
  }
  select() {}
}

function makeHarness(fetchImpl, options = {}) {
  const body = new Element('body');
  body.isConnected = true;
  const doc = {
    body,
    baseURI: 'about:blank',
    createElement: tag => new Element(tag),
    getElementById: id => {
      const find = node => node.id === id ? node : node.children.map(find).find(Boolean) || null;
      return find(body);
    },
    execCommand: () => false,
  };
  const sandbox = {
    document: doc,
    location: { href: 'about:blank', origin: 'null' },
    navigator: options.clipboard ? { clipboard: { writeText: options.clipboard } } : {},
    URL,
    fetch: fetchImpl,
    AbortController: options.noAbort ? undefined : AbortController,
    Response,
    crypto: options.noCrypto ? undefined : {
      subtle: {
        digest: (algorithm, bytes) => options.webCryptoError
          ? Promise.reject(new Error('simulated subtle failure'))
          : webcrypto.subtle.digest(algorithm, Buffer.from(bytes)),
      },
    },
    TextDecoder,
    Uint8Array,
    Set,
    Number,
    JSON,
    Math,
    String,
    Error,
    TypeError,
    Promise,
    performance,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(script, sandbox, { timeout: 1000 });
  return { body, panel: doc.getElementById('nf-remote-knowledge-poc-panel'), sandbox, document: doc };
}

const response = (body, status = 200, headers = {}) => new Response(body, { status, headers });
const validFetch = async url => response(url.endsWith('manifest.json') ? manifestBytes : knowledgeBytes, 200, {
  'content-type': 'application/json',
  'access-control-allow-origin': 'null',
  'cache-control': 'public, max-age=60',
  etag: '"synthetic"',
  age: '0',
});
const pairFor = (data, manifestChanges = {}) => {
  const bytes = Buffer.from(JSON.stringify(data));
  const manifest = Buffer.from(JSON.stringify({
    schema: 'nf-knowledge-manifest-poc-v1', bookId: 'nf-overgeared-poc', revision: 'test-r1',
    knowledgePath: 'braham.json', sha256: createHash('sha256').update(bytes).digest('hex'), byteLength: bytes.length,
    ...manifestChanges,
  }));
  return { manifest, bytes };
};
const runButton = harness => harness.panel.children.at(-1).children[0];
const waitUntilDone = async harness => {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    const state = harness.panel.querySelector('[data-remote-state]')?.textContent || '';
    if (state.startsWith('CONCLUÍDO')) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 2));
  }
  assert.fail('diagnostic did not complete within test deadline');
};
const reportText = harness => harness.panel.textContent;

let initialReport = '';
const initialHarness = makeHarness(async () => { throw new Error('must not fetch on initialization'); }, { clipboard: async text => { initialReport = text; } });
await initialHarness.panel.children.at(-1).children[1].click();
for (const heading of ['REMOTE TRANSPORT', 'MANIFEST VALIDATION', 'KNOWLEDGE VALIDATION', 'SHA-256', 'ANTISPOILER', 'CACHE OBSERVATIONS']) {
  assert(initialReport.includes(heading), `empty initial report contains ${heading} section`);
}
assert.match(initialReport, /Overall: NOT_TESTED/);
assert.equal(initialReport.includes('must not fetch'), false, 'diagnostic does not fetch until explicitly started');

let calls = [];
const successHarness = makeHarness(async url => { calls.push(url); return validFetch(url); }, { noCrypto: true });
assert(successHarness.panel, 'panel is created');
assert.match(successHarness.panel.textContent, /NOVELFORGE REMOTE KNOWLEDGE DIAGNOSTIC/);
await runButton(successHarness).click();
await waitUntilDone(successHarness);
assert.equal(calls.length, 4, 'two runs each independently fetch manifest and knowledge JSON');
assert.match(reportText(successHarness), /Run 1 SHA-256 DigestPASS/);
assert.match(reportText(successHarness), /Run 1 SHA-256 implementationPASSJS_FALLBACK/);
assert.match(reportText(successHarness), /Run 2 SHA-256 DigestPASS/);
assert.match(reportText(successHarness), /chapter 900 block 4PASS/);
assert.match(reportText(successHarness), /chapter 900 block 5PASS/);
assert(!reportText(successHarness).includes('Synthetic future fact'), 'fact text is never rendered/copied in the panel');
assert.match(reportText(successHarness), /ALLOW: fact-001, fact-002; DENY: fact-003/);
assert.match(reportText(successHarness), /Future facts leakedPASSNO/);
assert.match(reportText(successHarness), /Overall: PASS/);

const webCryptoHarness = makeHarness(validFetch);
await runButton(webCryptoHarness).click();
await waitUntilDone(webCryptoHarness);
assert.match(reportText(webCryptoHarness), /Run 1 SHA-256 implementationPASSWEB_CRYPTO/);
assert.match(reportText(webCryptoHarness), /Overall: PASS/);

const webCryptoFallbackHarness = makeHarness(validFetch, { webCryptoError: true });
await runButton(webCryptoFallbackHarness).click();
await waitUntilDone(webCryptoFallbackHarness);
assert.match(reportText(webCryptoFallbackHarness), /Run 1 SHA-256 implementationPASSJS_FALLBACK/);
assert.match(reportText(webCryptoFallbackHarness), /simulated subtle failure/);

const httpHarness = makeHarness(async () => response('unavailable', 503));
await runButton(httpHarness).click();
await waitUntilDone(httpHarness);
assert.match(reportText(httpHarness), /status=503/);
assert.match(reportText(httpHarness), /Run 1 overallFAIL/);

const networkHarness = makeHarness(async () => { throw new TypeError('simulated network failure'); });
await runButton(networkHarness).click();
await waitUntilDone(networkHarness);
assert.match(reportText(networkHarness), /TypeError: simulated network failure/);
assert(!reportText(networkHarness).includes('CORS failure'), 'TypeError is not automatically diagnosed as CORS');

const timeoutHarness = makeHarness(() => new Promise(() => {}));
await runButton(timeoutHarness).click();
await waitUntilDone(timeoutHarness);
assert.match(reportText(timeoutHarness), /manifestTimeout/);

const noCryptoHarness = makeHarness(validFetch, { noCrypto: true });
await runButton(noCryptoHarness).click();
await waitUntilDone(noCryptoHarness);
assert.match(reportText(noCryptoHarness), /JS_FALLBACK/);
assert.match(reportText(noCryptoHarness), /Overall: PASS/);

const vectorCases = [
  ['empty ArrayBuffer', Buffer.alloc(0)],
  ['abc', Buffer.from('abc', 'utf8')],
  ['longer than one block', Buffer.alloc(130, 0x61)],
  ['binary 00 80 ff', Buffer.from([0x00, 0x80, 0xff])],
  ['multibyte UTF-8', Buffer.from('Braham — 雪 — café 🐉', 'utf8')],
  ...[55, 56, 63, 64, 65, 128, 4097].map(length => [`length ${length}`, Buffer.from(Array.from({ length }, (_, index) => (index * 29 + 0xff) & 0xff))]),
];
const emptyArrayBuffer = new successHarness.sandbox.__testApi.Uint8Array(0).buffer;
assert.equal(
  successHarness.sandbox.__testApi.sha256Fallback(new successHarness.sandbox.__testApi.Uint8Array(emptyArrayBuffer)),
  createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
  'empty ArrayBuffer is hashed as the standard empty-message vector',
);
for (const [label, bytes] of vectorCases) {
  const vmBytes = new successHarness.sandbox.__testApi.Uint8Array(bytes);
  const actual = successHarness.sandbox.__testApi.sha256Fallback(vmBytes);
  const expected = createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, expected, `SHA-256 fallback matches independent Node crypto vector: ${label}`);
}
const changedVector = Buffer.from('abc');
changedVector[0] ^= 1;
assert.notEqual(
  successHarness.sandbox.__testApi.sha256Fallback(new successHarness.sandbox.__testApi.Uint8Array(changedVector)),
  createHash('sha256').update('abc').digest('hex'),
  'changing one input byte changes the digest',
);
assert.throws(() => successHarness.sandbox.__testApi.sha256Fallback(new successHarness.sandbox.__testApi.Uint8Array(65537)), /POC limit/);
const fallbackDigest = await noCryptoHarness.sandbox.__testApi.sha256Hex(new noCryptoHarness.sandbox.__testApi.Uint8Array(Buffer.from('abc')));
assert.equal(fallbackDigest.implementation, 'JS_FALLBACK');
assert.equal(fallbackDigest.hex, createHash('sha256').update('abc').digest('hex'));

const panelBeforeRerun = successHarness.panel;
vm.runInNewContext(script, successHarness.sandbox, { timeout: 1000 });
assert.equal(successHarness.body.children.length, 1, 'rerunning actual Custom Code does not duplicate panel');
assert.notEqual(successHarness.document.getElementById('nf-remote-knowledge-poc-panel'), panelBeforeRerun, 'rerun replaces prior panel');

let noAbortCalls = 0;
const noAbortHarness = makeHarness(async () => { noAbortCalls++; return validFetch('manifest.json'); }, { noAbort: true });
await runButton(noAbortHarness).click();
await waitUntilDone(noAbortHarness);
assert.equal(noAbortCalls, 0, 'without abort support, diagnostic skips requests rather than leave an uncancellable fetch');
assert.match(reportText(noAbortHarness), /AbortController indisponível/);

const parseHarness = makeHarness(async url => response(url.endsWith('manifest.json') ? '{bad json' : knowledgeBytes));
await runButton(parseHarness).click();
await waitUntilDone(parseHarness);
assert.match(reportText(parseHarness), /SyntaxError/);
assert(!reportText(parseHarness).includes('spoiler filter'), 'malformed manifest blocks queries');

const malformedKnowledge = Buffer.from('{invalid knowledge JSON');
const malformedKnowledgeManifest = Buffer.from(JSON.stringify({
  schema: 'nf-knowledge-manifest-poc-v1', bookId: 'nf-overgeared-poc', revision: 'fixture-r1',
  knowledgePath: 'braham.json', sha256: createHash('sha256').update(malformedKnowledge).digest('hex'), byteLength: malformedKnowledge.length,
}));
const invalidKnowledgeHarness = makeHarness(async url => response(url.endsWith('manifest.json') ? malformedKnowledgeManifest : malformedKnowledge));
await runButton(invalidKnowledgeHarness).click();
await waitUntilDone(invalidKnowledgeHarness);
assert.match(reportText(invalidKnowledgeHarness), /SyntaxError/);
assert(!reportText(invalidKnowledgeHarness).includes('spoiler filter'), 'malformed knowledge blocks queries');

const corrupt = Buffer.from(knowledgeBytes);
corrupt[10] ^= 1;
const hashHarness = makeHarness(async url => response(url.endsWith('manifest.json') ? manifestBytes : corrupt));
await runButton(hashHarness).click();
await waitUntilDone(hashHarness);
assert.match(reportText(hashHarness), /SHA-256 DigestFAIL/);
assert(!reportText(hashHarness).includes('schema \/ identityPASS'), 'unverified data does not proceed to schema/query display');

let releaseFirst;
let copiedReport = '';
let delayedCalls = 0;
const copyHarness = makeHarness(async url => {
  delayedCalls++;
  if (delayedCalls === 1) return new Promise(resolve => { releaseFirst = async () => resolve(await validFetch(url)); });
  return validFetch(url);
}, { clipboard: async text => { copiedReport = text; } });
await runButton(copyHarness).click();
while (!releaseFirst) await new Promise(resolvePromise => setTimeout(resolvePromise, 1));
const copyButton = copyHarness.panel.children.at(-1).children[1];
const copyPromise = copyButton.click();
assert.equal(copyButton.disabled, true, 'copy control shows it is waiting while diagnostic is active');
releaseFirst();
await waitUntilDone(copyHarness);
await copyPromise;
assert.equal(copyButton.disabled, false, 'copy resumes only after the complete report is ready');
assert.match(copiedReport, /Execution: COMPLETE/);
assert.match(copiedReport, /Overall: PASS/);
assert.match(copiedReport, /ANTISPOILER/);
assert(!copiedReport.includes('IN_PROGRESS'), 'copied report is final, not an incomplete snapshot');

const fixture = JSON.parse(knowledgeBytes.toString('utf8'));
for (const [caseName, changes, expected] of [
  ['manifest schema', { schema: 'wrong-manifest' }, /Schema do manifesto incompatível/],
  ['manifest bookId', { bookId: 'wrong-book' }, /bookId do manifesto divergente/],
  ['manifest revision missing', { revision: undefined }, /revision inválida/],
  ['manifest digest missing', { sha256: undefined }, /SHA-256 do manifesto inválido/],
  ['manifest byteLength missing', { byteLength: undefined }, /byteLength inválido/],
  ['manifest byteLength', { byteLength: 1 }, /byteLength não corresponde/],
  ['manifest path', { knowledgePath: '../other.json' }, /knowledgePath deve ser exatamente/],
]) {
  const pair = pairFor(fixture, changes);
  const harness = makeHarness(async url => response(url.endsWith('manifest.json') ? pair.manifest : pair.bytes));
  await runButton(harness).click();
  await waitUntilDone(harness);
  assert.match(reportText(harness), expected, `${caseName} is rejected by the executed validator`);
  assert.match(reportText(harness), /Run 1 manifest validation rejectionFAIL|Run 1 knowledge validation rejectionFAIL/);
  assert(!reportText(harness).includes('spoiler filter'), `${caseName} blocks all contextual queries`);
}

for (const [caseName, altered, expected] of [
  ['schema', { ...fixture, schema: 'wrong-schema' }, /Schema de conhecimento incompatível/],
  ['bookId', { ...fixture, bookId: 'wrong-book' }, /bookId divergente/],
  ['entityId', { ...fixture, entityId: 'character:other' }, /entityId divergente/],
  ['out-of-order', { ...fixture, facts: [fixture.facts[1], fixture.facts[0], fixture.facts[2]] }, /fora de ordem/],
  ['bad-provenance', { ...fixture, facts: [{ ...fixture.facts[0], revealedAt: { chapter: -1, block: 0 } }, ...fixture.facts.slice(1)] }, /Proveniência.*inválida/],
]) {
  const pair = pairFor(altered);
  const harness = makeHarness(async url => response(url.endsWith('manifest.json') ? pair.manifest : pair.bytes));
  await runButton(harness).click();
  await waitUntilDone(harness);
  assert.match(reportText(harness), expected, `${caseName} is rejected by the executed validator`);
  assert.match(reportText(harness), /Run 1 knowledge validation rejectionFAIL/);
  assert(!reportText(harness).includes('spoiler filter'), `${caseName} blocks all contextual queries`);
}

const knownFacts = fixture.facts;
for (const invalidPosition of [null, { chapter: '900', block: 5 }, { chapter: 900, block: -1 }, { chapter: NaN, block: 1 }]) {
  assert.throws(() => successHarness.sandbox.__testApi.filterFacts(knownFacts, invalidPosition), /Posição de consulta/);
}
for (const broken of [
  { ...fixture, facts: [{ ...fixture.facts[0], revealedAt: undefined }, ...fixture.facts.slice(1)] },
  { ...fixture, facts: [{ ...fixture.facts[0], revealedAt: { chapter: 1, block: -1 } }, ...fixture.facts.slice(1)] },
  { ...fixture, facts: [{ ...fixture.facts[0], revealedAt: { chapter: -1, block: 0 } }, ...fixture.facts.slice(1)] },
  { ...fixture, facts: [fixture.facts[0], { ...fixture.facts[1], id: fixture.facts[0].id }, fixture.facts[2]] },
  { ...fixture, facts: [{ ...fixture.facts[0], text: undefined }, ...fixture.facts.slice(1)] },
]) assert.throws(() => successHarness.sandbox.__testApi.validateKnowledge(broken));

const largeHarness = makeHarness(async url => url.endsWith('manifest.json')
  ? response(manifestBytes)
  : response(new Uint8Array(65537)));
await runButton(largeHarness).click();
await waitUntilDone(largeHarness);
assert.match(reportText(largeHarness), /excedeu o limite real de bytes/);

process.stdout.write('PASS: headless execution of the actual Custom Code covers HTTPS success/repetition, headers, spoiler boundaries, HTTP/network/timeout/parse/hash failures, absent Web Crypto and no fact-text disclosure. No network was used.\n');
