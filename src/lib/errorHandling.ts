import { toast } from 'sonner';

// ============================================
// Error Handling Utilities
// ============================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  originalError?: unknown;
  context?: Record<string, unknown>;
  timestamp: Date;
  retryable: boolean;
}


/**
 * Error codes for categorization
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',

  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Data errors
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',

  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Client errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * User-friendly error messages in Portuguese
 */
const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.NETWORK_ERROR]: 'Erro de conexão. Verifique sua internet e tente novamente.',
  [ErrorCodes.TIMEOUT]: 'A requisição demorou muito. Tente novamente.',
  [ErrorCodes.RATE_LIMITED]: 'Muitas requisições. Aguarde um momento e tente novamente.',
  [ErrorCodes.UNAUTHORIZED]: 'Sessão expirada. Faça login novamente.',
  [ErrorCodes.FORBIDDEN]: 'Você não tem permissão para esta ação.',
  [ErrorCodes.SESSION_EXPIRED]: 'Sua sessão expirou. Faça login novamente.',
  [ErrorCodes.NOT_FOUND]: 'Recurso não encontrado.',
  [ErrorCodes.VALIDATION_ERROR]: 'Dados inválidos. Verifique as informações.',
  [ErrorCodes.CONFLICT]: 'Conflito de dados. Atualize a página e tente novamente.',
  [ErrorCodes.SERVER_ERROR]: 'Erro no servidor. Tente novamente em alguns minutos.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Serviço temporariamente indisponível.',
  [ErrorCodes.UNKNOWN_ERROR]: 'Ocorreu um erro inesperado. Tente novamente.',
};

/**
 * Parses an error and returns a categorized ErrorCode
 */
export function categorizeError(error: unknown): ErrorCode {
  if (!error) return ErrorCodes.UNKNOWN_ERROR;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return ErrorCodes.NETWORK_ERROR;
  }

  // Timeout
  if (message.includes('timeout') || message.includes('408')) {
    return ErrorCodes.TIMEOUT;
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
    return ErrorCodes.RATE_LIMITED;
  }

  // Auth errors
  if (message.includes('401') || message.includes('unauthorized') || message.includes('not authenticated')) {
    return ErrorCodes.UNAUTHORIZED;
  }

  if (message.includes('403') || message.includes('forbidden') || message.includes('access denied')) {
    return ErrorCodes.FORBIDDEN;
  }

  if (message.includes('jwt') || message.includes('token expired') || message.includes('session')) {
    return ErrorCodes.SESSION_EXPIRED;
  }

  // Data errors
  if (message.includes('404') || message.includes('not found')) {
    return ErrorCodes.NOT_FOUND;
  }

  if (message.includes('400') || message.includes('422') || message.includes('validation') || message.includes('invalid')) {
    return ErrorCodes.VALIDATION_ERROR;
  }

  if (message.includes('409') || message.includes('conflict') || message.includes('duplicate')) {
    return ErrorCodes.CONFLICT;
  }

  // Server errors
  if (message.includes('500') || message.includes('internal server')) {
    return ErrorCodes.SERVER_ERROR;
  }

  if (message.includes('502') || message.includes('503') || message.includes('504') || message.includes('unavailable')) {
    return ErrorCodes.SERVICE_UNAVAILABLE;
  }

  return ErrorCodes.UNKNOWN_ERROR;
}

/**
 * Creates a standardized AppError from any error
 */
export function createAppError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {

  const code = categorizeError(error);
  const message = ErrorMessages[code];

  const severity: ErrorSeverity =
    code === ErrorCodes.UNAUTHORIZED || code === ErrorCodes.SESSION_EXPIRED ? 'warning' :
    code === ErrorCodes.SERVER_ERROR || code === ErrorCodes.SERVICE_UNAVAILABLE ? 'critical' :
    code === ErrorCodes.RATE_LIMITED ? 'info' :
    'error';

  const retryableCodes: ErrorCode[] = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.TIMEOUT,
    ErrorCodes.RATE_LIMITED,
    ErrorCodes.SERVER_ERROR,
    ErrorCodes.SERVICE_UNAVAILABLE,
  ];

  const retryable = retryableCodes.includes(code);

  return {
    message,
    code,
    severity,
    originalError: error,
    context,
    timestamp: new Date(),
    retryable,
  };
}

/**
 * Shows an error toast with appropriate styling
 */
export function showErrorToast(
  error: unknown,
  customMessage?: string,
  context?: Record<string, unknown>
): void {

  const appError = createAppError(error, context);
  const message = customMessage || appError.message;

  switch (appError.severity) {
    case 'critical':
      toast.error(message, {
        description: 'Se o problema persistir, contate o suporte.',
        duration: 8000,
      });
      break;
    case 'warning':
      toast.warning(message, {
        duration: 5000,
      });
      break;
    case 'info':
      toast.info(message, {
        duration: 4000,
      });
      break;
    default:
      toast.error(message, {
        duration: 5000,
      });
  }

  // Log to console/monitor
  import('./logger').then(({ logger }) => {
    logger.error(`AppError [${appError.code}]: ${message}`, { 
      originalError: appError.originalError, 
      context,
      severity: appError.severity,
      timestamp: appError.timestamp
    });
  }).catch(() => {
    // Fallback if logger fails: emit a single line to stderr via a safe channel.
    // We intentionally do not re-enter the logger to avoid recursion.
    if (typeof globalThis !== 'undefined' && typeof (globalThis as { reportError?: (e: unknown) => void }).reportError === 'function') {
      (globalThis as { reportError: (e: unknown) => void }).reportError(new Error(`AppError [${appError.code}]: ${message}`));
    }
  });
}

/**
 * Shows a success toast
 */
export function showSuccessToast(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    showToast?: boolean;
    customMessage?: string;
    context?: Record<string, unknown>;
    onError?: (error: AppError) => void;
  }
): Promise<T | null> {
  const { showToast = true, customMessage, context, onError } = options || {};

  try {
    return await fn();
  } catch (error) {
    const appError = createAppError(error, context);

    if (showToast) {
      showErrorToast(error, customMessage, context);
    }

    if (onError) {
      onError(appError);
    }

    return null;
  }
}

/**
 * Creates a mutation error handler for React Query
 */
export function createMutationErrorHandler(
  customMessage?: string,
  context?: Record<string, unknown>
) {
  return (error: unknown) => {
    showErrorToast(error, customMessage, context);
  };
}

/**
 * Checks if an error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return categorizeError(error) === code;
}

/**
 * Checks if the error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const code = categorizeError(error);
  return code === ErrorCodes.NETWORK_ERROR || code === ErrorCodes.TIMEOUT;
}

/**
 * Checks if the error is auth-related
 */
export function isAuthError(error: unknown): boolean {
  const code = categorizeError(error);
  return code === ErrorCodes.UNAUTHORIZED ||
         code === ErrorCodes.FORBIDDEN ||
         code === ErrorCodes.SESSION_EXPIRED;
}

