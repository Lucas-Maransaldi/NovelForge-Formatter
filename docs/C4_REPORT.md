# Entrega C4 — robustez e preparação para distribuição

## Implementado na C4 original

- Adaptador reprocessa alterações agrupadas dentro de `#LNReader-chapter` e substituição direta do contêiner usando um `MutationObserver` limitado; há somente uma tarefa pendente por lote. Inserções/remoções irmãs sem troca do capítulo (como UI/estilos) são ignoradas. Sem `MutationObserver`, permanece a inicialização e a espera limitada já existente.
- Reinicialização de UI limpa listener/modal anteriores. A UI contextual continua consumindo somente `queryEntity`, que aplica a política temporal C2.1; índice ambíguo/ausente/inválido não desativa o formatter visual e não intercepta os links.
- Modal recebe foco ao abrir, mantém Tab/Shift+Tab dentro dos controles e fecha por Escape/botão. Ao fechar, restaura ao gatilho conectado ou tenta focar o contêiner de capítulo; troca de capítulo fecha sem focar elemento obsoleto.
- Fatos permanecem inseridos via `textContent`/`createElement`; nenhum texto narrativo ou atributo semântico é reescrito.
- Versão `0.4.0` centralizada em `package.json`, usada pelo cabeçalho do build. Documentação de instalação e matriz de validação Android adicionadas.

## Build e testes

`npm.cmd run build` gerou `dist/novelforge-lnreader.js`; `npm.cmd test` passou 33/33 testes Node nesta execução. O artefato permanece autocontido, sem imports de runtime, `require()`, `fetch()` ou CDN, conforme verificações existentes.

## Pendências e limites

- A matriz `docs/ANDROID_VALIDATION.md` está integralmente PENDING; não houve execução real em dispositivo Android nem confirmação adicional de APIs/configuração de Custom Scripts.
- A observação exige suporte a `MutationObserver` para reagir a conteúdo substituído sem nova execução do script. Em ambientes sem suporte, a recuperação automática de swaps posteriores não é garantida.
- O build gera também o artefato legado `dist/novelforge-formatter.js`; a entrega LNReader indicada para distribuição/teste é `dist/novelforge-lnreader.js`.
- Não houve publicação, integração externa nem trabalho C5.

## Correção incremental C4.1

A partir de C4.1, o `MutationObserver` descrito acima foi removido. O gatilho principal é a execução do Custom Code por capítulo pelo LNReader, hipótese ainda pendente de validação Android. O adaptador mantém apenas uma espera inicial finita. Cada reexecução chama `enhance` idempotente e reinicializa a UI, que descarta estado anterior. Cada interação recarrega o índice contextual do capítulo antes de chamar `queryEntity`, para não usar uma cópia antiga se o conteúdo foi repopulado no mesmo DOM.

Ver também `docs/C4_1_REPORT.md`; esse documento representa o comportamento final do pacote.
