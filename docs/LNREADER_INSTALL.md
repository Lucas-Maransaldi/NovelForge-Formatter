# Instalação local no LNReader

Artefato principal: `dist/novelforge-lnreader.js` (v0.5.0 release candidate). A instalação local usa um único script autocontido com CSS incluído. A formatação visual não acessa a rede; a popup contextual consulta HTTPS sob demanda.

## Instalação

1. Baixe o arquivo completo `dist/novelforge-lnreader.js` da distribuição ou gere-o com `npm run build`.
2. Abra o arquivo e copie todo o seu conteúdo JavaScript.
3. Abra a configuração de Custom Code/Custom Script disponível na sua versão do LNReader.
4. Cole o conteúdo completo no editor de script e salve a configuração.
5. Abra EPUB enriquecido com metadados compatíveis com [NF-RK-001](contracts/NF-RK-001.md). Para Overgeared, são necessários `data-nf-novel="overgeared"`, capítulo numérico, bloco `bNNNN` e entidade marcada. O índice local `#nf-context-index` não é fallback do popup oficial.
6. Verifique formatação e texto/links intactos. O popup remoto só mostrará fatos se uma revisão real estiver publicada. Sem dados, ERROR é esperado e a leitura/formatação deve continuar. Registre evidências em `docs/ANDROID_VALIDATION.md`.

Os rótulos exatos dos menus e quaisquer APIs de importação/carregamento variam e não foram confirmados; não são presumidas APIs LNReader privadas. Não use loader remoto de script. O fetch HTTPS do Knowledge ocorre sob demanda para URLs fixas documentadas. Veja também `docs/DISTRIBUTION.md`.

## Diagnóstico opcional

Para investigar quando o LNReader executa Custom Code e o que permanece no DOM, use temporariamente o script independente `scripts/lnreader-diagnostic.js`, seguindo `docs/LNREADER_DIAGNOSTICS.md`. Ele não faz parte do bundle de produção e pode ser removido pelo próprio botão.

## Ciclo de vida e estado de validação

O NovelForge utiliza a execução do Custom Code pelo LNReader como gatilho principal de inicialização de cada capítulo. Essa estratégia depende de o LNReader executar o Custom Code a cada abertura de capítulo. O comportamento será confirmado durante a validação Android. O adaptador tem somente uma espera inicial limitada; não monitora continuamente o DOM.

O formatter visual funciona sem índice ou rede. A UI remota falha fechada se identidade, capítulo, bloco ou conteúdo não forem válidos; não consulta o índice C2 local como fallback. Compatibilidade C5.6 Android continua **não validada** até teste real do bundle integrado.
