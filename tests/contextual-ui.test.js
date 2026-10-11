const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.NovelForgeFormatterCSS = '';
global.NovelForgeContextualCSS = '.nf-context-overlay{position:fixed}';
require('../src/context-index.js');
const formatter = require('../src/formatter.js');
require('../src/contextual-ui.js');

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.attributes = Object.create(null);
    this.listeners = Object.create(null);
    this._text = '';
    this.className = '';
    this.id = '';
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  appendChild(child) { child.parentElement = this; child.parentNode = this; child.ownerDocument = this.ownerDocument; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentElement = null; child.parentNode = null; return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'id') this.id = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  removeEventListener(name, listener) { this.listeners[name] = (this.listeners[name] || []).filter(item => item !== listener); }
  matches(selector) {
    if (selector === 'article.nf-chapter[data-nf-chapter]') return this.tagName === 'ARTICLE' && this.className.split(' ').includes('nf-chapter') && !!this.getAttribute('data-nf-chapter');
    if (selector === 'p[data-nf-block]') return this.tagName === 'P' && !!this.getAttribute('data-nf-block');
    if (selector === '[data-nf-entity]') return this.getAttribute('data-nf-entity') !== null;
    if (selector.charAt(0) === '#') return this.id === selector.slice(1);
    if (selector === 'button') return this.tagName === 'BUTTON';
    if (selector === 'img') return this.tagName === 'IMG';
    return false;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = node => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  contains(target) { let node = target; while (node) { if (node === this) return true; node = node.parentElement; } return false; }
  focus() { this.ownerDocument.activeElement = this; }
}

class Document extends Element {
  constructor() {
    super('#document', null);
    this.nodeType = 9;
    this.ownerDocument = this;
    this.head = new Element('head', this);
    this.body = new Element('body', this);
    this.appendChild(this.head);
    this.appendChild(this.body);
    this.activeElement = null;
  }
  createElement(tag) { return new Element(tag, this); }
  getElementById(id) { return this.querySelectorAll('#' + id)[0] || null; }
}

function makeFixture(options = {}) {
  const document = new Document();
  const container = document.createElement('div');
  container.id = 'LNReader-chapter';
  container.setAttribute('id', 'LNReader-chapter');
  document.body.appendChild(container);
  const article = document.createElement('article');
  article.className = 'nf-chapter';
  article.setAttribute('data-nf-chapter', options.chapterId || 'c1');
  article.setAttribute('data-nf-novel', options.novelId || 'novel');
  article.setAttribute('data-nf-schema', '1');
  container.appendChild(article);

  const p1 = document.createElement('p');
  p1.setAttribute('data-nf-block', 'b1');
  const character = document.createElement('a');
  character.setAttribute('data-nf-entity', 'character:lyra');
  character.setAttribute('href', '../entities/lyra.xhtml#lyra');
  character.textContent = 'Lyra';
  p1.appendChild(character);
  article.appendChild(p1);

  const p2 = document.createElement('p');
  p2.setAttribute('data-nf-block', 'b2');
  const event = document.createElement('a');
  event.setAttribute('data-nf-entity', 'event:meeting');
  event.setAttribute('href', '../encyclopedia/events.xhtml#meeting');
  event.textContent = 'The meeting';
  p2.appendChild(event);
  article.appendChild(p2);

  if (!options.noIndex) {
    const script = document.createElement('script');
    script.id = 'nf-context-index';
    script.setAttribute('id', 'nf-context-index');
    script.setAttribute('type', 'application/json');
    const contextChapter = options.indexChapter || options.chapterId || 'c1';
    script.textContent = JSON.stringify({
      schemaVersion: '1.0-c3', novelId: 'novel', chapterId: contextChapter,
      entities: {
        'character:lyra': {
          displayName: 'Future name that must not replace visible label',
          facts: [
            { id: 'known', text: 'Known fact.', sourceChapter: contextChapter, sourceBlock: 'b1', revealedAt: { chapter: contextChapter, block: 'b1' } },
            { id: 'future', text: 'Future secret.', sourceChapter: contextChapter, sourceBlock: 'b2', revealedAt: { chapter: contextChapter, block: 'b2' } },
            { id: 'xss', text: '<img src=x onerror=alert(1)>', sourceChapter: contextChapter, sourceBlock: 'b1', revealedAt: { chapter: contextChapter, block: 'b1' } }
          ]
        },
        'event:meeting': {
          displayName: 'Meeting',
          facts: [{ id: 'event-fact', text: 'An authorized event fact.', sourceChapter: contextChapter, sourceBlock: 'b2', revealedAt: { chapter: contextChapter, block: 'b2' } }]
        }
      }
    });
    document.body.appendChild(script); // Deliberately outside .nf-chapter.
  }
  return { document, container, article, character, event };
}

function click(fixture, target) {
  const event = {
    target,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; }
  };
  for (const listener of fixture.article.listeners.click || []) listener(event);
  return event;
}

function byText(root, label) {
  return root.querySelectorAll('button').find(button => button.textContent === label) || null;
}

function findId(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findId(child, id);
    if (found) return found;
  }
  return null;
}

test('cliques em character e event abrem consulta no bloco ancestral correto', () => {
  const fixture = makeFixture();
  const initialized = global.NovelForgeContextualUI.initialize(fixture.container);
  assert.equal(initialized.ok, true);
  const characterClick = click(fixture, fixture.character);
  assert.equal(characterClick.defaultPrevented, true);
  let dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.match(dialog.textContent, /Known fact\./);
  assert.doesNotMatch(dialog.textContent, /Future secret\./);
  assert.doesNotMatch(dialog.textContent, /Future name that must not replace visible label/);
  const close = byText(fixture.document.body, 'Fechar');
  close.listeners.click[0]({});
  const eventClick = click(fixture, fixture.event);
  assert.equal(eventClick.defaultPrevented, true);
  dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.match(dialog.textContent, /An authorized event fact\./);
});

test('índice fora do artigo é associado pelo chapterId e índice ambíguo falha fechado', () => {
  const fixture = makeFixture();
  assert.equal(formatter.loadContextIndex(fixture.article).ok, true);
  const second = fixture.document.createElement('script');
  second.id = 'nf-context-index';
  second.setAttribute('id', 'nf-context-index');
  second.textContent = fixture.document.body.children.find(node => node.id === 'nf-context-index').textContent;
  fixture.document.body.appendChild(second);
  assert.equal(formatter.loadContextIndex(fixture.article).error.code, 'INDEX_AMBIGUOUS');
  assert.equal(global.NovelForgeContextualUI.initialize(fixture.container), false);
});

test('índice ausente, inválido ou de outro capítulo preserva o href original', () => {
  for (const options of [{ noIndex: true }, { indexChapter: 'other' }]) {
    const fixture = makeFixture(options);
    assert.equal(global.NovelForgeContextualUI.initialize(fixture.container), false);
    const result = click(fixture, fixture.character);
    assert.equal(result.defaultPrevented, false);
    assert.equal(fixture.character.getAttribute('href'), '../entities/lyra.xhtml#lyra');
  }
  const invalid = makeFixture();
  invalid.document.body.children.find(node => node.id === 'nf-context-index').textContent = '{bad json';
  assert.equal(global.NovelForgeContextualUI.initialize(invalid.container), false);
});

test('entidade não suportada ou desconhecida não intercepta o link original', () => {
  const fixture = makeFixture();
  global.NovelForgeContextualUI.initialize(fixture.container);
  fixture.character.setAttribute('data-nf-entity', 'location:unknown');
  const result = click(fixture, fixture.character);
  assert.equal(result.defaultPrevented, false);
  assert.equal(fixture.character.getAttribute('href'), '../entities/lyra.xhtml#lyra');
  assert.equal(findId(fixture.document.body, 'nf-contextual-ui'), null);
});

test('perfil detalhado, retorno, Escape e fechamento restauram foco', () => {
  const fixture = makeFixture();
  global.NovelForgeContextualUI.initialize(fixture.container);
  click(fixture, fixture.character);
  let dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.ok(dialog);
  byText(dialog, 'Ver perfil').listeners.click[0]({});
  dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.doesNotMatch(dialog.textContent, /Future secret\./);
  assert.match(dialog.textContent, /<img src=x onerror=alert\(1\)>/);
  byText(dialog, 'Voltar à consulta').listeners.click[0]({});
  dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.ok(byText(dialog, 'Ver perfil'));
  const escapeHandlers = fixture.document.listeners.keydown || [];
  escapeHandlers[escapeHandlers.length - 1]({ key: 'Escape', preventDefault() {} });
  assert.equal(findId(fixture.document.body, 'nf-contextual-ui'), null);
  assert.equal(fixture.document.activeElement, fixture.character);
  click(fixture, fixture.character);
  dialog = findId(fixture.document.body, 'nf-contextual-ui');
  byText(dialog, 'Fechar').listeners.click[0]({});
  assert.equal(findId(fixture.document.body, 'nf-contextual-ui'), null);
});

test('sem fatos autorizados não exibe conteúdo nem intercepta link', () => {
  const fixture = makeFixture({ chapterId: 'c1' });
  // Remove the character block from the validated order while retaining its link in another position.
  const p1 = fixture.article.children[0];
  fixture.article.removeChild(p1);
  const unpositioned = fixture.document.createElement('div');
  unpositioned.appendChild(fixture.character);
  fixture.article.appendChild(unpositioned);
  assert.equal(global.NovelForgeContextualUI.initialize(fixture.container).ok, true);
  const result = click(fixture, fixture.character);
  assert.equal(result.defaultPrevented, false);
});

test('consulta válida sem fatos autorizados mostra estado vazio seguro', () => {
  const fixture = makeFixture();
  fixture.article.children[0].appendChild(fixture.event);
  global.NovelForgeContextualUI.initialize(fixture.container);
  const result = click(fixture, fixture.event);
  assert.equal(result.defaultPrevented, true);
  const dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.match(dialog.textContent, /Nenhuma informação contextual disponível/);
  assert.doesNotMatch(dialog.textContent, /An authorized event fact\./);
});

test('XSS-like fact is inserted as inert text; narrative and semantic attributes stay intact', () => {
  const fixture = makeFixture();
  const originalText = fixture.article.textContent;
  global.NovelForgeContextualUI.initialize(fixture.container);
  click(fixture, fixture.character);
  const dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.match(dialog.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(dialog.querySelector('img'), null);
  assert.equal(fixture.article.textContent, originalText);
  assert.equal(fixture.character.getAttribute('data-nf-entity'), 'character:lyra');
  assert.equal(fixture.character.getAttribute('href'), '../entities/lyra.xhtml#lyra');
});

test('dupla inicialização não duplica listeners, estilos ou janelas e reinicializa capítulo substituído', () => {
  let fixture = makeFixture();
  global.NovelForgeContextualUI.initialize(fixture.container);
  global.NovelForgeContextualUI.initialize(fixture.container);
  assert.equal((fixture.article.listeners.click || []).length, 1);
  assert.equal(findId(fixture.document.head, 'nf-contextual-ui-styles') !== null, true);
  assert.equal(fixture.document.head.children.filter(node => node.id === 'nf-contextual-ui-styles').length, 1);
  click(fixture, fixture.character);
  assert.equal(fixture.document.body.children.filter(node => node.id === 'nf-contextual-ui').length, 1);

  fixture = makeFixture({ chapterId: 'c2' });
  assert.equal(global.NovelForgeContextualUI.initialize(fixture.container).ok, true);
  assert.equal(fixture.document.body.children.filter(node => node.id === 'nf-contextual-ui').length, 0);
  click(fixture, fixture.character);
  assert.match(fixture.document.body.textContent, /Known fact\./);
});

test('troca para contexto sem artigo ou índice encerra interface e listener antigos', () => {
  const previous = makeFixture();
  global.NovelForgeContextualUI.initialize(previous.container);
  click(previous, previous.character);
  assert.ok(findId(previous.document.body, 'nf-contextual-ui'));

  const invalidNext = makeFixture({ noIndex: true });
  assert.equal(global.NovelForgeContextualUI.initialize(invalidNext.container), false);
  assert.equal(findId(previous.document.body, 'nf-contextual-ui'), null);
  assert.equal((previous.article.listeners.click || []).length, 0);
});

test('clique recarrega o índice e não reutiliza contexto já alterado', () => {
  const fixture = makeFixture();
  global.NovelForgeContextualUI.initialize(fixture.container);
  const index = fixture.document.body.children.find(node => node.id === 'nf-context-index');
  const replacement = JSON.parse(index.textContent);
  replacement.entities['character:lyra'].facts = [
    { id: 'replacement', text: 'Fresh context only.', sourceChapter: 'c1', sourceBlock: 'b1', revealedAt: { chapter: 'c1', block: 'b1' } }
  ];
  index.textContent = JSON.stringify(replacement);
  click(fixture, fixture.character);
  const dialog = findId(fixture.document.body, 'nf-contextual-ui');
  assert.match(dialog.textContent, /Fresh context only\./);
  assert.doesNotMatch(dialog.textContent, /Known fact\./);
  assert.doesNotMatch(dialog.textContent, /Future secret\./);
});

test('popup oficial integra consulta remota, LOADING/READY e só mostra fatos recebidos', async () => {
  const fixture = makeFixture({ chapterId:'889', novelId:'overgeared' });
  fixture.article.children[0].setAttribute('data-nf-block','b0042');
  const priorRemote = global.NovelForgeRemoteKnowledge;
  const requests = [];
  global.NovelForgeRemoteKnowledge = { queryEntity(context) {
    requests.push(context);
    return Promise.resolve({ ok:true, value:{ revision:'r-test', facts:[{id:'allowed',text:'Remote allowed fact.',provenance:{chapter:100,block:10,blockId:'b00010'}}] } });
  } };
  try {
    assert.equal(global.NovelForgeContextualUI.initialize(fixture.container).mode,'remote');
    const result=click(fixture,fixture.character);
    assert.equal(result.defaultPrevented,true);
    assert.match(findId(fixture.document.body,'nf-contextual-ui').textContent,/Consultando a enciclopédia/);
    await new Promise(resolve=>setImmediate(resolve));
    const dialog=findId(fixture.document.body,'nf-contextual-ui');
    assert.match(dialog.textContent,/Remote allowed fact\./);
    assert.match(dialog.textContent,/REMOTE KNOWLEDGE · Revisão r-test/);
    assert.equal(requests[0].bookId,'overgeared');
    assert.equal(requests[0].chapter,889);
    assert.equal(requests[0].block,42);
  } finally {
    if(priorRemote===undefined) delete global.NovelForgeRemoteKnowledge;
    else global.NovelForgeRemoteKnowledge=priorRemote;
  }
});

test('popup remoto falha fechado para metadata desconhecido e nunca cai no índice local', async () => {
  const fixture=makeFixture({chapterId:'poc-source-unknown',novelId:'overgeared'});
  const priorRemote=global.NovelForgeRemoteKnowledge;
  let calls=0;
  global.NovelForgeRemoteKnowledge={queryEntity(){calls++;return Promise.resolve({ok:true,value:{facts:[{text:'must not appear'}]}});}};
  try {
    assert.equal(global.NovelForgeContextualUI.initialize(fixture.container).mode,'remote');
    const result=click(fixture,fixture.character);
    assert.equal(result.defaultPrevented,true);
    const dialog=findId(fixture.document.body,'nf-contextual-ui');
    assert.match(dialog.textContent,/Enciclopédia indisponível/);
    assert.doesNotMatch(dialog.textContent,/Known fact\.|must not appear/);
    assert.equal(calls,0);
  } finally {
    if(priorRemote===undefined) delete global.NovelForgeRemoteKnowledge;
    else global.NovelForgeRemoteKnowledge=priorRemote;
  }
});

test('popup remoto mantém links comuns e entidades não suportadas intactos', () => {
  const fixture=makeFixture({chapterId:'889',novelId:'overgeared'});
  const normal=fixture.document.createElement('a'); normal.setAttribute('href','chapter-2.xhtml'); normal.textContent='normal';
  fixture.article.children[0].appendChild(normal);
  const prior=global.NovelForgeRemoteKnowledge;
  global.NovelForgeRemoteKnowledge={queryEntity(){throw new Error('must not query');}};
  try {
    global.NovelForgeContextualUI.initialize(fixture.container);
    assert.equal(click(fixture,normal).defaultPrevented,false);
    fixture.character.setAttribute('data-nf-entity','location:unknown');
    assert.equal(click(fixture,fixture.character).defaultPrevented,false);
  } finally { if(prior===undefined)delete global.NovelForgeRemoteKnowledge;else global.NovelForgeRemoteKnowledge=prior; }
});

test('resposta remota atrasada não reabre popup após fechar ou trocar contexto', async () => {
  const fixture=makeFixture({chapterId:'889',novelId:'overgeared'});
  fixture.article.children[0].setAttribute('data-nf-block','b0042');
  const prior=global.NovelForgeRemoteKnowledge;
  let resolveQuery;
  global.NovelForgeRemoteKnowledge={queryEntity(){return new Promise(resolve=>{resolveQuery=resolve;});}};
  try {
    global.NovelForgeContextualUI.initialize(fixture.container);
    click(fixture,fixture.character);
    await Promise.resolve();
    const dialog=findId(fixture.document.body,'nf-contextual-ui');
    byText(dialog,'Fechar').listeners.click[0]({});
    resolveQuery({ok:true,value:{revision:'r-late',facts:[{id:'future',text:'late data'}]}});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(findId(fixture.document.body,'nf-contextual-ui'),null);
  } finally { if(prior===undefined)delete global.NovelForgeRemoteKnowledge;else global.NovelForgeRemoteKnowledge=prior; }
});

test('índice alterado para outro capítulo falha fechado no clique', () => {
  const fixture = makeFixture();
  global.NovelForgeContextualUI.initialize(fixture.container);
  const index = fixture.document.body.children.find(node => node.id === 'nf-context-index');
  const changed = JSON.parse(index.textContent);
  changed.chapterId = 'other-chapter';
  index.textContent = JSON.stringify(changed);
  const result = click(fixture, fixture.character);
  assert.equal(result.defaultPrevented, false);
  assert.equal(findId(fixture.document.body, 'nf-contextual-ui'), null);
  assert.equal(fixture.character.getAttribute('href'), '../entities/lyra.xhtml#lyra');
});

test('bundle LNReader inclui UI/CSS autocontidos sem rede ou imports', () => {
  const bundle = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'novelforge-lnreader.js'), 'utf8');
  assert.match(bundle, /NovelForgeContextualUI/);
  assert.match(bundle, /nf-contextual-ui-styles/);
  assert.match(bundle, /NovelForgeRemoteKnowledge/);
  assert.match(bundle, /role/);
  assert.doesNotMatch(bundle, /\bimport\s|\bexport\s|\brequire\s*\(/);
  assert.match(bundle, /fetch\s*\(/);
  assert.match(bundle, /https:\/\/cdn\.jsdelivr\.net\/gh\/Lucas-Maransaldi\/NovelForge-Formatter/);
  assert.doesNotMatch(bundle, /fetch\(['"]\//i, 'production client must not use document-relative URLs');
});

test('bundle oficial usa somente Knowledge remoto e não cai no índice local em erro', async () => {
  const fixture = makeFixture();
  const previousDocument = global.document;
  const previousWindow = global.window;
  global.document = fixture.document;
  global.window = global;
  const bundlePath = require.resolve('../dist/novelforge-lnreader.js');
  delete require.cache[bundlePath];
  try {
    require(bundlePath);
    assert.equal((fixture.article.listeners.click || []).length, 1);
    const result = click(fixture, fixture.character);
    assert.equal(result.defaultPrevented, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(findId(fixture.document.body, 'nf-contextual-ui').textContent, /Enciclopédia indisponível/);
    assert.doesNotMatch(findId(fixture.document.body, 'nf-contextual-ui').textContent, /Known fact\.|Future secret\./);
  } finally {
    const state = global.__novelforgeContextualUIState;
    if (state && state.cleanup) state.cleanup();
    global.document = previousDocument;
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('clique remoto em span ou link sem destino abre LOADING e consulta IDs sem navegar', async () => {
  const fixture = makeFixture({ chapterId: '1', novelId: 'overgeared' });
  fixture.article.children[0].setAttribute('data-nf-block', 'b0042');
  fixture.character.setAttribute('data-nf-entity', 'character:grid');
  const span = fixture.document.createElement('span');
  span.setAttribute('data-nf-entity', 'character:pagma');
  span.textContent = 'Pagma';
  fixture.article.children[0].appendChild(span);
  const prior = global.NovelForgeRemoteKnowledge;
  const calls = [];
  global.NovelForgeRemoteKnowledge = {
    queryEntity(context) {
      calls.push(context);
      return Promise.resolve({ ok: true, value: { revision: 'og-r0001', facts: [] } });
    }
  };
  try {
    global.NovelForgeContextualUI.initialize(fixture.container);
    global.NovelForgeContextualUI.initialize(fixture.container);
    assert.equal((fixture.article.listeners.click || []).length, 1);

    const spanTap = click(fixture, span);
    assert.equal(spanTap.defaultPrevented, true);
    assert.match(findId(fixture.document.body, 'nf-contextual-ui').textContent, /Consultando/);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(findId(fixture.document.body, 'nf-contextual-ui').textContent, /Não há informações disponíveis/);

    const linkTap = click(fixture, fixture.character);
    assert.equal(linkTap.defaultPrevented, true);
    assert.equal(fixture.character.getAttribute('href'), '../entities/lyra.xhtml#lyra');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls.map(call => [call.bookId, call.entityId, call.chapter, call.block]), [
      ['overgeared', 'character:pagma', 1, 42],
      ['overgeared', 'character:grid', 1, 42]
    ]);
  } finally {
    const state = global.__novelforgeContextualUIState;
    if (state && state.cleanup) state.cleanup();
    if (prior === undefined) delete global.NovelForgeRemoteKnowledge;
    else global.NovelForgeRemoteKnowledge = prior;
  }
});

test('posição remota inválida apresenta indisponibilidade e não consulta o Knowledge Index', async () => {
  const fixture = makeFixture({ chapterId: 'c1', novelId: 'overgeared' });
  const prior = global.NovelForgeRemoteKnowledge;
  let calls = 0;
  global.NovelForgeRemoteKnowledge = { queryEntity() { calls++; } };
  try {
    global.NovelForgeContextualUI.initialize(fixture.container);
    const tap = click(fixture, fixture.character);
    assert.equal(tap.defaultPrevented, true);
    assert.match(findId(fixture.document.body, 'nf-contextual-ui').textContent, /Enciclopédia indisponível/);
    await Promise.resolve();
    assert.equal(calls, 0);
  } finally {
    const state = global.__novelforgeContextualUIState;
    if (state && state.cleanup) state.cleanup();
    if (prior === undefined) delete global.NovelForgeRemoteKnowledge;
    else global.NovelForgeRemoteKnowledge = prior;
  }
});
