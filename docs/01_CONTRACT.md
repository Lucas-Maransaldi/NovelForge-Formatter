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

## Adendo C5.6 — Remote Knowledge

A integração remota de enciclopédia é uma decisão complementar, versionada em [NF-RK-001](contracts/NF-RK-001.md) e [C5.6 Remote Knowledge](decisions/C5_6_REMOTE_KNOWLEDGE.md). Ela substitui somente a fonte de dados do popup de produção; não altera marcadores de janelas nem embute o índice mestre no EPUB. NF-011 permanece como histórico e as regras locais C2 continuam disponíveis para consumidores que as usem explicitamente, mas o popup remoto oficial não faz fallback local.

O ID de produção configurado é `overgeared`; consultas exigem `data-nf-novel`, capítulo numérico e bloco `bNNNN` explícitos. Identidade ou posição ausente/inválida significa nenhuma consulta/fato remoto. O cliente não infere atributos, não depende de APIs privadas do LNReader e não faz fetch durante a inicialização visual.

A consulta é online-only fora do cache temporário em memória de registros já validados. Ausência de endpoint/dados ou falha de rede mantém formatter/CSS funcionando e mostra indisponibilidade no popup. Não existe dataset real publicado nesta versão; a resposta remota deve permanecer indisponível até publicação autorizada conforme [o procedimento](REMOTE_KNOWLEDGE_PUBLISHING.md).
