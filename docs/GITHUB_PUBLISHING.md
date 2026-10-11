# Preparar publicação GitHub (manual)

Esta pasta de trabalho não contém `.git` nem remoto configurado; a sessão também não possui conector GitHub autenticado. Nenhum repositório, branch, tag, release ou push foi criado. A publicação requer aprovação final do proprietário, escolha de licença e revisão pública dos arquivos.

## Antes de criar o remoto

1. Decida a licença conforme `docs/LICENSE_STATUS.md`; não publique sem a decisão necessária sobre direitos de redistribuição.
2. Revise o inventário que será enviado: `src/`, `tests/` sintéticos, `scripts/`, `docs/`, `dist/`, README, package, manifesto e `.gitignore`.
3. Confirme que fixtures originais listadas no `.gitignore` estão ausentes do staging; confirme que `.agents/` e `prompts/` internos não serão adicionados.
4. Rode `npm test`, `npm run build`, `npm run manifest:verify` e inspecione novamente o bundle e o manifesto.
5. Crie manualmente um repositório **vazio** chamado `NovelForge-Formatter` na conta/organização escolhida, inicialmente sem licença, README ou arquivos gerados automaticamente para evitar conflito.

## Primeiro push (exemplo; não executado)

```sh
git init -b main
git add .
git status --short
# Revise o staging e retire qualquer arquivo não autorizado antes do commit.
git diff --cached --stat
git diff --cached --check
git commit -m "Prepare NovelForge Formatter v0.4.0 preview"
git remote add origin https://github.com/OWNER/NovelForge-Formatter.git
git push -u origin main
```

Substitua `OWNER` pelo destino escolhido. Só execute a criação do repositório e `git push` após aprovação explícita do proprietário. Não use force push. Não crie tag/release até aprovação separada, revisão da licença e validação Android; v0.4.0 é preview, não versão estável.

Carregamento remoto do script é opcional, não está implementado e precisa de teste separado no LNReader. A instalação local por cópia integral continua o método recomendado.
