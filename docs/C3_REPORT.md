# C3 — interface contextual de personagens e eventos

## Arquitetura e posição consultada

`src/contextual-ui.js` implementa delegação de clique no artigo semântico. A inicialização resolve um único `article.nf-chapter[data-nf-chapter]`, carrega o índice com a assinatura existente `loadContextIndex(root)` e, em cada seleção, encontra o `p[data-nf-block]` ancestral. A consulta usa a assinatura existente `queryEntity(loaded, entityId, { chapter, block })`.

A posição é o bloco da ocorrência tocada; representa o ponto da interação, não confirma o progresso de leitura. A C2.1 valida o capítulo, o bloco e a ordem. A UI não faz filtragem temporal adicional.

## Transporte e links

O índice continua em `<script type="application/json" id="nf-context-index">`. O carregador agora consegue procurar no documento quando o elemento está fora de `.nf-chapter`. Ele associa pelo `chapterId` da própria estrutura semântica; índices duplicados, malformados ou sem associação inequívoca falham fechados.

Um link `[data-nf-entity]` só é interceptado depois de uma consulta bem sucedida. Se índice, posição ou entidade não puderem ser resolvidos, o evento não é cancelado e o `href` original permanece funcional. Uma consulta bem sucedida sem fatos apresenta estado vazio seguro.

## Interface e segurança

O painel rápido mostra o rótulo já visível na narrativa, tipo e até dois fatos autorizados. O perfil mostra todos os fatos retornados pela API, com capítulo/bloco de proveniência já fornecidos por ela. A UI não usa o `displayName` bruto do índice, não lista fatos ocultos ou contagens, e não inventa relações/eventos que a API não retornou.

Todos os valores são inseridos com `textContent`/`createElement`; HTML no índice aparece como texto inerte. O painel fica fora do artigo narrativo, tem botões Ver perfil/Voltar/Fechar, fecha com Escape, e devolve o foco ao link. O CSS em `src/contextual-ui.css` é incorporado ao bundle e tem tema claro/escuro, layout responsivo e áreas de toque de 44 px.

## Reexecução e limites

Uma nova inicialização remove a delegação e o painel anteriores antes de carregar novamente o índice. Isso evita listeners duplicados e dados antigos quando o Custom Script é reexecutado. Não há observador permanente de mudanças; o contrato disponível não confirma quando o LNReader substitui o capítulo nem se reexecuta o script. Sem nova execução, uma substituição interna do conteúdo pode deixar a interface antiga ativa. Essa troca automática precisa ser observada no LNReader real antes de escolher uma integração de ciclo de vida.

O próprio índice incorporado ainda não foi confirmado no WebView Android; quando indisponível, os links mantêm o destino original. Nenhuma compatibilidade Android é declarada.

## Build e testes

```text
npm run build
npm test
```

Resultado local: 33 testes aprovados, 0 falhas, incluindo execução do bundle completo com DOM simulado. Isso não comprova o comportamento no WebView Android. C4 não foi implementada.
