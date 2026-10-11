# Validação real no LNReader Android

Estado inicial de todos os casos: **PENDING**. Preencha “Observado” somente após executar no dispositivo; inclua modelo, Android, versão do LNReader e versão do EPUB/script. Resultado esperado não é evidência de execução.

| ID | Verificação / passos | Esperado | Observado | Estado |
|---|---|---|---|---|
| A01 | Instalar `dist/novelforge-lnreader.js` em Custom Scripts e abrir EPUB local | Script carrega sem erro | — | PENDING |
| A02 | Abrir capítulo com janela QUEST marcada | CSS de QUEST aplicado | — | PENDING |
| A03 | Abrir capítulo com SYSTEM marcado | CSS de SYSTEM aplicado | — | PENDING |
| A04 | Verificar texto narrativo antes/depois | Texto, ordem e pontuação idênticos | — | PENDING |
| A05 | Conferir delimitadores ocultos visualmente | Recuperáveis no DOM/texto; VIS-R13 | — | PENDING |
| A06 | Inspecionar Hidden Quest | Uma única janela QUEST | — | PENDING |
| A07 | Inspecionar SYSTEM dentro de QUEST | Sem janela SYSTEM aninhada/duplicada | — | PENDING |
| A08 | Navegar para próximo capítulo no mesmo leitor | Conteúdo novo recebe enhancement | — | PENDING |
| A09 | Navegar para capítulo sem índice contextual | Formatação preservada; UI contextual fechada | — | PENDING |
| A10 | Abrir índice JSON inválido | Sem crash; consulta falha fechada | — | PENDING |
| A11 | Tocar entidade com fato já revelado | Somente fatos autorizados são exibidos | — | PENDING |
| A12 | Tocar entidade antes de revelação posterior | Nenhum fato futuro aparece | — | PENDING |
| A13 | Tocar link com posição/bloco ausente | Link original continua funcional | — | PENDING |
| A14 | Abrir perfil detalhado e voltar | Somente fatos permitidos; navegação funciona | — | PENDING |
| A15 | Fechar modal pelo botão | Modal fecha e foco volta ao gatilho conectado | — | PENDING |
| A16 | Fechar modal com Escape | Modal fecha e foco retorna com segurança | — | PENDING |
| A17 | Percorrer controles com Tab | Foco permanece dentro do modal | — | PENDING |
| A18 | Percorrer controles com Shift+Tab | Foco permanece dentro do modal | — | PENDING |
| A19 | Trocar capítulo com modal aberto | Modal antigo fecha; sem foco em nó removido | — | PENDING |
| A20 | Reabrir/navegar repetidamente entre capítulos | Sem duplicação de UI, listeners ou estilos | — | PENDING |
| A21 | Confirmar se o Custom Code executa a cada abertura de capítulo | Registrar comportamento observado | — | PENDING |
| A22 | Avançar capítulo e observar execução do Custom Code | Registrar comportamento observado | — | PENDING |
| A23 | Retornar a capítulo anterior e observar execução | Registrar comportamento observado | — | PENDING |
| A24 | Observar se a WebView é reutilizada entre capítulos | Registrar comportamento observado | — | PENDING |
| A25 | Observar se `#LNReader-chapter` mantém identidade entre capítulos | Registrar comportamento observado | — | PENDING |
| A26 | Testar formatter após múltiplas trocas | Formatação correta sem repetição | — | PENDING |
| A27 | Verificar CSS após múltiplas inicializações | Sem CSS duplicado | — | PENDING |
| A28 | Verificar popup após múltiplas inicializações | Sem popup duplicado | — | PENDING |
| A29 | Trocar capítulo e tocar entidades | Nenhum dado contextual obsoleto | — | PENDING |
| A30 | Inspecionar se `#nf-context-index` sobrevive à renderização | Registrar presença/ausência no DOM | — | PENDING |
| A31 | Repetir teste offline | Formatter e índice incorporado operam offline | — | PENDING |
| A32 | Verificar SYSTEM em tema claro | Painel visual legível e único | — | PENDING |
| A33 | Verificar QUEST em tema claro | Painel visual legível e único | — | PENDING |
| A34 | Verificar QUEST e SYSTEM em tema escuro | Contraste e legibilidade adequados | — | PENDING |
| A35 | Comparar texto antes/depois da formatação | Texto narrativo idêntico | — | PENDING |
| A36 | Tocar links de entidades com índice ausente/inválido | Href original preservado; nenhum fato | — | PENDING |
| A37 | Inspecionar `data-nf-*` após renderização | Atributos semânticos continuam presentes | — | PENDING |
| A38 | Abrir capítulo longo e rolar | Sem travamento ou alteração narrativa | — | PENDING |
| A39 | Reabrir o mesmo capítulo várias vezes | Sem CSS, listener ou popup duplicado | — | PENDING |
| A40 | Avançar e retornar entre capítulos | Contexto atualizado sem fatos antigos | — | PENDING |
| A41 | Tocar personagem no ponto com fato revelado | Somente fato permitido aparece | — | PENDING |
| A42 | Tocar antes de revelação futura | Nenhum fato futuro aparece | — | PENDING |
| A43 | Tocar entidade sem bloco válido | Link original segue; sem fatos | — | PENDING |
| A44 | Testar quick note, perfil, voltar e fechar | Fluxos funcionam sem navegação XHTML | — | PENDING |
| A45 | Usar Escape e Tab/Shift+Tab se disponível | Fechamento e foco seguros | — | PENDING |
| A46 | Abrir a tela de Custom Code conforme a versão instalada | Registrar rótulos e método real de execução | — | PENDING |
| A47 | Instalar temporariamente `scripts/lnreader-diagnostic.js` e abrir capítulo | Badge informa presença/contagens sem conteúdo narrativo | — | PENDING |
| A48 | Avançar/retornar com diagnóstico instalado | Registrar contador e persistência entre execuções | — | PENDING |
| A49 | Usar “Sample current DOM” após troca sem reexecução observável | Mudanças estruturais desde amostra são indicadas | — | PENDING |
| A50 | Acionar “Remove diagnostic” | Badge desaparece; script pode ser removido das configurações | — | PENDING |

## Registro de execução

- Dispositivo / modelo: —
- Android: —
- LNReader: —
- EPUB / hash: —
- Data: —
- Resultado geral: PENDING
