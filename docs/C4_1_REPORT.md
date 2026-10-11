# Entrega C4.1 — ciclo de vida e manifesto

## Resultado

- Removidos do adaptador todos os estados, instalação, callbacks e desconexões de `MutationObserver`, e o agendamento que existia para mutações. Não há polling permanente; permanece somente espera limitada (20 tentativas de 100 ms) se o Custom Code rodar antes de `#LNReader-chapter` existir.
- O LNReader executar Custom Code por capítulo é o gatilho principal de inicialização. É uma hipótese do projeto, não um comportamento Android comprovado.
- Cada reexecução localiza o contêiner atual, chama o formatter idempotente e reinicializa a UI. A UI anterior remove seu listener/modal; CSS é injetado uma vez.
- Cada clique verifica que o artigo ainda pertence ao root conectado, recarrega o índice contextual e exige compatibilidade com o capítulo atual antes de chamar `queryEntity`. Não se usa fatos brutos, cache antigo ou posição final presumida; falha preserva o link original.
- Manifesto SHA-256 determinístico cobre os arquivos do projeto exceto a si próprio e diretórios `.git`/`node_modules`. Comandos: `npm run manifest:generate` e `npm run manifest:verify`. O teste automatizado também executa a verificação.
- A lista Android foi estendida com A21–A31, todos PENDING. Nenhum resultado foi simulado.

## Comandos para reproduzir

```text
npm run build
npm test
npm run manifest:generate
npm run manifest:verify
npm test
```

O manifesto deve ser gerado depois das alterações finais; o último `npm test` inclui sua verificação. O artefato principal segue sendo `dist/novelforge-lnreader.js`, versão `0.4.0`.

## Limitações

- Não foi confirmado em dispositivo se Custom Code executa em toda abertura/troca de capítulo, se WebView/root são reutilizados ou se o índice incorporado sobrevive à renderização. Validar os itens pendentes de `docs/ANDROID_VALIDATION.md`.
- A execução posterior do Custom Code é necessária para reconhecer troca de capítulo; sem execução do host, não existe observação ativa.
- C5 e publicação não foram executadas.
