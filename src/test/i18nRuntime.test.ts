import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n, { supportedLanguages } from '@/i18n';

const TitleProbe = () => {
  const { t } = useTranslation();
  return createElement('p', { 'data-testid': 'probe' }, t('dashboard.title'));
};

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

  // O seletor de idioma (LanguageSwitcher) depende do useTranslation: trocar o
  // idioma precisa re-renderizar componente ja montado, nao so mudar i18n.t().
  it('useTranslation re-renderiza componente montado ao trocar o idioma', async () => {
    await i18n.changeLanguage('pt-BR');
    render(createElement(TitleProbe));
    expect(screen.getByTestId('probe').textContent).toBe('Dashboard Principal');

    try {
      await act(async () => {
        await i18n.changeLanguage('en-US');
      });
      expect(screen.getByTestId('probe').textContent).toBe('Dashboard');

      await act(async () => {
        await i18n.changeLanguage('es-ES');
      });
      expect(screen.getByTestId('probe').textContent).toBe('Panel Principal');

      await act(async () => {
        await i18n.changeLanguage('pt-BR');
      });
      expect(screen.getByTestId('probe').textContent).toBe('Dashboard Principal');
    } finally {
      // Restaura o idioma mesmo se um assert acima falhar, para nao cascatear
      // a falha no teste seguinte.
      if (i18n.language !== 'pt-BR') {
        await act(async () => {
          await i18n.changeLanguage('pt-BR');
        });
      }
    }
  });

  it('mantem o idioma pt-BR ao fim da suite', () => {
    expect(i18n.language).toBe('pt-BR');
  });
});