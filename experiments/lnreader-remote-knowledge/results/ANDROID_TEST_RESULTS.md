# C5.4 — resultados Android

Preencher somente após executar em LNReader Android real. Testes locais Node/headless não são evidência Android. Todos os resultados começam como `NOT_TESTED`.

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
| SHA-256 via Web Crypto | `NOT_TESTED` | |
| byteLength exato | `NOT_TESTED` | |
| Filtro 889:42 | `NOT_TESTED` | Esperado fact-001, fact-002. |
| Filtro 900:4 | `NOT_TESTED` | Esperado fact-001, fact-002; fact-003 proibido. |
| Filtro 900:5 | `NOT_TESTED` | Esperado fact-001, fact-002, fact-003. |
| Duração / resultado primeira rodada | `NOT_TESTED` | |
| Duração / resultado segunda rodada | `NOT_TESTED` | Duração não prova cache. |
| Repetição sem objeto JSON em memória | `NOT_TESTED` | |
| Resultado após force-stop/reabertura | `NOT_TESTED` | Não há armazenamento persistente na POC. |
| Execução em modo avião | `NOT_TESTED` | |

## Relatórios

```text
Cole aqui o relatório online após revisar privacidade. Inicial: NOT_TESTED
```

```text
Cole aqui o relatório offline após revisar privacidade. Inicial: NOT_TESTED
```

## Critério

`PASS` requer evidência reproduzível no dispositivo. `FAIL` é falha observada; `UNKNOWN` não permite concluir; `NOT_TESTED` não foi executado. Não classificar TypeError como CORS sem evidência adicional, não declarar cache com base em tempo e não declarar compatibilidade Android usando testes Node.
