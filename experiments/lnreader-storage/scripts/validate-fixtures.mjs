import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = resolve(ROOT, 'fixtures');
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function readZip(buffer) {
  let eocd = -1;
  const earliest = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= earliest; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  assert.notEqual(eocd, -1, 'ZIP End of Central Directory exists');
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const diskCount = buffer.readUInt16LE(eocd + 8);
  const totalCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  assert.equal(disk, 0, 'single-disk ZIP');
  assert.equal(centralDisk, 0, 'central directory is on disk 0');
  assert.equal(diskCount, totalCount, 'entry counts match');
  assert.equal(centralOffset + centralSize, eocd, 'central directory bounds are valid');

  const entries = new Map();
  const methods = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < totalCount; index++) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50, `central entry ${index} signature`);
    const method = buffer.readUInt16LE(cursor + 10);
    const expectedCrc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    assert(!entries.has(name), `no duplicate ZIP path: ${name}`);
    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50, `local header exists: ${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    assert.equal(compressed.length, compressedSize, `entry data bounds: ${name}`);
    const data = method === 0
      ? Buffer.from(compressed)
      : method === 8
        ? inflateRawSync(compressed)
        : assert.fail(`unsupported compression method ${method} for ${name}`);
    assert.equal(data.length, uncompressedSize, `uncompressed size: ${name}`);
    assert.equal(crc32(data), expectedCrc, `CRC-32: ${name}`);
    entries.set(name, data);
    methods.set(name, method);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(cursor, centralOffset + centralSize, 'central directory fully consumed');
  entries.methods = methods;
  return entries;
}

function parseManifest(opf) {
  const items = new Map();
  for (const match of opf.matchAll(/<item\b([^>]*)\/?\s*>/g)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
    );
    assert(attributes.id && attributes.href && attributes['media-type'], 'manifest item has id, href, media-type');
    assert(!items.has(attributes.id), `manifest id is unique: ${attributes.id}`);
    items.set(attributes.id, attributes);
  }
  return items;
}

function validateBook(entries, expected) {
  const names = [...entries.keys()];
  assert.equal(names[0], 'mimetype', 'mimetype is the first ZIP entry');
  assert.equal(entries.methods.get('mimetype'), 0, 'mimetype is stored without compression');
  assert.equal(entries.get('mimetype').toString(), 'application/epub+zip', 'mimetype exact value');
  assert.equal(entries.get('META-INF/container.xml')?.length > 0, true, 'container.xml exists');

  const container = entries.get('META-INF/container.xml').toString();
  const opfPath = container.match(/<rootfile\b[^>]*full-path="([^"]+)"/)?.[1];
  assert.equal(opfPath, 'OEBPS/package.opf', 'container points to the package document');
  const opf = entries.get(opfPath)?.toString();
  assert(opf?.includes('<package ') && opf.includes('<manifest>') && opf.includes('<spine>'), 'OPF has package, manifest and spine');
  assert(opf.includes(`urn:novelforge:${expected.bookId}`), 'publication identifier matches book');
  const manifest = parseManifest(opf);
  for (const item of manifest.values()) {
    const archivePath = `OEBPS/${item.href}`;
    assert(entries.has(archivePath), `manifest resource exists: ${archivePath}`);
  }

  const spineIds = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map(([, id]) => id);
  assert.deepEqual(spineIds, ['chapter-a', 'chapter-b'], 'spine has the two chapters in order');
  for (const id of spineIds) assert.equal(manifest.get(id)?.['media-type'], 'application/xhtml+xml', `${id} is XHTML`);
  assert.equal(manifest.get('knowledge')?.['media-type'], 'application/json', 'knowledge JSON is manifested as application/json');
  assert.equal(manifest.get('test-css')?.['media-type'], 'text/css', 'CSS media type is correct');
  assert.equal(manifest.get('test-image')?.['media-type'], 'image/png', 'PNG media type is correct');

  const chapterA = entries.get('OEBPS/text/chapter-a.xhtml').toString();
  const chapterB = entries.get('OEBPS/text/chapter-b.xhtml').toString();
  for (const xml of [chapterA, chapterB]) {
    assert(xml.startsWith('<?xml'), 'chapter has XML declaration');
    assert(xml.includes('xmlns="http://www.w3.org/1999/xhtml"'), 'chapter is XHTML namespace');
    assert(xml.includes('data-nf-entity="character:test"'), 'stable entity marker exists');
    assert(xml.includes('data-nf-block='), 'block markers exist');
  }
  assert(chapterA.includes(`data-nf-novel="${expected.bookId}"`), 'chapter A book identity matches');
  assert(chapterB.includes(`data-nf-novel="${expected.bookId}"`), 'chapter B book identity matches');
  assert(chapterA.includes(`data-nf-chapter="${expected.bookId}-chapter-a"`), 'chapter A ID is stable and unique');
  assert(chapterB.includes(`data-nf-chapter="${expected.bookId}-chapter-b"`), 'chapter B ID is stable and unique');
  assert(chapterA.includes(`${expected.letter}_CHAPTER_A`) && chapterB.includes(`${expected.letter}_CHAPTER_B`), 'chapter markers are distinct');
  assert(entries.has('OEBPS/novelforge/knowledge.json'), 'auxiliary JSON exists');
  const json = JSON.parse(entries.get('OEBPS/novelforge/knowledge.json').toString());
  assert.equal(json.schema, 'nf-storage-poc-v1', 'POC schema is separate/versioned');
  assert.equal(json.bookId, expected.bookId, 'JSON bookId matches this EPUB');
  assert.equal(json.marker, expected.knowledgeMarker, 'JSON marker matches this EPUB');
  assert.equal(json.entities['character:test'].facts[0].block, `${expected.bookId}-chapter-a-b0001`, 'fact uses the fixture block identity');
  assert(entries.get('OEBPS/images/test.png').subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'test image is a generated PNG');
  assert(entries.get('OEBPS/styles/test.css').toString().includes('.poc-epub-stylesheet-marker'), 'auxiliary CSS exists');

  const allText = [...entries.values()].filter(value => !value.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).map(value => value.toString('utf8')).join('\n');
  assert(!/Overgeared|Grid|Shin Youngwoo/i.test(allText), 'fixture contains no named copyrighted story content');
  return { entries, json };
}

const bookA = validateBook(readZip(await readFile(resolve(FIXTURES, 'storage-poc-book-a.epub'))), {
  letter: 'A', bookId: 'nf-storage-book-a', knowledgeMarker: 'BOOK_A_KNOWLEDGE',
});
const bookB = validateBook(readZip(await readFile(resolve(FIXTURES, 'storage-poc-book-b.epub'))), {
  letter: 'B', bookId: 'nf-storage-book-b', knowledgeMarker: 'BOOK_B_KNOWLEDGE',
});
assert.notEqual(bookA.json.bookId, bookB.json.bookId, 'book IDs differ');
assert.notEqual(bookA.json.marker, bookB.json.marker, 'knowledge markers differ');
assert.notEqual(
  bookA.entries.get('OEBPS/text/chapter-a.xhtml').toString().match(/data-nf-poc-marker="([^"]+)/)?.[1],
  bookB.entries.get('OEBPS/text/chapter-a.xhtml').toString().match(/data-nf-poc-marker="([^"]+)/)?.[1],
  'chapter markers differ across books',
);

const jsPath = resolve(ROOT, 'custom-code/storage-diagnostic.js');
const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
assert.equal(syntax.status, 0, `Custom Code syntax check: ${syntax.stderr || syntax.stdout}`);
const css = await readFile(resolve(ROOT, 'custom-code/storage-diagnostic.css'), 'utf8');
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces are balanced');
assert(css.includes('.nf-poc-carrier') && /display:\s*none\s*!important/.test(css), 'carrier fallback CSS hides the class carrier');
assert(css.includes('#nf-storage-poc-panel') && css.includes('position: fixed'), 'diagnostic panel CSS exists');
const customJs = await readFile(jsPath, 'utf8');
assert(!/\beval\s*\(/.test(customJs), 'Custom Code does not call eval');
assert(!/https?:\/\//.test(customJs), 'Custom Code has no literal remote URL');
assert(customJs.includes("resolved.protocol !== 'file:'"), 'fetch is gated to a local file URL');
assert(!customJs.includes('indexedDB.deleteDatabase'), 'Custom Code never deletes an IndexedDB database');
assert(customJs.includes('removeItem(disposableKey)'), 'only the explicitly disposable localStorage key is removed');
assert(customJs.includes("['chapter', 'CHAPTER']"), 'chapter results have a rendered report section');
assert(customJs.includes("['json', 'localStorage', 'indexedDB', 'chapter']"), 'empty asynchronous/storage sections are finalized explicitly');
assert(customJs.includes('await activeRun'), 'copy waits for the active asynchronous diagnostic');
assert(customJs.includes("setRunState('EM ANDAMENTO'"), 'panel exposes an in-progress status');
assert(customJs.includes("setRunState('CONCLUIDO'"), 'panel exposes a completed status');
assert(customJs.includes('Promise.allSettled([jsonPromise, indexedDbPromise])'), 'JSON and IndexedDB completion/errors are awaited');
assert(customJs.includes('FETCH_TIMEOUT_MS') && customJs.includes('STORAGE_TIMEOUT_MS'), 'network/file and storage operations have explicit timeouts');
assert(customJs.includes('priorChapter && priorChapter !== chapterId'), 'localStorage cross-chapter result uses a previously read record');
assert(customJs.includes('result.prior?.chapterId && result.prior.chapterId !== chapterId'), 'IndexedDB cross-chapter result uses a previously read record');
assert(css.includes('.nf-poc-run-state'), 'CSS styles the execution indicator');

process.stdout.write('PASS: both EPUB ZIP archives, CRCs, mimetype, OPF references, spine, JSON, chapter markers, distinct identities, generated PNG, CSS, Custom Code syntax and safety guards validated.\n');
process.stdout.write('LIMITATION: structural checks are not EPUBCheck and do not replace import/render/storage tests on Android.\n');
