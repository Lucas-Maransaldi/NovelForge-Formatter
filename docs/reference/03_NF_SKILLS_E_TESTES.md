# NovelForge — Playbook operacional de Skills (Project Source)

> **Uso neste Project:** este documento é uma fonte de instruções de trabalho, com seis procedimentos especializados. Quando o usuário solicitar uma dessas atividades, o assistente deve consultar este documento e os arquivos `00`, `01` e `02` relevantes **antes** de executar. As Skills aqui são **playbooks utilizáveis mediante consulta**, não Skills instaladas automaticamente no mecanismo de ferramentas do ChatGPT. A leitura das Sources pode exigir recuperação explícita do arquivo. Não afirmar que uma Skill foi executada se não houve processamento real.

## Roteador operacional — escolha a Skill pelo objetivo

| Solicitação | Procedimento a seguir | Entradas mínimas | Saídas esperadas |
|---|---|---|---|
| Classificar capítulo / marcar janelas | `novelforge-chapter-analyzer` | HTML original, identificador e ordem do capítulo | anotações com IDs, offsets, confiança e evidências |
| Criar/atualizar personagens ou glossário | `novelforge-knowledge-indexer` | blocos validados, conhecimento anterior | fatos com proveniência e índices contextuais |
| Auditar spoilers | `novelforge-spoiler-validator` | fatos, `revealedAt`, posição de leitura, páginas/links | relatório PASS/FAIL e correções necessárias |
| Produzir HTML/EPUB | `novelforge-epub-builder` | originais, anotações aprovadas, índices | HTML enriquecidos, EPUB, relatório de validação |
| Auditar qualidade semântica | `novelforge-semantic-qa` | originais, anotações e renderizações | diferenças, conflitos, estado por capítulo |
| Especificar/testar custom script LNReader | `novelforge-lnreader-formatter` | contrato `data-nf-*`, XHTML de teste, requisitos | script/prompt técnico e plano de testes |

## Ordem de execução padrão

1. Ler `00_NF_GOVERNANCA_E_DECISOES.md` para identificar decisões vigentes e premissas ainda não verificadas.
2. Ler `01_NF_ESPECIFICACOES.md` para consultar a categoria e as regras pertinentes.
3. Ler `02_NF_ARQUITETURA_E_CONTRATOS.md` para estruturas de dados e interfaces.
4. Aplicar o procedimento da Skill pertinente descrito abaixo; em fluxos completos, seguir **análise → indexação → validação antisspoiler → QA → publicação**.
5. Validar integridade textual com comparação determinística; em falhas, não publicar saída enriquecida daquele capítulo.
6. Reportar arquivos gerados, capítulos processados, limitações e pendências; não inventar conteúdo ausente.

## Regras transversais obrigatórias

- Original imutável; nunca reescrever o texto da novel.
- Nenhum fato de capítulo/bloco futuro pode aparecer em consultas contextuais.
- Anotações ambíguas não recebem estilização automática; preservar revisão manual.
- Gerar EPUB **sob demanda**, sem lote fixo obrigatório; manter HTMLs enriquecidos e intermediários.
- O formatter do LNReader **não** reclassifica semanticamente o texto; interpreta as anotações.
- A execução de scripts em EPUB local é premissa para a PoC, **não** compatibilidade comprovada.
- Se um arquivo necessário não estiver acessível, solicitar ou recuperar a fonte; não completar lacunas com suposições.

---

# NovelForge — Fonte consolidada
> Pacote v0.1.1. Conteúdo transcrito do pacote v0.1.0, sem resumir. Arquivos originais identificados em cada seção.


---

## ARQUIVO ORIGINAL: `04_SKILLS/00_SKILLS_GUIDE.md`

# Guia de Skills

Skills são instruções de trabalho especializadas. Estes arquivos foram preparados para futura instalação/adaptação; simplesmente anexá-los como Project Sources não os torna ferramentas executáveis. Cada Skill deve consultar as especificações oficiais, registrar versões e nunca sobrescrever fonte. Prioridade: integridade > antisspoiler > legibilidade > estilo. A validação determinística deve existir em código, não apenas em prompt.



---

## ARQUIVO ORIGINAL: `04_SKILLS/01_chapter_analyzer/SKILL.md`

---
name: novelforge-chapter-analyzer
description: Analisador semântico de capítulos para o projeto NovelForge.
---

# Analisador semântico de capítulos

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Receber HTML/blocos imutáveis e contexto anterior permitido. 2. Identificar janelas WIN-001..WIN-009, subtipos, limites exatos, destaques HLT e referências. 3. Respeitar multiparágrafo e spans inline. 4. Emitir apenas anotações com IDs e intervalos, evidências e confiança; nunca texto reescrito. 5. Deixar ambiguidade como NEEDS_REVIEW ou original. 6. Não incorporar fatos futuros. 7. Submeter à validação determinística.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `04_SKILLS/02_knowledge_indexer/SKILL.md`

---
name: novelforge-knowledge-indexer
description: Indexador temporal de conhecimento para o projeto NovelForge.
---

# Indexador temporal de conhecimento

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Ler fatos sustentados por blocos e estado conhecido até capítulo anterior. 2. Identificar entidades com IDs estáveis, aliases seguros e relações. 3. Registrar fonte e posição `revealedAt` por fato. 4. Preservar mudanças temporais, não sobrescrever retrospectivamente. 5. Produzir índice mestre separado e visões contextuais. 6. Garantir que quick note e página detalhada respeitem bloco de origem. 7. Não inventar lore.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `04_SKILLS/03_spoiler_validator/SKILL.md`

---
name: novelforge-spoiler-validator
description: Validador de spoilers para o projeto NovelForge.
---

# Validador de spoilers

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Validar cada fato, alias, nome visível, título, âncora e relação contra a posição de consulta. 2. Não incluir fatos de capítulos futuros em índice contextual de capítulo anterior. 3. Aplicar filtro por bloco no capítulo corrente. 4. Ao navegar para página detalhada, preservar capítulo/bloco de origem. 5. Reportar vazamentos como FAIL; não publicar versão insegura. 6. Exigir verificações em código, não apenas juízo de IA.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `04_SKILLS/04_epub_builder/SKILL.md`

---
name: novelforge-epub-builder
description: Construtor de HTML e EPUB para o projeto NovelForge.
---

# Construtor de HTML e EPUB

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Consumir fonte validada + anotações + índices, sem reclassificar. 2. Produzir HTML semântico individual com `data-nf-*`. 3. Produzir EPUB sob demanda para seleção arbitrária, navegação e manifesto válidos. 4. Incorporar CSS de fallback e índice contextual offline. 5. Preservar JSON/HTML intermediários. 6. Validar texto e recursos antes de publicar. 7. Não depender da execução do script para legibilidade.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `04_SKILLS/05_semantic_qa/SKILL.md`

---
name: novelforge-semantic-qa
description: Auditoria semântica e correções para o projeto NovelForge.
---

# Auditoria semântica e correções

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Conferir intervalos, agrupamento, categoria dominante e elementos secundários. 2. Impedir janelas aninhadas, `<a>` aninhados e duplicatas. 3. Registrar confiança e estado de revisão. 4. Aplicar correções manuais validadas com prioridade; guardar histórico. 5. Reprocessar somente região autorizada e dependências. 6. Gerar PASS/PASS_WITH_WARNINGS/FAIL.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `04_SKILLS/06_lnreader_formatter/SKILL.md`

---
name: novelforge-lnreader-formatter
description: Contrato de implementação do formatter para o projeto NovelForge.
---

# Contrato de implementação do formatter

## Quando usar
Usar somente quando a tarefa corresponder a esta especialidade e os dados necessários estiverem disponíveis. Consultar `01_GOVERNANCE/01_DECISIONS.md` e as especificações correspondentes.

## Procedimento
1. Codex implementa custom script para consumir `data-nf-*` e índice contextual, sem reclassificação. 2. Aplicar tema adaptativo, raridades, notas rápidas e páginas detalhadas. 3. Respeitar posição de leitura e links de retorno. 4. Garantir fallback quando índice/script falhar. 5. Instrumentar PoC de execução em EPUB local. 6. Não afirmar compatibilidade sem teste. 7. Entregar arquivos completos e testes.

## Saída
Produzir artefatos verificáveis, relatar ambiguidades e manter proveniência. Não declarar execução de etapas não realizadas.

## Status
Modelo de Skill incluído como fonte; **não é skill automaticamente instalada** no Project.



---

## ARQUIVO ORIGINAL: `06_TESTS/00_TEST_PLAN.md`

# Plano de teste e rastreabilidade

- Fixture real preservada sem modificações; conferir hash antes/depois.
- Detectar `div#chapter-content` e 91 parágrafos, 149 spans na amostra.
- Testar janela QUEST multiparágrafo nos blocos semânticos `b3` e `b4` da fixture sintética, sem incluir o bloco seguinte.
- Testar spans de pontuação com conteúdo sintético: `<span>“</span><span>Ready!</span><span>”</span>` deve manter `“Ready!”`.
- Testar notificação parcial no mesmo `<p>` que narrativa.
- Testar janelas adjacentes independentes, referências internas, destaque de raridade, link sem aninhamento.
- Testar índice por capítulo/bloco, página detalhada aberta de ponto anterior à revelação, aliases spoiler-safe.
- Testar falha de anotação e de integridade com fallback correto.
- Executar POC-001..010 descritos em NF-012 no dispositivo do usuário.
