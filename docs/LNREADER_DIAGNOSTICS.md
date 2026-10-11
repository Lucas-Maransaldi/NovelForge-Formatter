# Diagnóstico temporário de Custom Code no LNReader

`scripts/lnreader-diagnostic.js` é um script independente, não incluído no bundle de produção. Ele não usa rede, bibliotecas, MutationObserver, polling ou console. A indicação visual é temporária e removível pelo botão **Remove diagnostic**.

## Como executar

1. Faça uma cópia do conteúdo completo do arquivo e use o mesmo mecanismo de Custom Code já disponível na instalação do LNReader. Não assuma nomes de menus não confirmados.
2. Abra uma fixture/EPUB sintético e observe a indicação no canto inferior da página.
3. Abra, avance e retorne capítulos. Anote `Custom Code executions`, identidade do root, chapter id, contagens semânticas e presença do índice.
4. Se o Custom Code não executar após uma troca, toque em **Sample current DOM** no diagnóstico ainda visível. A comparação é entre resumo estrutural (IDs/contagens), sem coletar texto narrativo. Ela pode indicar alterações ocorridas desde a amostra anterior, mas não registra o instante da troca.
5. Pressione **Remove diagnostic** ao terminar e remova o script temporário das configurações.

Execuções sucessivas com contador crescente demonstram que o estado JavaScript sobreviveu entre execuções. Um contador reiniciado, sozinho, não comprova que a WebView foi recriada: o host pode recriar o contexto JavaScript mantendo outros elementos, ou limpar estado por outra razão. `Same root as last script execution` compara identidade do elemento quando há estado anterior no mesmo contexto.

O diagnóstico reporta apenas presença/contagens e atributos de identificação semânticos, não texto da novel, dados pessoais, URLs, nem fatos contextuais. A presença de `#nf-context-index` e dos atributos precisa ser confirmada no DOM renderizado real. O script não valida comportamento antisspoiler e não modifica nem substitui o formatter de produção.
