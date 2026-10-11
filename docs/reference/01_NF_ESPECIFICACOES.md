# NovelForge — Fonte consolidada
> Pacote v0.1.1. Conteúdo transcrito do pacote v0.1.0, sem resumir. Arquivos originais identificados em cada seção.


---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/01_NF-001_SEMANTIC_WINDOWS.md`

# NF-001 — Janelas semânticas | APROVADO

## Nove categorias
1. `WIN-001 SYSTEM`: `SYS-001` geral, `SYS-002` progressão, `SYS-003` recompensa, `SYS-004` alerta, `SYS-005` penalidade.
2. `WIN-002 ITEM`: nome, tipo, raridade, atributos, efeitos, descrição, requisitos/restrições; multiline; preservar ordem/texto.
3. `WIN-003 SKILL`: `SKL-001` info, `SKL-002` adquirida, `SKL-003` level up, `SKL-004` upgraded, `SKL-005` unlocked, `SKL-006` perdida/removida; nome, raridade/tipo, nível, efeitos, custos, cooldown, descrições.
4. `WIN-004 QUEST`: `QST-001` info, `QST-002` available, `QST-003` accepted/started, `QST-004` updated, `QST-005` completed, `QST-006` failed, `QST-007` abandoned/cancelled; nome, dificuldade, descrição, objetivos/progresso, recompensas, penalidades, restrições.
5. `WIN-005 STATUS`: `STS-001` general, `STS-002` attributes, `STS-003` resources, `STS-004` effects, `STS-005` progression, `STS-006` combat; sem tabelas de comparação histórica.
6. `WIN-006 ACHIEVEMENT`: `ACH-001` unlocked, `ACH-002` first, `ACH-003` world first, `ACH-004` milestone, `ACH-005` special.
7. `WIN-007 CLASS`: `CLS-001` info, `CLS-002` acquired, `CLS-003` changed, `CLS-004` advanced, `CLS-005` specialization, `CLS-006` lost; distinguir profissão de classe quando indicado.
8. `WIN-008 TITLE`: `TTL-001` info, `TTL-002` acquired, `TTL-003` upgraded, `TTL-004` activated, `TTL-005` lost, `TTL-006` effect.
9. `WIN-009 EVENT`: `EVT-001` announcement, `EVT-002` started, `EVT-003` updated, `EVT-004` completed, `EVT-005` cancelled, `EVT-006` world, `EVT-007` special; escopo e status podem coexistir.

## Regras transversais
Classificar apenas com evidência; preferir categoria específica a SYSTEM genérico; agrupar conservadoramente apenas mensagens adjacentes claramente relacionadas; preservar ordem e texto; cabeçalho por categoria, estado e raridade quando houver; ambiguidade mantém original.

## Registro de regras anteriores
Famílias `QST-R1..R10`, `STS-R1..R10`, `ACH-R1..R10`, `CLS-R1..R11`, `TTL-R1..R11`, `EVT-R1..R12` foram aprovadas em conversa anterior, mas sua redação literal não está integralmente disponível neste contexto. **Não interpretar a síntese acima como transcrição linha a linha dessas regras.**



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/02_NF-002_CONTEXTUAL_HIGHLIGHTS.md`

# NF-002 — Destaques contextuais | APROVADO

- `HLT-001`: moeda do jogo.
- `HLT-002`: moeda do mundo real.
- `HLT-003`: raridade.
- `HLT-004`: progressão.
- `HLT-005`: atributos/efeitos.
- `HLT-006`: informação crítica.

Destaque é inline, não janela; funciona dentro e fora de janelas. Contexto é obrigatório para evitar falsos positivos e excesso de ruído visual. Não modificar texto. CSS offline e acessível. Regras `HLT-R1..R7` aprovadas anteriormente; formulação literal não recuperada integralmente.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/03_NF-003_CURRENCY.md`

# NF-003 — Conversão monetária | APROVADO

- `CUR-001`: KRW → USD.
- `CUR-002`: outras moedas reais configuradas.
- `CUR-003`: USD apenas destacado.
- `CUR-004`: moeda virtual sem conversão.
- `CUR-005`: moeda ambígua sem conversão.

Prioridade: taxa de câmbio configurada pelo usuário; caso contrário taxa corrente no momento de geração do EPUB; sem consulta disponível, referência cacheada previamente conhecida, **explicitamente rotulada**. Congelar taxa por EPUB e registrar fonte/data/valor. Original intocado; valor convertido aproximado, secundário e opcional; leitura offline. `CUR-R1..R10` aprovadas, sem texto literal completo disponível.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/04_NF-004_CHARACTER_ENCYCLOPEDIA.md`

# NF-004 — Enciclopédia de personagens | APROVADO

Abordagem **C híbrida**: nota rápida + página detalhada, com links internos como fallback. Fatos incrementais com capítulo/bloco de revelação, fonte, temporalidade e estado histórico; identidades, aliases e relações só quando conhecidos. O nome, ID exposto, título, âncora e URL não podem revelar futuro. Índice mestre global privado ao pipeline; visões contextuais por capítulo e por ponto de consulta. Funciona offline, com links opcionais/adaptativos para evitar poluição visual. `ENC-001..ENC-007` e `ENC-R1..R20` aprovados anteriormente; redação literal completa não disponível.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/05_NF-005_VISUAL_IDENTITY.md`

# NF-005 — Identidade visual | APROVADO

`VIS-001` discreto, `VIS-002` moderado, `VIS-003` épico. **Escolha C: Adaptativo**. Narrativa limpa; notificações com intensidade proporcional à relevância. Perfis de raridade configuráveis por novel (exemplo ilustrativo: Common cinza, Uncommon verde, Rare azul, Epic roxo, Unique magenta, Legendary dourado, Mythic rubi — não hierarquia canônica). Classificação independente do tema. CSS EPUB degradável em leitores, respeitando acessibilidade e modos claro/escuro/sépia. `VIS-R1..R12` aprovadas; redação literal não disponível.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/06_NF-006_WORLD_GLOSSARY.md`

# NF-006 — Glossário do mundo | APROVADO

`GLS-001` locais, `GLS-002` organizações, `GLS-003` conceitos de sistema, `GLS-004` terminologia, `GLS-005` história/mitologia, `GLS-006` artefatos importantes. Nota rápida + página detalhada; relevância seletiva; fatos e relações com fonte capítulo/bloco; barreira antisspoiler compartilhada com enciclopédia. `GLS-R1..R14` aprovadas anteriormente; texto literal completo não disponível.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/07_NF-007_NARRATIVE_INTEGRITY.md`

# NF-007 — Integridade narrativa | APROVADO

## Intenção consolidada de INT-R1..R14
- Fonte HTML original imutável; IA nunca reescreve a novel.
- Proveniência para cada anotação; janelas não englobam narrativa externa.
- Não sobrepor janelas estruturais; destaques inline podem coexistir.
- Preservar texto, ordem, espaços e pontuação; conteúdo gerado identificável.
- Anotação inválida descartada com segurança; validações determinísticas antes e após renderização.
- Relatório por capítulo; reprocessamento seletivo e invalidação de dependências.
- Validação temporal contra spoilers e integridade EPUB; IA não é única instância de validação.
- `PASS`, `PASS_WITH_WARNINGS`, `FAIL`; em FAIL bloquear enriquecido e admitir original somente validado.

## INT-R15..R17 (incorporadas na consolidação aprovada)
- `INT-R15`: preservar origem HTML e mapeamento de elementos.
- `INT-R16`: spans/inline não definem necessariamente limites semânticos.
- `INT-R17`: janelas podem atravessar múltiplos parágrafos.

## INT-R18..R24
- `INT-R18`: importar HTML recursivamente em subpastas.
- `INT-R19`: ordenar capítulos por evidência confiável, não posição/alfabeto simples.
- `INT-R20`: detectar duplicidades.
- `INT-R21`: detectar lacunas.
- `INT-R22`: registrar origem, identidade e integridade de HTML.
- `INT-R23`: processamento incremental.
- `INT-R24`: HTML enriquecido e EPUB como saídas reutilizáveis; preservar original, JSON e índice.

## Política de falhas aprovada
Falha de classificação → trecho original, seguir processamento. Falha de integridade → bloquear publicação enriquecida do capítulo; fallback original somente após validar. Registrar tudo.

**Nota:** redação de INT-R1..R14 é síntese, não transcrição literal.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/08_NF-008_PIPELINE.md`

# NF-008 — Pipeline | APROVADO, com ajustes

- `PIPE-R1` importação incremental.
- `PIPE-R2` ordem narrativa correta.
- `PIPE-R3` **publicação flexível sob demanda**: um capítulo, intervalo ou coleção completa (substitui lote fixo de 50).
- `PIPE-R4` conhecimento contínuo entre publicações.
- `PIPE-R5` falhas semânticas isoladas não interrompem todos os capítulos.
- `PIPE-R6` validação obrigatória.
- `PIPE-R7` saídas HTML + EPUB.
- `PIPE-R8` reprocessamento seletivo.
- `PIPE-R9` troca de tema sem reclassificar IA.
- `PIPE-R10` relatórios.
- `PIPE-R11` configuração por novel.
- `PIPE-R12` leitura offline.
- `PIPE-R13` independência entre processamento e publicação.
- `PIPE-R14` processamento individual por capítulo.
- `PIPE-R15` publicação não destrutiva.

**Arquitetura posterior prevalece:** ChatGPT recebe ZIP e processa diretamente; não exigir programa próprio de exporter/importer como caminho principal. Internamente, processar sequencialmente, salvar checkpoints e publicar seleção arbitrária.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/09_NF-009_SEMANTIC_CONFLICTS.md`

# NF-009 — Hierarquia e conflitos semânticos | APROVADO (SEM-R1..R34)

## NF-009.1
- `SEM-R1`: categoria dominante reflete propósito, não palavras isoladas.
- `SEM-R2`: elementos secundários coexistem com categoria principal.
- `SEM-R3`: notificações independentes têm janelas separadas.
- `SEM-R4`: preservar ordem original.
- `SEM-R5`: ambiguidade → sem transformação estrutural.

## NF-009.2
- `SEM-R6`: janela multiparágrafo com evidência.
- `SEM-R7`: limites precisos, sem narrativa externa.
- `SEM-R8`: intervalos parciais dentro do bloco.
- `SEM-R9`: preservar texto e elementos inline relevantes.
- `SEM-R10`: delimitadores incompletos não proíbem classificação se outras evidências bastarem.
- `SEM-R11`: validar intervalos e sobreposições.
- `SEM-R12`: proximidade não basta para agrupar.

## NF-009.3
- `SEM-R13`: separar notificações independentes.
- `SEM-R14`: não aninhar janelas estruturais; usar seções internas.
- `SEM-R15`: permitir destaques dentro de janelas.
- `SEM-R16`: permitir múltiplas classificações semânticas sobre mesmo texto.
- `SEM-R17`: resolver conflitos visuais deterministicamente.
- `SEM-R18`: permitir links contextuais em janelas.
- `SEM-R19`: proibir `<a>` aninhados.
- `SEM-R20`: degradação visual segura.

## NF-009.4
- `SEM-R21`: confiança explícita HIGH/MEDIUM/LOW.
- `SEM-R22`: incerteza não aplicada automaticamente (MEDIUM revisão, LOW original).
- `SEM-R23`: correção individual.
- `SEM-R24`: correção manual validada prevalece.
- `SEM-R25`: histórico de alterações.
- `SEM-R26`: reprocessamento localizado.
- `SEM-R27`: contexto fornecido à IA somente para leitura.
- `SEM-R28`: proteger anotações revisadas manualmente.
- `SEM-R29`: validar após correções.
- `SEM-R30`: dependências e evidência de fatos.
- `SEM-R31`: revalidar conhecimento dependente seletivamente.
- `SEM-R32`: proteger temporalidade após correções.
- `SEM-R33`: estados persistentes (`AUTO_APPROVED`, `NEEDS_REVIEW`, `MANUALLY_APPROVED`, `REJECTED`).
- `SEM-R34`: anotações pendentes/rejeitadas não produzem estrutura; narrativa original permanece.

**Prioridade visual:** integridade → estrutura → legibilidade → links → destaques → decoração.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/10_NF-010_CHATGPT_INTEGRATION.md`

# NF-010 — Integração ChatGPT / formatter | ARQUITETURA REVISTA APROVADA

## Fluxo atual (prevalece)
Usuário fornece ZIP com HTMLs → ChatGPT processa semanticamente, cria índices, HTMLs anotados e EPUB sob demanda → LNReader importa EPUB → custom script Codex consulta índices e aplica tema. HTML hospedado via extensão é fallback se necessário. Manter JSON e HTML intermediários. A análise pode exigir lotes internos e checkpoints por limite operacional.

## AI-R1..R10 (propostas na arquitetura anterior; aproveitáveis como requisitos técnicos, sem aprovação explícita individual)
- `AI-R1` pacotes estruturados por capítulo; `AI-R2` IDs estáveis; `AI-R3` sem reescrita; `AI-R4` JSON validável; `AI-R5` separar análise/renderização; `AI-R6` dividir capítulos extensos; `AI-R7` contexto de apoio; `AI-R8` deduplicar sobreposições; `AI-R9` consolidar/validar; `AI-R10` interface extensível.

## AI-R11..R18 (propostas e coerentes com arquitetura aprovada; aprovação individual não registrada)
- `AI-R11` EPUB local preferencial; `AI-R12` HTML hospedado fallback; `AI-R13` semântica independente de tema; `AI-R14` CSS reutilizável; `AI-R15` CSS fallback no EPUB; `AI-R16` análise independente do LNReader; `AI-R17` teste de compatibilidade antes de escalar; `AI-R18` ZIP como entrada, respeitando limites.

## IDX-R1..R10 (propostos; abordagem híbrida e responsabilidade do formatter aprovadas)
- `IDX-R1` ChatGPT constrói, formatter consulta.
- `IDX-R2` IDs estáveis.
- `IDX-R3` revelação capítulo/bloco.
- `IDX-R4` consulta por posição.
- `IDX-R5` antisspoiler.
- `IDX-R6` offline.
- `IDX-R7` formato independente.
- `IDX-R8` índice mestre preservado fora do EPUB.
- `IDX-R9` índices contextuais por capítulo.
- `IDX-R10` falha segura.

## Limitação conhecida
Execução de scripts em EPUBs locais é **premissa aceita**, não comportamento verificado. Não confundir aprovação de projeto com teste de compatibilidade.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/11_NF-011_DATA_CONTRACT.md`

# NF-011 — Contrato EPUB/indexing/formatter | APROVADO (NF11-R1..R37)

## NF-011.1
- `NF11-R1` ID único de capítulo na novel.
- `NF11-R2` ID independente do nome/posição de arquivo.
- `NF11-R3` IDs estáveis por bloco.
- `NF11-R4` preservação textual.
- `NF11-R5` janela com ID, categoria e subtipo.
- `NF11-R6` raridade opcional com evidência.
- `NF11-R7` anotações independentes do tema.
- `NF11-R8` referências semânticas a entidades.
- `NF11-R9` identidade persistente.
- `NF11-R10` nomes/aliases não definem identidade por si.
- `NF11-R11` fatos com revelação temporal.
- `NF11-R12` consulta até posição atual.
- `NF11-R13` metadados/nomes/IDs seguros contra spoilers.
- `NF11-R14` índice acessível durante leitura.
- `NF11-R15` transporte substituível.
- `NF11-R16` versionamento.
- `NF11-R17` compatibilidade futura sempre que possível.
- `NF11-R18` falha segura em dados incompatíveis.

## NF-011.2
- `NF11-R19` estrutura EPUB padronizada.
- `NF11-R20` recursos declarados no pacote.
- `NF11-R21` índice contextual autossuficiente por capítulo.
- `NF11-R22` consulta offline.
- `NF11-R23` JSON e XHTML gerados da mesma fonte validada.
- `NF11-R24` descoberta por atributos/IDs documentados.
- `NF11-R25` formatter não reclassifica.
- `NF11-R26` índice do capítulo não contém fatos posteriores ao capítulo.
- `NF11-R27` filtro por bloco de revelação.
- `NF11-R28` identificadores/metadados seguros.
- `NF11-R29` páginas detalhadas respeitam posição de origem.
- `NF11-R30` navegação preserva contexto/retorno.
- `NF11-R31` fallback por links internos.
- `NF11-R32` CSS fallback legível.
- `NF11-R33` script pode complementar/substituir tema.
- `NF11-R34` evitar conflito/duplicação CSS.
- `NF11-R35` versão de contrato e índice declaradas.
- `NF11-R36` compatibilidade progressiva.
- `NF11-R37` falha segura em versão incompatível.

## Estrutura EPUB ilustrativa
```text
mimetype
META-INF/container.xml
OEBPS/package.opf
OEBPS/nav.xhtml
OEBPS/chapters/chapter-0001.xhtml
OEBPS/indexing/chapter-0001.json
OEBPS/styles/base.css
OEBPS/styles/fallback.css
OEBPS/encyclopedia/characters.xhtml
OEBPS/encyclopedia/glossary.xhtml
```

**Nota:** organização é ilustrativa e deverá atender ao perfil EPUB adotado. Dados no XHTML são alternativa ao acesso direto ao JSON. Consultar `02_ARCHITECTURE/02_DATA_CONTRACT.md`.



---

## ARQUIVO ORIGINAL: `03_SPECIFICATIONS/12_NF-012_PROOF_OF_CONCEPT.md`

# NF-012 — Prova de conceito | INÍCIO AUTORIZADO; NÃO EXECUTADA

## Fixture
A fixture pública atual é sintética (`tests/fixtures/chapter-synthetic.xhtml`) e cobre janelas multiparágrafo, blocos e marcações semânticas sem distribuir narrativa de terceiros. Os artefatos da PoC original foram mantidos apenas localmente e excluídos da distribuição; contagens/offsets desses arquivos não são requisitos do formatter.

## Testes POC-001..POC-010
1. Importar EPUB no LNReader.
2. Confirmar execução do custom script.
3. Confirmar preservação/leitura de `data-nf-*`.
4. Estilizar Hidden Quest multiparágrafo.
5. Consultar índice contextual incorporado.
6. Abrir nota rápida de personagem.
7. Abrir página detalhada contextual.
8. Verificar CSS de fallback sem script.
9. Comparar texto original e renderizado.
10. Testar modo escuro.

## Entregas previstas
A: ChatGPT prepara HTML anotado, EPUB mínimo, índice e CSS. B: Codex implementa script experimental com contrato documentado. C: usuário testa no LNReader Android. Não expandir para 9 categorias antes de testar comunicação essencial.

## Critério de êxito
EPUB abre; script lê anotações; janela formatada; índice consultável; texto intacto; fallback legível. Se falhar script no EPUB, investigar HTML hospedado via extensão (sem presumir funcionamento).
