# Preparação C5 — distribuição e validação LNReader

## Preparado

- README público descreve escopo, instalação local por cópia completa, funcionalidade, dependência de marcações NovelForge, antisspoiler, limitações e independência do LNReader.
- Criada fixture XHTML sintética pública com QUEST, SYSTEM aninhado, entidade character/event, blocos e índice contextual. Os testes usam identificadores e fatos sintéticos.
- Os quatro artefatos locais com texto de referência (`poc-v0.2.1.epub`, `original.html`, `chapter.xhtml`, `context.json`) foram preservados sem alterações, excluídos por `.gitignore` e omitidos do manifesto público. `npm pack --dry-run --json` não os incluiu.
- Criados diagnóstico independente removível (`scripts/lnreader-diagnostic.js`), instruções (`docs/LNREADER_DIAGNOSTICS.md`), notas sobre distribuição local/remota, checklist de release, estado da licença e instruções de publicação manual.
- Checklist Android ampliado até A50; todos os casos continuam PENDING.
- Bundle de produção não inclui o diagnóstico. Sem loader remoto, APIs externas ou recursos de runtime.

## Auditoria do ambiente e publicação

- Não existe arquivo `LICENSE`; a escolha está explicitamente pendente em `docs/LICENSE_STATUS.md`. Nenhuma licença foi presumida.
- Esta pasta não é um repositório Git (`.git` ausente), não há histórico/remote a preservar ou inspecionar. Nenhum conector GitHub autenticado está disponível nesta sessão.
- Nenhum repositório público, commit, branch remoto, tag, release ou push foi criado. Os comandos para publicação futura estão em `docs/GITHUB_PUBLISHING.md`; criação pública/push exigem aprovação explícita do proprietário.
- Versão permanece `0.4.0 preview`, não estável. Compatibilidade Android não foi declarada.

## Verificações desta execução

- `npm test`: 40/40 aprovados.
- `npm run build`: concluído com sucesso.
- `npm run manifest:verify`: manifesto verificado com sucesso após geração final.
- `npm pack --dry-run --json`: 46 arquivos listados; fixtures protegidas, `.agents/` e `prompts/` não incluídos. Nenhum pacote foi publicado.
- SHA-256 dos quatro fixtures locais comparados com os hashes anteriores: correspondem; conteúdos foram preservados.
- Bundle conferido: sem MutationObserver, polling, chamadas de rede ou código do diagnóstico.

Dry-run de npm é somente inspeção do conteúdo do pacote; não é publicação.

## Limitações e decisões pendentes

- Confirmar em Android se Custom Code executa em cada abertura/troca e se DOM, atributos e `#nf-context-index` ficam disponíveis. Diagnóstico não substitui testes funcionais do formatter.
- O método de carregamento remoto é apenas documentado como possibilidade condicional; não foi implementado nem validado.
- Proprietário precisa decidir licença, autorizar publicação pública, escolher conta/owner GitHub e aprovar qualquer push/tag/release.
