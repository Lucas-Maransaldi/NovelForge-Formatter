# NovelForge C5.4 — Remote Knowledge POC

## Objetivo e estado

POC experimental para verificar a possibilidade de o Custom Code LNReader buscar JSON público via HTTPS, conferir manifesto/SHA-256/byteLength, validar entidade e fatos e filtrar fatos por capítulo e bloco. Não é integração de produção. Android, CORS, Web Crypto, CDN e cache permanecem `NOT_TESTED`; a POC não declara viabilidade.

## Arquivos

- `README.md`: geração, publicação, instalação, execução, online/offline, interpretação e limites.
- `fixtures/braham.json`, `fixtures/manifest.json`: conteúdo integralmente sintético e manifesto determinístico.
- `scripts/generate-manifest.mjs`: SHA-256/byteLength Node sem rede ou timestamp variável.
- `scripts/validate-fixtures.mjs`: valida fixture, manifesto, temporalidade, segurança e Custom Code.
- `scripts/test-remote-diagnostic.mjs`: executa o Custom Code real em VM/headless com respostas simuladas.
- `custom-code/remote-diagnostic.js` e `.css`: diagnóstico standalone, sem módulos/imports/API LNReader presumida.
- `results/ANDROID_TEST_RESULTS.md`: campos Android iniciados em `NOT_TESTED`.

## Testes locais

`validate-fixtures.mjs` valida JSON/schema/IDs/ordem/proveniência/hash/tamanho, filtro em posições limite, byte alterado, parse inválido, sintaxe e guardas estáticas; também regenera e compara o manifesto determinístico. `test-remote-diagnostic.mjs` não faz rede real: executa o próprio snippet com Fetch/Response simulados para sucesso e duas rodadas independentes, headers, capítulos/blocos, HTTP 503, TypeError de rede, timeout, parse, byte/hash alterado, schema/IDs/proveniência inválidos, limite de resposta e ausência de Web Crypto.

Resultados locais: `validate-fixtures.mjs` e `test-remote-diagnostic.mjs` passaram em Node neste ambiente; `npm.cmd test` do projeto retornou 39 aprovados e 1 falha no verificador preexistente do manifesto SHA-256 global. O manifesto global não foi atualizado porque está fora do escopo. Os testes são Node, não evidência Android. Não foram alterados formatter, bundle, contratos ou arquivos globais; não fazer commit/push automaticamente nesta entrega.

## Segurança e limitações

Endpoints HTTPS absolutos e explícitos; redirect `error`; credentials `omit`; somente JSON como dado; sem `eval`, código remoto, storage, telemetria ou tráfego além das duas URLs declaradas. Streaming impõe tamanho real quando disponível; fallback `arrayBuffer` precisa alocar antes da checagem e é limitação documentada. Redirecionamentos são rejeitados por Fetch e URL final é verificada se exposta, mas comportamento depende do WebView. TypeError não é sinônimo de CORS. Headers não expostos não significam ausentes. SHA-256 valida consistência de bytes com o manifesto, não autentica uma origem que controla ambos.

O cache HTTP será observado por headers/duração, sem prova conclusiva de cache ou download. Cada rodada faz fetch novo e não reutiliza JSON em memória; a WebView/CDN ainda pode cachear. Não há armazenamento offline/persistente. CORS, modo `origin: null`, `crypto.subtle` e compatibilidade real precisam ser confirmados em Android.

## Critérios de decisão

Considerar HTTPS viável para uma próxima decisão (não produção automática) somente se, em Android documentado, os endpoints públicos forem acessíveis de origem `null`, JSON e identidade forem corretos, SHA-256 e byteLength forem verificados, consultas por capítulo/bloco passarem sem fato futuro, limites/timeout se comportarem e resultados se repetirem em mais de uma rodada. Uma abordagem que dependa de ignorar CORS, executar JS remoto, aceitar integridade não verificada como segura, revelar futuro, depender de cache incerto para funcionamento básico, ou exceder limites/timeout deve ser rejeitada ou redesenhada.

Questões abertas: CORS real no LNReader/WebView; `crypto.subtle` sob origem opaca; disponibilidade e comportamento jsDelivr; redirect/error; headers expostos; cache e modo offline. A próxima decisão arquitetural possível é avaliar transporte HTTPS versionado com pinagem de commit e política explícita de fallback, somente após evidência Android; esta POC não altera NF-011/C2.1.

## Execução Android

Seguir integralmente `README.md` e registrar evidências em `results/ANDROID_TEST_RESULTS.md`. Necessário publicar primeiro; commit local não expõe recursos. Fixar commit em vez de `main` para reprodutibilidade. Rodar online antes do procedimento offline. Nenhum resultado Android foi inventado nesta entrega.
