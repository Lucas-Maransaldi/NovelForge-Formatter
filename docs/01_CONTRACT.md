# NF-011 — contrato de integração (referência operacional)

Fontes normativas completas disponíveis em `docs/reference/` (cópias das Sources do Project). Em conflito, decisões aprovadas prevalecem sobre exemplos PoC.

## HTML/XHTML
- Capítulo: `article.nf-chapter[data-nf-novel][data-nf-chapter][data-nf-schema]`.
- Bloco: `p[data-nf-block]`, IDs estáveis por capítulo.
- Janela: `.nf-window[data-nf-id][data-nf-category][data-nf-subtype]`, `data-nf-rarity` opcional.
- Entidade: `[data-nf-entity]` com ID estável (ex.: `character:lyra`). Na fixture sintética é `<a>` com `href` para XHTML separado; **não seguir o href para o popup**; capturar clique apenas se for possível fazê-lo sem quebrar o leitor.
- O CSS da PoC já estiliza QUEST; evitar duplicar estrutura/decoração.
- Nunca reclassificar texto; não inserir `.nf-window` dentro de `.nf-window`.

## Índice contextual
- `schemaVersion`, `novelId`, `chapterId`, `entities`, `facts[]` e `revealedAt.chapter/block`.
- O JSON externo da fixture é um artefato de desenvolvimento; **não pressupor que o WebView consegue ler arquivos arbitrários do EPUB**.
- A PoC contém `chapterOrder: null` e `chapterId: poc-source-unknown`: isso **não** fornece ordem global confiável. Só comparar blocos dentro desse mesmo capítulo; para outras posições, não revelar fatos.
- C2 deverá testar o transporte do índice de forma real: preferir dados incorporados no XHTML se comprovadamente acessíveis; JSON externo apenas quando acesso estiver demonstrado. Sem transporte válido, não exibir informações.
- Perfil detalhado e nota rápida usam o mesmo filtro temporal e a posição de origem, mesmo se o usuário rolar ou navegar.
- O índice mestre não deve ser empacotado no EPUB.

## VIS-R13
Delimitadores redundantes (como `[` e `]`) podem ser ocultados visualmente quando marcados semanticamente, **sem apagar texto/nós**. Não ocultar caracteres arbitrários nem deixar o formatter alterar a narrativa.

## Compatibilidade
- Script em EPUB local: confirmado pelo usuário.
- APIs e formato de execução do custom script LNReader: **não documentados neste pacote**; Codex deve observar script existente/ambiente do usuário, não inventar integração.
- Links para outro XHTML: falharam no LNReader testado; não basear a UI contextual nessa navegação.
