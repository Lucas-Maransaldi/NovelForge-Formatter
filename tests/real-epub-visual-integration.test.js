const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { test } = require('node:test');

const epubPath = path.resolve(__dirname, '..', 'Overgeared_1-5_NovelForge_Sem_CSS_Proprio.epub');
const bundlePath = path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js');

function readZipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 0xffff - 22); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.notEqual(eocd, -1, 'EPUB deve conter diretório central ZIP');
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50, 'entrada ZIP válida');
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert.ok(content, `método ZIP suportado para ${name}`);
    entries.set(name, content.toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) result[match[1]] = match[3];
  return result;
}

function parseElementTree(markup) {
  const root = { tag: '#document', attrs: {}, children: [], parent: null };
  const stack = [root];
  for (const match of markup.matchAll(/<\/?([\w:-]+)\b([^>]*)>/g)) {
    const token = match[0];
    const tag = match[1].toLowerCase();
    if (token.startsWith('</')) {
      while (stack.length > 1) if (stack.pop().tag === tag) break;
      continue;
    }
    const node = { tag, attrs: attributes(match[2]), children: [], parent: stack[stack.length - 1] };
    node.parent.children.push(node);
    if (!/\/>$/.test(token) && !['meta', 'link', 'img', 'br', 'hr', 'input'].includes(tag)) stack.push(node);
  }
  return root;
}

function descendants(node, predicate, found = []) {
  for (const child of node.children) {
    if (predicate(child)) found.push(child);
    descendants(child, predicate, found);
  }
  return found;
}

function serializedWindow(markup, id) {
  const attributeIndex = markup.indexOf(`data-nf-id="${id}"`);
  assert.notEqual(attributeIndex, -1, `janela ${id} serializada`);
  const start = markup.lastIndexOf('<section', attributeIndex);
  const close = markup.indexOf('</section>', attributeIndex);
  assert.ok(start !== -1 && close !== -1, `limites da janela ${id}`);
  return markup.slice(start, close + '</section>'.length);
}

test('EPUB real: janelas ITEM e SYSTEM correspondem aos seletores de apresentação do bundle', { skip: !fs.existsSync(epubPath) }, () => {
  const entries = readZipEntries(fs.readFileSync(epubPath));
  const opfPath = [...entries.keys()].find((name) => name.endsWith('.opf'));
  assert.ok(opfPath, 'package.opf presente');
  const opf = entries.get(opfPath);
  const manifest = new Map([...opf.matchAll(/<item\b([^>]*)\/?\s*>/g)].map((match) => {
    const attrs = attributes(match[1]);
    return [attrs.id, attrs.href];
  }));
  const firstSpineId = opf.match(/<itemref\b([^>]*)\/?\s*>/);
  assert.ok(firstSpineId, 'spine contém capítulo');
  const chapterHref = manifest.get(attributes(firstSpineId[1]).idref);
  assert.ok(chapterHref, 'spine idref resolvido no manifest');
  const chapterPath = path.posix.normalize(path.posix.join(path.posix.dirname(opfPath), chapterHref));
  const chapter = entries.get(chapterPath);
  assert.ok(chapter, `XHTML do primeiro capítulo presente: ${chapterPath}`);

  const tree = parseElementTree(chapter);
  const chapterRoot = descendants(tree, (node) => node.tag === 'article' && node.attrs['data-nf-chapter'] === '1')[0];
  assert.ok(chapterRoot, 'capítulo 1 tem article.nf-chapter[data-nf-chapter]');
  assert.ok(chapterRoot.attrs.class.split(/\s+/).includes('nf-chapter'));
  assert.equal(chapterRoot.attrs['data-nf-novel'], 'overgeared');

  const windows = descendants(chapterRoot, (node) => node.tag === 'section' && node.attrs.class?.split(/\s+/).includes('nf-window'));
  const item = windows.find((node) => node.attrs['data-nf-category'] === 'ITEM' && node.attrs['data-nf-id'] === 'w0105');
  assert.ok(item, 'ficha Pagma marcada como ITEM');
  assert.equal(item.attrs['data-nf-subtype'], 'INFO');
  assert.equal(item.attrs['data-nf-rarity'], 'LEGENDARY');
  assert.equal(item.parent, chapterRoot, 'ITEM é filho direto do capítulo');
  const itemIndex = chapterRoot.children.indexOf(item);
  const nextWindow = chapterRoot.children.slice(itemIndex + 1).find((node) => node.tag === 'section' && node.attrs.class?.split(/\s+/).includes('nf-window'));
  assert.equal(nextWindow?.attrs['data-nf-category'], 'SYSTEM', 'SYSTEM vem depois do ITEM');
  assert.equal(nextWindow.parent, chapterRoot, 'SYSTEM usa a mesma hierarquia do ITEM');

  const serializedItem = serializedWindow(chapter, item.attrs['data-nf-id']);
  for (const text of ['Pagma', 'Rating:', 'Legendary', 'Effects:', 'Conditions:']) assert.ok(serializedItem.includes(text), `conteúdo preservado: ${text}`);
  assert.ok(serializedItem.includes('data-nf-field="rating"'));
  assert.equal((serializedItem.match(/class="nf-delimiter"/g) || []).length, 2);
  const systemSerialized = serializedWindow(chapter, nextWindow.attrs['data-nf-id']);
  assert.ok(systemSerialized.includes('class="nf-delimiter"'), 'SYSTEM seguinte também mantém delimitadores semânticos');
  assert.ok(systemSerialized.includes('>]</span>') || systemSerialized.includes('>]</span'), 'delimitador de fechamento continua no XHTML');
  assert.ok(nextWindow.children.length > 0);

  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const cssLiteral = bundle.match(/const FORMATTER_CSS = ("(?:\\.|[^"\\])*");/);
  assert.ok(cssLiteral, 'bundle contém literal CSS do formatter');
  const css = JSON.parse(cssLiteral[1]);
  const cardSelector = '.nf-chapter > .nf-window[data-nf-id][data-nf-category][data-nf-subtype]';
  assert.ok(css.includes(cardSelector), 'bundle contém seletor de cartão compartilhado');
  assert.ok(css.includes('.nf-chapter > .nf-window[data-nf-id][data-nf-category="ITEM"][data-nf-rarity="LEGENDARY"]'), 'bundle contém destaque LEGENDARY');
  assert.ok(css.includes(`${cardSelector} .nf-delimiter`), 'bundle contém seletor de delimitadores');
  assert.ok(css.includes('display: none;'), 'bundle esconde delimitadores visualmente');
  assert.ok(css.includes('[data-nf-category="SYSTEM"]'), 'bundle mantém regra SYSTEM');
  assert.ok(bundle.includes('style.textContent = FORMATTER_CSS'), 'bundle injeta CSS compilado');
  // This is a source/selector integration check, not a computed-style browser test.
});
