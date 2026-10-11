# Instalação local no LNReader

Artefato principal: `dist/novelforge-lnreader.js` (v0.4.0 preview). A primeira validação deve usar instalação local por cópia; o script é autocontido, inclui CSS e não busca recursos pela rede.

## Instalação

1. Baixe o arquivo completo `dist/novelforge-lnreader.js` da distribuição ou gere-o com `npm run build`.
2. Abra o arquivo e copie todo o seu conteúdo JavaScript.
3. Abra a configuração de Custom Code/Custom Script disponível na sua versão do LNReader.
4. Cole o conteúdo completo no editor de script e salve a configuração.
5. Abra um EPUB de teste que contenha marcações NovelForge `data-nf-*`. Para consultas contextuais, o XHTML renderizado também precisa conter `#nf-context-index` e blocos ordenados `p[data-nf-block]`.
6. Verifique formatação, texto/links intactos e, quando o índice estiver disponível, a consulta antisspoiler. Registre evidências em `docs/ANDROID_VALIDATION.md`.

Os rótulos exatos dos menus e quaisquer APIs de importação/carregamento variam e não foram confirmados neste projeto. Não use um loader remoto nem presuma que a WebView permite scripts externos. Veja também `docs/DISTRIBUTION.md`.

## Diagnóstico opcional

Para investigar quando o LNReader executa Custom Code e o que permanece no DOM, use temporariamente o script independente `scripts/lnreader-diagnostic.js`, seguindo `docs/LNREADER_DIAGNOSTICS.md`. Ele não faz parte do bundle de produção e pode ser removido pelo próprio botão.

## Ciclo de vida e estado de validação

O NovelForge utiliza a execução do Custom Code pelo LNReader como gatilho principal de inicialização de cada capítulo. Essa estratégia depende de o LNReader executar o Custom Code a cada abertura de capítulo. O comportamento será confirmado durante a validação Android. O adaptador tem somente uma espera inicial limitada; não monitora continuamente o DOM.

O formatter visual funciona sem índice; a UI contextual falha fechada se índice, capítulo ou posição não forem válidos. Compatibilidade Android continua **não validada** até testes reais no dispositivo.
