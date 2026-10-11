# Distribuição

## Método A — cópia local (recomendado para a primeira validação)

Baixe `dist/novelforge-lnreader.js` da página do repositório ou gere-o com `npm run build`. Copie o arquivo completo e cole-o na configuração de Custom Code/Custom Script disponível na versão instalada do LNReader. Salve e valide com `docs/ANDROID_VALIDATION.md`. O script é autocontido. CSS/formatação não necessitam de rede; a popup do Knowledge consulta HTTPS sob demanda.

## Método B — carregamento remoto (opcional, não implementado/validado)

Não há loader remoto de Custom Code. O usuário instala localmente o bundle completo. Separadamente, o cliente de Knowledge baixa JSON como dados de URLs HTTPS fixas conforme [NF-RK-001](contracts/NF-RK-001.md); não baixa nem executa JavaScript remoto. O transporte integrado requer validação Android e uma revisão real publicada.
