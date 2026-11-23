import { describe, it, expect } from 'vitest';
import i18n, { supportedLanguages } from '@/i18n';

describe('i18n runtime (i18next 27 / react-i18next 18)', () => {
  it('resolve traducao padrao pt-BR', () => {
    expect(i18n.t('dashboard.title')).toBe('Dashboard Principal');
  });

  it('interpola variaveis', () => {
    expect(i18n.t('dashboard.welcome', { name: 'Ana' })).toBe('Bem-vindo, Ana!');
    expect(i18n.t('auth.passwordMinLength', { min: 8 })).toBe(
      'Senha deve ter pelo menos 8 caracteres',
    );
  });

  it('troca de idioma em runtime', async () => {
    await i18n.changeLanguage('en-US');
    expect(i18n.t('dashboard.welcome', { name: 'Ana' })).toBe('Welcome, Ana!');
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('dashboard.title')).toBe('Dashboard Principal');
  });

  it('resolve chave no idioma ativo en-US', async () => {
    await i18n.changeLanguage('en-US');
    expect(i18n.t('dashboard.title')).toBe('Dashboard');
    await i18n.changeLanguage('pt-BR');
  });

  it('expoe os tres idiomas suportados', () => {
    expect(supportedLanguages.map((l) => l.code)).toEqual(['pt-BR', 'en-US', 'es-ES']);
    expect(Object.keys(i18n.options.resources ?? {})).toEqual(
      expect.arrayContaining(['pt-BR', 'en-US', 'es-ES']),
    );
  });
});