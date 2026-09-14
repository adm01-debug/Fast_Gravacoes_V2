## O que muda neste PR?

<!-- Resumo curto do problema e da solução. -->

## Checklist do autor

- [ ] Commits seguem [Conventional Commits](https://www.conventionalcommits.org/) (o hook `commit-msg` valida)
- [ ] `npm run lint` sem novos erros/warnings
- [ ] `npx tsc --noEmit` passa
- [ ] `npm run test` passa localmente
- [ ] Novos comportamentos possuem testes (unit/e2e quando aplicável)
- [ ] Migrations SQL são idempotentes ou seguras de reaplicar
- [ ] Nenhum secret/credencial no diff (TruffleHog roda no CI)

## Impacto em segurança/performance

<!-- Se tocar RLS, Edge Functions, CORS, CSP, bundle ou queries: descrever aqui. -->
