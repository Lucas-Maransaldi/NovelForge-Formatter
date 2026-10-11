# C5.4 — resultados Android

Preencher somente após executar em LNReader Android real. Testes locais Node/headless não são evidência Android. Todos os resultados começam como `NOT_TESTED`.

## Evidência C5.4 já reportada pelo usuário (não é teste C5.4.1)

- `location.href` / `document.baseURI`: `about:blank`; `location.origin`: `null`.
- HTTPS fetch / CORS: `PASS` reportado; `response.type=cors`, HTTP 200, `Access-Control-Allow-Origin: *`.
- Manifesto recebido: 243 bytes; revisão `fixture-r1`, bookId `nf-overgeared-poc`.
- Conhecimento recebido: 614 bytes.
- Tempos reportados: primeira rodada manifesto 554 ms/conhecimento 306 ms; segunda rodada 4 ms/5 ms.
- Cache HTTP: `UNKNOWN`.
- `crypto.subtle.digest`: indisponível; SHA-256 `NOT_TESTED`; antisspoiler remoto ainda sem comprovação.

Essa evidência motivou o fallback C5.4.1. A explicação específica para Web Crypto indisponível em `about:blank`/origem nula não está confirmada.

## Ambiente

- Modelo do dispositivo: `NOT_TESTED`
- Versão Android: `NOT_TESTED`
- Versão Android System WebView: `NOT_TESTED`
- Versão/build LNReader: `NOT_TESTED`
- Data/hora e fuso: `NOT_TESTED`
- Estado online/offline: `NOT_TESTED`
- Commit remoto fixado: `NOT_TESTED`
- URLs testadas: `NOT_TESTED`

## Resultados observados

| Verificação | Resultado | Evidência/observações |
|---|---|---|
| Custom Code executa e painel aparece | `NOT_TESTED` | |
| HTTPS fetch / CORS de origem `null` | `NOT_TESTED` | Não inferir CORS apenas por TypeError. |
| HTTP status / response.ok | `NOT_TESTED` | |
| response.type / url / redirected | `NOT_TESTED` | |
| Content-Type / ACAO / Cache-Control / ETag / Age | `NOT_TESTED` | Headers não expostos não provam ausência no servidor. |
| JSON parse / schema / bookId / entityId | `NOT_TESTED` | |
| Implementação SHA-256 (WEB_CRYPTO / JS_FALLBACK) | `NOT_TESTED` | Registrar qual caminho foi usado. |
| Digest SHA-256 | `NOT_TESTED` | Deve comparar hash dos bytes exatos. |
| Tempo de cálculo SHA-256 | `NOT_TESTED` | |
| Integridade byteLength + hash | `NOT_TESTED` | Tamanho sozinho não valida integridade. |
| byteLength exato | `NOT_TESTED` | |
| Filtro 889:42 | `NOT_TESTED` | Esperado `ALLOW fact-001, fact-002`; `DENY fact-003`. |
| Filtro 900:4 | `NOT_TESTED` | Esperado `ALLOW fact-001, fact-002`; `DENY fact-003`. |
| Filtro 900:5 | `NOT_TESTED` | Esperado `ALLOW fact-001, fact-002, fact-003`. |
| Future facts leaked | `NOT_TESTED` | Esperado `NO`. |
| Resultado geral C5.4.1 | `NOT_TESTED` | Só PASS se as duas execuções e todas as validações obrigatórias passarem. |
| Duração / resultado primeira rodada | `NOT_TESTED` | |
| Duração / resultado segunda rodada | `NOT_TESTED` | Duração não prova cache. |
| Repetição sem objeto JSON em memória | `NOT_TESTED` | |
| Resultado após force-stop/reabertura | `NOT_TESTED` | Não há armazenamento persistente na POC. |
| Execução em modo avião | `NOT_TESTED` | |
| SHA-256 com Web Crypto deliberadamente indisponível | `NOT_TESTED` | Esperado `JS_FALLBACK`; testar na configuração C5.4 observada ou sem `crypto.subtle`. |

## Relatórios

```text
Cole aqui o relatório online após revisar privacidade. Inicial: NOT_TESTED
```

```text
Cole aqui o relatório offline após revisar privacidade. Inicial: NOT_TESTED
```

## Critério

`PASS` requer evidência reproduzível no dispositivo. `FAIL` é falha observada; `UNKNOWN` não permite concluir; `NOT_TESTED` não foi executado. Não classificar TypeError como CORS sem evidência adicional, não declarar cache com base em tempo e não declarar compatibilidade Android usando testes Node.
