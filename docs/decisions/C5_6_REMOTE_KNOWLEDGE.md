# C5.6 — decisão de implementação para Remote Knowledge

**Estado:** direção remota autorizada pelo usuário; detalhes abaixo são decisão versionada da implementação C5.6.
**Contrato:** [NF-RK-001](../contracts/NF-RK-001.md), versão 1.0.0.

## Relação com NF-011

NF-011 e o histórico em `docs/reference/` permanecem preservados. A preferência original era consumir índices contextuais do EPUB e operar offline; NF-011 também proíbe empacotar o índice mestre no EPUB. C5.6 não reescreve esse histórico. Como complemento aprovado para a enciclopédia, a popup de produção passa a consultar Knowledge remoto online sob demanda e não usa o índice C2.1 local como fallback. CSS e leitura continuam disponíveis sem internet; sem cache temporário validado, a enciclopédia mostra erro controlado. Nenhum conhecimento mestre é copiado para o EPUB.

Esta alteração é deliberadamente mais estreita que um pipeline remoto geral: marcadores visuais e C2.1 permanecem no código e no artefato `novelforge-formatter.js`; o artefato oficial `novelforge-lnreader.js` incorpora o cliente remoto e a UI usa esse caminho, sem fallback local quando a rede, identidade ou dataset falham.

## Decisões C5.6

1. ID de produção `overgeared`, separado de `nf-overgeared-poc`. O identificador deve estar no `data-nf-novel` do HTML enriquecido; o leitor não o deduz de título nem estado do LNReader.
2. A posição remota é capítulo numérico e bloco numérico extraído de `data-nf-chapter="889"` e `data-nf-block="b0042"`. O contrato C2.1 com IDs opacos locais não é convertido por ordem visual.
3. Descoberta mutável `latest.json` contém uma revisão legível e `contentCommit` de 40 hex. Manifesto e entidades são lidos exclusivamente no commit imutável referenciado por esse ponteiro. Isso separa descoberta de conteúdo e impede mistura de revisões.
4. Host fixo: repositório `Lucas-Maransaldi/NovelForge-Formatter` via `cdn.jsdelivr.net`; paths do manifesto são derivados e validados pelo formatter, nunca URLs arbitrárias.
5. Âncora de confiança: identidade do repositório configurada mais validação TLS da WebView. SHA-256 é integridade relativa ao manifesto, não assinatura/autenticidade do publicador.
6. Apenas o popup existente é integrado. LOADING/READY/EMPTY/ERROR compartilham estilos, foco e fechamento; perfil detalhado usa somente o conjunto já filtrado para a posição capturada. Request cancelado/atrasado ou contexto substituído não pode atualizar a UI.
7. A consulta é online-only fora do cache volátil de dados integralmente validados na sessão atual. Não há armazenamento persistente nem consulta local alternativa.
8. Não há conhecimento real de Overgeared publicado neste repositório nesta entrega. O cliente está preparado para retornar indisponibilidade até que dados reais, verificáveis e autorizados sejam publicados; as fixtures de teste C5.4 continuam sintéticas e não são origem de produção.

## Identidade, migração e validação pendente

A fixture sintética C5.5.1 demonstrou marcadores da PoC, não prova que o EPUB de produção contém `data-nf-novel="overgeared"` e capítulos/blocos compatíveis. Sem esses marcadores, o cliente falha fechado, enquanto `formatter.enhance()` ainda formata QUEST/SYSTEM. O ID deve ser aplicado pelo produtor de HTML enriquecido, não inferido nem escrito pelo formatter.

O teste C5.6 no Android ainda é pendente. Requer um EPUB de Overgeared enriquecido com esses metadados e uma revisão real publicada sob NF-RK-001. Evidências C5.4.1/C5.5 qualificam a viabilidade da POC e não validam bundle, popup integrado, metadados de produção ou release.
