# C1 — relatório

Implementado em `src/formatter.js`:

- reconhece apenas janelas existentes com `data-nf-id`, `data-nf-category` e `data-nf-subtype`;
- mantém a janela `QUEST` anotada como uma única janela de apresentação;
- ignora qualquer `.nf-window` anotada dentro de outra janela, sem criar `SYSTEM`;
- não examina colchetes, não altera `textContent` e não modifica o DOM;
- preserva o CSS fallback e a execução idempotente.

## Testes

Execute `npm test`. Os testes cobrem DOM ausente, reconhecimento da QUEST, colchetes sem classificação e aninhamento sem duplicação.

## Validação Android pendente

No LNReader Android, usar um EPUB local de teste criado com a fixture sintética `tests/fixtures/chapter-synthetic.xhtml`, executar o script e confirmar uma única caixa QUEST, sem painel SYSTEM aninhado. Os arquivos de referência protegidos permanecem locais e não são distribuídos. Registrar versão do LNReader, versão do script, captura e log disponível.

Não foi criado adaptador LNReader: o pacote não documenta seu formato/API e nenhum script antigo ou exemplo do ambiente foi fornecido.

## Fora de C1

Transporte/filtro temporal do índice, quick note, perfil detalhado, navegação de entidade e robustez adicional pertencem a C2–C4.
