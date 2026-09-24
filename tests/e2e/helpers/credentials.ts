/**
 * E2E test credentials — supplied exclusively via environment so no real
 * credential ever lives in source control. CI provides E2E_EMAIL /
 * E2E_PASSWORD from repository secrets (see .github/workflows/ci.yml);
 * locally, export them or use a gitignored .env file before running the
 * suite. Failing fast here beats 60+ tests timing out at the login form.
 */
const e2eEmail = process.env.E2E_EMAIL?.trim();
const e2ePassword = process.env.E2E_PASSWORD;

if (!e2eEmail || !e2ePassword) {
  throw new Error('Defina E2E_EMAIL e E2E_PASSWORD antes de executar os testes E2E.');
}

export const E2E_EMAIL = e2eEmail;
export const E2E_PASSWORD = e2ePassword;

/**
 * Secret TOTP (base32) da conta E2E — a conta tem coordinator ativo e exige
 * MFA no login. Opcional: sem ele, o helper de login falha ao encontrar a
 * tela de verificação (ver helpers/e2e-setup.ts login()).
 */
export const E2E_TOTP_SECRET = process.env.E2E_TOTP_SECRET?.trim();
