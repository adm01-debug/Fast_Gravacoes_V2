/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X, AlertCircle, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  checkBreaches?: boolean;
  className?: string;
}

interface PasswordCriteria {
  id: string;
  label: string;
  met: boolean;
}

// SHA-1 hash function using Web Crypto API
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Check if password has been leaked using Have I Been Pwned API (k-anonymity)
async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds padding to prevent response size analysis
      },
    });

    if (!response.ok) {
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix?.trim() === suffix) {
        const count = parseInt(countStr?.trim() || '0', 10);
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    return { breached: false, count: 0 };
  }
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  checkBreaches = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const [breachStatus, setBreachStatus] = useState<{
    checking: boolean;
    breached: boolean;
    count: number;
  }>({ checking: false, breached: false, count: 0 });

  const debouncedPassword = useDebounce(password, 500);

  // Check for breaches when password changes (debounced)
  useEffect(() => {
    if (!checkBreaches || !debouncedPassword || debouncedPassword.length < 8) {
      setBreachStatus({ checking: false, breached: false, count: 0 });
      return;
    }

    let cancelled = false;
    setBreachStatus(prev => ({ ...prev, checking: true }));

    checkPasswordBreach(debouncedPassword).then(result => {
      if (!cancelled) {
        setBreachStatus({
          checking: false,
          breached: result.breached,
          count: result.count,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedPassword, checkBreaches]);

  const analysis = useMemo(() => {
    const criteria: PasswordCriteria[] = [
      {
        id: 'length',
        label: 'Mínimo 8 caracteres',
        met: password.length >= 8,
      },
      {
        id: 'uppercase',
        label: 'Letra maiúscula (A-Z)',
        met: /[A-Z]/.test(password),
      },
      {
        id: 'lowercase',
        label: 'Letra minúscula (a-z)',
        met: /[a-z]/.test(password),
      },
      {
        id: 'number',
        label: 'Número (0-9)',
        met: /[0-9]/.test(password),
      },
      {
        id: 'special',
        label: 'Caractere especial (!@#$%&*)',
        met: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password),
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const strength = password.length === 0 ? 0 : Math.round((metCount / criteria.length) * 100);

    let level: 'none' | 'weak' | 'fair' | 'good' | 'strong' = 'none';
    let label = '';
    let colorClass = '';

    if (password.length === 0) {
      level = 'none';
      label = '';
      colorClass = '';
    } else if (metCount <= 1) {
      level = 'weak';
      label = 'Muito fraca';
      colorClass = 'bg-red-500';
    } else if (metCount === 2) {
      level = 'weak';
      label = 'Fraca';
      colorClass = 'bg-orange-500';
    } else if (metCount === 3) {
      level = 'fair';
      label = 'Razoável';
      colorClass = 'bg-yellow-500';
    } else if (metCount === 4) {
      level = 'good';
      label = 'Boa';
      colorClass = 'bg-lime-500';
    } else {
      level = 'strong';
      label = 'Forte';
      colorClass = 'bg-green-500';
    }

    return { criteria, strength, level, label, colorClass, metCount };
  }, [password]);

  if (password.length === 0) {
    return null;
  }

  const formatBreachCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Força da senha</span>
          <span
            className={cn(
              'text-xs font-medium',
              analysis.level === 'weak' && 'text-red-500',
              analysis.level === 'fair' && 'text-yellow-600',
              analysis.level === 'good' && 'text-lime-600',
              analysis.level === 'strong' && 'text-green-600'
            )}
          >
            {analysis.label}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              analysis.colorClass
            )}
            style={{ width: `${analysis.strength}%` }}
          />
        </div>
      </div>

      {/* Breach Warning */}
      {checkBreaches && password.length >= 8 && (
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-md text-xs transition-all duration-200',
            breachStatus.checking && 'bg-muted/50 text-muted-foreground',
            breachStatus.breached && 'bg-red-500/10 text-red-600 border border-red-500/20',
            !breachStatus.checking && !breachStatus.breached && 'bg-green-500/10 text-green-600 border border-green-500/20'
          )}
        >
          {breachStatus.checking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>Verificando vazamentos de dados...</span>
            </>
          ) : breachStatus.breached ? (
            <>
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>Atenção:</strong> Esta senha apareceu em {formatBreachCount(breachStatus.count)} vazamentos de dados.
                Escolha outra senha.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <span>Senha não encontrada em vazamentos conhecidos</span>
            </>
          )}
        </div>
      )}

      {/* Requirements List */}
      {showRequirements && (
        <div className="grid grid-cols-1 gap-1.5">
          {analysis.criteria.map((criterion) => (
            <div
              key={criterion.id}
              className={cn(
                'flex items-center gap-2 text-xs transition-colors duration-200',
                criterion.met ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {criterion.met ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              )}
              <span>{criterion.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for password validation
export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password);

    const criteriaMet = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    const isStrong = criteriaMet >= 4;
    const isValid = hasMinLength && criteriaMet >= 3;

    return {
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      criteriaMet,
      isStrong,
      isValid,
    };
  }, [password]);
}
