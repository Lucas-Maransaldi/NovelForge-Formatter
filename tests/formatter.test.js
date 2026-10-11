const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
global.NovelForgeFormatterCSS = fs.readFileSync(require('node:path').resolve(__dirname, '..', 'src', 'formatter.css'), 'utf8');
const { inspect, enhance, injectStyles, STYLE_ID, FORMATTER_CSS } = require('../src/formatter.js');
const distApi = require('../dist/novelforge-formatter.js');

test('dist é autocontido e preserva a API pública', () => {
  assert.equal(typeof distApi.inspect, 'function');
  assert.equal(typeof distApi.enhance, 'function');
  assert.equal(typeof distApi.injectStyles, 'function');
  assert.equal(distApi.STYLE_ID, STYLE_ID);
});

test('sem DOM: falha segura', () => {
  assert.deepEqual(inspect(null), { chapters: 0, windows: 0, categories: [] });
});
test('inspeciona marcações sem modificar DOM nem duplicar janelas', () => {
  let mutations = 0;
  const quest = { getAttribute: name => name === 'data-nf-category' ? 'QUEST' : null };
  const fakeRoot = {
    querySelectorAll: selector => {
      if (selector === 'article.nf-chapter[data-nf-chapter]') return [{}];
      if (selector === '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]') return [quest];
      throw new Error('seletor inesperado');
    },
    appendChild: () => { mutations++; }
  };
  assert.deepEqual(enhance(fakeRoot), { chapters: 1, windows: 1, categories: ['QUEST'] });
  assert.deepEqual(enhance(fakeRoot), { chapters: 1, windows: 1, categories: ['QUEST'] });
  assert.equal(mutations, 0);
});

test('reconhece a janela QUEST anotada sem classificar colchetes narrativos', () => {
  const quest = {
    getAttribute: name => ({
      'data-nf-id': 'w0001',
      'data-nf-category': 'QUEST',
      'data-nf-subtype': 'INFO'
    })[name] || null,
    parentElement: null
  };
  const root = {
    querySelectorAll: selector => selector === 'article.nf-chapter[data-nf-chapter]' ? [{}] : [quest]
  };
  assert.deepEqual(enhance(root), { chapters: 1, windows: 1, categories: ['QUEST'] });
});

test('ignora janela anotada dentro de outra janela existente', () => {
  const outer = {
    matches: selector => selector === '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]',
    parentElement: null,
    getAttribute: name => ({ 'data-nf-id': 'w0001', 'data-nf-category': 'QUEST', 'data-nf-subtype': 'INFO' })[name] || null
  };
  const inner = {
    parentElement: outer,
    getAttribute: name => ({ 'data-nf-id': 'w0002', 'data-nf-category': 'SYSTEM', 'data-nf-subtype': 'INFO' })[name] || null
  };
  const root = { querySelectorAll: selector => selector === 'article.nf-chapter[data-nf-chapter]' ? [{}] : [outer, inner] };
  assert.deepEqual(enhance(root), { chapters: 1, windows: 1, categories: ['QUEST'] });
});

function documentDouble() {
  const styles = [];
  const head = { appendChild: node => styles.push(node) };
  return {
    nodeType: 9,
    head,
    styles,
    getElementById: id => styles.find(style => style.id === id) || null,
    createElement: tag => ({ tagName: tag, textContent: '', appendChild: () => {} })
  };
}

test('injeta CSS uma vez e é idempotente', () => {
  const document = documentDouble();
  assert.equal(injectStyles(document), true);
  assert.equal(injectStyles(document), false);
  assert.equal(document.styles.length, 1);
  assert.equal(document.styles[0].id, STYLE_ID);
  assert.match(document.styles[0].textContent, /data-nf-category="QUEST"/);
  assert.match(document.styles[0].textContent, /data-nf-category="SYSTEM"/);
  assert.equal(document.styles[0].textContent, FORMATTER_CSS);
});

test('CSS unifica cartões semânticos, estiliza raridade e trata somente marcadores explícitos', () => {
  assert.match(FORMATTER_CSS, /\.nf-chapter \[data-nf-entity\]\s*\{[^}]*color: inherit;[^}]*text-decoration: underline/s);
  for (const category of ['ITEM', 'SYSTEM', 'QUEST', 'SKILL', 'STATUS', 'CLASS', 'TITLE']) {
    assert.match(FORMATTER_CSS, new RegExp('data-nf-category="' + category + '"'));
  }
  assert.match(FORMATTER_CSS, /border-radius: \.55em/);
  assert.match(FORMATTER_CSS, /> p:first-of-type \{\s*font-weight: 700/);
  assert.match(FORMATTER_CSS, /\[data-nf-field\]\s*\{\s*font-weight: 700/);
  assert.match(FORMATTER_CSS, /\[data-nf-field="rating"\] \+ strong\s*\{\s*color: var\(--nf-accent\)/);
  assert.match(FORMATTER_CSS, /\.nf-delimiter\s*\{\s*display: none/);
  assert.match(FORMATTER_CSS, /data-nf-rarity="LEGENDARY"/);
  assert.doesNotMatch(FORMATTER_CSS, /content:\s*["'][^"']*LEGENDARY/i, 'rarity should not be duplicated as generated text');
  assert.doesNotMatch(FORMATTER_CSS, /(^|[;}])\s*\[[^\]]*\]\s*\{\s*display:\s*none/i, 'never hide arbitrary bracket characters');
});

test('enhance injeta estilo sem alterar texto ou estrutura semântica', () => {
  const document = documentDouble();
  const text = '[The Glass Observatory]';
  const quest = {
    ownerDocument: document,
    parentElement: null,
    textContent: text,
    getAttribute: name => ({ 'data-nf-id': 'w0001', 'data-nf-category': 'QUEST', 'data-nf-subtype': 'INFO' })[name] || null
  };
  const root = {
    ownerDocument: document,
    querySelectorAll: selector => selector === 'article.nf-chapter[data-nf-chapter]' ? [{}] : [quest]
  };
  assert.deepEqual(enhance(root), { chapters: 1, windows: 1, categories: ['QUEST'] });
  assert.equal(quest.textContent, text);
  assert.equal(document.styles.length, 1);
});

test('fixture sintética pública cobre janelas, entidades, blocos e índice sem narrativa protegida', () => {
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'chapter-synthetic.xhtml'), 'utf8');
  assert.match(fixture, /data-nf-category="QUEST"/);
  assert.match(fixture, /data-nf-category="SYSTEM"/);
  assert.match(fixture, /data-nf-entity="character:lyra"/);
  assert.match(fixture, /data-nf-entity="event:comet"/);
  assert.match(fixture, /data-nf-block="b1"/);
  assert.match(fixture, /id="nf-context-index"/);
  assert.match(fixture, /revealedAt/);
  assert.doesNotMatch(fixture, /Overgeared|Braham|Qi Jian|Call of the Heavens/i);
});
