> **Nota v0.1.2:** as seis Skills são procedimentos operacionais consultáveis no arquivo `03_NF_SKILLS_E_TESTES.md`. Adicionar este arquivo às Sources permite sua recuperação como instrução de trabalho, mas não instala Skills nativas automaticamente.

# NovelForge — Fonte consolidada
> Pacote v0.1.1. Conteúdo transcrito do pacote v0.1.0, sem resumir. Arquivos originais identificados em cada seção.


---

## ARQUIVO ORIGINAL: `00_START_HERE/00_README.md`

# NovelForge — pacote de fontes v0.1.0

**Estado:** especificação consolidada para consulta; não é implementação funcional. **Idioma:** português. **Data:** 2026-10-11.

## Missão
Transformar HTMLs de capítulos obtidos pelo LNReader em HTMLs enriquecidos e EPUBs anotados semanticamente, para leitura offline no LNReader com custom script de apresentação desenvolvido pelo Codex. ChatGPT interpreta; formatter consulta índices e apresenta; nenhum componente reescreve a narrativa.

## Fluxo aprovado
ZIP de HTMLs (um HTML em cada subpasta) → organização/validação → interpretação semântica pelo ChatGPT → anotações e conhecimento temporal → HTMLs semânticos + EPUB sob demanda → LNReader → custom script Codex (tema RPG, notas, enciclopédia). Preservar fontes, JSON e índices. HTML hospedado via extensão LNReader é alternativa se scripts não executarem em EPUBs locais.

## Navegação
- `00_START_HERE/01_SOURCE_MAP.md`: índice numerado e status.
- `01_GOVERNANCE/`: decisões, instruções e pendências.
- `02_ARCHITECTURE/`: arquitetura, fluxo e contrato de dados.
- `03_SPECIFICATIONS/`: NF-001 a NF-012.
- `04_SKILLS/`: procedimentos especializados (arquivos `SKILL.md`, **não instalados automaticamente**).
- `05_SCHEMAS/`: contratos ilustrativos para implementação futura.
- `06_TESTS/`: plano de PoC e fixture sintética pública; materiais originais de referência não fazem parte desta distribuição.

## Convenções
Arquivos com prefixo numérico estável para facilitar substituições. Identificadores NF/INT/SEM etc. não devem ser renumerados. Ao atualizar um arquivo, manter seu caminho, aumentar versão e registrar mudança em `01_GOVERNANCE/03_CHANGELOG.md`. Não tratar exemplos como decisões definitivas de esquema.

## Proveniência
Este pacote deriva das decisões acessíveis nesta conversa e do resumo de decisões anteriores. Onde o texto exato das regras antigas não está disponível, foi registrada a **intenção aprovada**, sem reconstruir artificialmente a redação original. Itens propostos mas não aprovados estão marcados.



---

## ARQUIVO ORIGINAL: `00_START_HERE/01_SOURCE_MAP.md`

# Mapa de fontes

| Faixa | Arquivo | Estado |
|---|---|---|
| 00 | README / mapa | referência |
| 01 | decisões, governança, changelog, AGENTS | referência |
| 02 | arquitetura, ingestão, contrato, segurança | consolidado |
| 03 NF-001 a NF-006 | categorias e recursos | aprovado; parte das regras só em resumo |
| 03 NF-007 | integridade | aprovado; formulação consolidada |
| 03 NF-008 | pipeline | aprovado, com publicação sob demanda |
| 03 NF-009 | conflitos semânticos | aprovado, SEM-R1 a R34 |
| 03 NF-010 | integração | arquitetura revista aprovada; AI-R1 a R10 **propostos** antes da revisão; AI-R11 a R18 **propostos**, não aprovação explícita por número |
| 03 NF-011 | contrato | aprovado, NF11-R1 a R37 |
| 03 NF-012 | PoC | início autorizado; execução pendente |
| 04 | skills operacionais | proposta de procedimentos, não aprovadas individualmente |
| 05 | exemplos de contratos | rascunhos, não schema definitivo |
| 06 | teste | plano aprovado; fixture sintética pública |

**Regra de leitura:** decisões em `01_GOVERNANCE/01_DECISIONS.md` prevalecem sobre alternativas históricas. Ver `01_GOVERNANCE/02_OPEN_QUESTIONS.md` para incertezas.



---

## ARQUIVO ORIGINAL: `00_START_HERE/02_FILE_MANIFEST.json`

{
  "packageVersion": "0.1.0",
  "files": [
    {
      "path": "00_START_HERE/00_README.md",
      "sha256": "7e886e44de10052626cfd5d2eb73d115cf7aaffecefb6aa65ad79eb645c7f27b",
      "bytes": 2036
    },
    {
      "path": "00_START_HERE/01_SOURCE_MAP.md",
      "sha256": "ee70bf56414172fd4f043b2b787a48667e983db8d3b6b9df8578dddaf972e276",
      "bytes": 1177
    },
    {
      "path": "01_GOVERNANCE/00_PROJECT_INSTRUCTIONS.md",
      "sha256": "dc9034ec9f292ed49f640ed04d876f528638c54e4dd02d9f3a0f0c9adfee6df8",
      "bytes": 813
    },
    {
      "path": "01_GOVERNANCE/01_DECISIONS.md",
      "sha256": "9cb6772baec76fab7056968b5231b7e5ddd56e64c353c39021a313f7047ceb66",
      "bytes": 2684
    },
    {
      "path": "01_GOVERNANCE/02_OPEN_QUESTIONS.md",
      "sha256": "a4190537799ac10482f8e97396d5acf5822dbb518cf3bcb9e1c0a9b4eff7c535",
      "bytes": 1725
    },
    {
      "path": "01_GOVERNANCE/03_CHANGELOG.md",
      "sha256": "43c398ca1f8258233f9db75d8c65b9d5f10bc8cccb8277a249eb8c90c4643ecb",
      "bytes": 377
    },
    {
      "path": "01_GOVERNANCE/04_AGENTS.md",
      "sha256": "76a691ee4e99f576a9faa4aa947c0d9c974a4272de723ee44ef6ac08f863793e",
      "bytes": 1080
    },
    {
      "path": "02_ARCHITECTURE/00_SYSTEM_OVERVIEW.md",
      "sha256": "58191768e321b451793d2c0e9ecf0a1b9334bea8dcaef889f28e4d4b4abc8028",
      "bytes": 1432
    },
    {
      "path": "02_ARCHITECTURE/01_INGESTION_AND_PIPELINE.md",
      "sha256": "26fac157240f7016c6b5ca6ce23bc906bc32fd2346e594250b2f3558f0f333c6",
      "bytes": 1298
    },
    {
      "path": "02_ARCHITECTURE/02_DATA_CONTRACT.md",
      "sha256": "ccba43184bd4c1467dd8b0fb47311052412a0af30f857a85fe45012847886a8d",
      "bytes": 1529
    },
    {
      "path": "02_ARCHITECTURE/03_SECURITY_AND_INTEGRITY.md",
      "sha256": "af00a828a762697bb7c85108fea7d2226fce5499a50d49c855571321302a85d2",
      "bytes": 1004
    },
    {
      "path": "03_SPECIFICATIONS/01_NF-001_SEMANTIC_WINDOWS.md",
      "sha256": "317de234c39e1e4d2d518cb30ab12956669475c44f38c95acc6505a14d7d4237",
      "bytes": 2260
    },
    {
      "path": "03_SPECIFICATIONS/02_NF-002_CONTEXTUAL_HIGHLIGHTS.md",
      "sha256": "8d9f448642009a90fd11096fa7f17ede3b358f3ff0a88353f038ea1e1a50d9d1",
      "bytes": 522
    },
    {
      "path": "03_SPECIFICATIONS/03_NF-003_CURRENCY.md",
      "sha256": "d8070e999e4ce53bc1424f836cadbe8276015522bd17fab2cf2a8159934271ad",
      "bytes": 667
    },
    {
      "path": "03_SPECIFICATIONS/04_NF-004_CHARACTER_ENCYCLOPEDIA.md",
      "sha256": "ffca33660fb1c8ea790c11fac8ae1e518d376d3d8391c2db15fd4b1ccfb56455",
      "bytes": 660
    },
    {
      "path": "03_SPECIFICATIONS/05_NF-005_VISUAL_IDENTITY.md",
      "sha256": "131de7a1aa303c309040c7d5c3820aa37586ba2c43ac341f00118919ae9eac65",
      "bytes": 591
    },
    {
      "path": "03_SPECIFICATIONS/06_NF-006_WORLD_GLOSSARY.md",
      "sha256": "dee56015a3d04d6d58ec5dc1fef05ea94fd48c720ccaf8a83de499b0dbcb17f5",
      "bytes": 446
    },
    {
      "path": "03_SPECIFICATIONS/07_NF-007_NARRATIVE_INTEGRITY.md",
      "sha256": "596004901d8fc58b6ab74a921b9553bd6b1d95b20285cff072259aae1eaba09f",
      "bytes": 1795
    },
    {
      "path": "03_SPECIFICATIONS/08_NF-008_PIPELINE.md",
      "sha256": "98986817b8a469f7cef0016ec3ace54c6a1d3715ffbcffd6a14c92c09281e86a",
      "bytes": 1045
    },
    {
      "path": "03_SPECIFICATIONS/09_NF-009_SEMANTIC_CONFLICTS.md",
      "sha256": "820a2a056721592262b6a02cd55da778d329d09166115c361a176acf4cea4583",
      "bytes": 2236
    },
    {
      "path": "03_SPECIFICATIONS/10_NF-010_CHATGPT_INTEGRATION.md",
      "sha256": "042e4740b5121f688b9fe0941ea523285989dc07792412b11c255f67b02c4401",
      "bytes": 1974
    },
    {
      "path": "03_SPECIFICATIONS/11_NF-011_DATA_CONTRACT.md",
      "sha256": "1450d1a73af33ebc92a4020636a47084072020825929553df721f515f0b18049",
      "bytes": 2368
    },
    {
      "path": "03_SPECIFICATIONS/12_NF-012_PROOF_OF_CONCEPT.md",
      "sha256": "ea9dcb1f9f1b503182b1bea08603344c9cce18b1ffd267490a9ce049d764f000",
      "bytes": 1327
    },
    {
      "path": "04_SKILLS/00_SKILLS_GUIDE.md",
      "sha256": "7c8e9edc86c9813ed1e57a9e3c54139b03aa0a0f9a9970c0eb8f17dfbd74e78f",
      "bytes": 471
    },
    {
      "path": "04_SKILLS/01_chapter_analyzer/SKILL.md",
      "sha256": "92cdc99bd35dfe34a8d71d7ad35877392d2d5295ad8f13f938e4d2afcf18ef94",
      "bytes": 1067
    },
    {
      "path": "04_SKILLS/02_knowledge_indexer/SKILL.md",
      "sha256": "3350ddab15ea0c1448c028e21e0482b0950ad30ddfb2dfdd00ae512798061efa",
      "bytes": 1064
    },
    {
      "path": "04_SKILLS/03_spoiler_validator/SKILL.md",
      "sha256": "cc5e822ab5be0a0e343db871d653a5f3f40dee22b9c8c966df81b41e80ea8cac",
      "bytes": 1051
    },
    {
      "path": "04_SKILLS/04_epub_builder/SKILL.md",
      "sha256": "1fc8bfc3f66b5850eff4236155d833bdbc1b5db5ceb3307f808e3fc118e19086",
      "bytes": 1031
    },
    {
      "path": "04_SKILLS/05_semantic_qa/SKILL.md",
      "sha256": "83ea90fd3257380eb4dd48e6cc352b9f4831fc4a3c9bc79d64686ea2a728694c",
      "bytes": 986
    },
    {
      "path": "04_SKILLS/06_lnreader_formatter/SKILL.md",
      "sha256": "917195419f40c74d4a9cfc6b301f6881d704dc311ec831ce67b4a97bf352f542",
      "bytes": 1061
    },
    {
      "path": "05_SCHEMAS/00_SCHEMA_NOTES.md",
      "sha256": "f1bf9ff63758097648eba1ea23c8204e23f48976d57260b8eeae0f4c4223bd7d",
      "bytes": 314
    },
    {
      "path": "05_SCHEMAS/01_ANNOTATION_EXAMPLE.json",
      "sha256": "d919ecb7bd9ae6c5503d99a9c376d8c40db79dd7ad0ed576503965ba4884fa61",
      "bytes": 368
    },
    {
      "path": "05_SCHEMAS/02_INDEX_EXAMPLE.json",
      "sha256": "2d54d5ae34925032f3eb7e10ca9bb77c5f5f023b40c05603196a187ce29db64d",
      "bytes": 535
    },
    {
      "path": "05_SCHEMAS/03_MANIFEST_EXAMPLE.json",
      "sha256": "5c3c8a45f83f8839dce5c8d7855bcd591b0bfe7dddd284aceb0d2973ae7bf3bc",
      "bytes": 257
    },
    {
      "path": "06_TESTS/00_TEST_PLAN.md",
      "sha256": "f89d83c74fecdaa9445540a3e60aba36ac0c25d179cde45c086d302b5e597acf",
      "bytes": 802
    },
    {
      "path": "tests/fixtures/chapter-synthetic.xhtml",
      "sha256": "generated-by-MANIFEST_SHA256.json",
      "bytes": 1844
    }
  ]
}



---

## ARQUIVO ORIGINAL: `01_GOVERNANCE/00_PROJECT_INSTRUCTIONS.md`

# Instruções sugeridas para Project Instructions

Projeto: NovelForge. Comunicar em português. Consultar fontes numeradas antes de propor mudanças. Não reabrir decisões aprovadas sem pedido explícito. Distinguir aprovado, premissa técnica, proposto e não verificado. Antes de programar, respeitar a fase de especificação; Codex implementa o formatter quando solicitado. Para alterações de código, preferir arquivos completos, não patches parciais. O texto original da novel é imutável. IA não reescreve conteúdo; apenas produz anotações com evidências. Manter spoiler-safe por capítulo e bloco, inclusive metadados e navegação. Publicação EPUB sob demanda, HTML enriquecido preservado. Não assumir compatibilidade de scripts em EPUB local como fato comprovado: é premissa para a PoC.



---

## ARQUIVO ORIGINAL: `01_GOVERNANCE/01_DECISIONS.md`

# Registro de decisões — fonte normativa

| ID | Decisão | Estado |
|---|---|---|
| D-001 | LNReader é leitor principal no Android. | APROVADO |
| D-002 | Entrada: ZIP de capítulos HTML, um arquivo por pasta na exportação/armazenamento LNReader. | APROVADO |
| D-003 | ChatGPT analisa semanticamente capítulos, constrói índices e produz artefatos HTML/EPUB; Codex desenvolve custom script do LNReader. | APROVADO |
| D-004 | EPUB local com custom script como caminho principal. | PREMISSA TÉCNICA NÃO VERIFICADA |
| D-005 | HTML hospedado consumido por extensão LNReader como alternativa se D-004 falhar. | APROVADO COMO PLANO B; viabilidade não verificada |
| D-006 | Preservar HTML original, HTML enriquecido, anotações JSON e índice mestre; EPUB adicional sob demanda. | APROVADO |
| D-007 | **Não** impor volumes de 50 capítulos; publicação por capítulo, intervalo ou coleção sob demanda. | APROVADO, substitui padrão anterior |
| D-008 | Classificação por IA sem reescrita; validador determinístico; falha semântica mantém original, falha de integridade bloqueia versão enriquecida. | APROVADO |
| D-009 | Enciclopédia e glossário híbridos: nota rápida + página detalhada. | APROVADO |
| D-010 | Índice mestre + visões contextuais; spoiler-safe por capítulo e bloco. | APROVADO |
| D-011 | Tema adaptativo e CSS básico de fallback no EPUB. | APROVADO |
| D-012 | Formatter consulta índice e aplica visual; não reclassifica capítulos já anotados. | APROVADO |
| D-013 | Taxas FX: configuração do usuário; sem configuração, taxa corrente na geração; se indisponível, referência cacheada explicitamente rotulada. | APROVADO |
| D-014 | PoC de apresentação com fixture de referência antes da implementação completa (material original não distribuído). | APROVADO; validação real pendente |
| D-015 | NF-009 SEM-R1..R34. | APROVADO |
| D-016 | NF-011 NF11-R1..R37. | APROVADO |
| D-017 | Ingestão e indexação temporal sequencial; artefatos incrementais. | APROVADO |

## Decisões substituídas
- EPUB obrigatoriamente em lotes de 50 capítulos → **substituído** por publicação sob demanda.
- Programa NovelForge próprio com exportador de pacotes JSON para ChatGPT como fluxo principal → **substituído** por envio de ZIP diretamente ao ChatGPT. A interface JSON continua como artefato interno e possibilidade futura.
- Consulta manual de preferência A/B/C para enciclopédia → **já decidida C**, não reabrir.

## Limites de certeza
Não foi comprovado que custom scripts do LNReader executam sobre EPUB importado nem que atributos/JSON embutidos sejam preservados. Desenvolver assumindo essa hipótese e verificar na PoC; não anunciar compatibilidade como fato.



---

## ARQUIVO ORIGINAL: `01_GOVERNANCE/02_OPEN_QUESTIONS.md`

# Pendências e riscos

1. **PoC:** verificar script sobre EPUB local; preservação de `data-nf-*`, índice embutido e CSS.
2. **Ingestão:** examinar nomes reais de pastas/arquivos para inferir numeração; HTML de amostra não contém número explícito. Nunca presumir ordenação alfabética.
3. **Escala:** um ZIP com milhares de capítulos pode exceder limites de uma execução ChatGPT; definir checkpoints/lotes internos sem impor lote de publicação.
4. **Formato do índice no EPUB:** JSON externo vs dados incorporados ao XHTML; transporte não finalizado.
5. **Formato de offsets:** unidade de contagem de caracteres, normalização Unicode e mapeamento DOM devem ser especificados e testados antes de implementar spans parciais.
6. **Páginas detalhadas temporais:** garantir que navegação originada em bloco anterior não revele fatos posteriores do mesmo capítulo.
7. **Segurança:** evitar que IDs, títulos, âncoras e nomes de arquivos revelem spoilers.
8. **EPUB:** definir/validar perfil de compatibilidade, navegação, metadados, manifesto, CSS e sanitização de conteúdo.
9. **Taxa de câmbio:** fonte, cache, data e método de obtenção a implementar; nunca inventar cotação.
10. **NF-001..NF-006:** texto literal de todas as regras detalhadas não está integralmente acessível; documento preserva o conteúdo comprovado pelo resumo, sem falsificar numeração.
11. **NF-010:** regras AI-R1..R18 apareceram como propostas em etapas anteriores; a arquitetura revisada foi aceita, mas não há aprovação textual explícita de cada regra numerada.
12. **Instalação de Skills:** arquivos deste ZIP são fontes e modelos; anexar ao Project não instala automaticamente skills executáveis.



---

## ARQUIVO ORIGINAL: `01_GOVERNANCE/03_CHANGELOG.md`

# Changelog

## v0.1.0 — 2026-10-11
- Consolidação inicial das decisões acessíveis, NF-001 a NF-012, regras SEM e NF11, arquitetura ZIP → ChatGPT → EPUB → LNReader → formatter.
- Incluídos modelos de skills, contrato ilustrativo, plano PoC e fixture HTML original.
- Incertezas de compatibilidade e ausência de redação literal de algumas regras explicitadas.



---

## ARQUIVO ORIGINAL: `01_GOVERNANCE/04_AGENTS.md`

# AGENTS.md — instruções para Codex

## Antes de editar
1. Ler `00_START_HERE/00_README.md`, `01_GOVERNANCE/01_DECISIONS.md` e a especificação relevante.
2. Confirmar se a tarefa é PoC ou implementação completa; não implementar módulos não autorizados.
3. Preservar integralmente texto, ordem, pontuação e espaços narrativos.

## Contrato
- Consumir atributos `data-nf-*` e índice contextual; não inferir categoria com regex se já anotada.
- Não supor APIs de LNReader não testadas; registrar limitações e instrumentar PoC.
- Fallback seguro quando não houver metadados, houver erro de versão ou índice inacessível.
- Nunca exibir fatos com `revealedAt` posterior à posição da consulta.
- Evitar `<a>` aninhados, contêineres de janela aninhados e DOM inválido.

## Entregas
- Preferir arquivos completos, com caminho e instruções de instalação/teste.
- Testes com a fixture real e exemplos sintéticos sem spoilers.
- Documentar decisões técnicas novas, versões de esquema e incompatibilidades.
- Não modificar arquivos originais de origem.



## COMO USAR ESTA VERSÃO

Adicione os arquivos 00 a 03 às Sources do Project. O arquivo 04 é um fixture HTML de teste opcional e pode ficar armazenado localmente. Os blocos de Skills são documentação de procedimentos; não são instalados automaticamente como Skills executáveis. Este pacote substitui os 37 arquivos do v0.1.0, sem necessidade de carregar ambos.
