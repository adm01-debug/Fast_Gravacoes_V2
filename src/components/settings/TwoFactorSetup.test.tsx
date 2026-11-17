import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `qr_code` do Supabase e um SVG inteiro (varios KB). Se ele chegar ao
// QRCodeSVG, a lib estoura `RangeError: Data too long` e o ErrorBoundary
// derruba a tela de configuracao do 2FA. O payload correto e `uri`.
const QR_CODE_SVG = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg">${'<rect x="1" y="1"/>'.repeat(400)}</svg>`;
const TOTP_URI = 'otpauth://totp/FastGrava:dono@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=FastGrava';

const enroll = vi.fn();
const listFactors = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { mfa: { enroll: (...a: unknown[]) => enroll(...a), listFactors: (...a: unknown[]) => listFactors(...a) } },
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
  },
}));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'dono@empresa.com' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/errorHandling', () => ({ showErrorToast: vi.fn() }));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => {
    // Espelha o limite real do padrao QR (2953 bytes no modo byte):
    // reproduz o RangeError em vez de aceitar qualquer string.
    if (value.length > 2953) throw new RangeError('Data too long');
    return <svg data-testid="totp-qr" data-value={value} />;
  },
}));

import { TwoFactorSetup } from './TwoFactorSetup';

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    enroll.mockResolvedValue({
      data: { id: 'factor-1', totp: { qr_code: QR_CODE_SVG, secret: 'JBSWY3DPEHPK3PXP', uri: TOTP_URI } },
      error: null,
    });
  });

  it('gera o QR a partir do otpauth uri, nao do svg pronto do Supabase', async () => {
    render(<TwoFactorSetup />);
    const botao = await screen.findByRole('button', { name: /configurar/i });
    await userEvent.click(botao);

    const qr = await waitFor(() => screen.getByTestId('totp-qr'));
    expect(qr.getAttribute('data-value')).toBe(TOTP_URI);
    expect(qr.getAttribute('data-value')).not.toContain('<svg');
  });
});
