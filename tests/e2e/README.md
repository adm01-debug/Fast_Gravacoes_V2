# E2E (Playwright)

Specs em `tests/e2e/*.spec.ts`, rodando contra `npm run preview` (baseURL
`http://localhost:8090`). A suíte inteira loga numa instância **Supabase
viva** com um usuário de teste seedado — sem `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_EMAIL` e `E2E_PASSWORD` (e
`E2E_TOTP_SECRET`, já que a conta principal tem MFA) ela falha rápido no
helper de credenciais (`tests/e2e/helpers/credentials.ts`) em vez de deixar
60+ testes travarem na tela de login. Veja `.github/workflows/ci.yml` (job
`e2e`) para a lista completa de secrets.

## Regressão visual (`visual-regression.spec.ts`)

Compara screenshots contra baselines commitados em
`visual-regression.spec.ts-snapshots/`. Desde a Etapa 34 do plano de
melhorias (`docs/plano-50-etapas-260924.md`), todo `toHaveScreenshot()` desse
arquivo usa `animations: 'disabled'` e espera `document.fonts.ready` antes de
capturar — sem isso, uma transição CSS/framer-motion ainda em andamento ou um
web font ainda carregando produz diffs de pixel que não representam nenhuma
mudança real de UI (falso-positivo).

### Atualizando o baseline conscientemente

Só regenere os PNGs de baseline quando tiver certeza de que a diferença
visual é **intencional** (uma mudança de layout/estilo que você quis fazer),
nunca para "fazer o CI passar" numa falha que você não investigou. Antes de
atualizar:

1. Rode o teste falhando localmente e abra o diff em `test-results/` —
   arquivos `*-actual.png`, `*-expected.png` e `*-diff.png` — para confirmar
   visualmente o que mudou.
2. Confirme que a mudança corresponde a algo que você (ou o PR que está
   revisando) alterou de propósito — não a timing, animação, fonte ainda não
   carregada ou dado dinâmico não mascarado. Se for isso, corrija o teste
   (mask, `animations: 'disabled'`, espera determinística) em vez de
   atualizar o baseline.
3. Gere os baselines no **mesmo ambiente do CI** (ubuntu-latest + chromium),
   já que renderização de fonte varia por SO. Duas formas:
   - Localmente, apenas se seu SO for Linux/chromium equivalente ao CI:
     ```bash
     npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium --update-snapshots
     ```
   - Preferencialmente, dispare o workflow dedicado `Visual Baselines
     Generator` (`.github/workflows/visual-baselines.yml`, `workflow_dispatch`)
     e baixe o artifact `visual-baselines` — ele builda e roda com
     `--update-snapshots` no runner do CI, garantindo paridade de
     renderização.
4. Rode o teste normalmente (sem `--update-snapshots`) mais uma vez para
   confirmar que o novo baseline passa, e rode-o algumas vezes seguidas para
   checar estabilidade antes de commitar.
5. Documente, no commit ou na PR, **por que** o baseline mudou (ex.: "novo
   card X no dashboard", "espaçamento do sidebar ajustado") — isso é o que
   permite a quem revisar diferenciar uma atualização legítima de uma
   regressão sendo maquiada.
