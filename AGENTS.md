# NovelForge Formatter — instruções para Codex

## Missão e limites
Implementar **somente** o custom script de apresentação do LNReader para EPUB local, conforme NF-011. ChatGPT é responsável pela classificação, indexação, validação e publicação do EPUB. O formatter consome `data-nf-*` e índices contextuais; **não** infere categorias pela narrativa ou por regex de colchetes.

## Antes de cada alteração
1. Ler `docs/01_CONTRACT.md` e `docs/02_TEST_PLAN.md`.
2. Escolher a Skill apropriada em `.agents/skills/` e seguir seu `SKILL.md`.
3. Examinar `tests/fixtures/` e o código existente. Não inventar APIs LNReader.
4. Restringir escopo à entrega solicitada em `docs/03_DELIVERY_PLAN.md` (C1 antes de C2).

## Regras obrigatórias
- Fonte narrativa intocada; nenhuma alteração de texto, ordem ou pontuação. Delimitadores podem ser ocultados **apenas visualmente**, mantendo texto recuperável (VIS-R13).
- Se houver `.nf-window`/`data-nf-category`, não criar outra janela SYSTEM nem reclassificar seus descendentes.
- Fatos e aliases visíveis só se `revealedAt` <= posição real de leitura (capítulo e bloco). Se posição/ordem não forem confiáveis, **não mostrar fatos**.
- Não carregar índice mestre completo no leitor; usar índice contextual por capítulo. Nunca apresentar fatos futuros em quick note, modal, página detalhada ou metadados.
- Preferir DOM/CSS e recursos offline; evitar fetch remoto. Em falhas, manter texto legível e registrar erro sem expor dados.
- Nunca substituir script antigo sem backup ou autorização. Integração LNReader depende do ambiente real do usuário.
- Criar testes automatizados para qualquer alteração. Não afirmar que teste Android passou sem evidência.
- Preferir arquivos completos, não patches; relatar o que foi alterado, testes e pendências.

## Uso eficiente do Codex
Uma entrega por execução. Começar C1 com Medium; usar High apenas se bloqueado por bugs de integração/segurança temporal. Não implementar C2–C4 antecipadamente.
