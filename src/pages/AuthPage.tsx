/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuth, useAuthenticatorAssuranceLevel } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Moon, Sun, KeyRound } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { z } from 'zod';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { AuthLoginForm } from '@/components/auth/AuthLoginForm';
import { MFALoginVerification } from '@/components/auth/MFALoginVerification';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '@/components/ui/BrandLogo';



export default function AuthPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const loginSchema = z.object({ email: z.string().email(t('auth.invalidEmail')), password: z.string().min(6, t('auth.passwordMinLength', { min: 6 })) });

  const [isLoading, setIsLoading] = useState(false);
  const loginSubmittingRef = useRef(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetCooldownSec, setResetCooldownSec] = useState(0);
  const resetCooldownUntilRef = useRef(0);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [mfaSigningOut, setMfaSigningOut] = useState(false);
  const [mfaSignOutError, setMfaSignOutError] = useState<string | null>(null);

  useEffect(() => { const saved = localStorage.getItem('rememberedEmail'); if (saved) { setLoginEmail(saved); setRememberMe(true); } }, []);

  // Etapa 032 / AUT-04: a decisao de 2FA vem de um unico lugar — o mesmo hook
  // que o guarda de rota (ProtectedRoute) usa. Antes, esta tela e o guarda
  // consultavam o Supabase por conta propria e podiam discordar (aqui havia
  // fator, la nao), o que jogava o usuario para "/" e de volta para "/auth"
  // em laco. Agora aqui so reagimos a decisao compartilhada:
  //   - session resolved              -> navega para "/"
  //   - exige aal2 e ha TOTP          -> mostra o desafio
  //   - exige aal2 e NAO ha TOTP      -> bloqueio explicito com saida
  const {
    checked: mfaChecked,
    needsMfaChallenge,
    challengeableFactorId,
    factorsUnavailable,
    refresh: refreshMfa,
  } = useAuthenticatorAssuranceLevel();

  const mfaChallengeFactorId = needsMfaChallenge ? challengeableFactorId : null;
  const mfaBlockedReason = mfaChecked && needsMfaChallenge && !challengeableFactorId
    ? (factorsUnavailable
      ? 'Não foi possível consultar os fatores de segurança da sua conta. Tente novamente em instantes.'
      : 'Sua conta exige verificação em dois fatores, mas nenhum aplicativo autenticador está ativo. Fale com o administrador.')
    : null;

  useEffect(() => {
    if (!user || !mfaChecked || needsMfaChallenge) return;
    navigate('/', { replace: true });
  }, [user, mfaChecked, needsMfaChallenge, navigate]);

  // Sessao encerrada por fora (paleta de comandos, outra aba) precisa largar
  // tambem o aviso de bloqueio: sem isto o formulario de login ficava escondido
  // atras de um aviso da sessao anterior.
  useEffect(() => {
    if (!user) {
      setMfaSignOutError(null);
      setMfaSigningOut(false);
    }
  }, [user]);

  // Enquanto a decisao compartilhada nao resolveu, nao renderizar nada evita
  // piscar o formulario para quem precisa de 2FA.
  if (user && !mfaChecked) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrors({});
    // Synchronous re-entry guard: the button's disabled={isLoading} only takes
    // effect after the next render, so rapid double-submits in the same tick
    // could enqueue duplicate auth requests without this ref.
    if (loginSubmittingRef.current) return;
    try { loginSchema.parse({ email: loginEmail, password: loginPassword }); } catch (err) { if (err instanceof z.ZodError) { const fe: Record<string, string> = {}; err.issues.forEach(e => { if (e.path[0]) fe[`login_${String(e.path[0])}`] = e.message; }); setErrors(fe); return; } }
    if (rememberMe) localStorage.setItem('rememberedEmail', loginEmail); else localStorage.removeItem('rememberedEmail');
    loginSubmittingRef.current = true;
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    loginSubmittingRef.current = false;
    if (error) {
      const le = error as Error & { isLockout?: boolean; remainingMinutes?: number; lockoutMinutes?: number; blockedByIp?: boolean; geoBlocked?: boolean };
      if (le.isLockout) {
              if (le.geoBlocked) {
                toast.error('Acesso Bloqueado', { description: 'Esta região/país está bloqueada para acesso ao sistema. Contate o administrador.', duration: 10000 });
              } else if (le.blockedByIp) {
                toast.error('Acesso Bloqueado', { description: 'Esta rede/IP está bloqueada para acesso ao sistema. Contate o administrador.', duration: 10000 });
              } else {
                toast.error('Conta Bloqueada', { description: `Muitas tentativas falhas. Tente novamente em ${le.remainingMinutes || le.lockoutMinutes || 0} minuto(s).`, duration: 10000 });
              }
      } else {
        toast.error(t('auth.loginError'));
      }
      setIsLoading(false);
      return;
    }

    // Whether this session still needs an MFA challenge (and whether to show the
    // challenge, block with an explicit exit, or navigate away) is decided by
    // useAuthenticatorAssuranceLevel — the same hook ProtectedRoute reads — which
    // reacts to `user` becoming set; avoids two diverging checks.
    setIsLoading(false);
    toast.success(t('auth.loginSuccess'));
  };

  // Etapa 032: o aviso de bloqueio so pode desaparecer quando a sessao
  // realmente termina (`user` vira null). Limpar o aviso antes do logout deixava
  // a tela em branco quando o proprio logout falhava — sessao viva, sem fator
  // e sem aviso. A rejeicao agora mantem o aviso e explica a falha.
  const handleBlockedSignOut = async () => {
    if (mfaSigningOut) return;
    setMfaSigningOut(true);
    setMfaSignOutError(null);
    try {
      await signOut();
    } catch {
      setMfaSignOutError('Não foi possível encerrar a sessão. Verifique a conexão e tente novamente.');
    } finally {
      setMfaSigningOut(false);
    }
  };

  const handleGoogleLogin = async () => { setSocialLoading('google'); try { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if (result.error) toast.error('Erro ao conectar com Google'); } catch { toast.error('Erro ao iniciar login social'); } finally { setSocialLoading(null); } };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error(t('validation.required')); return; }
    try { z.string().email().parse(forgotEmail); } catch { toast.error(t('auth.invalidEmail')); return; }

    // Client-side cooldown: prevent burst-submitting before the server round-trip completes
    const now = Date.now();
    if (now < resetCooldownUntilRef.current) {
      toast.info(`Aguarde ${resetCooldownSec}s antes de enviar outra solicitação.`);
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.from('password_reset_requests').insert({
      user_email: forgotEmail.trim().toLowerCase(),
      requested_by_name: null,
      status: 'pending',
    });

    if (error) {
      // Postgres unique-violation code 23505 means a pending request already exists
      // (enforced by the partial unique index on user_email WHERE status='pending')
      if ((error as { code?: string }).code === '23505') {
        toast.info('Já existe uma solicitação pendente para este e-mail. Aguarde a aprovação do gestor.');
      } else {
        toast.error('Erro ao enviar solicitação. Tente novamente.');
      }
      setIsSendingReset(false);
      return;
    }

    // Arm 60-second cooldown to throttle repeated requests
    const until = Date.now() + 60_000;
    resetCooldownUntilRef.current = until;
    setResetCooldownSec(60);
    const tick = setInterval(() => {
      const rem = Math.ceil((resetCooldownUntilRef.current - Date.now()) / 1000);
      if (rem <= 0) { clearInterval(tick); setResetCooldownSec(0); } else { setResetCooldownSec(rem); }
    }, 1000);

    toast.success(t('auth.resetRequestSent', 'Solicitação enviada! Aguarde aprovação do gestor.'));
    setShowForgotPassword(false);
    setForgotEmail('');
    setIsSendingReset(false);
  };


  return (
    <AuthErrorBoundary>
      <Helmet>
        <title>{t('auth.login')} | FAST GRAVAÇÕES</title>
        <meta name="description" content="Acesse o sistema FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO para gerenciar sua produção industrial." />
      </Helmet>

      <div className="min-h-screen w-full flex bg-[#050505] text-white text-title selection:bg-[#FF5A1F]/30">
        {/* LEFT — Industrial Showcase */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0a0a0a] border-r border-white/5">
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-br from-[#FF5A1F]/20 to-transparent blur-[120px] pointer-events-none" />

          <div className="relative z-10 p-12 xl:p-16 flex flex-col justify-between h-full w-full">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center">
              <BrandLogo size="lg" />
            </motion.div>


            <div className="max-w-2xl space-y-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A1F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5A1F]" />
                </span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
                QUALIDADE + <span className="text-[#FF5A1F]">VELOCIDADE</span><br />em Tempo Real.
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-zinc-400 text-lg leading-relaxed max-w-md">
                FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO: Monitoramento de OEE e KPIs em uma plataforma unificada.
              </motion.p>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="grid grid-cols-3 gap-4 xl:gap-6">
              {[
                { label: 'OEE Médio', value: '87', suffix: '%', highlight: false },
                { label: 'Uptime', value: '99.9', suffix: '%', highlight: false },
                { label: 'Velocidade', value: '<3', suffix: 's', highlight: true },
              ].map((k) => (
                <div key={k.label} className={`p-5 rounded-xl backdrop-blur-sm border ${k.highlight ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/20' : 'bg-white/5 border-white/10'}`}>
                  <p className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${k.highlight ? 'text-[#FF5A1F]' : 'text-muted-foreground'}`}>{k.label}</p>
                  <p className="text-3xl font-bold leading-none">{k.value}<span className="text-[#FF5A1F]">{k.suffix}</span></p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* RIGHT — Login form */}
        <div className="w-full lg:w-[540px] flex flex-col p-6 sm:p-10 lg:p-16 justify-center relative bg-[#050505]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center mb-10">
            <BrandLogo size="md" />
          </div>


          {/* Top utility */}
          <div className="absolute top-6 right-6 lg:top-8 lg:right-8 flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/5">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <AnimatePresence mode="wait">
              {mfaBlockedReason ? (
                <motion.div key="mfa-blocked" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="mb-8">
                    <h3 className="text-3xl font-bold mb-2 tracking-tight">Verificação em dois fatores</h3>
                    <p className="text-muted-foreground text-sm" role="alert">{mfaBlockedReason}</p>
                    {mfaSignOutError && (
                      <p className="text-destructive text-sm mt-3" role="alert">{mfaSignOutError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button onClick={refreshMfa}>Tentar novamente</Button>
                    <Button variant="outline" onClick={() => { void handleBlockedSignOut(); }} disabled={mfaSigningOut}>
                      {mfaSigningOut ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saindo...</>) : 'Sair'}
                    </Button>
                  </div>
                </motion.div>
              ) : mfaChallengeFactorId ? (
                <motion.div key="mfa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <MFALoginVerification factorId={mfaChallengeFactorId} onSuccess={() => navigate('/')} onCancel={() => { void handleBlockedSignOut(); }} />
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="mb-8">
                    <h3 className="text-3xl font-bold mb-2 tracking-tight">Bem-vindo</h3>
                    <p className="text-muted-foreground text-sm">Acesse sua conta para gerenciar as máquinas.</p>
                  </div>

                  <div className="w-full">
                    <AuthLoginForm loginEmail={loginEmail} loginPassword={loginPassword} rememberMe={rememberMe} isLoading={isLoading} socialLoading={socialLoading} errors={errors} onEmailChange={setLoginEmail} onPasswordChange={setLoginPassword} onRememberMeChange={setRememberMe} onSubmit={handleLogin} onGoogleLogin={handleGoogleLogin} onForgotPassword={() => setShowForgotPassword(true)} />
                  </div>

                  <footer className="mt-16 text-center">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">© {new Date().getFullYear()} FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO • Indústria 4.0</p>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#FF5A1F]" />{t('auth.resetPassword')}</DialogTitle><DialogDescription>{t('auth.resetNeedsApproval', 'Digite seu e-mail. A solicitação será enviada para aprovação do gestor.')}</DialogDescription></DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- foco no input do dialog de recuperação é UX esperada */}
            <div className="space-y-2"><Label htmlFor="forgot-email">{t('auth.email')}</Label><Input id="forgot-email" type="email" placeholder={t('auth.email')} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} disabled={isSendingReset} autoFocus /><p className="text-xs text-muted-foreground">{t('auth.resetApprovalNote', 'Sua solicitação será analisada por um gestor antes do envio do e-mail de redefinição.')}</p></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} disabled={isSendingReset}>{t('common.cancel')}</Button><Button type="submit" disabled={isSendingReset || resetCooldownSec > 0}>{isSendingReset ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common.loading')}</> : resetCooldownSec > 0 ? `Aguarde ${resetCooldownSec}s` : t('auth.sendRequest', 'Enviar Solicitação')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </AuthErrorBoundary>
  );
}
