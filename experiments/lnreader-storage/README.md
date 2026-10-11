# NovelForge Storage POC — LNReader Android

Experimento isolado para observar transporte de JSON auxiliar, `localStorage`, IndexedDB, sanitização dos carriers HTML, troca de capítulos e isolamento lógico entre dois livros sintéticos.

Este é material diagnóstico, não é o formatter NovelForge de produção e não implementa uma arquitetura definitiva. O schema JSON `nf-storage-poc-v1` é intencionalmente experimental e não substitui NF-011/C2.1. Os EPUBs usam somente texto fictício criado para este teste.

## Requisitos

- Node.js 18 ou mais recente (somente módulos nativos; sem instalação de dependências).
- LNReader Android com suporte a importar EPUB local e configurar snippets Custom Code.
- Para inspecionar resultado detalhado, anote também a versão do Android System WebView.

## Gerar e validar os EPUBs

Na raiz do repositório:

```sh
node experiments/lnreader-storage/scripts/build-fixtures.mjs
node experiments/lnreader-storage/scripts/validate-fixtures.mjs
```

O primeiro comando gera `fixtures/storage-poc-book-a.epub` e `fixtures/storage-poc-book-b.epub` por código, incluindo a imagem PNG sintética. O segundo valida ZIP central directory, entradas, CRCs, `mimetype`, referências do OPF, spine, JSON e identidades diferentes; também verifica sintaxe JS e estrutura CSS. Nenhuma dependência nova é usada. EPUBCheck não foi encontrado instalado nesta máquina; as verificações estruturais não substituem EPUBCheck nem a importação real no LNReader.

## Instalação no LNReader

1. Desative temporariamente os snippets NovelForge de produção e outros Custom Codes que alterem HTML/CSS, para isolar o resultado. Não os apague nem sobrescreva.
2. No leitor, adicione um snippet JavaScript com o conteúdo integral de [`custom-code/storage-diagnostic.js`](custom-code/storage-diagnostic.js).
3. Adicione um snippet CSS separado com o conteúdo integral de [`custom-code/storage-diagnostic.css`](custom-code/storage-diagnostic.css). Ative os dois.
4. Importe os dois arquivos da pasta [`fixtures/`](fixtures/) pelo fluxo de importação de EPUB local do LNReader. São livros de diagnóstico distintos.
5. Desative Wi-Fi/dados móveis antes dos testes offline. O código só tenta `fetch()` se a URL relativa resolver para `file:`. Se resolver para `http:`/`https:`, registra `NOT_TESTED` e não envia requisição à rede. A URL é formada apenas a partir de `document.baseURI`; não são tentados diretórios Android arbitrários.

O Custom Code identifica livro/capítulo por `data-nf-novel` e `data-nf-chapter` dos próprios capítulos sintéticos, não por título visível nem por API interna presumida do LNReader. Ele executa automaticamente ao carregar o capítulo. O painel também tem “Executar novamente”.

## Executar e coletar resultados

1. Abra Book A, Chapter A; aguarde o painel. Observe `location.href`, `location.origin`, `document.baseURI`, fetch, carriers e storage.
2. Use **Copiar relatório**. A URL copiada tem query/hash removidos e caminhos locais/HTTP reduzidos para evitar expor caminhos ou parâmetros desnecessários. Nenhum JSON integral é exibido/copied.
3. Abra Chapter B, depois volte a Chapter A. Compare os valores anteriores de storage e os IDs/capítulos. Repetir um capítulo sozinho não comprova persistência após reinício.
4. Force-stop e reabra LNReader conforme o roteiro em [`results/ANDROID_TEST_RESULTS.md`](results/ANDROID_TEST_RESULTS.md). Preencha os campos manualmente. Não limpe os dados do aplicativo.
5. Abra Book B após escrever registros no Book A. O Custom Code usa chaves que contêm `bookId`, e tenta detectar um registro do outro livro. `Origin isolation` permanece `UNKNOWN`: ausência do registro não prova isolamento real por origem. Se o registro A estiver visível em B, há compartilhamento de storage acessível ao script, apesar do namespace.
6. “Fechar” remove somente o painel. Os registros diagnósticos permanecem. O script não executa `indexedDB.deleteDatabase()`; a limpeza probe remove apenas sua própria chave localStorage descartável. Não limpe o banco IndexedDB manualmente durante a rodada.

Resultados iniciais (`PASS`/`FAIL`) são observações desta execução, não resultados Android. `App restart persistence` inicia como `NOT_TESTED` e deve continuar assim até completar force-stop/reabertura e registrar evidência no arquivo de resultados.

## Limites

- A POC não é um teste antisspoiler e não deve receber fatos reais. Sucesso de armazenamento não significa segurança contra fatos futuros.
- O teste de `fetch` é deliberadamente restrito ao caso `file:`. URLs HTTP(S) não são acessadas, mesmo sem rede, para respeitar a proibição de requisições externas.
- O arquivo JSON do EPUB contém apenas marcadores sintéticos. Não há garantia de que o LNReader o mantenha após importação.
- A verificação automatizada é local; origem, permissões, WebView, persistência e layout só podem ser confirmados no aparelho.
- A execução com snippets simultâneos pode alterar o resultado. Desative os demais durante a rodada e reative-os depois.
