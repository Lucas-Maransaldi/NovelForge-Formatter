# Plano de testes — Codex

## C1 (primeira execução)
- Detectar `article.nf-chapter` e janelas QUEST já anotadas.
- Não criar SYSTEM aninhado em QUEST; nunca inferir janela a partir de `[... ]`.
- Sem mutação de `textContent` do capítulo, sem duplicar `.nf-window`.
- Rodar duas vezes (idempotência); tolerar ausência de marcação.
- Não quebrar fallback CSS nem modo escuro.
- Teste real no Android: script executa, QUEST continua com caixa única.

## C2
- Verificar transporte e leitura do índice **no WebView do LNReader**.
- Testar `revealedAt` no mesmo capítulo antes/depois do bloco e capítulos desconhecidos.
- Sem índice ou posição inválida => nenhum fato exibido.

## C3
- Toque em uma entidade sintética abre quick note no mesmo documento, sem `ERR_FILE_NOT_FOUND`.
- Visualização detalhada sem navegar para outro XHTML; preservar posição de origem.
- Fechar popup e retornar à leitura; sem `<a>` aninhado.
- Testes locais: entidade character/event, bloco ancestral, consulta C2.1, link preservado em falha, índice externo/ambíguo, XSS inerte, quick/profile/volta/fechar/Escape, reexecução sem duplicação.
- Validação Android continua necessária para Custom Script, toque, foco, WebView e ciclo de substituição de capítulos.

## C4
- Verificar integridade de texto antes/depois, duplicações, falhas de schema, ausência de índice, modo escuro e acessibilidade.
- Evidências Android: capturas, console/log quando disponível, versão do LNReader e do script.

## Limitações atuais
Nenhum teste automatizado substitui validação Android. A fixture contém fatos demonstrativos, não enciclopédia completa.

## C4.1
- O Custom Code executado pelo LNReader é o gatilho de inicialização; não há MutationObserver nem polling permanente.
- Reexecução limpa UI/listener anterior e inicializa o contêiner/capítulo atual de modo idempotente.
- Cada clique recarrega o índice do capítulo e consulta apenas pela API C2.1; contexto inconsistente falha fechado.
- Integridade: `npm run manifest:verify`; atualizar deliberadamente com `npm run manifest:generate`.
- O gatilho de execução por capítulo permanece hipótese até validação Android (`docs/ANDROID_VALIDATION.md`).
