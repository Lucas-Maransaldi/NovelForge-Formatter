# Resultados no Android — planilha de evidências

Preencher somente após teste real. Nesta entrega nenhum aparelho/emulador LNReader foi testado. Não substituir `NOT_TESTED` por PASS com base apenas nos testes Node.

## Ambiente

- LNReader version/build:
- Android version/device:
- Android System WebView version:
- Data/hora e fuso:
- Modo avião confirmado antes do teste offline? `NOT_TESTED`
- Outros snippets desativados? `NOT_TESTED`

## Importação

| Verificação | Book A | Book B | Evidência/observação |
|---|---|---|---|
| EPUB importado | `NOT_TESTED` | `NOT_TESTED` | |
| Chapter A/B aparecem no spine | `NOT_TESTED` | `NOT_TESTED` | |
| CSS e imagem auxiliares | `NOT_TESTED` | `NOT_TESTED` | |
| Sem erro de importação | `NOT_TESTED` | `NOT_TESTED` | |

## Testes no leitor

| Teste | Resultado | Evidência/observação |
|---|---|---|
| Custom JS/CSS executado | `NOT_TESTED` | |
| location.href / origin / baseURI | `NOT_TESTED` | Cole somente o relatório copiado, que redige parte dos caminhos. |
| Resolução de `../novelforge/knowledge.json` | `NOT_TESTED` | |
| Fetch JSON file local | `NOT_TESTED` | Registrar status/erro; nenhuma chamada HTTP(S) é feita pelo POC. |
| localStorage write/read/remove probe | `NOT_TESTED` | |
| localStorage entre capítulos | `NOT_TESTED` | |
| localStorage após force-stop/reabertura | `NOT_TESTED` | |
| IndexedDB open/store/write/read | `NOT_TESTED` | |
| IndexedDB entre capítulos | `NOT_TESTED` | |
| IndexedDB após force-stop/reabertura | `NOT_TESTED` | |
| Probe de namespace entre livros | `NOT_TESTED` | |
| Isolamento real por origem | `NOT_TESTED` | Não inferir por bookId/chaves distintas. |
| Carrier script pós-sanitização | `NOT_TESTED` | Somente marcador/estado, sem copiar payload. |
| Carrier hidden DIV pós-sanitização | `NOT_TESTED` | Registrar atributos hidden/style/data, computed display/visibility e innerText boolean. |
| Carrier class DIV e CSS pós-sanitização | `NOT_TESTED` | Registrar classe/data/textContent boolean e computed style. |
| Marcador de payload aparece visualmente | `NOT_TESTED` | Não registrar/capturar conteúdo narrativo. |
| Troca A → B → A | `NOT_TESTED` | |
| Operação offline após reinício | `NOT_TESTED` | |

## Relatórios copiados

Book A / Chapter A:

```text
Cole o relatório aqui após verificar que não contém dados privados.
```

Book A / Chapter B:

```text
NOT_TESTED
```

Book B / Chapter A:

```text
NOT_TESTED
```

Após force-stop/reabertura:

```text
NOT_TESTED
```

## Erros e observações

- Erros (tipo/status, sem JSON integral):
- Diferenças por capítulo:
- Diferenças entre A e B:
- Observações sobre WebView/origem:
- Evidência (captura/log sem dados privados):

## Critério de preenchimento

- `PASS`: teste executado e resultado observado, com versão do ambiente/evidência.
- `FAIL`: teste executado e resultado negativo observado.
- `UNKNOWN`: observação não permite concluir (por exemplo, chave ausente não prova isolamento de origem).
- `NOT_TESTED`: etapa não executada.

Persistência após reinício só pode ser marcada `PASS` depois de force-stop/reabertura sem limpar dados e de leitura de registro anterior identificado. Testes automatizados do fixture não substituem este procedimento.
