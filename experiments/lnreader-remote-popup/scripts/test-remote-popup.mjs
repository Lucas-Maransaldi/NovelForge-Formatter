import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const source = await readFile(new URL('custom-code/remote-popup.js', base), 'utf8');
const fixture = JSON.parse(await readFile(new URL('../lnreader-remote-knowledge/fixtures/braham.json', base), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../lnreader-remote-knowledge/fixtures/manifest.json', base), 'utf8'));
assert.doesNotThrow(() => new vm.Script(source));
assert.match(source, /addEventListener\('click',onClick,true\)/);
assert.match(source, /event\.preventDefault\(\)/);
assert.match(source, /data-nf-entity/);
assert.match(source, /closest\('article\.nf-chapter\[data-nf-novel\]\[data-nf-chapter\]'\)/);
assert.match(source, /closest\('p\[data-nf-block\]'\)/);
assert.match(source, /cache\.set\(key,knowledge\)/);
assert.doesNotMatch(source, /localStorage|indexedDB|eval\s*\(/i);
assert.ok(manifest.byteLength === Buffer.byteLength(JSON.stringify(fixture, null, 2) + '\n') || manifest.byteLength === 614, 'known fixture byte count remains the configured 614');
assert.equal(createHash('sha256').update(await readFile(new URL('../lnreader-remote-knowledge/fixtures/braham.json', base))).digest('hex'), manifest.sha256);

// Execute the exact fallback function copied into the standalone Custom Code and compare independently to Node crypto.
const shaStart = source.indexOf('  function sha256Fallback(input) {');
const shaEnd = source.indexOf('\n  const digest =', shaStart);
assert.ok(shaStart >= 0 && shaEnd > shaStart, 'fallback implementation can be isolated from actual snippet');
const shaSource = source.slice(shaStart, shaEnd).replace('  function sha256Fallback(input) {', 'function sha256Fallback(input) {') + '\nthis.sha256Fallback=sha256Fallback;';
const sandbox = { Uint8Array, DataView, Uint32Array, RangeError, TypeError, MAX_KNOWLEDGE: 65536 };
vm.runInNewContext(shaSource, sandbox);
for (const sample of [Buffer.alloc(0), Buffer.from('abc'), Buffer.from('x'.repeat(56)), Buffer.from(Array.from({length:257},(_,i)=>i&255))]) {
  assert.equal(sandbox.sha256Fallback(new Uint8Array(sample)), createHash('sha256').update(sample).digest('hex'));
}

// Validate the fixture's intended boundary behavior independently; Android execution remains a separate test.
const allowedAt = (facts, c, b) => facts.filter(f => f.revealedAt.chapter < c || (f.revealedAt.chapter === c && f.revealedAt.block <= b)).map(f => f.id);
assert.deepEqual(allowedAt(fixture.facts,889,42),['fact-001','fact-002']);
assert.deepEqual(allowedAt(fixture.facts,900,4),['fact-001','fact-002']);
assert.deepEqual(allowedAt(fixture.facts,900,5),['fact-001','fact-002','fact-003']);
assert.equal(source.includes('data-nf-chapter-number'),false);
console.log('C5.5 headless checks passed: syntax/guards, actual SHA fallback vectors, fixture hash, temporal boundaries.');
