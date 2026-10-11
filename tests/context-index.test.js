const test = require('node:test');
const assert = require('node:assert/strict');
const { loadContextIndex, parseContextIndex, queryEntity } = require('../src/context-index.js');

function indexText(overrides = {}) {
  return JSON.stringify({
    schemaVersion: '1.0-c2', novelId: 'novel', chapterId: 'c1',
    entities: {
      'character:lyra': {
        displayName: 'Lyra',
        facts: [
          { id: 'f1', text: 'Known at b0002.', sourceChapter: 'c1', sourceBlock: 'b0002', revealedAt: { chapter: 'c1', block: 'b0002' } },
          { id: 'f2', text: 'Future at b0004.', sourceChapter: 'c1', sourceBlock: 'b0004', revealedAt: { chapter: 'c1', block: 'b0004' } },
          { id: 'f3', text: 'No temporal provenance.', textOnly: true }
        ]
      },
      'event:meeting': { displayName: 'Meeting', facts: [] }
    },
    ...overrides
  });
}

function rootWithIndex(text) {
  const script = { textContent: text };
  const blocks = ['b0001', 'b0002', 'b0003', 'b0004'].map(id => ({ getAttribute: () => id }));
  return {
    querySelector: selector => selector === '#nf-context-index' ? script : null,
    querySelectorAll: selector => selector === 'p[data-nf-block]' ? blocks : []
  };
}

test('carrega índice incorporado e deriva ordem dos blocos do DOM', () => {
  const loaded = loadContextIndex(rootWithIndex(indexText()));
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.value.blockOrder, ['b0001', 'b0002', 'b0003', 'b0004']);
  assert.equal(loaded.value.source, 'embedded-dom');
  assert.equal(loaded.value.orderValid, true);
});

test('índice ausente, JSON inválido e schema inválido retornam erros estruturados', () => {
  assert.equal(loadContextIndex({ querySelector: () => null }).error.code, 'INDEX_MISSING');
  assert.equal(parseContextIndex('{invalid').error.code, 'INVALID_JSON');
  assert.equal(parseContextIndex(JSON.stringify({ entities: {} })).error.code, 'INVALID_SCHEMA');
});

test('consulta entidade existente suporta character e event', () => {
  const loaded = loadContextIndex(rootWithIndex(indexText())).value;
  const character = queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'b0002' });
  const event = queryEntity(loaded, 'event:meeting', { chapter: 'c1', block: 'b0002' });
  assert.equal(character.ok, true);
  assert.deepEqual(character.value.facts.map(fact => fact.id), ['f1']);
  assert.deepEqual(event.value.facts, []);
});

test('fato futuro nunca aparece e o limite exato é permitido', () => {
  const loaded = loadContextIndex(rootWithIndex(indexText())).value;
  const exact = queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'b0002' });
  const before = queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'b0001' });
  const after = queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'b0004' });
  assert.deepEqual(exact.value.facts.map(fact => fact.id), ['f1']);
  assert.deepEqual(before.value.facts, []);
  assert.deepEqual(after.value.facts.map(fact => fact.id), ['f1', 'f2']);
  assert.equal(JSON.stringify(before), JSON.stringify({ ok: true, value: { id: 'character:lyra', entity: { displayName: 'Lyra' }, facts: [] } }));
});

test('capítulo diferente, posição ausente e proveniência ausente omitem fatos', () => {
  const loaded = loadContextIndex(rootWithIndex(indexText())).value;
  assert.equal(queryEntity(loaded, 'character:lyra', { chapter: 'c2', block: 'b0004' }).error.code, 'CHAPTER_MISMATCH');
  assert.equal(queryEntity(loaded, 'character:lyra').error.code, 'POSITION_REQUIRED');
  assert.equal(queryEntity(loaded, 'character:unknown', { chapter: 'c1', block: 'b0004' }).error.code, 'ENTITY_NOT_FOUND');
  assert.equal(queryEntity(loaded, 'book:unknown', { chapter: 'c1', block: 'b0004' }).error.code, 'UNSUPPORTED_ENTITY');
});

test('proveniência incoerente também omite o fato', () => {
  const malformed = JSON.parse(indexText());
  malformed.entities['character:lyra'].facts.push({
    id: 'f4', text: 'Incoherent source.', sourceChapter: 'c1', sourceBlock: 'b0001',
    revealedAt: { chapter: 'c1', block: 'b0003' }
  });
  const loaded = loadContextIndex(rootWithIndex(JSON.stringify(malformed))).value;
  const result = queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'b0004' });
  assert.deepEqual(result.value.facts.map(fact => fact.id), ['f1', 'f2']);
});

test('posição de bloco desconhecida falha fechada', () => {
  const loaded = loadContextIndex(rootWithIndex(indexText())).value;
  assert.equal(queryEntity(loaded, 'character:lyra', { chapter: 'c1', block: 'unknown' }).error.code, 'BLOCK_NOT_FOUND');
});

test('ordem ausente ou duplicada nega a consulta temporal', () => {
  const noBlocks = loadContextIndex({ querySelector: () => ({ textContent: indexText() }), querySelectorAll: () => [] }).value;
  assert.equal(queryEntity(noBlocks, 'character:lyra', { chapter: 'c1', block: 'b0002' }).error.code, 'INVALID_BLOCK_ORDER');
  const duplicateRoot = rootWithIndex(indexText());
  duplicateRoot.querySelectorAll = selector => selector === 'p[data-nf-block]' ? [{ getAttribute: () => 'b0001' }, { getAttribute: () => 'b0001' }] : [];
  const duplicate = loadContextIndex(duplicateRoot).value;
  assert.equal(queryEntity(duplicate, 'character:lyra', { chapter: 'c1', block: 'b0001' }).error.code, 'INVALID_BLOCK_ORDER');
});
