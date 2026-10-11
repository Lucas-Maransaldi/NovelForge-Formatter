import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const epubPath = resolve(root, 'fixtures/novelforge-c55-remote-popup.epub');
const generator = await readFile(resolve(root, 'scripts/build-epub-fixture.mjs'), 'utf8');
const popup = await readFile(resolve(root, 'custom-code/remote-popup.js'), 'utf8');
const epub = await readFile(epubPath);
assert.doesNotMatch(generator, /\bfetch\s*\(|node:https?|https?\.request|axios|undici/i, 'generator must not use a network client');
assert.doesNotMatch(generator, /\b(child_process|execSync|spawn)\b/);
assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', resolve(root, 'scripts/build-epub-fixture.mjs')], { stdio:'pipe' }));
assert.doesNotThrow(() => new vm.Script(popup));
assert.match(popup, /if\(!target\|\|target\.getAttribute\('data-nf-entity'\)!==ENTITY_ID\)return;/);
assert.ok(popup.indexOf('event.preventDefault()') < popup.indexOf('load(controller&&controller.signal)'), 'supported tap is prevented before async lookup');

// Parse central directory, inflate all members and verify CRC-32 and local headers.
const eocdSignature = Buffer.from([0x50,0x4b,0x05,0x06]);
const eocd = epub.lastIndexOf(eocdSignature);
assert.ok(eocd >= 0, 'EOCD present');
const count = epub.readUInt16LE(eocd + 10);
const centralSize = epub.readUInt32LE(eocd + 12);
const centralOffset = epub.readUInt32LE(eocd + 16);
assert.equal(centralOffset + centralSize, eocd, 'central directory ends at EOCD');
const files = new Map();
let cursor = centralOffset;
for (let i = 0; i < count; i++) {
  assert.equal(epub.readUInt32LE(cursor), 0x02014b50, 'central entry signature');
  const method = epub.readUInt16LE(cursor + 10), crc = epub.readUInt32LE(cursor + 16);
  const compressedLength = epub.readUInt32LE(cursor + 20), rawLength = epub.readUInt32LE(cursor + 24);
  const nameLength = epub.readUInt16LE(cursor + 28), extraLength = epub.readUInt16LE(cursor + 30), commentLength = epub.readUInt16LE(cursor + 32);
  const localOffset = epub.readUInt32LE(cursor + 42);
  const name = epub.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
  assert.equal(epub.readUInt32LE(localOffset), 0x04034b50, 'local entry signature');
  const localNameLength = epub.readUInt16LE(localOffset + 26), localExtraLength = epub.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
  const compressed = epub.subarray(dataOffset, dataOffset + compressedLength);
  const data = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : assert.fail(`unsupported ZIP method ${method}`);
  assert.equal(data.length, rawLength, `${name} uncompressed length`);
  assert.equal(crc32(data), crc, `${name} CRC-32`);
  files.set(name, data.toString('utf8'));
  cursor += 46 + nameLength + extraLength + commentLength;
}
assert.equal(files.size, count);
assert.equal(epub.readUInt32LE(0), 0x04034b50);
assert.equal(epub.readUInt16LE(8), 0, 'EPUB mimetype must be stored');
assert.equal(epub.subarray(30, 30 + epub.readUInt16LE(26)).toString(), 'mimetype');
assert.equal(files.get('mimetype'), 'application/epub+zip');
assert.match(files.get('META-INF/container.xml'), /full-path="OEBPS\/content\.opf"/);
const opf = files.get('OEBPS/content.opf');
assert.match(opf, /urn:novelforge:nf-overgeared-poc/);
assert.match(opf, /<manifest>[\s\S]*chapter-889\.xhtml[\s\S]*chapter-900\.xhtml[\s\S]*<\/manifest>/);
assert.match(opf, /<spine>[\s\S]*idref="c889"[\s\S]*idref="c900"[\s\S]*<\/spine>/);

const xhtml = [...files].filter(([name]) => /chapter-\d+\.xhtml$/.test(name));
assert.equal(xhtml.length, 2);
for (const [, text] of xhtml) {
  assert.match(text, /<article class="nf-chapter" data-nf-novel="nf-overgeared-poc" data-nf-chapter="(?:889|900)" data-nf-schema="1">/);
  assert.doesNotMatch(text, /Synthetic fact revealed|Synthetic future fact|fact-00[123]|revealedAt|"facts"/i);
}
const c889 = files.get('OEBPS/chapter-889.xhtml');
const c900 = files.get('OEBPS/chapter-900.xhtml');
assert.match(c889, /<p data-nf-block="b0042"[^>]*>[\s\S]*<a data-nf-entity="character:braham" href="chapter-900\.xhtml#ordinary-target">Braham<\/a>/);
assert.match(c900, /<p data-nf-block="b0004"/);
assert.match(c900, /<p data-nf-block="b0005"[^>]*>[\s\S]*<a data-nf-entity="character:braham"/);
assert.match(c900, /<a href="chapter-889\.xhtml#ordinary-target">Ordinary navigation link<\/a>/);
assert.match(c889, /id="ordinary-target"/);
assert.match(c900, /id="ordinary-target"/);
assert.match(popup, /if\(!target\|\|target\.getAttribute\('data-nf-entity'\)!==ENTITY_ID\)return;/, 'unmarked and unsupported links are not intercepted');
assert.equal((c889.match(/data-nf-entity="character:braham"/g) || []).length, 1);
assert.equal((c900.match(/data-nf-entity="character:braham"/g) || []).length, 1);

// Evaluate the actual C5.5 positionFor parser with minimal DOM-shaped nodes.
const start = popup.indexOf('  const positionFor = anchor => {');
const end = popup.indexOf('\n  const validateManifest', start);
assert.ok(start >= 0 && end > start, 'position parser found in actual Custom Code');
const parserSource = popup.slice(start, end).replace('  const positionFor = anchor => {', 'const positionFor = anchor => {') + '\nthis.positionFor=positionFor;';
const context = { EXPECTED_BOOK:'nf-overgeared-poc', setDiag(){}, Error, Number, String };
// parser depends on parsePos; evaluate both declarations from the production POC source.
const parseStart = popup.indexOf('  const parsePos =');
const parseEnd = popup.indexOf('\n  const positionFor', parseStart);
vm.runInNewContext(popup.slice(parseStart, parseEnd).replace('  const parsePos =', 'const parsePos =') + '\n' + parserSource, context);
function parsedPosition(bookId, chapterValue, blockValue) {
  const block = { getAttribute: name => name === 'data-nf-block' ? blockValue : null };
  const chapter = { contains: candidate => candidate === block, getAttribute: name => ({'data-nf-novel':bookId,'data-nf-chapter':chapterValue}[name] ?? null) };
  const anchor = { closest: selector => selector === 'article.nf-chapter[data-nf-novel][data-nf-chapter]' ? chapter : selector === 'p[data-nf-block]' ? block : null };
  return context.positionFor(anchor);
}
assert.deepEqual(JSON.parse(JSON.stringify(parsedPosition('nf-overgeared-poc','889','b0042'))), {chapter:889,block:42});
assert.deepEqual(JSON.parse(JSON.stringify(parsedPosition('nf-overgeared-poc','900','b0004'))), {chapter:900,block:4});
assert.deepEqual(JSON.parse(JSON.stringify(parsedPosition('nf-overgeared-poc','900','b0005'))), {chapter:900,block:5});
assert.throws(() => parsedPosition('overgeared','889','b0042'), /bookId/);
assert.throws(() => parsedPosition('nf-overgeared-poc','poc-source-unknown','b0001'), /Capítulo\/bloco/);
assert.throws(() => parsedPosition('nf-overgeared-poc','889','1'), /Capítulo\/bloco/);

const digest = createHash('sha256').update(epub).digest('hex');
console.log(`C5.5.1 fixture valid: ${epubPath} (${epub.length} bytes, sha256 ${digest.slice(0,16)}…).`);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
