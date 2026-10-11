# NovelForge — Fonte consolidada
> Pacote v0.1.1. Conteúdo transcrito do pacote v0.1.0, sem resumir. Arquivos originais identificados em cada seção.


---

## ARQUIVO ORIGINAL: `02_ARCHITECTURE/00_SYSTEM_OVERVIEW.md`

# Arquitetura consolidada

## Camadas
1. **Origem:** ZIP com HTMLs em subpastas, arquivos imutáveis e manifesto de origem.
2. **Ingestão:** descoberta, identificação, ordenação, deduplicação, hashes e blocos estáveis.
3. **Interpretação ChatGPT:** janelas, subtipos, destaques, referências, fatos com evidência e posição de revelação.
4. **Validação:** intervalos, não sobreposição estrutural, igualdade textual, antisspoiler e esquema.
5. **Persistência:** JSON de anotações, índice mestre temporal e visões contextuais.
6. **Publicação:** XHTML/HTML enriquecido e EPUB por seleção arbitrária; CSS de fallback.
7. **Leitura:** LNReader executa custom script Codex (premissa); tema adaptativo, quick notes, páginas detalhadas e filtragem temporal.

## Interfaces
- Entrada: capítulos HTML + metadados de ordenação.
- Intermediário: blocos originais + intervalos anotados + fatos de conhecimento.
- Saída: HTML enriquecido individual + EPUB sob demanda + relatórios.
- Leitor: atributos `data-nf-*`, índices contextuais acessíveis, versão do contrato.

## Princípios
- IA sugere, validador verifica, correção manual prevalece.
- Não confundir bloco `<p>` com span `<span>`; janela pode cruzar blocos ou ocupar fração de bloco.
- Não agrupar por proximidade apenas.
- Índice mestre não deve ser disponibilizado integralmente ao leitor.
- Sem conectividade obrigatória para leitura.



---

## ARQUIVO ORIGINAL: `02_ARCHITECTURE/01_INGESTION_AND_PIPELINE.md`

# Ingestão e pipeline

1. Receber ZIP e inspecionar caminhos sem executar conteúdo; prevenir path traversal e entradas inesperadas.
2. Localizar HTMLs recursivamente; coletar caminho, hash e metadados.
3. Resolver ordem narrativa a partir de evidência verificável; solicitar confirmação se ambígua.
4. Detectar duplicados, lacunas e colisões de IDs.
5. Normalizar **estrutura**, sem alterar texto; mapear nós originais, blocos e offsets.
6. Classificar sequencialmente, com contexto anterior e sem capítulos futuros.
7. Validar anotações e atualizar fatos com proveniência; manter checkpoints por capítulo.
8. Renderizar HTML semântico com fallback visual.
9. Publicar EPUB sob demanda, com navegação e recursos offline.
10. Validar integridade textual pré/pós-render, EPUB e spoilers; emitir PASS / PASS_WITH_WARNINGS / FAIL.

## Falhas
- Anotação inválida: rejeitar só a anotação, preservar narrativa.
- Integridade falhou: bloquear publicação enriquecida; fallback original apenas após validar sua integridade.
- Reprocessar apenas regiões afetadas e dependências de conhecimento.

## Saídas persistentes
HTML original, manifesto, blocos/offsets, JSON semântico, índice mestre, índices contextuais, HTML enriquecido, EPUBs gerados e relatórios de validação.



---

## ARQUIVO ORIGINAL: `02_ARCHITECTURE/02_DATA_CONTRACT.md`

# Contrato semântico — referência NF-011

## Identificadores
- Novel ID estável; chapter ID independente do caminho e do número no EPUB.
- Block ID estável; Window ID e Entity ID estáveis; schemaVersion explícito.

## XHTML anotado (ilustrativo)
```html
<article class="nf-chapter" data-nf-novel="synthetic-novel" data-nf-chapter="c1" data-nf-schema="1.0">
  <p data-nf-block="b0042"><span class="nf-entity" data-nf-entity="character:lyra">Lyra</span> entered the observatory.</p>
  <section class="nf-window" data-nf-id="w0007" data-nf-category="QUEST" data-nf-subtype="INFO" data-nf-rarity="HIDDEN">
    <p data-nf-block="b0081">[The Glass Observatory]</p>
  </section>
</article>
```
Exemplo apenas; a renderização real deve preservar a sequência e os nós originais, inclusive janelas parciais. Nunca copiar este exemplo como transcrição de capítulo.

## Índice
- `entityId`, nomes seguros no ponto de leitura, `facts[]` com `sourceChapter`, `sourceBlock` e `revealedAt`.
- Contexto de consulta inclui capítulo e bloco de origem, inclusive ao navegar para página detalhada.
- JSON externo e dados incorporados ao XHTML são representações do mesmo índice validado.

## Transporte
- Preferência inicial por índice contextual incorporado ao XHTML para acesso offline; JSON adicional para persistência.
- `<script type="application/json" id="nf-context-index">` foi **exemplo proposto**, não transporte verificado no LNReader.
- Versão incompatível → texto legível e nenhuma exposição de conhecimento incorreto.



---

## ARQUIVO ORIGINAL: `02_ARCHITECTURE/03_SECURITY_AND_INTEGRITY.md`

# Integridade, segurança e antisspoiler

- Fonte original imutável e hash por arquivo.
- Anotações referenciam intervalos da fonte; não reproduzem texto da novel.
- Validador verifica limites, sobreposições, referências existentes e correspondência textual exata (excluindo elementos gerados).
- Blocos podem conter múltiplos spans; não inserir espaços inexistentes.
- Janelas podem atravessar `<p>` ou ocupar parte de um `<p>`; nunca capturar narrativa externa.
- Sem janelas estruturais aninhadas; destaques e links podem coexistir, sem `<a>` aninhado.
- Conhecimento temporal é limitado por capítulo/bloco; aliases, títulos, IDs e âncoras também não devem vazar spoilers.
- EPUB offline com CSS de fallback; JS é enriquecimento, não requisito de legibilidade.
- Entradas ZIP/HTML não confiáveis: não executar scripts da origem, sanitizar atributos perigosos e impedir travessia de diretórios.
- Registro de proveniência, estado de revisão, versões e dependências de fatos.



---

## ARQUIVO ORIGINAL: `05_SCHEMAS/00_SCHEMA_NOTES.md`

# Esquemas de referência (não definitivos)

Exemplos JSON demonstram a forma esperada das informações, **não são JSON Schemas oficiais validados**. Tipos de offsets, IDs, serialização XHTML e transporte do índice ainda exigem decisão técnica. Não assumir que dados de exemplo são fatos de qualquer obra publicada.



---

## ARQUIVO ORIGINAL: `05_SCHEMAS/01_ANNOTATION_EXAMPLE.json`

{
  "schemaVersion": "draft-0.1",
  "novelId": "synthetic-novel",
  "chapterId": "example-unknown",
  "windows": [
    {
      "id": "w0001",
      "category": "QUEST",
      "subtype": "INFO",
      "startBlock": "b0081",
      "endBlock": "b0089",
      "confidence": "HIGH",
      "reviewState": "AUTO_APPROVED"
    }
  ],
  "highlights": [],
  "entityReferences": []
}



---

## ARQUIVO ORIGINAL: `05_SCHEMAS/02_INDEX_EXAMPLE.json`

{
  "schemaVersion": "draft-0.1",
  "novelId": "synthetic-novel",
  "chapterId": "example-unknown",
  "entities": {
    "character:example": {
      "displayName": "Personagem fictício (exemplo)",
      "facts": [
        {
          "id": "fact-example",
          "text": "Fato ilustrativo, não extraído da novel.",
          "sourceChapter": "example-unknown",
          "sourceBlock": "b0010",
          "revealedAt": {
            "chapter": "example-unknown",
            "block": "b0010"
          }
        }
      ]
    }
  }
}



---

## ARQUIVO ORIGINAL: `05_SCHEMAS/03_MANIFEST_EXAMPLE.json`

{
  "schemaVersion": "draft-0.1",
  "novelId": "synthetic-novel",
  "chapters": [
    {
      "chapterId": "unresolved",
      "sourcePath": "some-folder/chapter.html",
      "sha256": "<sha256-do-arquivo>",
      "orderStatus": "NEEDS_CONFIRMATION"
    }
  ]
}
