import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = (await readFile(resolve(ROOT, 'custom-code', 'remote-diagnostic.js'), 'utf8')).replace('const FETCH_TIMEOUT_MS = 12000;', 'const FETCH_TIMEOUT_MS = 25;');
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
    const key = selector === '[data-remote-results]' ? 'data-remote-results' : selector === '[data-remote-state]' ? 'data-remote-state' : null;
    if (!key) return null;
    return this.children.find(child => Object.hasOwn(child.attributes, key)) || this.children.map(child => child.querySelector(selector)).find(Boolean) || null;
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
    navigator: {},
    URL,
    fetch: fetchImpl,
    AbortController: options.noAbort ? undefined : AbortController,
    Response,
    crypto: options.noCrypto ? undefined : webcrypto,
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
  return { body, panel: doc.getElementById('nf-remote-knowledge-poc-panel') };
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

let calls = [];
const successHarness = makeHarness(async url => { calls.push(url); return validFetch(url); });
assert(successHarness.panel, 'panel is created');
assert.match(successHarness.panel.textContent, /NOVELFORGE REMOTE KNOWLEDGE DIAGNOSTIC/);
await runButton(successHarness).click();
await waitUntilDone(successHarness);
assert.equal(calls.length, 4, 'two runs each independently fetch manifest and knowledge JSON');
assert.match(reportText(successHarness), /Run 1 SHA-256PASS/);
assert.match(reportText(successHarness), /Run 2 SHA-256PASS/);
assert.match(reportText(successHarness), /chapter 900 block 4PASS/);
assert.match(reportText(successHarness), /chapter 900 block 5PASS/);
assert(!reportText(successHarness).includes('Synthetic future fact'), 'fact text is never rendered/copied in the panel');

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
assert.match(reportText(noCryptoHarness), /SHA-256NOT_TESTED/);
assert.match(reportText(noCryptoHarness), /Web Crypto SHA-256 indisponível/);

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

const corrupt = Buffer.from(knowledgeBytes);
corrupt[10] ^= 1;
const hashHarness = makeHarness(async url => response(url.endsWith('manifest.json') ? manifestBytes : corrupt));
await runButton(hashHarness).click();
await waitUntilDone(hashHarness);
assert.match(reportText(hashHarness), /SHA-256FAIL/);
assert(!reportText(hashHarness).includes('schema \/ identityPASS'), 'unverified data does not proceed to schema/query display');

let releaseFirst;
let delayedCalls = 0;
const copyHarness = makeHarness(async url => {
  delayedCalls++;
  if (delayedCalls === 1) return new Promise(resolve => { releaseFirst = async () => resolve(await validFetch(url)); });
  return validFetch(url);
});
await runButton(copyHarness).click();
while (!releaseFirst) await new Promise(resolvePromise => setTimeout(resolvePromise, 1));
const copyButton = copyHarness.panel.children.at(-1).children[1];
const copyPromise = copyButton.click();
assert.equal(copyButton.disabled, true, 'copy control shows it is waiting while diagnostic is active');
releaseFirst();
await waitUntilDone(copyHarness);
await copyPromise;
assert.equal(copyButton.disabled, false, 'copy resumes only after the complete report is ready');

const fixture = JSON.parse(knowledgeBytes.toString('utf8'));
for (const [caseName, changes, expected] of [
  ['manifest schema', { schema: 'wrong-manifest' }, /Schema do manifesto incompatível/],
  ['manifest bookId', { bookId: 'wrong-book' }, /bookId do manifesto divergente/],
  ['manifest byteLength', { byteLength: 1 }, /byteLength não corresponde/],
  ['manifest path', { knowledgePath: '../other.json' }, /knowledgePath deve ser exatamente/],
]) {
  const pair = pairFor(fixture, changes);
  const harness = makeHarness(async url => response(url.endsWith('manifest.json') ? pair.manifest : pair.bytes));
  await runButton(harness).click();
  await waitUntilDone(harness);
  assert.match(reportText(harness), expected, `${caseName} is rejected by the executed validator`);
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
}

const largeHarness = makeHarness(async url => url.endsWith('manifest.json')
  ? response(manifestBytes)
  : response(new Uint8Array(65537)));
await runButton(largeHarness).click();
await waitUntilDone(largeHarness);
assert.match(reportText(largeHarness), /excedeu o limite real de bytes/);

process.stdout.write('PASS: headless execution of the actual Custom Code covers HTTPS success/repetition, headers, spoiler boundaries, HTTP/network/timeout/parse/hash failures, absent Web Crypto and no fact-text disclosure. No network was used.\n');
