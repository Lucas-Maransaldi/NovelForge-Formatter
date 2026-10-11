# NovelForge Storage POC — relatório

## 1. Objetivo

Criar um experimento reproduzível para observar, no LNReader Android, acesso ao JSON auxiliar de um EPUB sintético, disponibilidade/persistência de `localStorage` e IndexedDB, carriers HTML após sanitização, troca de capítulos e separação lógica entre dois livros. Esta POC não implementa transporte/context index de produção nem atualiza NF-011/C2.1.

## 2. Hipóteses

1. O EPUB pode conter `application/json`, mas isso não prova preservação nem acesso pela página.
2. `fetch()` relativo pode falhar porque a página do leitor é montada de HTML string com base/origem que precisa ser observada no Android.
3. Web storage pode estar disponível, mas write/read na mesma carga não prova persistência entre capítulos ou reinício.
4. Namespace por `bookId` não equivale a isolamento real de origem da WebView.
5. Sanitização do capítulo pode remover `<script>`, `hidden` e `style` inline enquanto mantém `div`, classes, `data-*` e conteúdo textual.

Resultados 2–5 exigem Android. Nenhuma hipótese runtime foi marcada como fato antecipadamente.

## 3. Arquitetura do experimento

- Dois EPUB 3 sintéticos com dois capítulos cada, texto inventado, IDs de livro/capítulo/bloco distintos, entidade `character:test`, JSON `application/json`, CSS e PNG gerado por código.
- Chapter A de cada EPUB contém as três variantes de carrier: script JSON, div com `hidden`/style, e div com classe + `data-*`. Chapter B tem seus próprios marcadores para observar o ciclo de capítulo.
- O JavaScript é Custom Code independente do bundle de produção. Descobre IDs pelo próprio DOM sintético, sem APIs privadas do LNReader. Cria painel removível, executa checks finitos e não usa polling ou MutationObserver.
- `fetch` resolve `../novelforge/knowledge.json` contra `document.baseURI`, mas só envia tentativa se o protocolo resolvido for `file:`. URLs HTTP(S) são explicitamente bloqueadas para evitar tráfego externo. Verifica timeout, rejeição, resposta/status, parse e `marker`/`bookId`, sem exibir JSON bruto.
- LocalStorage usa prefixo/chaves `nf-storage-poc-v1`, faz um probe descartável que remove apenas sua própria chave e mantém o registro sintético para os testes de capítulo/reinício. IndexedDB usa o banco `nf-storage-poc-v1`, store `diagnostics`, chave lógica composta por `bookId|marker`; não apaga banco.
- Relatório de clipboard remove query/hash, redige caminhos de arquivo e reduz paths HTTP. O relatório não inclui conteúdo narrativo nem JSON integral.

## 4. Artefatos gerados

- `README.md` — geração, configuração, execução e limitações.
- `scripts/build-fixtures.mjs` — gera determinística e localmente os dois EPUBs; código usa apenas built-ins Node (zlib, fs, path).
- `scripts/validate-fixtures.mjs` — verifica ZIP/CRC, `mimetype`, referências manifest, spine, JSON, recursos, IDs/marcadores, sintaxe JS, guards de segurança e CSS estrutural.
- `fixtures/storage-poc-book-a.epub` e `fixtures/storage-poc-book-b.epub` — binários gerados exclusivamente pelo script.
- `custom-code/storage-diagnostic.js` e `.css` — snippets separados para colar nas configurações Custom Code do LNReader.
- `results/ANDROID_TEST_RESULTS.md` — planilha permanece `NOT_TESTED` até execução física.

## 5. Procedimento de instalação

Ver instruções detalhadas em `README.md`. Resumo: desativar temporariamente snippets que possam conflitar (sem apagá-los), colar e ativar o JS e CSS POC como snippets separados, gerar/importar ambos os EPUBs localmente, então observar/copy report dentro de cada capítulo. Não é necessário instalar dependências. Manter rede desligada para operação offline.

## 6. Procedimento de execução

```sh
node experiments/lnreader-storage/scripts/build-fixtures.mjs
node experiments/lnreader-storage/scripts/validate-fixtures.mjs
npm test
```

No Android: Chapter A → Chapter B → A; depois force-stop/reabrir sem limpar os dados; por fim, comparar Book B. Os passos detalhados e campos de evidência estão em `README.md` e `results/ANDROID_TEST_RESULTS.md`.

## 7. Resultados automatizados

Execução local nesta entrega:

- Geração dos dois EPUBs: **PASS**.
- ZIP central directory, arquivos, CRCs, mimetype primeiro/não comprimido, contagens e tamanhos: **PASS**.
- OPF com manifest/spine, referências resolvidas, capítulos no spine e media types: **PASS**.
- JSON válido e identidade/marker/blocos coerentes: **PASS**.
- Book IDs, knowledge markers e chapter markers distintos: **PASS**.
- PNG gerado e reconhecido pela assinatura; CSS auxiliar presente: **PASS**.
- Sintaxe JavaScript (`node --check`), CSS com chaves equilibradas e verificações estáticas de URL local, ausência de `eval`, ausência de deleção IndexedDB e limpeza restrita: **PASS**.
- Texto usado é sintético e teste estático não encontrou os nomes amostrados de conteúdo protegido: **PASS** (não é detector geral de copyright).
- EPUBCheck: **não executado**; comando/ferramenta não estava instalado. A verificação própria não é substituto integral de EPUBCheck.
- `npm test`: **39 passaram, 1 falhou, 40 total**. Única falha: `manifesto SHA-256 confere com todos os arquivos incluídos` (`tests/lnreader-adapter.test.js`); `scripts/manifest.js` reporta mismatch porque o manifesto global não inclui os novos arquivos da pesquisa/POC (inclui também o relatório C5.3 da raiz, já existente como arquivo novo da execução anterior). Não regenerei `MANIFEST_SHA256.json`: a restrição desta entrega limita os novos artefatos à pasta `experiments/lnreader-storage/`. Os outros 39 testes passaram.

## 8. Resultados Android pendentes

Tudo em `results/ANDROID_TEST_RESULTS.md` começa como `NOT_TESTED`. Exige execução no LNReader real: importação, localização/origin/baseURI, resultado fetch file, sanitização dos três carriers, visualização/CSS, storage write/read, capítulo, reinício, livros distintos e offline. Não há resultado Android inventado nesta entrega.

## 9. Critérios de sucesso

- Importar ambos os EPUBs sem erro e carregar ambos os capítulos.
- Exibir identidade de livro/capítulo sintético correta e executar Custom Code por capítulo.
- Registrar URL/origem/base e resultado objetivo da tentativa de recurso, sem contato externo e sem despejar dados.
- Medir write/read e leituras anteriores entre capítulos e após force-stop/reabertura.
- Manter `Origin isolation` como UNKNOWN a menos que haja evidência adequada; duas chaves distintas, por si, só comprovam namespace lógico.
- Determinar os carriers que sobrevivem ao sanitizer e garantir que marcador de JSON não fique visível.
- Completar em modo avião e copiar relatório higienizado.

## 10. Limitações

- Nenhum Android/emulador foi executado nesta entrega; testes locais validam artefatos e sintaxe, não comportamento WebView.
- Não foi possível executar EPUBCheck sem instalar ferramenta/dependência.
- O POC de `fetch` é conservador: protocolo HTTP(S) resulta em `NOT_TESTED`, não requisição. Só testa `file:` quando essa base realmente é obtida do documento.
- O teste mede localStorage/IndexedDB de origem atual; não afirma origem, persistência durável ou isolamento de livros automaticamente.
- O teste de carriers não é antisspoiler e usa exclusivamente payload sintético.
- O relatório copiado sanitiza URLs, então a pessoa que executar deve preservar separadamente apenas os detalhes técnicos necessários e não compartilhar caminhos privados.

## 11. Próximas decisões possíveis

1. Se o JSON file falhar/ficar inacessível, seguir com carrier contextual inline em XHTML, após verificar sanitização e invisibilidade no próprio LNReader.
2. Se o storage persistir, decidir se é somente cache opcional; não tratá-lo como fonte única até provar origem estável, cold start, atualização/limpeza e associação livro→dados.
3. Se Book B consegue ler a chave A na mesma origem, considerar storage compartilhado e evitar pôr ali fatos futuros ou confiar em isolamento implícito.
4. Qualquer requisito de arquivo compartilhado deve voltar à revisão de contrato/API explícita; índice mestre continua proibido no EPUB pelo NF-011.

---

**Escopo preservado:** nenhum arquivo de `src/`, `dist/`, contrato, regra antisspoiler, versão, pipeline de produção ou manifesto foi editado nesta entrega. Nenhum commit foi criado. Os dois `.epub` são resultados gerados pelo script, não arquivos editados manualmente. A suíte completa fica com a falha de manifesto descrita acima até o proprietário autorizar reconciliar o manifesto com esses documentos/artefatos ou definir que caminhos experimentais/documentação sejam excluídos da integridade global.
