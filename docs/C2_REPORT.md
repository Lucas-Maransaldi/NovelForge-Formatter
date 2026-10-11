# C2 — leitor de índice contextual

## Transporte

O leitor usa o elemento incorporado no XHTML:

```html
<script type="application/json" id="nf-context-index">{...}</script>
```

`loadContextIndex(root)` lê esse elemento pelo DOM e deriva a ordem dos blocos a partir de `p[data-nf-block]`. Não usa `fetch`, URLs, filesystem ou navegação XHTML. A fixture pública `tests/fixtures/chapter-synthetic.xhtml` contém um exemplo sintético desse transporte. Os arquivos de referência da PoC ficam locais e não são distribuídos.

O transporte incorporado foi proposto no contrato e está presente na fixture, mas ainda não foi comprovado no WebView Android do LNReader. Essa é a limitação de integração pendente, sem alterar o contrato silenciosamente.

## API

O módulo `src/context-index.js` e o bundle final expõem:

- `loadContextIndex(root)`: retorna `{ ok: true, value: { index, blockOrder, source } }` ou erro estruturado.
- `parseContextIndex(text)`: valida JSON e campos mínimos do índice.
- `queryEntity(loaded, entityId, position)`: consulta `character:*` e `event:*`, retornando `{ ok, value }` ou `{ ok: false, error: { code, message, details } }`.
- `comparePosition(revealedAt, position, blockOrder)`: comparação fechada por capítulo e bloco.

Posições exigem `{ chapter, block }`. Um fato só é retornado quando possui texto, `sourceChapter`, `sourceBlock`, `revealedAt` coerente e bloco conhecido na ordem do DOM. Fatos futuros, capítulos diferentes, blocos desconhecidos e proveniência ausente são omitidos. O limite exato (`revealedAt.block === position.block`) é permitido.

## Build e testes

```text
npm run build
npm test
```

O build mantém `dist/novelforge-lnreader.js` autocontido, incorporando o leitor e o CSS. Resultado local: 19 testes aprovados, 0 falhas.

Não há popup, perfil, enciclopédia ou navegação entre XHTMLs. A API é independente da interface e ainda não é chamada por UI.

Validação Android real permanece pendente. C3 não foi implementada.
