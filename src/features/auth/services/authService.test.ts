import { describe, it, expect, vi, beforeEach } from 'vitest';

const resetPasswordForEmail = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a),
    },
  },
}));

import { AuthService } from './authService';

describe('AuthService.resetPassword', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('devolve o link para o host em que o pedido foi feito', async () => {
    await AuthService.resetPassword('pessoa@exemplo.com');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('pessoa@exemplo.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it('propaga o erro do provedor', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new Error('rate limit'),
    });
    await expect(AuthService.resetPassword('pessoa@exemplo.com')).rejects.toThrow(
      'rate limit'
    );
  });
});