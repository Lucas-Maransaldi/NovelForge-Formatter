const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function createDocument() {
  const styles = [];
  return {
    readyState: 'complete',
    head: { appendChild: style => styles.push(style) },
    styles,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: id => styles.find(style => style.id === id) || null,
    createElement: tag => ({ tagName: tag, textContent: '', appendChild() {} }),
    addEventListener() {},
    removeEventListener() {}
  };
}

function createChapter(document) {
  const attributes = { 'data-nf-id': 'q1', 'data-nf-category': 'QUEST', 'data-nf-subtype': 'INFO' };
  const quest = {
    parentElement: null,
    textContent: '[Hidden Quest]',
    matches: selector => selector === '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]',
    getAttribute: name => attributes[name] || null
  };
  const nestedSystem = {
    parentElement: quest,
    textContent: 'Nested system',
    getAttribute: name => ({ 'data-nf-id': 'nested1', 'data-nf-category': 'SYSTEM', 'data-nf-subtype': 'INFO' })[name] || null
  };
  const system = {
    parentElement: null,
    textContent: 'System message',
    getAttribute: name => ({ 'data-nf-id': 's1', 'data-nf-category': 'SYSTEM', 'data-nf-subtype': 'INFO' })[name] || null
  };
  return {
    ownerDocument: document,
    textContent: 'Original narrative [Hidden Quest].',
    attributes: { 'data-nf-chapter': 'c1', 'data-nf-schema': '1' },
    quest,
    nestedSystem,
    system,
    querySelectorAll: selector => selector === '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]' ? [quest, nestedSystem, system] : []
  };
}

function executeBundle(chapter, readyState = 'complete') {
  const timers = new Map();
  const listeners = new Map();
  const document = createDocument();
  if (chapter) chapter.ownerDocument = document;
  document.readyState = readyState;
  document.querySelector = selector => selector === '#LNReader-chapter' ? chapter || null : null;
  const sandbox = {
    document,
    setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    console
  };
  document.addEventListener = (name, callback) => listeners.set(name, callback);
  document.removeEventListener = name => listeners.delete(name);
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const filename = path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox);
  return { sandbox, document, timers, listeners };
}

test('auto inicia pelo seletor confirmado e injeta estilos QUEST/SYSTEM', () => {
  const document = createDocument();
  const chapter = createChapter(document);
  const runtime = executeBundle(chapter);
  assert.equal(runtime.document.styles.length, 1);
  assert.equal(runtime.document.styles[0].id, 'nf-formatter-styles');
  assert.match(runtime.document.styles[0].textContent, /data-nf-category="QUEST"/);
  assert.match(runtime.document.styles[0].textContent, /data-nf-category="SYSTEM"/);
  assert.equal(runtime.sandbox.NovelForgeFormatter.inspect(chapter).windows, 2);
  assert.equal(chapter.nestedSystem.parentElement, chapter.quest);
});

test('ausência do contêiner usa espera limitada', () => {
  const runtime = executeBundle(null);
  assert.equal(runtime.timers.size, 1);
  for (let i = 0; i < 25 && runtime.timers.size > 0; i++) {
    const [id, callback] = runtime.timers.entries().next().value;
    runtime.timers.delete(id);
    callback();
  }
  assert.equal(runtime.timers.size, 0);
  assert.equal(runtime.document.styles.length, 0);
});

test('DOMContentLoaded repete a busca quando o documento estava carregando', () => {
  const runtime = executeBundle(null, 'loading');
  const chapter = createChapter(runtime.document);
  runtime.document.querySelector = selector => selector === '#LNReader-chapter' ? chapter : null;
  const callback = runtime.listeners.get('DOMContentLoaded');
  assert.equal(typeof callback, 'function');
  callback();
  assert.equal(runtime.document.styles.length, 1);
});

test('reexecução após troca de capítulo injeta sem duplicar estilo nem alterar texto/atributos', () => {
  const chapter = createChapter(createDocument());
  const runtime = executeBundle(chapter);
  const replacement = createChapter(runtime.document);
  runtime.document.querySelector = selector => selector === '#LNReader-chapter' ? replacement : null;
  runtime.sandbox.NovelForgeLNReaderAdapter.start();
  assert.equal(runtime.document.styles.length, 1);
  assert.equal(replacement.textContent, 'Original narrative [Hidden Quest].');
  assert.equal(replacement.attributes['data-nf-chapter'], 'c1');
  assert.equal(replacement.quest.getAttribute('data-nf-category'), 'QUEST');
});

test('bundle não usa imports, rede ou reconstrução via innerHTML', () => {
  const bundle = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js'), 'utf8');
  assert.doesNotMatch(bundle, /\bimport\s|\bexport\s|\brequire\s*\(/);
  assert.doesNotMatch(bundle, /fetch\s*\(|https?:\/\//i);
  assert.doesNotMatch(bundle, /innerHTML\s*=/);
});

test('adaptador não instala monitoramento contínuo e mantém apenas espera inicial finita', () => {
  const chapter = createChapter(createDocument());
  const runtime = executeBundle(chapter);
  assert.equal(runtime.sandbox.NovelForgeLNReaderAdapter.start(), true);
  assert.equal(runtime.timers.size, 0);
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js'), 'utf8'), /MutationObserver|setInterval/);
});

test('manifesto SHA-256 confere com todos os arquivos incluídos', () => {
  execFileSync(process.execPath, [path.resolve(__dirname, '..', 'scripts', 'manifest.js')]);
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'MANIFEST_SHA256.json'), 'utf8'));
  for (const privatePath of ['tests/fixtures/poc-v0.2.1.epub', 'tests/fixtures/original.html', 'tests/fixtures/chapter.xhtml', 'tests/fixtures/context.json']) {
    assert.equal(Object.prototype.hasOwnProperty.call(manifest, privatePath), false);
  }
});

test('fixture XHTML diagnóstica contém QUEST e SYSTEM sem stylesheet fallback', () => {
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'chapter-no-fallback.xhtml'), 'utf8');
  assert.match(fixture, /data-nf-category="QUEST"/);
  assert.match(fixture, /data-nf-category="SYSTEM"/);
  assert.doesNotMatch(fixture, /fallback\.css|<link\b/i);
});
