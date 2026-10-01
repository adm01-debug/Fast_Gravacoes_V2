import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Single password policy for the whole app: mirrors the minimum enforced
 * server-side by the create-operator edge function (>= 8 chars) plus the
 * complexity rules PasswordStrengthIndicator already advertises.
 * Login screens must NOT reuse this — they validate existing credentials.
 */
export const PASSWORD_MIN_LENGTH = 8;

export function newPasswordSchema(t?: TFunction) {
  const msg = (key: string, fallback: string, opts?: Record<string, unknown>) =>
    t ? t(key, { defaultValue: fallback, ...opts }) : fallback;

  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, msg('auth.passwordMinLength', 'Senha deve ter pelo menos {{min}} caracteres', { min: PASSWORD_MIN_LENGTH }))
    .regex(/[a-z]/, msg('validation.passwordLowercase', 'Deve conter pelo menos uma letra minúscula'))
    .regex(/[A-Z]/, msg('validation.passwordUppercase', 'Deve conter pelo menos uma letra maiúscula'))
    .regex(/[0-9]/, msg('validation.passwordNumber', 'Deve conter pelo menos um número'));
}
