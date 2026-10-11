# Checklist de pré-release — v0.4.0 preview

Nenhuma caixa marcada abaixo substitui a aprovação final do proprietário.

- [ ] Revisar `npm test` no commit candidato.
- [ ] Executar `npm run build`.
- [ ] Executar `npm run manifest:verify` após a geração final do manifesto.
- [ ] Confirmar que o bundle de distribuição está atualizado, autocontido e sem recursos remotos.
- [ ] Revisar cada arquivo que será público; confirmar exclusão de fixtures narrativas protegidas, caches e credenciais.
- [ ] Revisar documentação pública, instruções de instalação, diagnóstico e problemas conhecidos.
- [ ] Decidir a licença após revisar `docs/LICENSE_STATUS.md`. Nenhuma licença deve ser presumida ou adicionada automaticamente.
- [ ] Validar instalação local no LNReader Android e atualizar os resultados reais do checklist Android.
- [ ] Registrar compatibilidade Android como pendente enquanto houver testes sem execução.
- [ ] Confirmar que a release será apresentada como preview v0.4.0, não como versão estável.
- [ ] Aprovação final do proprietário para publicar/criar repositório público.
- [ ] Aprovação final do proprietário antes de qualquer push/tag/release.

Não criar tag ou release automaticamente. O acesso GitHub e as permissões de publicação precisam ser confirmados no ambiente que executará a publicação.
