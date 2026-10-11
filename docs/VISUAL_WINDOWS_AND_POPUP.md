# Janelas visuais e interação de entidades

## O que o Formatter consome

O bundle oficial injeta o CSS de `src/formatter.css`; o EPUB local inspecionado não contém stylesheet próprio para essas janelas. Regras de apresentação vistas no Android podem, portanto, vir do CSS injetado pelo bundle ou do CSS do próprio leitor. O Formatter aplica estilos somente a `.nf-window[data-nf-id][data-nf-category][data-nf-subtype]` como filho direto do capítulo. Ele não cria janela nem tenta classificar texto.

O novo CSS dá geometria de cartão comum às categorias `ITEM`, `SYSTEM`, `QUEST`, `SKILL`, `STATUS`, `CLASS` e `TITLE`. A categoria e `data-nf-rarity="LEGENDARY"` mudam apenas o acento. Títulos são tratados como a primeira linha de parágrafo da janela. Entidades herdam a cor do texto do tema do leitor, com sublinhado e indicação de toque, em vez do azul de link padrão. Para rótulos internos, o enriquecedor deve usar `<strong data-nf-field="rating">` (ou o nome do campo) somente no rótulo; não deve aplicar peso ao parágrafo. O atributo `data-nf-field` já aparece no CSS fallback do projeto, e fica no nó do rótulo, nunca no parágrafo inteiro. O valor de raridade em ITEM pode ser um `<strong>` adjacente ao rótulo `rating`, que recebe o acento sem badge ou texto duplicado.

## Delimitadores e ajuste necessário no enriquecedor

VIS-R13 permite ocultar delimitadores sem apagar seus nós/texto, mas exige que estejam identificados. O XHTML inspecionado contém colchetes como caracteres simples, inclusive fora de janelas; não há modo seguro de distinguir visualmente esses caracteres sem alterar HTML. Não se usa regex, pseudoelementos para remover conteúdo nem varredura de narrativa.

O projeto já usa a classe `.nf-delimiter` no CSS fallback da fixture. Para aplicá-la na geração, envolva somente cada `[` e `]` estrutural, mantendo ambos os caracteres dentro do DOM. Para avisos SYSTEM, o gerador também precisa emitir a própria janela semântica. Exemplo ilustrativo com IDs/blocos existentes — ajustar os IDs para os valores reais, sem renumerar blocos:

```html
<section class="nf-window" data-nf-id="item-pagma-rare-book-c1" data-nf-category="ITEM" data-nf-subtype="INFO" data-nf-rarity="LEGENDARY">
  <p data-nf-block="b0105"><span class="nf-delimiter">[</span><strong><a data-nf-entity="character:pagma">Pagma</a>’s Rare Book</strong><span class="nf-delimiter">]</span></p>
  <p data-nf-block="b0106"><strong data-nf-field="rating">Rating:</strong> <strong>Legendary</strong></p>
  <p data-nf-block="b0107">This is a book that contains the techniques of <a data-nf-entity="character:pagma">Pagma</a>.</p>
  <p data-nf-block="b0108"><strong>Effects:</strong> Become <a data-nf-entity="character:pagma">Pagma</a>’s descendant.</p>
  <p data-nf-block="b0109"><strong>Conditions:</strong> None.</p>
  <p data-nf-block="b0110">* The level and stats will change when used.</p>
</section>

<section class="nf-window" data-nf-id="system-item-found-c1" data-nf-category="SYSTEM" data-nf-subtype="ALERT">
  <p data-nf-block="b0111"><span class="nf-delimiter">[</span>A legendary item has been found!<span class="nf-delimiter">]</span></p>
</section>
<section class="nf-window" data-nf-id="system-reputation-c1" data-nf-category="SYSTEM" data-nf-subtype="INFO">
  <p data-nf-block="b0112"><span class="nf-delimiter">[</span>Reputation will rise by 500 across the continent.<span class="nf-delimiter">]</span></p>
</section>
```

No enriquecimento, preserve literalmente o conteúdo dos blocos, ordem e IDs `data-nf-block`; mantenha `data-nf-entity` nos mesmos nomes/offsets de origem. Envolver caractere existente em `span` não muda seu `textContent`, não adiciona texto e não altera proveniência temporal do Knowledge Index. O CSS não cria badge/texto de raridade: o valor visível `Rating: Legendary` não é duplicado. EPUBs anteriores continuam legíveis, mas colchetes não marcados e campos em texto simples não recebem esse refinamento até novo enriquecimento.

## Inicialização e clique remoto

O bundle é concatenado na ordem Context Index → Remote Knowledge → Formatter → UI contextual → adaptador. Ao executar, o adaptador procura imediatamente `#LNReader-chapter`; se ainda não existe, espera `DOMContentLoaded` quando `readyState` é `loading` e faz apenas uma série limitada de tentativas. Assim, não depende de um novo `DOMContentLoaded` após a inserção assíncrona do script. Ao localizar o contêiner, injeta o CSS, chama `enhance()` e inicializa a UI remota.

Na inspeção desta entrega, a URL pública jsDelivr `@main` respondeu com o cabeçalho v0.4.0 e não continha `NovelForgeRemoteKnowledge`; o bundle local de produção é v0.5.0. O carregamento HTTP bem-sucedido, portanto, não significava que a integração remota estivesse presente. Com o índice JSON removido pelo sanitizador, v0.4.0 não instalava o listener do popup. O artefato novo inclui o cliente remoto, a UI e o adaptador no mesmo arquivo.

A UI instala um único listener delegado `click` em fase de captura no artigo, antes que handlers delegados do leitor possam consumir o toque. A busca do ancestral `[data-nf-entity]` aceita `a`, `span` ou outro elemento. Entidades válidas abrem LOADING imediatamente; posição inválida resulta em ERROR sem consulta. Links comuns e IDs não suportados não são interceptados. O adaptador prefere `#LNReader-chapter`, mas agora aceita como raiz um único `article.nf-chapter[data-nf-chapter]` quando o leitor não expõe aquele wrapper. A validação remota mantém endpoint/revisão, manifesto, SHA-256 e filtro por capítulo/bloco; não há fallback local nem cache persistente.

Testes automatizados confirmam esse fluxo em DOM simulado, mas não reproduzem o WebView do LNReader. O EPUB reenriquecido mais recente inspecionado contém artigo semântico direto no `<body>`, 41 janelas ITEM/SYSTEM e CSS fallback inline em cada XHTML, mas não possui wrapper `#LNReader-chapter`. O fallback do adaptador agora inicializa pelo artigo único. A fixture ainda não contém `.nf-delimiter` nem marcadores de rótulos (`data-nf-field`/`strong`); portanto os colchetes e o destaque de campos exigem novo enriquecimento. O CSS inline do EPUB continua sendo fallback redundante; o Formatter publicado aplica sua camada posterior e mais específica. A ausência de popup ainda precisa ser retestada no LNReader com o bundle atualizado; não declarar validação Android sem esse teste.
