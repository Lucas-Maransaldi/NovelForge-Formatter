# Investigação técnica LNReader — C5.3-RESEARCH

## 1. Resumo executivo

**Conclusão sobre `knowledge.json` separado: AINDA NÃO DETERMINADO para acesso pelo Custom Code sem alteração do LNReader; não se deve desenhar a solução contando com esse acesso.** O código confirma que o importador descompacta todas as entradas ZIP para um diretório temporário, mas só promove capítulos, imagens e CSS para o armazenamento normal do livro. O parser não inclui JSON em seu modelo de recursos. Além disso, capítulos EPUB importados são lidos como texto nativo, sanitizados e inseridos em uma string HTML no WebView; não são carregados como páginas `file://` da pasta extraída. Para o WebView Android, o LNReader define `allowFileAccess=true`, mas a dependência React Native WebView mantém `allowFileAccessFromFileURLs=false` e `allowUniversalAccessFromFileURLs=false` por padrão, e o LNReader não passa valores para essas propriedades. A base URL da string HTML é vazia para capítulo baixado/importado.

Consequências:

- **Não há evidência de que `fetch('../novelforge/knowledge.json')` funcione.** A URI/base efetiva do documento quando `loadDataWithBaseURL` recebe base vazia, a resolução de URLs relativas nesse caso e o comportamento em dispositivos LNReader reais precisam de teste.
- A existência de `NativeFile.readFile` no lado React Native não expõe essa API dentro da página. A ponte WebView verificada fornece `window.ReactNativeWebView.postMessage` (WebView → app); o app também injeta JS (app → WebView), mas não foi encontrada uma API Custom Code para pedir a leitura de um arquivo EPUB.
- O sanitizer permite elementos `div` e atributos `data-*`, mas não inclui `hidden` nem `style` na lista de atributos permitidos. Isso explica plausivelmente o caso observado de JSON em `div` cujo conteúdo permaneceu e pôde aparecer visualmente, enquanto `hidden` foi removido. `<script>` também não está na lista de tags permitidas. O resultado exato da transformação deve ser atribuído ao sanitizer configurado; o desaparecimento do payload `<script type="application/json">` também foi observado empiricamente pelo usuário.
- O importador pode reescrever links para `file://.../<basename>`, mas não copia páginas XHTML arbitrárias de enciclopédia para a pasta permanente do livro. Isso é consistente com o `ERR_FILE_NOT_FOUND` relatado, sem provar por si só a causa exata daquele teste.
- A opção sem dependência de API privada, URL ou rede é o **índice contextual mínimo incorporado no XHTML do capítulo**, ocultado com um seletor CSS compatível (por exemplo, classe/data attribute; não depender do atributo `hidden`). Essa duplicação é de contexto por capítulo, não do índice mestre. O NF-011 explicitamente proíbe empacotar o índice mestre no EPUB.
- IndexedDB/localStorage podem ser experimentados, pois o WebView Android tem DOM storage habilitado, mas origem, disponibilidade e persistência não são garantidas pelo código para páginas criadas com `loadDataWithBaseURL("", ...)`. Não utilizar como persistência necessária sem testes de troca de capítulo, reinício e isolamento entre livros.

Esta pesquisa não modificou código, não construiu EPUB, não atualizou dependências e não criou commit. As observações de dispositivo reproduzidas neste documento são do usuário, não foram repetidas nesta execução.

## 2. Identificação da versão analisada

| Campo | Valor |
|---|---|
| Repositório | <https://github.com/LNReader/lnreader> |
| Branch | `master` |
| Commit LNReader | `14d87add614960b5d1f300092339fa191399c393` |
| Data da investigação | 2026-10-11 (America/Sao_Paulo) |
| Dependência WebView | `react-native-webview` 13.17.0; lockfile resolve essa versão; código inspecionado no tag `v13.17.0`, SHA `386df1dc26f0556d412a9e87ef4d2f59ff88fbc0` |
| Sanitizer | `sanitize-html` 2.17.6 conforme `pnpm-lock.yaml`; configuração de uso inspecionada no LNReader; implementação da dependência não auditada nesta execução |
| Acesso/limitações | Clone público raso bem-sucedido. O relatório descreve o código dessa revisão, não necessariamente qualquer APK publicado ou build personalizado do usuário. Sem dispositivo Android conectado para repetir os testes empíricos. |

Links de código abaixo usam o SHA fixado acima. Para arquivos da dependência WebView, os links usam o SHA do tag indicado.

## 3. Arquitetura de importação EPUB

### Fluxo comprovado

1. `importEpub` copia o EPUB selecionado para `ExternalCachesDirectoryPath/novel.epub`, limpa e cria `ExternalCachesDirectoryPath/epub` e chama `NativeZipArchive.unzip`. Android percorre todas as entradas não-diretório do ZIP e grava cada uma sob o diretório de destino. Portanto, **a etapa ZIP extrai todas as entradas**, sem filtrar pelo OPF. Evidência: [`src/services/epub/import.ts`, `importEpub`, linhas 119–140](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/services/epub/import.ts#L119-L140); [`NativeZipArchiveModule.kt`, `unzip`, linhas 32–49](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/native-zip-archive/android/src/main/java/expo/modules/nativeziparchive/NativeZipArchiveModule.kt#L32-L49).
2. O módulo nativo de EPUB abre `META-INF/container.xml`, lê o `full-path` do rootfile e depois lê o OPF. Ele mapeia itens do `manifest` por ID/href/media type e percorre `spine/itemref` na ordem declarada para produzir capítulos. CSS e imagens são registrados em listas específicas; JSON não ganha uma lista/campo equivalente. Evidência: [`EpubParser.cpp`, descoberta de container/OPF, linhas 287–318 e 450–468](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/nitro-epub/cpp/import/EpubParser.cpp#L287-L318); [`EpubParser.cpp`, manifest, CSS/imagens e spine, linhas 320–445](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/nitro-epub/cpp/import/EpubParser.cpp#L320-L445).
3. O tipo retornado contém metadados, `chapters`, `cssPaths` e `imagePaths`; não contém coleção geral de recursos nem caminhos JSON. Evidência: [`EpubNovel.ts`, linhas 8–24](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/nitro-epub/src/types/EpubNovel.ts#L8-L24).
4. O importador grava os capítulos sob `NOVEL_STORAGE/local/<novelId>/<chapterId>/index.html`, move recursos CSS e imagens reconhecidos para a pasta permanente do livro e não há etapa análoga para JSON ou XHTML auxiliar. Evidência: [`import.ts`, `insertLocalChapter`, linhas 75–117](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/services/epub/import.ts#L75-L117); [`import.ts`, movimentação de imagens/CSS, linhas 165–191](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/services/epub/import.ts#L165-L191).

### Respostas A1–A9

| Pergunta | Resposta e evidência |
|---|---|
| A1. Extrai tudo ou só o necessário? | **[CONFIRMADO PELO CÓDIGO]** Extrai todas as entradas ZIP não diretório. Depois, só algumas categorias são processadas/movidas para a pasta persistente do livro. `NativeZipArchiveModule.kt:32–43`; `import.ts:138–140, 172–190`. |
| A2. JSON personalizado é preservado? | **[CONFIRMADO PELO CÓDIGO]** É materializado no diretório temporário por `unzip`, mas não aparece no modelo retornado nem no fluxo que move arquivos para o armazenamento normal. Logo, não é preservado pelo fluxo de importação como recurso persistente/acessível. A pasta temporária sobrevive após a função até ser limpa por importação posterior ou pela política de cache; não é contrato de retenção. `import.ts:129–140, 165–191`; `EpubNovel.ts:8–24`. |
| A3. Depende do manifest OPF? | **[CONFIRMADO PELO CÓDIGO]** A extração não depende do OPF. A seleção de capítulos/CSS/imagens usa o manifest; o parser simplesmente registra `application/json` no mapa genérico e não cria saída para esse media type. `EpubParser.cpp:342–368, 396–442`. |
| A4. Aceita `application/json`? | **[NÃO DETERMINADO]** Não há validação/rejeição específica de `application/json` na extração. O parser aceita ler os itens do manifest como mapa, mas o modelo/import não oferece API de JSON. Isso significa que um item pode estar dentro do ZIP e ainda assim não estar disponível ao formatter. |
| A5. Arquivos internos ficam disponíveis após importação? | **[CONFIRMADO PELO CÓDIGO]** Capítulos, CSS/imagens selecionados, sim. Diretório extraído fica em cache, sem promoção de JSON/XHTML personalizado para a árvore durável; é apagado no começo da próxima importação EPUB (`unlink(epubDirPath)`). Não considerar essa permanência incidental como garantia. `import.ts:129–140, 165–191`. |
| A6. Diretório extraído é acessível à WebView? | **[NÃO DETERMINADO]** O caminho existe do lado nativo temporário, mas não é fornecido ao documento nem aparece em `baseUrl` para capítulos EPUB baixados. Além disso, o WebView não permite por padrão acesso universal de páginas `file://` a outros arquivos. Nenhuma ponte de leitura de EPUB foi identificada. |
| A7. Converte para formato interno? | **[CONFIRMADO PELO CÓDIGO]** Converte a estrutura de importação em registros de novel/capítulo e páginas HTML no armazenamento de app, não num arquivo EPUB virtual lido diretamente. Os capítulos são copiados como texto para `index.html`; há normalização específica de SVG/XHTML para imagem quando aplicável (`EpubChapterNormalizer.cpp:107–134`). |
| A8. Recursos não usados são descartados? | **[CONFIRMADO PELO CÓDIGO]** Não são selecionados para a pasta permanente pelo fluxo examinado. Podem continuar no diretório temporário até limpeza do cache/da próxima importação. “Descartados imediatamente” seria uma afirmação mais forte do que o código permite. |
| A9. Muda entre EPUB e extensões? | **[CONFIRMADO PELO CÓDIGO]** Sim: capítulo baixado é lido de arquivo local; se não encontrado, o leitor recorre ao plugin (`useChapter.ts:168–175`). Para capítulo importado/baixado, `baseUrl` é omitido; para capítulo de plugin não baixado, usa `plugin.site` (`WebViewReader.tsx:315–322`). O sanitizer e a composição da página são compartilhados. |

**Observação de segurança:** o código Android do unzip combina `File(distDirPath, zipEntry.name)` sem uma verificação visível de que o caminho canônico permaneça sob o diretório de destino (`NativeZipArchiveModule.kt:35–42`). Isto merece avaliação separada para EPUB não confiável; não foi testado como exploração nesta pesquisa.

## 4. Arquitetura de renderização

### Pipeline

`NativeFile.readFile(...)` fornece a string HTML do capítulo local; se a leitura falhar, `fetchChapter` consulta o plugin. O leitor aplica `sanitizeChapterText`, guarda o resultado em cache e posteriormente envolve essa string em `<div id="LNReader-chapter">...</div>` numa nova página HTML para a WebView. Evidência: [`useChapter.ts`, linhas 163–205](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/hooks/useChapter.ts#L163-L205); [`WebViewReader.tsx`, construção da página, linhas 309–435](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L309-L435).

Isto significa que o leitor não apresenta simplesmente o documento XHTML original com sua URL de arquivo: ele sanitiza a string e constrói outro documento. A exceção é a normalização importada de um wrapper SVG simples contendo imagem, que o parser nativo transforma em `<img>` no próprio arquivo extraído antes da cópia do capítulo. Evidência: [`EpubChapterNormalizer.cpp`, linhas 60–134](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/nitro-epub/cpp/import/EpubChapterNormalizer.cpp#L60-L134).

### Sanitização e respostas B1–B12

| Pergunta | Resposta e evidência |
|---|---|
| B1. Usa XHTML original? | **[CONFIRMADO PELO CÓDIGO]** Usa conteúdo lido como texto, após normalização EPUB pontual e `sanitize-html`, dentro de outro documento HTML. Não carrega o XHTML importado como página com sua própria URL. `useChapter.ts:168–205`; `WebViewReader.tsx:315–435`. |
| B2. Transformações? | **[CONFIRMADO PELO CÓDIGO]** Sanitização de tags/atributos/schemes; wrapper com CSS/assets e scripts do leitor; import EPUB reescreve `href`/`src` para `file://<novelDir>/<basename>` e grava o HTML. O extrator CSS/imagem move recursos por basename. `import.ts:97–113, 172–190`; `sanitizeChapterText.ts:42–102`; `WebViewReader.tsx:323–435`. |
| B3. `<script>` removido? | **[CONFIRMADO PELO CÓDIGO]** `script` não consta na lista adicional `allowedTags`, e o sanitizer é invocado antes do WebView. O payload `<script type="application/json">` não aparecer no DOM também é observação empírica do usuário. Para detalhes exatos de como a implementação da versão 2.17.6 trata conteúdo textual de script, consultar/auditar a implementação vendorizada da dependência seria necessário; não foi inferido aqui além da configuração e observação. |
| B4. `<div>` preservado? | **[CONFIRMADO PELO CÓDIGO]** `div` faz parte das tags HTML permitidas pelo conjunto default do `sanitize-html`; não há remoção de `div` na configuração. `sanitizeChapterText.ts:42–64`. |
| B5. `data-*` preservado? | **[CONFIRMADO PELO CÓDIGO]** Atributo curinga `data-*` é explicitamente permitido. `sanitizeChapterText.ts:65–78`. |
| B6. `hidden` preservado? | **[CONFIRMADO PELO CÓDIGO]** Não aparece na allowlist global nem na lista específica de atributos de `div` (que herda apenas a lista global); portanto não há suporte configurado para mantê-lo. A conclusão de que esse é o motivo do div aparecer visualmente é **[INFERÊNCIA]**, consistente com o teste do usuário. |
| B7. `style` preservado? | **[CONFIRMADO PELO CÓDIGO]** Atributo inline `style` não está permitido. Tags `<style>` estão permitidas e CSS fornecido pelo leitor/custom CSS é inserido separadamente no `<head>`. `sanitizeChapterText.ts:42–102`; `WebViewReader.tsx:372–374`. |
| B8. HTML vira texto visível? | **[INFERÊNCIA]** O sanitizer mantém `<div>` e o conteúdo filho, mas remove o atributo `hidden` não permitido; o texto JSON de um div restante pode ser renderizado como texto normal no fim do capítulo se esse div foi colocado no fim do HTML. Não encontrei uma etapa que converta genericamente elementos em texto simples. |
| B9. Por que `<div hidden>` poderia aparecer? | **[INFERÊNCIA]** `hidden` é retirado durante a sanitização, enquanto `div` e seu conteúdo persistem. Isto explica precisamente o sintoma descrito, mas o relatório do usuário é a evidência empírica para a ocorrência observada. |
| B10. Sanitização explica script vs div? | **[INFERÊNCIA]** Sim: `script` não é permitido, mas `div` é; em conjunto com o atributo `hidden` removido, o DOM pode ficar sem o elemento script e manter o texto do div visível. Não extrapolar o comportamento de script além da implementação testada. |
| B11. Tags desconhecidas? | **[NÃO DETERMINADO]** A allowlist limitada permite afirmar que tags fora do default/adicional não são preservadas como tags seguras; o tratamento específico de wrapper/text nodes depende das regras do `sanitize-html` 2.17.6, cuja implementação não foi auditada nesta execução. Tags NovelForge devem ser verificadas contra allowlist antes de depender delas. |
| B12. DOM é substituído na navegação? | **[CONFIRMADO PELO CÓDIGO]** A fonte HTML do WebView é recomposta a partir do capítulo ativo; o comentário do componente registra que trocar `source` recarrega a página. Custom Code é incluído nessa nova fonte, portanto roda de novo por capítulo carregado. `WebViewReader.tsx:309–323, 437–451`. |

## 5. Arquitetura da WebView e acesso a arquivos

### O que a revisão permite afirmar

- LNReader usa `react-native-webview` 13.17.0 (lockfile `pnpm-lock.yaml`, dependência `react-native-webview`) e monta `<WebView>` com `javaScriptEnabled={true}`, `allowFileAccess={true}`, `originWhitelist={['*']}`. Não define `allowFileAccessFromFileURLs` nem `allowUniversalAccessFromFileURLs`. Evidência: [`WebViewReader.tsx:453–475`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L453-L475).
- O Android da dependência configura `allowFileAccess=false`, `allowContentAccess=false`, `allowFileAccessFromFileURLs=false` e `allowUniversalAccessFromFileURLs=false` como defaults. O prop `allowFileAccess={true}` do LNReader altera somente `allowFileAccess`; os dois controles de acesso cruzado a partir de URL `file:` permanecem falsos. Evidência externa primária: [`RNCWebViewManagerImpl.kt`, defaults e setters, tag SHA `386df1d`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt#L71-L84), [`setAllowFileAccess`/`setAllowFileAccessFromFileURLs`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt#L550-L558).
- No Android, a dependência carrega source `{html}` por `loadDataWithBaseURL(baseUrl, html, ...)`. Se a chave `baseUrl` está ausente, essa implementação usa string vazia. Para EPUB importado, LNReader gera `baseUrl: undefined`; para capítulo não baixado, fornece `plugin.site`. Evidência: [`WebViewReader.tsx:315–323`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L315-L323) e [`RNCWebViewManagerImpl.kt`, linhas 385–398, tag SHA `386df1d`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt#L385-L398).
- **A origem serial efetiva para HTML de base vazia não é estabelecida pelo código do LNReader isoladamente.** `loadDataWithBaseURL` e a interpretação de base vazia pelo Android System WebView são determinantes. Classificação: **[DEPENDE DE TESTE NO ANDROID]**.
- `onShouldStartLoadWithRequest` trata URL de refresh e links de reporte, então retorna `true` para demais navegações principais. Isso não implementa um servidor nem um interceptor de recursos EPUB. Não há `shouldInterceptRequest` customizado no componente LNReader examinado. Evidência: [`WebViewReader.tsx:465–475`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L465-L475).
- A API `NativeFile.readFile` é registrada como módulo Expo/React Native no host (`NativeFileModule.kt`), não injetada como objeto JS no documento WebView. A ponte `react-native-webview` expõe a interface `ReactNativeWebView.postMessage` (WebView → handler nativo); isso não é uma função de leitura arbitrária. Evidência: [módulo `NativeFile`, métodos nativos](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/modules/native-file/android/src/main/java/expo/modules/nativefile/NativeFileModule.kt#L375-L449); [ponte WebView, `postMessage`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java#L250-L273) e [implementação do bridge](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java#L433-L453).

### Respostas C1–C12

| Pergunta | Conclusão |
|---|---|
| C1. Origem efetiva? | **[DEPENDE DE TESTE NO ANDROID]** Para EPUB local, HTML é `loadDataWithBaseURL` com base `""`; para plugin não baixado, `plugin.site`. O código não prova uma origem estável para a base vazia. |
| C2. Custom Code pode usar `fetch()`? | **[INFERÊNCIA]** `fetch` é API normal do WebView JavaScript; nenhum bloqueio explícito de JS foi encontrado e JavaScript está ligado. Mas sucesso depende da origem, política de rede/CORS e URL solicitada. Não é uma API LNReader e não se pode prometer que funcione. |
| C3. `fetch()` acessa arquivo EPUB? | **[NÃO DETERMINADO]** Não há acesso direto estabelecido. A política file-to-file/universal permanece falsa por padrão e o HTML não carrega do caminho original do capítulo. |
| C4. `fetch('../novelforge/knowledge.json')` funciona? | **[NÃO DETERMINADO]**, com evidência contrária à suposição: o documento não tem base no diretório EPUB; `baseUrl` vazia não é o URL do capítulo. A falha do link XHTML relativo observada pelo usuário é consistente, mas o fetch precisa ser testado e depende de URL/origem exata. |
| C5. Outro caminho interno? | **[NÃO DETERMINADO]** Nenhum endpoint público para recursos EPUB foi encontrado. URLs `file://` arbitrárias também não são autorizadas simplesmente por `allowFileAccess=true`. |
| C6. Servidor HTTP local? | **[CONFIRMADO PELO CÓDIGO]** Nenhum servidor local de recursos EPUB é construído no pipeline examinado. `assetsUriPrefix` usa `http://localhost:8081/assets` em dev e `file:///android_asset` em release, para os assets empacotados do leitor, não para os arquivos do EPUB. [`WebViewReader.tsx:123–125`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L123-L125). |
| C7. Interceptação de recursos? | **[CONFIRMADO PELO CÓDIGO]** Callback de navegação top-level para dois esquemas/URLs específicos; não encontrado interceptor de sub-recursos EPUB. |
| C8. Acessa arquivos locais fora do HTML? | **[NÃO DETERMINADO]** O conteúdo pode referenciar arquivos `file://` apresentados com o capítulo; carregar/ler qualquer caminho por JS é outra permissão e não é habilitado explicitamente pelo LNReader. |
| C9. APIs internas para ler recursos? | **[CONFIRMADO PELO CÓDIGO]** Não foi identificada API no mundo da página para solicitar arquivos. A camada host tem operações `NativeFile`, mas ficam na aplicação React Native. |
| C10. API está disponível ao Custom Code? | **[CONFIRMADO PELO CÓDIGO]** Não como API de leitura. `window.ReactNativeWebView.postMessage` é canal de mensagem da página para o host; o código host decide quais mensagens tratar. Nenhum comando genérico de recurso EPUB é implementado. |
| C11. Offline? | **[INFERÊNCIA]** Pode ser offline se os dados estiverem já no HTML/JS ou em armazenamento local funcional. Consulta ao JSON externo no EPUB não está comprovada; fetch remoto, por definição, não satisfaz offline. |
| C12. Android versus outras plataformas? | **[CONFIRMADO PELO CÓDIGO]** Os flags investigados são Android-specific; iOS usa WKWebView com política distinta. Nenhuma conclusão Android deve ser generalizada para iOS. O alvo do NovelForge é Android, que ainda precisa do teste real. |

## 6. Funcionamento do Custom Code

O Custom Code consiste em snippets salvos nas configurações do leitor. `useCustomCode` compõe snippets ativos, separando CSS e JS; `composeCSS` concatena CSS; `composeJS` envolve cada JS em `try/catch`. Evidência: [`useCustomCode.ts:5–24`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/Hooks/useCustomCode.ts#L5-L24); [`customCode.ts:7–40`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/utils/customCode.ts#L7-L40).

### Respostas D1–D14

| Pergunta | Conclusão |
|---|---|
| D1. Quando executa? | CSS customizado é inserido em `<style id="ln-custom-css">` na página construída. JS customizado é incluído na página e chamado pelo listener `DOMContentLoaded`. `WebViewReader.tsx:372–374, 426–433`. |
| D2. Executa por capítulo? | **[CONFIRMADO PELO CÓDIGO]** A cada montagem/recarga da página do capítulo, pois a fonte HTML nova inclui o snippet novamente. |
| D3. Antes/depois do DOM? | **[CONFIRMADO PELO CÓDIGO]** O callback é registrado no HTML produzido e chamado no `DOMContentLoaded`, depois que a estrutura enviada — inclusive `#LNReader-chapter` — foi parseada. A ordem relativa a callbacks de outras bibliotecas que também escutem DOMContentLoaded não é garantida pelo código apresentado. |
| D4. Mesmo contexto JS? | **[CONFIRMADO PELO CÓDIGO]** O snippet JS é texto inline dentro do documento WebView, não um worker/iframe isolado. Compartilha DOM e contexto global da página. |
| D5. Pode criar `<script>`/`<style>`? | **[INFERÊNCIA]** O snippet executa JS com `document` e pode manipular DOM; CSS já é aplicado via `<style>`. A sanitização do conteúdo do capítulo não se aplica a elementos criados pelo snippet depois que a página já foi construída. Testar CSP/limitações do System WebView se for requisito. |
| D6. Restrições? | Cada snippet tem `try/catch`; erros são exibidos via `alert`. O script não recebe acesso ao código-fonte React Native por estar em outro runtime. O lifecycle depende de DOMContentLoaded e de nova fonte ao navegar. `customCode.ts:24–40`; `WebViewReader.tsx:426–433`. |
| D7. Acessa API interna do leitor? | **[CONFIRMADO PELO CÓDIGO]** Pode inspecionar globals públicos incidentalmente presentes na página (ex. `window.reader`, configuração do leitor) porque roda no contexto comum; isso não equivale a API Custom Code estável/documentada. Não deve depender de closures ou métodos privados. |
| D8. Intercepta navegação entre capítulos? | **[CONFIRMADO PELO CÓDIGO]** Não é fornecido hook de interceptação para Custom Code. A camada host trata navegações via callback; snippet não recebe callback React. Pode ouvir eventos DOM próprios, mas o leitor não declara evento de capítulo para snippets. |
| D9. Evento de capítulo acessível? | **[NÃO DETERMINADO]** Não encontrei evento de ciclo de capítulo público para snippets. Navegar gera documento novo e reexecuta snippet. |
| D10. Mecanismo oficial de arquivos auxiliares? | **[CONFIRMADO PELO CÓDIGO]** Nenhum encontrado. |
| D11. localStorage/IndexedDB? | **[INFERÊNCIA]** São APIs de navegador potencialmente disponíveis, e Android WebView tem `domStorageEnabled=true` na dependência; o LNReader não as desativa na configuração mostrada. IndexedDB não foi configurado explicitamente. Disponibilidade depende da origem criada por base vazia. [`RNCWebViewManagerImpl.kt:71–84`, SHA dependency]. |
| D12. Persistência entre capítulos/sessões/livros? | **[NÃO DETERMINADO]** Não há garantia no código para storage WebView do documento `loadDataWithBaseURL("", ...)`. Origem persistente, limpeza de dados, versão do Android System WebView e lifecycle devem ser testados. Isolamento por livro não é assegurado pela identidade do EPUB. |
| D13. Limites e isolamento? | **[CONFIRMADO PELO CÓDIGO]** O host define `domStorageEnabled=true`; não encontramos quota, namespace por livro nem ponte de storage explícita. As regras de origem do WebView são determinantes; seus resultados para base vazia ficam por testar. |
| D14. Livro/capítulo/posição? | **Livro e capítulo:** **[INFERÊNCIA]** o script inline tem acesso ao global `initialReaderConfig`, que é criado como `var` com objetos `novel` e `chapter`; o tipo de capítulo inclui `id`, `novelId`, `name`, `position` opcional e `progress`. Esses valores são dados atuais do app, mas não constituem contrato documentado do Custom Code. **Posição do capítulo:** a página tem `window.scrollY` e o core calcula percentual de scroll, mas o leitor salva progresso como percentual inteiro; não há identificador estável de bloco NovelForge fornecido. Portanto a localização exata e confiável em bloco depende do DOM semântico do capítulo e de implementação própria, com falha segura quando ausente. [`WebViewReader.tsx:398–415`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/components/WebViewReader.tsx#L398-L415); [`ChapterInfo`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/database/types/index.ts#L27-L44); [`core.js:141–151`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/assets/reader/js/core.js#L141-L151); [`saveProgress`](https://github.com/LNReader/lnreader/blob/14d87add614960b5d1f300092339fa191399c393/src/screens/reader/hooks/useChapter.ts#L435-L458). |

### CSS versus JavaScript

CSS entra no `<head>` antes do conteúdo ser mostrado e não tem lifecycle. JS é executado como parte do HTML gerado, com chamada em `DOMContentLoaded`, após o parse do capítulo. Ambos são recompostos em toda nova fonte de capítulo. Não confundir o `custom.js` do plugin (URL no armazenamento do plugin) com snippets Custom Code do usuário nem com os assets de um EPUB.

## 7. Viabilidade de JSON separado no EPUB

### Veredito: **AINDA NÃO DETERMINADO** (e não suportado como arquitetura operacional pelo código verificado)

O ZIP o extrai. O código do importador não reconhece/promove o arquivo JSON para a pasta persistente do livro. O capítulo vira HTML em string com base vazia, não um documento em sua pasta extraída. As permissões Android de acesso de uma página `file:` a outros arquivos não são ativadas pelo LNReader. Assim, “preservado em cache” e “consultável offline pelo Custom Code” são afirmações diferentes: a primeira pode ser incidental e temporária; a segunda não está demonstrada.

Além disso, o contrato local [NF-011](docs/01_CONTRACT.md) afirma que o JSON externo na fixture é artefato de desenvolvimento, que não se deve presumir leitura de arquivos arbitrários do EPUB, e que **o índice mestre não deve ser empacotado no EPUB**. Consequentemente, mesmo que o experimento prove leitura de um arquivo auxiliar, ele não autoriza a arquitetura de um mestre global dentro do EPUB sem revisão de contrato. O formato aceito no C2 deve ser contextual ao capítulo e com posição/proveniência suficiente.

### Respostas curtas AINDA NÃO DETERMINADO / SIM / NÃO

- **É possível fisicamente incluir `knowledge.json` num EPUB? SIM.** Um EPUB é um ZIP e o extrator grava todas as entradas.
- **O LNReader o preservará como arquivo permanente do livro? NÃO pelo fluxo de persistência encontrado.** Só pode restar temporariamente no cache de extração; isso não é preservação contratual.
- **O Custom Code pode acessá-lo sem app modificado? AINDA NÃO DETERMINADO; não existe caminho suportado demonstrado.** Não implementar usando fetch relativo antes do experimento.
- **A consulta poderia ser offline? AINDA NÃO DETERMINADO via JSON externo.** O transporte inline funciona offline por natureza; armazenamento persistido exige prova no Android.
- **Pode evitar JSON duplicado por capítulo? Só com estratégia de estado/arquivo compartilhado que ainda não foi demonstrada.** Recomenda-se duplicação do subconjunto contextual mínimo e não da base mestre.
- **Precisa alterar LNReader?** Não necessariamente para o transporte contextual inline. Para fornecer uma API estável de arquivo EPUB/índice global, o código atual não fornece a integração; ou é necessário teste demonstrando mecanismo browser compatível, ou uma mudança futura no app (fora desta pesquisa).

## 8. Comparação de arquiteturas

| Alternativa | Viabilidade / offline | Duplicação e persistência | Segurança antisspoiler e riscos | Avaliação |
|---|---|---|---|---|
| 1. JSON compartilhado no EPUB via `fetch()` | Arquivo extraído; acesso via `fetch` não comprovado. Offline só se o acesso local funcionar. | Evita duplicação; não é promovido ao storage durável pelo importador. | Perigo de mestre inteiro no leitor; contradiz NF-011 e torna fácil consultar fatos futuros. Origem file/relative sem garantia. | Não adotar até prova; mesmo comprovado, revisar contrato e filtrar no transporte. |
| 2. XHTML auxiliar no EPUB | Mesmo problema: importador não copia páginas auxiliares para armazenamento durável. Link pode virar `file://` por basename, mas arquivo pode não estar nesse destino. | Um documento compartilhado; retenção não garantida. | Link de navegação já falhou no teste do usuário; conteúdo/antisspoiler precisa filtrar. | Não basear UI em links externos XHTML. |
| 3. Base incorporada ao bundle JS do NovelForge | Executa offline quando bundle está instalado e Custom Code o executa. | Atualizar distribuição do snippet/bundle; cópia por usuário, não por capítulo. | Bundle pode conter fatos de todo arco e disponibilizá-los a qualquer capítulo. Proibitivo para anti-spoiler sem indexação/filtro seguro e distribuição de subconjuntos. | Não embutir índice mestre no snippet. |
| 4. Carregar uma vez e persistir em IndexedDB/localStorage | APIs web possivelmente existentes; origem/storage desse documento não demonstrados. | Menos duplicação após bootstrap. Persistência por capítulo/sessão/reinício e isolamento por livro não comprovados. | Se armazenar mestre inteiro localmente, qualquer script que rode pode consultar futuro; limpeza e corrupção também precisam falhar fechado. | Experimento apenas; não usar como fonte autoritativa agora. |
| 5. Índice compacto no XHTML de cada capítulo | Compatível com fluxo já confirmado de texto XHTML → sanitizer → DOM, desde que markup/atributos sobrevivam. Offline nativo. | Duplica só entidades/fatos relevantes do capítulo ou contexto permitido. Sem persistência necessária. | Melhor aderência à política de contexto. Exige filtro por `revealedAt.chapter/block`, validação de ordem e omissão se metadados ausentes. Usar atributo CSS/data para esconder JSON; `hidden`/`style` inline são removidos pela allowlist atual. | **Recomendação atual.** Testar payload codificado/escapado e invisibilidade sem alterar narrativa. Preferir janela contextual estreita, não mestre. |
| 6. Arquivo externo separado distribuído offline | Fora do EPUB, sem fetch remoto; Custom Code não tem API de seleção/importação documentada para lê-lo. Pode haver instalação manual de conteúdo no leitor, mas interface inexistente. | Sem duplicação no EPUB, porém gerenciamento/atualização/pareamento difíceis. | Risco de associar base errada ao livro e de persistência sem isolamento. | Não é viável sem fluxo suportado no app; não inventar adaptador/API. |

## 9. Riscos e limitações

1. **Acesso ao arquivo auxiliar e base URL:** o código tem base `""` para capítulo importado; sem teste no dispositivo, não concluir origin, resolução relativa, fetch file, IndexedDB ou localStorage.
2. **Sanitização:** `hidden` e `style` atributos não são permitidos; `data-*` é permitido. Usar seletor CSS ativo em custom stylesheet para esconder elemento de payload e confirmar no DOM já sanitizado. Evitar markup não permitido.
3. **Antisspoiler:** Custom Code recebe o capítulo atual pelo objeto passado ao script, mas não recebe uma posição NovelForge de bloco. O app persiste percentual de capítulo, e não chave de bloco. Usar `data-nf-block` no XHTML atual, validar ID/order e omitir fato se capítulo/bloco/proveniência forem inválidos ou não comparáveis. Não usar título/número textual isolado.
4. **Índice contextual versus mestre:** NF-011 exclui mestre no EPUB. Não distribuir fatos futuros via snippet global, IndexedDB ou quick note; ocultar no visual não é controle de acesso. Filtragem precisa ocorrer antes de formar resposta pública.
5. **Arquivos estáticos:** nomes são reduzidos a basename ao mover imagem/CSS, com possibilidade de colisão entre subpastas. URLs relativas de páginas extras não são preservadas como uma árvore de publicação.
6. **Armazenamento WebView:** DOM storage está habilitado, mas capacidade não significa garantia de persistência. Dados podem ser apagados por clear data/cache, atualização de WebView ou particularidades do origin.
7. **Segurança do ZIP:** a rotina usa caminho da entrada ao criar arquivo no diretório de extração sem contenção canônica visível; pesquisa identificou risco potencial, não validou exploração.
8. **Diferença de build/dispositivo:** SHA upstream não prova que APK instalado é exatamente essa revisão/configuração. Teste Android identifica a versão e WebView System efetivas.

## 10. Experimento Android recomendado

Somente documentação nesta etapa; nenhum EPUB ou script foi criado. Usar obra sintética própria, sem conteúdo protegido.

### EPUB sintético

Criar um EPUB mínimo, compatível com EPUB 3:

- `mimetype`, `META-INF/container.xml`, `OEBPS/package.opf`.
- `OEBPS/text/chapter-a.xhtml` e `chapter-b.xhtml`, ambos no spine e com blocos identificados `data-nf-block="b1"`, `b2`.
- `OEBPS/novelforge/knowledge.json` com um registro inofensivo (sem spoiler narrativo) e declarado no OPF manifest como `application/json`.
- Dentro de `chapter-a.xhtml`, incluir diagnósticos distintos: `<script type="application/json">`, `<div hidden>JSON-DIV-HIDDEN</div>`, `<div class="nf-index-carrier" data-nf-index>JSON-DIV-CLASS</div>`, uma imagem/CSS e link relativo à página extra. CSS de teste para `.nf-index-carrier { display:none!important }` aplicado pelo Custom Code.
- `chapter-b.xhtml` com mesmo ID de entidade e marcador B para verificar reexecução/capítulo ativo.

### Diagnóstico e passos

1. Registrar versão/build do LNReader e Android System WebView. Desativar rede (modo avião) antes do teste de consulta offline.
2. Importar o EPUB por “import local” normal. Confirmar capítulo, imagem e CSS. Inspecionar DOM via WebView debugging de build debug, se disponível, ou emitir diagnóstico visível controlado sem deixar JSON na página.
3. No Custom Code de diagnóstico, observar e reportar somente: `location.href`, `document.baseURI`, `location.origin`, existência de cada carrier após sanitização, atributos presentes, `window.initialReaderConfig?.novel/chapter` (IDs/position, não todo objeto), `typeof fetch`, `typeof indexedDB`, acesso/tentativa de storage com `try/catch`, e se a query simples `fetch(new URL('../novelforge/knowledge.json', document.baseURI))` resolve ou rejeita. Não exibir o conteúdo inteiro do JSON.
4. Separar testes: (a) `fetch` de URL relativa; (b) caminho `file://` conhecido apenas se derivado por observação do próprio ambiente de teste; (c) armazenamento local de um marcador descartável; não inferir permissão de um sucesso CSS/imagem.
5. Registrar se `script` foi removido, se `div` permaneceu, se `hidden` e `style` foram removidos e se a classe/data marker foi preservada; verificar que payload escondido não ocupa espaço nem aparece no texto/TTS/busca.
6. Trocar para capítulo B e voltar: confirmar execução do snippet, `baseURI`/origin, acesso JSON e estado local. Fechar/forçar parada/abrir LNReader: repetir. Repetir em outro livro sintético para verificar contaminação/isolation.
7. Repetir consulta inteiramente offline, mantendo o recurso no EPUB. Se relativo falhar, o resultado negativo encerra a hipótese de usar essa URL no ambiente testado; não tentar contornar com caminhos privados não documentados.

### Matriz de resultados

| Questão do experimento | Critério de confirmação |
|---|---|
| (1) Arquivo auxiliar preservado? | Depois de importar e reiniciar o app, ainda há cópia estável acessível — não apenas no cache temporário até a próxima importação. |
| (2) Custom Code localiza? | URL/URI válida obtida sem API ou caminho interno inventado e funciona em ambos os capítulos. |
| (3) Lê o conteúdo? | Resposta/parsing validado por marcador, sem mostrar o índice inteiro ao usuário. |
| (4) Offline? | Consulta bem-sucedida em modo avião após cold start. |
| (5) JSON invisível? | DOM contém carrier, mas não aparece visualmente, na busca nem no TTS; preserva capítulo. |
| (6) Troca de capítulo? | Mesmo mecanismo funciona nos dois capítulos, com contexto trocado e sem reaproveitar posição antiga. |
| (7) Reinício? | Disponibilidade e persistência continuam após force-stop/reabertura. |

O experimento é **[DEPENDE DE TESTE NO ANDROID]** para origem/URL, fetch, armazenamento e persistência. Mesmo com resultado positivo, validar cada versão alvo do LNReader e manter fallback inline.

## 11. Recomendação arquitetural

1. Manter como caminho suportado a serialização de **índice contextual mínimo por capítulo no próprio XHTML**, com schema versionado, IDs estáveis e proveniência completa. Não incorporar o índice mestre à publicação EPUB.
2. Colocar payload num elemento permitido com `data-*`/classe e JSON codificado/escapado como dado não executável; aplicar CSS do formatter para ocultá-lo. Não usar `<script type="application/json">`, atributo `hidden` ou `style` inline sem evidência pós-sanitização.
3. Fazer a consulta independente da interface e fail-closed: se `novelId`, `chapterId`, ordem ou `data-nf-block` atual não puderem ser validados, retornar zero fatos. Não usar a posição visual aproximada para autorizar fatos de blocos desconhecidos.
4. Considerar leitura de arquivo compartilhado, IndexedDB ou localStorage somente depois do experimento. Mesmo sucesso de fetch num aparelho não substitui o requisito do NF-011 nem autoriza mestre com fatos futuros.
5. Se a meta de reduzir duplicação exigir arquivo mestre único, decisão exige uma extensão explícita do contrato e uma interface suportada no LNReader que exponha recurso contextual filtrado — não adaptar uma API interna presumida.

## 12. Referências ao código-fonte

Todas as referências LNReader são para SHA `14d87add614960b5d1f300092339fa191399c393`.

| Arquivo/função | Linhas | Uso na análise |
|---|---:|---|
| `src/services/epub/import.ts` — `importEpub`, `insertLocalChapter` | 75–117, 119–191 | Descompacta, grava capítulos, reescreve URLs e move somente imagem/CSS. |
| `modules/native-zip-archive/android/.../NativeZipArchiveModule.kt` — `unzip` | 32–49 | Percorre entradas ZIP não diretório. |
| `modules/nitro-epub/cpp/import/EpubParser.cpp` — parser OPF/spine | 287–445, 450–468 | Manifest, media types processados, ordem spine. |
| `modules/nitro-epub/cpp/import/EpubChapterNormalizer.cpp` | 107–134 | Normalização pontual de SVG. |
| `modules/nitro-epub/src/types/EpubNovel.ts` | 8–24 | Campos/recursos no modelo parseado. |
| `src/screens/reader/hooks/useChapter.ts` — `loadChapterText`, `loadChapterHtml`, `saveProgress` | 163–213, 435–458 | Leitura local/fallback plugin, sanitização e precisão da posição persistida. |
| `src/screens/reader/utils/sanitizeChapterText.ts` | 42–124 | Allowlist de tags, atributos e schemes. |
| `src/screens/reader/components/WebViewReader.tsx` | 123–125, 309–475, 510–623 | prefixo assets, source HTML, baseURL, Custom Code, flags e ponte/eventos. |
| `src/screens/reader/components/Hooks/useCustomCode.ts` | 5–24 | Composição JS/CSS. |
| `src/utils/customCode.ts` | 7–40 | concatenação e try/catch dos snippets. |
| `src/database/types/index.ts` — `ChapterInfo` | 27–44 | Campos de identidade e progresso do capítulo. |
| `assets/reader/js/core.js` — `document.onscrollend` | 141–151 | Percentual inteiro de progresso enviado pelo reader. |
| `modules/native-file/android/.../NativeFileModule.kt` | 375–449 | NativeFile está no runtime nativo, não na página. |

Dependência externa examinada: React Native WebView [`RNCWebViewManagerImpl.kt`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebViewManagerImpl.kt) e [`RNCWebView.java`](https://github.com/react-native-webview/react-native-webview/blob/386df1dc26f0556d412a9e87ef4d2f59ff88fbc0/android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java), versão lockada 13.17.0. Não analisados builds de APK ou o código de WebView de cada versão Android.

## 13. Questões ainda não resolvidas

1. Qual `location.href`, `document.baseURI` e `location.origin` o Android System WebView atribui à página passada a `loadDataWithBaseURL("", ...)` na versão do aplicativo do usuário?
2. `fetch()` consegue buscar URI local relativa/absoluta sob as flags atuais? Há diferenças por versão do Android/System WebView?
3. Um arquivo JSON que permaneceu no diretório de cache extraído pode ser lido por algum caminho que o próprio DOM conheça? Não foi encontrado caminho entregue ao JS.
4. IndexedDB/localStorage funcionam com origem opaca/base vazia? Persistem entre capítulos/reinício e ficam isolados por livro?
5. O APK instalado corresponde à revisão/configuração upstream auditada?
6. O comportamento de sanitização dos textos filhos de tags `<script>` e tags desconhecidas na versão 2.17.6 depende de detalhe da implementação do pacote não auditada aqui.
7. Como a posição `data-nf-block` será sincronizada com navegação por paginação (page reader), TTS, busca e mudanças de conteúdo? O percentual de scroll sozinho não é proveniência de bloco.
8. O potencial Zip Slip no extrator nativo deve ser revisado separadamente.

## 14. Respostas objetivas Q1–Q8

**Q1. Podemos armazenar `knowledge.json` dentro do EPUB?** Sim, fisicamente como entrada ZIP. Mas o índice mestre viola o contrato NF-011 atual.

**Q2. O LNReader preservará esse arquivo?** Não como recurso permanente exposto pelo fluxo visto. Ele é extraído para cache; só capítulos, CSS e imagens são promovidos.

**Q3. O Custom Code poderá acessá-lo?** Ainda não determinado; não há API/URL suportada demonstrada. Não confiar em `fetch()` relativo.

**Q4. A consulta poderá funcionar offline?** Ainda não determinado para o JSON separado. Payload contextual embutido no XHTML/Custom Code funciona sem rede.

**Q5. Podemos evitar JSON duplicado por capítulo?** Não com base nas garantias atuais. Usar payload contextual compacto por capítulo; não duplicar o índice mestre.

**Q6. Precisamos modificar o LNReader?** Não para testar e usar contexto inline. Para um arquivo externo compartilhado com acesso estável, talvez; primeiro testar. Se a leitura externa falhar e continuar requisito, será necessária uma interface suportada/alteração do app ou manter transporte inline.

**Q7. Qual a melhor arquitetura para NovelForge?** Índice contextual mínimo e versionado no XHTML de cada capítulo, escondido com CSS sobre carrier permitido, com dados filtrados por capítulo e bloco e falha fechada. Nunca colocar fatos futuros no bundle persistente nem entregar o mestre.

**Q8. Qual o menor experimento?** EPUB sintético com dois capítulos, JSON auxiliar `application/json`, carrier `<script>` e `<div hidden>`/classe, CSS de ocultação e Custom Code diagnóstico; medir origem, fetch local, DOM pós-sanitização, offline, troca de capítulo e reinício no Android. Os passos completos estão na seção 10.

---

**Escopo:** somente investigação/documentação. Nenhuma funcionalidade do LNReader ou NovelForge foi alterada; nenhuma dependência foi atualizada; nenhum teste Android foi declarado como executado nesta pesquisa; nenhum commit foi criado.
