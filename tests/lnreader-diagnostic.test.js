const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.listeners = {}; this.parentNode = null; this.attributes = {}; this.style = {}; this.textContent = ''; this.id = ''; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) { this.children = this.children.filter(child => child !== node); node.parentNode = null; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] || null; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  querySelectorAll(selector) { return this.counts && this.counts[selector] || []; }
  querySelector(selector) { return selector === 'article.nf-chapter[data-nf-chapter]' ? this.article || null : null; }
  matches(selector) { return selector === 'article.nf-chapter[data-nf-chapter]' && this.tagName === 'article'; }
}

function runtime() {
  const body = new Element('body');
  const doc = {
    body,
    createElement: tag => new Element(tag),
    querySelector: selector => selector === '#LNReader-chapter' ? root : null,
    querySelectorAll: selector => selector === '#nf-context-index' ? [new Element('script')] : [],
    getElementById(id) { return find(body, id); }
  };
  const root = new Element('div');
  const article = new Element('article');
  article.attributes['data-nf-chapter'] = 'c1';
  root.article = article;
  root.counts = { 'article.nf-chapter[data-nf-chapter]': [article] };
  article.counts = {
    'p[data-nf-block]': [{}, {}], '[data-nf-entity]': [{}],
    '.nf-window[data-nf-id][data-nf-category][data-nf-subtype]': [{}]
  };
  const sandbox = { document: doc, console: { log() {}, error() {} } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'lnreader-diagnostic.js'), 'utf8');
  return { sandbox, doc, root, article, source };
}

function find(node, id) {
  if (node.id === id) return node;
  for (const child of node.children) { const result = find(child, id); if (result) return result; }
  return null;
}

test('diagnóstico mostra execuções e identidade do contêiner, amostra alterações e pode ser removido', () => {
  const r = runtime();
  vm.runInContext(r.source, r.sandbox);
  let badge = r.doc.getElementById('nf-lnreader-diagnostic');
  assert.match(badge.children[0].textContent, /executions in this JS context: 1/);
  assert.match(badge.children[0].textContent, /#nf-context-index count in rendered DOM: 1/);
  vm.runInContext(r.source, r.sandbox);
  badge = r.doc.getElementById('nf-lnreader-diagnostic');
  assert.match(badge.children[0].textContent, /executions in this JS context: 2/);
  assert.match(badge.children[0].textContent, /Same root as last script execution: yes/);
  r.article.counts['p[data-nf-block]'].push({});
  badge.children[1].children[0].listeners.click();
  assert.match(badge.children[0].textContent, /DOM summary changed since previous sample: yes/);
  badge.children[1].children[1].listeners.click();
  assert.equal(r.doc.getElementById('nf-lnreader-diagnostic'), null);
});

test('diagnóstico é offline, isolado e não monitora DOM continuamente', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'lnreader-diagnostic.js'), 'utf8');
  assert.doesNotMatch(source, /MutationObserver|setInterval|fetch\s*\(|https?:\/\//i);
  assert.match(source, /Sample current DOM/);
  assert.match(source, /Remove diagnostic/);
  const production = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js'), 'utf8');
  assert.doesNotMatch(production, /NovelForge diagnostic|nf-lnreader-diagnostic/);
});
