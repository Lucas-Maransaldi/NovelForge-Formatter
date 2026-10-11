import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, '../fixtures/novelforge-c55-remote-popup.epub');
const BOOK_ID = 'nf-overgeared-poc';

const entries = [
  ['mimetype', 'application/epub+zip', false],
  ['META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`, true],
  ['OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:novelforge:${BOOK_ID}</dc:identifier><dc:title>NovelForge Synthetic Remote Popup Fixture</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata>
  <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c889" href="chapter-889.xhtml" media-type="application/xhtml+xml"/><item id="c900" href="chapter-900.xhtml" media-type="application/xhtml+xml"/></manifest>
  <spine><itemref idref="c889"/><itemref idref="c900"/></spine>
</package>`, true],
  ['OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title></head><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol><li><a href="chapter-889.xhtml">Scenario 889</a></li><li><a href="chapter-900.xhtml">Scenario 900</a></li></ol></nav></body></html>`, true],
  ['OEBPS/chapter-889.xhtml', chapter(889, [['b0042', 'In this synthetic scene, <a data-nf-entity="character:braham" href="chapter-900.xhtml#ordinary-target">Braham</a> is mentioned for the remote popup test.', 'id="ordinary-target"']]) , true],
  ['OEBPS/chapter-900.xhtml', chapter(900, [
    ['b0004', 'This is the synthetic chapter 900 boundary before the final block. <a href="chapter-889.xhtml#ordinary-target">Ordinary navigation link</a>.', 'id="ordinary-target"'],
    ['b0005', 'At the exact synthetic boundary, <a data-nf-entity="character:braham" href="chapter-889.xhtml#ordinary-target">Braham</a> appears again.'],
  ]), true],
];

function chapter(number, blocks) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><title>Synthetic scenario ${number}</title></head><body>
  <article class="nf-chapter" data-nf-novel="${BOOK_ID}" data-nf-chapter="${number}" data-nf-schema="1">
    <h1>Synthetic scenario ${number}</h1>
    ${blocks.map(([id, text, extra = '']) => `<p data-nf-block="${id}" ${extra}>${text}</p>`).join('\n    ')}
  </article>
</body></html>`;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const u16 = (buffer, offset, value) => buffer.writeUInt16LE(value, offset);
const u32 = (buffer, offset, value) => buffer.writeUInt32LE(value >>> 0, offset);

function createZip(files) {
  const localParts = [], centralParts = [];
  let offset = 0;
  for (const [name, content, compressed] of files) {
    const nameBytes = Buffer.from(name, 'utf8');
    const raw = Buffer.from(content, 'utf8');
    const method = compressed ? 8 : 0;
    const data = compressed ? deflateRawSync(raw, { level: 9 }) : raw;
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    u32(local, 0, 0x04034b50); u16(local, 4, 20); u16(local, 6, 0x0800);
    u16(local, 8, method); u32(local, 14, crc); u32(local, 18, data.length); u32(local, 22, raw.length);
    u16(local, 26, nameBytes.length); u16(local, 28, 0);
    localParts.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    u32(central, 0, 0x02014b50); u16(central, 4, 20); u16(central, 6, 20);
    u16(central, 8, 0x0800); u16(central, 10, method); u32(central, 16, crc);
    u32(central, 20, data.length); u32(central, 24, raw.length);
    u16(central, 28, nameBytes.length); u16(central, 30, 0); u16(central, 32, 0);
    u16(central, 34, 0); u32(central, 38, 0); u32(central, 42, offset);
    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  u32(end, 0, 0x06054b50); u16(end, 8, files.length); u16(end, 10, files.length);
  u32(end, 12, centralSize); u32(end, 16, centralOffset); u16(end, 20, 0);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, createZip(entries));
process.stdout.write(`Generated ${OUTPUT}\n`);
