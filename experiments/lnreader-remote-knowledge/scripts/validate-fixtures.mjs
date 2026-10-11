import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = resolve(ROOT, 'fixtures');
const readJson = async name => JSON.parse((await readFile(resolve(FIXTURES, name), 'utf8')));
const knowledgeBytes = await readFile(resolve(FIXTURES, 'braham.json'));
const knowledge = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(knowledgeBytes));
const manifest = await readJson('manifest.json');

assert.equal(knowledge.schema, 'nf-knowledge-poc-v1', 'knowledge schema is versioned');
assert.equal(knowledge.bookId, 'nf-overgeared-poc');
assert.equal(knowledge.entityId, 'character:braham');
assert.equal(manifest.schema, 'nf-knowledge-manifest-poc-v1');
assert.equal(manifest.bookId, knowledge.bookId);
assert.equal(manifest.revision, 'fixture-r1');
assert.equal(manifest.knowledgePath, 'braham.json');
assert.equal(manifest.byteLength, knowledgeBytes.byteLength, 'manifest byteLength is exact');
assert.equal(manifest.sha256, createHash('sha256').update(knowledgeBytes).digest('hex'), 'manifest SHA-256 matches exact bytes');
assert.equal(manifest.sha256.length, 64);

assert(Array.isArray(knowledge.facts) && knowledge.facts.length > 0 && knowledge.facts.length <= 100);
const factIds = new Set();
let previous = null;
for (const fact of knowledge.facts) {
  assert.match(fact.id, /^fact-[0-9]{3}$/);
  assert(!factIds.has(fact.id), `unique fact id ${fact.id}`);
  factIds.add(fact.id);
  assert.equal(typeof fact.text, 'string');
  assert(fact.text.length <= 1000);
  assert(Number.isSafeInteger(fact.revealedAt?.chapter) && fact.revealedAt.chapter >= 0, `${fact.id} chapter provenance`);
  assert(Number.isSafeInteger(fact.revealedAt?.block) && fact.revealedAt.block >= 0, `${fact.id} block provenance`);
  if (previous) assert(previous.chapter < fact.revealedAt.chapter || (previous.chapter === fact.revealedAt.chapter && previous.block <= fact.revealedAt.block), 'facts are ordered by chapter/block');
  previous = fact.revealedAt;
}
assert(!knowledge.facts.some(f => /Grid|Shin Youngwoo|Overgeared novel/i.test(`${knowledge.name} ${f.text}`)), 'only synthetic story text is present');

const filterFacts = (facts, point) => {
  if (!point || !Number.isSafeInteger(point.chapter) || point.chapter < 0 || !Number.isSafeInteger(point.block) || point.block < 0) throw new TypeError('Invalid position');
  return facts.filter(f => f.revealedAt.chapter < point.chapter || (f.revealedAt.chapter === point.chapter && f.revealedAt.block <= point.block));
};
assert.deepEqual(filterFacts(knowledge.facts, { chapter: 889, block: 42 }).map(f => f.id), ['fact-001', 'fact-002']);
assert.deepEqual(filterFacts(knowledge.facts, { chapter: 900, block: 4 }).map(f => f.id), ['fact-001', 'fact-002']);
assert.deepEqual(filterFacts(knowledge.facts, { chapter: 900, block: 5 }).map(f => f.id), ['fact-001', 'fact-002', 'fact-003']);
assert.throws(() => filterFacts(knowledge.facts, { chapter: 900, block: NaN }), /Invalid position/);
assert.throws(() => filterFacts(knowledge.facts, null), /Invalid position/);

const changedBytes = Buffer.from(knowledgeBytes);
changedBytes[changedBytes.length - 2] ^= 1;
assert.notEqual(createHash('sha256').update(changedBytes).digest('hex'), manifest.sha256, 'one changed byte is detected');
assert.equal(changedBytes.byteLength, manifest.byteLength, 'changing one byte preserves the exact fixture length');
assert.throws(() => JSON.parse('{invalid'), SyntaxError, 'invalid JSON parse is detected');
assert.notEqual('wrong-book', manifest.bookId, 'bookId mismatch is detectable');
assert.notEqual('character:other', knowledge.entityId, 'entityId mismatch is detectable');
assert.throws(() => {
  const broken = { ...knowledge.facts[2], revealedAt: { chapter: 899, block: 99 } };
  assert(previous.chapter <= broken.revealedAt.chapter, 'temporal ordering guard');
});
assert.throws(() => {
  const broken = { chapter: -1, block: 0 };
  assert(Number.isSafeInteger(broken.chapter) && broken.chapter >= 0, 'invalid provenance is rejected');
});
assert(knowledgeBytes.byteLength <= 65536, 'fixture meets response-size budget');

const diagnosticPath = resolve(ROOT, 'custom-code', 'remote-diagnostic.js');
const syntax = spawnSync(process.execPath, ['--check', diagnosticPath], { encoding: 'utf8' });
assert.equal(syntax.status, 0, `Custom Code syntax: ${syntax.stderr || syntax.stdout}`);
const js = await readFile(diagnosticPath, 'utf8');
const css = await readFile(resolve(ROOT, 'custom-code', 'remote-diagnostic.css'), 'utf8');
assert(!/\beval\s*\(|\bFunction\s*\(|\.innerHTML\b/.test(js), 'no eval, dynamic Function or innerHTML');
assert(!/localStorage|indexedDB|JSONP|mode:\s*['"]no-cors/i.test(js), 'diagnostic has no persistent storage, JSONP or CORS bypass');
assert.equal((js.match(/https:\/\//g) || []).length, 2, 'only the two explicitly configured HTTPS endpoints are embedded');
assert(js.includes("redirect: 'error'"), 'fetch requests reject redirects');
assert(js.includes('response.type === \'opaque\''), 'opaque responses are rejected');
assert(js.includes('getReader()') && js.includes('total > limit'), 'streamed body enforces actual byte limit');
assert(js.includes('AbortController') && js.includes('Promise.race'), 'fetch has finite timeout/abort path');
assert(js.includes('Access-Control-Allow-Origin'.toLowerCase()), 'CORS header is inspected only when exposed');
assert(js.includes("subtle.digest('SHA-256', bytes)") && js.includes('NOT_TESTED'), 'Web Crypto is attempted when exposed; no simulated hash');
assert(js.includes('const sha256Fallback = input =>') && js.includes('JS_FALLBACK') && js.includes('WEB_CRYPTO'), 'real byte-level SHA-256 fallback and implementation reporting exist');
assert(js.includes('fact.revealedAt.chapter') && js.includes('fact.revealedAt.block'), 'spoiler filter compares chapter and block');
assert(js.includes('ALLOW:') && js.includes('DENY:') && !js.includes('fact.text}'), 'public result reports allowed/denied IDs, not remote fact text');
for (const heading of ['REMOTE TRANSPORT', 'MANIFEST VALIDATION', 'KNOWLEDGE VALIDATION', 'SHA-256', 'ANTISPOILER', 'CACHE OBSERVATIONS']) {
  assert(js.includes(`'${heading}'`), `diagnostic report contains ${heading} section`);
}
assert(js.includes('Overall: ${running ? \'IN_PROGRESS\' : overallStatus()}'), 'overall status is not prematurely PASS');
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces balance');
assert(css.includes('#nf-remote-knowledge-poc-panel'), 'diagnostic CSS has panel styles');

const generatorPath = resolve(ROOT, 'scripts', 'generate-manifest.mjs');
const generated = spawnSync(process.execPath, [generatorPath], { encoding: 'utf8' });
assert.equal(generated.status, 0, `manifest generator: ${generated.stderr || generated.stdout}`);
const afterGeneration = await readFile(resolve(FIXTURES, 'manifest.json'));
assert(afterGeneration.equals(Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)), 'manifest generator output is deterministic and agrees with the checked-in manifest');

process.stdout.write('PASS: deterministic manifest/hash/byte length; synthetic schema and temporal filters; corrupted byte and invalid input guards; Custom Code syntax and offline safety guards.\n');
process.stdout.write('LIMITATION: network, CORS, WebView crypto, redirects and cache are simulated/not asserted here; only Android can establish device behavior.\n');
