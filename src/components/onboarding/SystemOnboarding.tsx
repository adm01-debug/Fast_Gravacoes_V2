import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { Joyride as JoyrideBase, Step, STATUS, type Styles } from 'react-joyride';
const Joyride = JoyrideBase as unknown as ComponentType<Record<string, unknown>>;
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import { useTheme } from 'next-themes';

const STORAGE_KEY = 'onboarding_completed_v1';

/**
 * Marca o onboarding como concluído (usado para "Pular" e "Finalizar").
 */
export const markOnboardingCompleted = () => {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
};

/**
 * Reinicia o tour de onboarding, removendo a flag e disparando um evento global.
 * Pode ser chamado em qualquer lugar (ex: botão "Refazer tour" nas configurações).
 */
export const restartOnboarding = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('onboarding:restart'));
};

export const SystemOnboarding = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [run, setRun] = useState(false);

  // Primeiro acesso: só roda se a flag não estiver setada
  useEffect(() => {
    if (!user) return;
    const completed = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
    if (completed) return;
    const timer = setTimeout(() => setRun(true), 2000);
    return () => clearTimeout(timer);
  }, [user]);

  // Listener para reiniciar o tour manualmente
  useEffect(() => {
    const handler = () => setRun(true);
    window.addEventListener('onboarding:restart', handler);
    return () => window.removeEventListener('onboarding:restart', handler);
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: t('onboarding.welcome.title', { defaultValue: 'Bem-vindo ao FAST GRAVAÇÕES!' }),
      content: t('onboarding.welcome.content', {
        defaultValue:
          'Vamos fazer um tour rápido para você conhecer as principais funcionalidades da sua nova Fábrica Autônoma.',
      }),
    },
    {
      target: '#navigation',
      placement: 'right',
      title: t('onboarding.navigation.title', { defaultValue: 'Menu Principal' }),
      content: t('onboarding.navigation.content', {
        defaultValue: 'Aqui você acessa todos os módulos do sistema: Produção, Inventário, OEE e muito mais.',
      }),
    },
    {
      target: 'main h1',
      placement: 'bottom',
      title: t('onboarding.dashboard.title', { defaultValue: 'Dashboard' }),
      content: t('onboarding.dashboard.content', {
        defaultValue: 'Nesta área você visualiza os principais indicadores de performance em tempo real.',
      }),
    },
    {
      target: '[role="toolbar"]',
      placement: 'bottom',
      title: t('onboarding.toolbar.title', { defaultValue: 'Ações Rápidas' }),
      content: t('onboarding.toolbar.content', {
        defaultValue: 'Atalhos para favoritos, status de rede, notificações e troca de tema.',
      }),
    },
    {
      target: '#main-navigation button:first-of-type',
      placement: 'right',
      title: t('onboarding.newJob.title', { defaultValue: 'Agendamentos' }),
      content: t('onboarding.newJob.content', {
        defaultValue: 'Crie novos jobs e agende produções diretamente por aqui.',
      }),
    },
  ];

  const handleJoyrideCallback = useCallback((data: { status: string }) => {
    const { status } = data;
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(status)) {
      markOnboardingCompleted();
      setRun(false);
    }
  }, []);

  const isDark = theme === 'dark';
  const bg = isDark ? 'hsl(220 14% 10%)' : '#ffffff';
  const fg = isDark ? 'hsl(0 0% 98%)' : 'hsl(220 14% 12%)';
  const muted = isDark ? 'hsl(220 10% 65%)' : 'hsl(220 10% 40%)';
  const border = isDark ? 'hsl(220 14% 22%)' : 'hsl(220 14% 90%)';

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      hideCloseButton={false}
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: bg,
          textColor: fg,
          arrowColor: bg,
          overlayColor: 'rgba(0, 0, 0, 0.65)',
          zIndex: 10000,
          width: 440,
        },
        tooltip: {
          textAlign: 'left',
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${border}`,
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px hsl(var(--primary) / 0.15)',
          fontFamily: 'inherit',
        },
        tooltipTitle: {
          fontSize: 20,
          fontWeight: 700,
          color: fg,
          margin: 0,
          marginBottom: 8,
          letterSpacing: '-0.01em',
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.55,
          color: muted,
          padding: '8px 0 4px',
        },
        tooltipFooter: {
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${border}`,
          alignItems: 'center',
        },
        buttonNext: {
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          padding: '10px 20px',
          boxShadow: '0 4px 14px hsl(var(--primary) / 0.4)',
          outline: 'none',
        },
        buttonBack: {
          color: muted,
          fontSize: 14,
          fontWeight: 500,
          marginRight: 8,
        },
        buttonSkip: {
          color: fg,
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 14px',
          borderRadius: 8,
          border: `1px solid ${border}`,
          background: 'transparent',
        },
        buttonClose: {
          width: 12,
          height: 12,
          top: 16,
          right: 16,
          color: muted,
        },
        spotlight: {
          borderRadius: 12,
        },
      } as Partial<Styles>}
      locale={{
        back: t('common.back', { defaultValue: '← Voltar' }),
        close: t('common.close', { defaultValue: 'Fechar' }),
        last: t('common.finish', { defaultValue: '✨ Finalizar' }),
        next: t('common.next', { defaultValue: 'Próximo →' }),
        skip: t('common.skip', { defaultValue: 'Pular tour' }),
      }}
    />
  );
};
