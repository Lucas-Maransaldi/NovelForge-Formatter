# C2.1 — hardening do Context Index Reader

## Correções

- `comparePosition()` valida a presença do bloco de revelação e do bloco consultado antes de comparar posições. Igualdade de strings não autoriza mais um bloco desconhecido.
- `loadContextIndex()` preserva a sequência de blocos do DOM e marca `orderValid` como falso quando a ordem está vazia, contém IDs inválidos ou possui duplicatas.
- `queryEntity()` exige que `position.chapter` seja exatamente o `chapterId` do índice carregado e que o bloco consultado pertença à ordem validada.
- Fatos continuam exigindo `text`, `sourceChapter`, `sourceBlock` e `revealedAt` coerentes. Dados incompletos ou referências temporais incompatíveis são omitidos.

## Erros estruturados

Além dos erros da C2, a API pode retornar `CHAPTER_MISMATCH`, `BLOCK_NOT_FOUND` e `INVALID_BLOCK_ORDER`. Esses estados não retornam fatos. `ENTITY_NOT_FOUND` continua separado do caso de entidade existente sem fatos liberados.

## Decisão C2.1-D

A posição futura será derivada na C3 do bloco semântico ancestral da entidade tocada. A consulta usará `{ chapter, block }`, validará `chapterId` e a presença do bloco no DOM, e então chamará a API filtrada. Esta entrega não adiciona listeners, popup ou interface. A posição da interação representa o ponto consultado e não prova, por si só, o progresso real de leitura; a política de disponibilização do índice continua parte da segurança antisspoiler.

## Testes e build

```text
npm run build
npm test
```

Resultado local: 21 testes aprovados, 0 falhas. Foram adicionados casos para capítulo incompatível, bloco inexistente, ordem ausente, ordem duplicada, igualdade válida somente para bloco existente e proveniência incoerente.

O bundle `dist/novelforge-lnreader.js` continua autocontido e offline. A execução e o transporte do índice ainda não foram validados no Android. C3 não foi implementada.
