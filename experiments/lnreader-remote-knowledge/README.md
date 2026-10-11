# NovelForge C5.4 — Remote Knowledge POC

Experimento isolado para testar se o Custom Code do LNReader Android pode buscar por HTTPS um JSON público, validar manifesto/bytes, aplicar corte antisspoiler por capítulo **e bloco**, e repetir consultas sem reutilizar o objeto JSON em memória. Todos os fatos são sintéticos. Isso não é integração de produção e não prova compatibilidade Android, CORS, disponibilidade do CDN ou cache.

### C5.4.1 — SHA-256 fallback e antisspoiler

Na rodada Android C5.4 informada pelo usuário, HTTPS/CORS retornaram PASS (origin `null`, `response.type=cors`, HTTP 200), mas `crypto.subtle.digest` não estava disponível; portanto SHA-256 e antisspoiler remoto ficaram sem comprovação. A origem opaca/`about:blank` pode acionar restrições de secure context da WebView, mas esse dado sozinho não identifica a causa exata. O diagnóstico tenta Web Crypto e recorre ao SHA-256 puro JavaScript sobre os octetos recebidos se a API estiver ausente ou falhar.

O fallback é exercitado por vetores conhecidos contra `node:crypto`, incluindo padding nos comprimentos 55/56/63/64/65, múltiplos blocos, bytes binários e UTF-8 multibyte. O fluxo remoto só decodifica/interpreta o conhecimento após conferir tamanho e hash. O relatório identifica `WEB_CRYPTO` ou `JS_FALLBACK`, tempo de digest e resultado de integridade. A autenticidade continua fora do alcance: manifesto e JSON na mesma origem podem ser ambos substituídos por quem controla essa origem; uma referência confiável com hash/revisão pinada seria uma proteção futura.

As consultas remotas mostram apenas IDs: `ALLOW` e `DENY`. A inclusão de bloco é numérica e inclusiva no ponto de revelação. Um resultado geral `PASS` exige duas rodadas completas; falha em qualquer uma impede `PASS`. Os resultados Android específicos da C5.4.1 permanecem `NOT_TESTED` até novo teste no aparelho.

## Preparar e validar localmente

Requer Node.js 18+ e não instala dependências nem acessa a rede.

```powershell
node experiments/lnreader-remote-knowledge/scripts/generate-manifest.mjs
node experiments/lnreader-remote-knowledge/scripts/validate-fixtures.mjs
node experiments/lnreader-remote-knowledge/scripts/test-remote-diagnostic.mjs
```

O manifesto determinístico registra schema, bookId, revision, caminho, SHA-256 e byteLength dos bytes UTF-8 exatos de `braham.json`. O validador confere integridade, estrutura, ordenação/proveniência, filtro e segurança estática; o teste headless executa o próprio Custom Code contra respostas simuladas, sem rede real. SHA-256 prova somente que os bytes recebidos coincidem com o manifesto usado na comparação. Se ambos vierem da mesma origem não confiável, isso não autentica o publicador. `revision` identifica a revisão lógica do fixture, não é cache nem hash Git. Cache HTTP é comportamento do WebView/CDN e não pode ser provado por tempos ou headers isolados.

## Publicar e conferir disponibilidade

Arquivos locais ou um commit local não estão publicados. É necessário que o commit seja enviado ao GitHub (`push`) para que os endpoints possam ser consultados. Esta entrega não faz commit nem push. Após publicar, confira os dois arquivos em navegador/requisição HTTPS antes do Android:

```text
https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/manifest.json
https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/braham.json
```

Esses são destinos pretendidos, não disponibilidade confirmada. O CDN pode demorar para atualizar. Para reprodução, prefira substituir `@main` nos dois valores `REMOTE_*_URL` em `custom-code/remote-diagnostic.js` por `@<commit-sha>` da revisão publicada, mantendo o resto do caminho. Hash SHA-256 dos bytes do JSON e hash Git do commit têm finalidades distintas.

## Instalar e executar no LNReader

1. Confirme que os dois endpoints acima (ou os endpoints da revisão fixada) respondem publicamente e que manifesto e JSON são parseáveis. Não faça teste Android antes do push/CDN.
2. Copie o conteúdo completo de `custom-code/remote-diagnostic.js` para um novo snippet JavaScript Custom Code. O padrão usa URLs absolutas HTTPS. Se fixar um commit, edite **ambas** as constantes `REMOTE_MANIFEST_URL` e `REMOTE_KNOWLEDGE_URL` para a mesma revisão.
3. Opcional: instale `custom-code/remote-diagnostic.css` em snippet CSS separado. O painel também é utilizável sem ele.
4. Desative temporariamente outros snippets que criem painel ou modifiquem o DOM, preservando seus conteúdos para reativação. Abra um capítulo e toque em **Executar diagnóstico**; não há fetch automático ao instalar/carregar.
5. Aguarde `CONCLUÍDO` e toque em **Copiar relatório**. O botão aguarda a execução completa. O painel não mostra texto dos fatos; o relatório contém somente IDs permitidos/bloqueados e metadados de rede.

Cada rodada busca novamente manifesto e JSON, duas vezes em sequência: quatro requests esperados se tudo chegar à resposta. Não há cache próprio em memória entre consultas. O WebView/CDN pode reutilizar cache HTTP; `Age`, `ETag`, `Cache-Control` e duração são observações, não prova de cache nem de download novo. `redirect: error` rejeita redirecionamentos; comportamento e erro final variam por WebView. Quando `response.url` existe, a URL final também é conferida. Quando não existe, a validação depende da política de redirect do Fetch implementada no dispositivo.

## Online e offline

Online: desligue modo avião, execute a rodada duas vezes, confirme `PASS` para respostas HTTPS, status, validação do manifesto/bytes, SHA-256 (se disponível) e filtros. `TypeError` é reportado como falha observada, **não** classificado automaticamente como CORS; também pode ser rede, DNS, TLS, URL ou política da WebView. Headers CORS/cache ausentes via JavaScript significam `NOT_EXPOSED`, não que o servidor não os enviou.

Offline manual: (1) execute e guarde relatório online bem-sucedido; (2) feche LNReader; (3) ative modo avião; (4) reabra o app; (5) execute novamente; (6) copie o relatório. Falha offline não demonstra suporte por cache. A POC não adiciona armazenamento persistente nem promete uso offline.

## Estados e limites de segurança

- `PASS`: verificação observável passou nesta rodada.
- `FAIL`: resposta/operação observável falhou ou divergência foi encontrada.
- `UNKNOWN`: a observação não permite uma conclusão, como inferir cache só pelo tempo.
- `NOT_TESTED`: recurso ausente ou etapa manual não executada (por exemplo Web Crypto ausente e offline).

Somente HTTPS, duas URLs configuradas, credenciais omitidas, modo CORS, sem `no-cors`, sem APIs autenticadas, tokens, proxy, JSONP, `eval`, `Function`, execução remota, armazenamento persistente ou telemetria. O redirect é configurado como `error`; limitações de implementação do Fetch no WebView permanecem. O corpo é limitado por stream real quando `ReadableStream` está disponível. Sem stream, `arrayBuffer()` pode alocar antes do limite pós-leitura; isso será indicado na falha. Limites: manifesto 4 KiB, conhecimento 64 KiB, 100 fatos e strings de até 1000 caracteres.

SHA-256 usa `crypto.subtle.digest` quando disponível e, caso contrário, o fallback JavaScript puro testado. Se ambos falharem, registra falha e bloqueia o uso do conhecimento. Nenhum fato remoto é renderizado: apenas IDs que passaram pela proveniência numérica `revealedAt.chapter/block`. Dados/posição/schema inválidos falham fechado.

Para repetir a C5.4.1 no Android, substitua manualmente os snippets JavaScript **e** CSS pelo conteúdo atualizado em `custom-code/`. Não é necessário republicar EPUBs nem modificar `fixtures/braham.json` ou `fixtures/manifest.json`; valide que ambos permanecem byte-a-byte iguais. Envie o relatório copiado e preencha `results/ANDROID_TEST_RESULTS.md`.

Envie para revisão o relatório inteiro após remover qualquer dado que considere privado, além de modelo Android, versão Android, LNReader/WebView, data/hora, commit/URLs testadas e se estava online/offline. Preencha também `results/ANDROID_TEST_RESULTS.md`. Nenhum resultado Android está presumido nesta POC.
