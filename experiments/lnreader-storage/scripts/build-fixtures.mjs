import { deflateRawSync, deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../fixtures');
const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 0x21; // 1980-01-01

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, n) => {
    let value = n;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  return Buffer.concat([u32(data.length), name, data, u32(crc32(Buffer.concat([name, data])))]);
}

function makeTestPng() {
  const width = 8;
  const height = 8;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const pixels = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4);
    pixels[row] = 0; // PNG filter: None
    for (let x = 0; x < width; x++) {
      const offset = row + 1 + x * 4;
      pixels[offset] = x < 4 ? 44 : 35;
      pixels[offset + 1] = y < 4 ? 120 : 88;
      pixels[offset + 2] = 210;
      pixels[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [path, value] of entries) {
    const name = Buffer.from(path, 'utf8');
    const raw = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
    const method = path === 'mimetype' ? 0 : 8;
    const compressed = method === 0 ? raw : deflateRawSync(raw, { level: 9 });
    const checksum = crc32(raw);
    const flags = 0x0800; // UTF-8 filenames
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(method),
      u16(FIXED_DOS_TIME), u16(FIXED_DOS_DATE), u32(checksum),
      u32(compressed.length), u32(raw.length), u16(name.length), u16(0),
      name, compressed,
    ]);
    localParts.push(local);

    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method),
      u16(FIXED_DOS_TIME), u16(FIXED_DOS_DATE), u32(checksum),
      u32(compressed.length), u32(raw.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length),
    u16(entries.length), u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function chapterXhtml(bookId, chapterId, chapterLabel, chapterMarker, includeCarriers) {
  const carriers = includeCarriers ? `
    <script type="application/json" id="nf-poc-script">{"marker":"SCRIPT_TEST"}</script>
    <div id="nf-poc-hidden" hidden="hidden" style="display:none!important" data-nf-poc="hidden">{"marker":"HIDDEN_TEST"}</div>
    <div id="nf-poc-class" class="nf-poc-carrier" data-nf-poc="class">{"marker":"CLASS_TEST"}</div>` : '';
  const entityMarker = `${bookId.toUpperCase()}_ENTITY`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
  <head>
    <title>${escapeXml(chapterLabel)}</title>
    <link rel="stylesheet" type="text/css" href="../styles/test.css" />
  </head>
  <body>
    <div id="nf-poc-chapter-context" class="nf-poc-chapter" data-nf-novel="${bookId}" data-nf-chapter="${chapterId}" data-nf-schema="storage-poc-v1" data-nf-poc-marker="${chapterMarker}">
      <h1>${escapeXml(chapterLabel)}</h1>
      <p data-nf-block="${chapterId}-b0001">At the quiet observatory, Tavi found a blue brass compass beside the window.</p>
      <p data-nf-block="${chapterId}-b0002"><a href="#test-entity" id="test-entity" data-nf-entity="character:test">Mira the mapmaker</a> wrote the harmless note ${chapterMarker} into her notebook.</p>
      <p class="poc-epub-stylesheet-marker">EPUB_STYLESHEET_${bookId.toUpperCase()}</p>
      <img src="../images/test.png" alt="Small blue and green diagnostic tile" />
      <span data-nf-poc-entity-marker="${entityMarker}">${entityMarker}</span>${carriers}
    </div>
  </body>
</html>`;
}

function packageOpf(bookId, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:novelforge:${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>NovelForge synthetic storage test</dc:creator>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="chapter-a" href="text/chapter-a.xhtml" media-type="application/xhtml+xml" />
    <item id="chapter-b" href="text/chapter-b.xhtml" media-type="application/xhtml+xml" />
    <item id="knowledge" href="novelforge/knowledge.json" media-type="application/json" />
    <item id="test-css" href="styles/test.css" media-type="text/css" />
    <item id="test-image" href="images/test.png" media-type="image/png" />
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
  </manifest>
  <spine>
    <itemref idref="chapter-a" />
    <itemref idref="chapter-b" />
  </spine>
</package>`;
}

function navXhtml(title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
  <head><title>${escapeXml(title)} navigation</title></head>
  <body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
    <li><a href="text/chapter-a.xhtml">Chapter A</a></li>
    <li><a href="text/chapter-b.xhtml">Chapter B</a></li>
  </ol></nav></body>
</html>`;
}

function makeBook({ letter, bookId, knowledgeMarker }) {
  const title = `NovelForge Storage POC ${letter}`;
  const chapterAId = `${bookId}-chapter-a`;
  const chapterBId = `${bookId}-chapter-b`;
  const json = {
    schema: 'nf-storage-poc-v1',
    bookId,
    marker: knowledgeMarker,
    entities: {
      'character:test': {
        name: 'Personagem de Teste',
        facts: [{
          text: 'Fato fictício de diagnóstico.',
          chapter: 1,
          block: `${chapterAId}-b0001`,
        }],
      },
    },
  };
  const nav = navXhtml(title);
  return makeZip([
    ['mimetype', 'application/epub+zip'],
    ['META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml" /></rootfiles>
</container>`],
    ['OEBPS/package.opf', packageOpf(bookId, title)],
    ['OEBPS/nav.xhtml', nav],
    ['OEBPS/text/chapter-a.xhtml', chapterXhtml(bookId, chapterAId, 'Chapter A — Blue Compass', `${letter}_CHAPTER_A`, true)],
    ['OEBPS/text/chapter-b.xhtml', chapterXhtml(bookId, chapterBId, 'Chapter B — Quiet Map', `${letter}_CHAPTER_B`, false)],
    ['OEBPS/novelforge/knowledge.json', `${JSON.stringify(json, null, 2)}\n`],
    ['OEBPS/styles/test.css', `/* Synthetic EPUB resource; not the diagnostic Custom CSS. */
.poc-epub-stylesheet-marker { border-left: 3px solid #2c78d2; padding-left: 0.5em; }
img { width: 32px; height: 32px; }\n`],
    ['OEBPS/images/test.png', makeTestPng()],
  ]);
}

await mkdir(FIXTURES, { recursive: true });
const books = [
  { file: 'storage-poc-book-a.epub', options: { letter: 'A', bookId: 'nf-storage-book-a', knowledgeMarker: 'BOOK_A_KNOWLEDGE' } },
  { file: 'storage-poc-book-b.epub', options: { letter: 'B', bookId: 'nf-storage-book-b', knowledgeMarker: 'BOOK_B_KNOWLEDGE' } },
];

for (const { file, options } of books) {
  const output = resolve(FIXTURES, file);
  await writeFile(output, makeBook(options));
  process.stdout.write(`Generated ${output}\n`);
}
