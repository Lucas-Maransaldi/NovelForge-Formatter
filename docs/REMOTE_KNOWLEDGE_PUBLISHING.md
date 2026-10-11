# Publicação do Knowledge Index — NF-RK-001

Esta é uma instrução para uma futura publicação explícita. C5.6 não gera fatos e não publica conhecimento real de Overgeared. Leia primeiro [NF-RK-001](contracts/NF-RK-001.md). Não use as fixtures C5.4/C5.5 como conteúdo de produção.

## Estrutura versionada

```text
knowledge/v1/books/overgeared/
  latest.json                         # ponteiro mutável, apenas descoberta
  entities/
    character/<slug>/
      manifest.json                   # contém somente esta entidade
      data.json
    event/<slug>/
      manifest.json
      data.json
```

O formatter conhece somente a base fixa do repositório e aceita caminhos derivados do ID visível selecionado. Cada manifesto lista exatamente uma entidade, evitando enumerar personagens/eventos ocultos ou futuros. URLs fornecidas por dados nunca são executadas nem aceitas.

## Publicação transacional em Git

1. A partir dos capítulos-fonte disponíveis, o produtor cria ou atualiza os arquivos necessários da entidade com fatos apoiados em proveniência. Faça alterações incrementais sem repetir o histórico em cada capítulo. Não invente dados ausentes.
2. Para cada entidade, gere `entities/<type>/<slug>/data.json` e o respectivo `manifest.json` com `schemaVersion`, `bookId=overgeared`, `revision` e mapa `entities` com somente aquele `entityId`; a entrada registra o caminho canônico, `byteLength` e SHA-256 dos bytes exatos. Valide limites, proveniência, ordem numérica e corte antisspoiler. Não crie manifesto global que enumere entidades.
3. Faça commit dos recursos e manifestos por entidade e obtenha o SHA completo de 40 dígitos do commit. Esse commit é imutável e identifica a revisão consumida.
4. Em outro commit, altere `latest.json` para `schemaVersion=nf-rk-discovery/1`, `bookId=overgeared`, a mesma `revision` e `contentCommit=<SHA do passo 3>`. Confirme que o SHA aponta para a árvore que contém os arquivos. Somente depois da revisão humana publique os commits.
5. Valide os JSONs no commit imutável e aponte o cliente de teste para a cópia pública de `latest.json`; após o toque em uma entidade visível, o cliente buscará somente seu manifesto e seus dados pelo mesmo `contentCommit`. Teste distribuição/CDN, hash e limites antes de anunciar a revisão.
6. Para rollback, atualize `latest.json` para um commit de conteúdo previamente validado e publique essa mudança explicitamente. Nunca edite uma revisão de conteúdo já referenciada; crie outra revisão/commit.

O ponteiro `main/latest.json` pode sofrer atraso de CDN. Os dados são consistentes com o commit por ele indicado; clientes já carregados podem manter dados validados em memória até o Custom Code ser reexecutado. SHA-256 confirma bytes contra o manifesto, não autentica o autor. A confiança depende da conta/repositório configurados e da validação TLS da origem HTTPS.

## Atualização coordenada de um EPUB

O produtor deve entregar separadamente: (1) XHTML/EPUB com `data-nf-novel="overgeared"`, capítulo numérico e blocos `bNNNN`; (2) JSON incremental das entidades alteradas; (3) manifesto e ponteiro após publicação; (4) relatório com hashes e testes temporais. Valide correspondência entre bookId/entityId/revision, IDs estáveis, blocos-fonte existentes e texto intacto antes de distribuir o EPUB. A publicação do EPUB não publica automaticamente o Knowledge e vice-versa.

Sem dados reais ou sem metadados confiáveis no XHTML, mantenha a enciclopédia indisponível; a formatação visual do EPUB não depende do endpoint.
