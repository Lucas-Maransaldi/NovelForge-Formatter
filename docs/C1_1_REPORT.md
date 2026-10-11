# C1.1 — integração visual

## Implementação

`src/formatter.css` contém os estilos editáveis. `src/formatter.js` agora expõe `injectStyles()` e faz `enhance()` injetar um único elemento `<style id="nf-formatter-styles">` no `head` do documento (ou no elemento raiz como fallback). O build incorpora o CSS no `dist/novelforge-formatter.js`, sem rede ou dependências em runtime.

Há estilos distintos para `QUEST` e `SYSTEM`. Os seletores visuais usam o filho direto de `article.nf-chapter`; isso impede que uma anotação SYSTEM descendente de QUEST produza um segundo painel visual. Os delimitadores são apenas ocultados por CSS e continuam no DOM.

## Testes

`npm.cmd test`: 6 testes aprovados, 0 falhas. Cobertura inclui injeção inicial, segunda execução idempotente, estilos QUEST/SYSTEM, preservação de texto/estrutura e regressões da C1.

## Limitações e teste no LNReader

A integração específica do custom script continua pendente porque a API/formato não está documentada no repositório e nenhum script antigo foi fornecido. O ponto de conexão é chamar `NovelForgeFormatter.enhance(document)` no custom script real.

No Android, colar o script no ambiente disponível e abrir um EPUB de teste produzido a partir de `tests/fixtures/chapter-synthetic.xhtml`. Verificar uma única caixa QUEST, sem painel SYSTEM interno, e estilos próprios sem `fallback.css`. Os testes Node não comprovam compatibilidade Android.

C2 e C3 não foram implementados.
