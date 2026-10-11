# C1.2 — adaptador LNReader Custom Script

## Arquivos

- `src/lnreader-adapter.js`: inicialização automática pelo seletor confirmado `#LNReader-chapter`.
- `scripts/build-dist.js`: gera a biblioteca e o script executável para LNReader, incorporando `src/formatter.css`.
- `dist/novelforge-lnreader.js`: artefato autocontido para colagem no editor Custom Script.
- `tests/lnreader-adapter.test.js`: testes do adaptador e do artefato.
- `tests/fixtures/chapter-no-fallback.xhtml`: XHTML diagnóstico sem link para CSS fallback, com QUEST, SYSTEM e SYSTEM aninhado.

## Inicialização

O bundle contém o núcleo da C1.1 e o adaptador. O adaptador procura `#LNReader-chapter` imediatamente e chama `NovelForgeFormatter.enhance(chapter)`. Se o elemento não estiver disponível, registra `DOMContentLoaded` quando apropriado e tenta localizá-lo em até 20 intervalos de 100 ms. Há no máximo um timer ativo por instância do script; não há observador permanente.

Cada nova execução do custom script procura o capítulo atual novamente. A injeção de CSS continua protegida por `nf-formatter-styles`; a formatação não reconstrói o HTML nem altera texto ou atributos narrativos.

## Build e testes

```text
npm run build
npm test
```

Resultado local desta entrega: 13 testes aprovados, 0 falhas. Os testes usam DOM simulado; não comprovam o comportamento no WebView do LNReader.

## Teste manual Android

1. Execute `npm run build` no repositório.
2. Abra `dist/novelforge-lnreader.js`, copie todo o conteúdo e cole no editor Custom Script do LNReader; salve.
3. Abra um EPUB de teste contendo a fixture sintética, sem `fallback.css`. Não distribua os arquivos de referência locais.
4. Verifique que QUEST e SYSTEM têm estilos distintos, que a QUEST não ganha painel SYSTEM interno e que texto e marcadores continuam selecionáveis/recuperáveis.
5. Saia e abra outro capítulo ou reexecute o custom script. Confirme ausência de CSS duplicado e registre versão do LNReader, captura de tela e logs disponíveis.

O fixture XHTML não é, isoladamente, um EPUB instalável. A criação/empacotamento de uma cópia diagnóstica deve manter intacto o EPUB de referência.

## Limitações

Foi confirmado pelo usuário que custom scripts executam em EPUB local e foi fornecido o seletor `#LNReader-chapter`. Não há evidência no repositório que confirme quando o LNReader reexecuta o script durante navegação. Se ele executar apenas na abertura, a reinicialização para o próximo capítulo depende do mecanismo do LNReader. Validação Android permanece pendente. C2 e C3 não foram implementados.
