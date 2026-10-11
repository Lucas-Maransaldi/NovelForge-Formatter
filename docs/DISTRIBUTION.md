# Distribuição

## Método A — cópia local (recomendado para a primeira validação)

Baixe `dist/novelforge-lnreader.js` da página do repositório ou gere-o com `npm run build`. Copie o arquivo completo e cole-o na configuração de Custom Code/Custom Script disponível na versão instalada do LNReader. Salve e valide com `docs/ANDROID_VALIDATION.md`. O script é autocontido e não necessita de rede em tempo de execução.

## Método B — carregamento remoto (opcional, não implementado/validado)

Uma URL pública estável poderia ser usada somente se a versão do LNReader documentar e permitir explicitamente a carga remota de scripts. Este projeto não fornece um loader remoto, não presume suporte da WebView e não recomenda substituir a cópia local. Compatibilidade, política de segurança e disponibilidade precisariam ser avaliadas separadamente.
