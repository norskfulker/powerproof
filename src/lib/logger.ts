type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const SESSION_KEY = 'powerproof_session_id'

function isDev() {
  return import.meta.env.DEV
}

/** Stable anonymous session id for analytics and error correlation. */
export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let sessionId = window.sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId =
        typeof window.crypto?.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      window.sessionStorage.setItem(SESSION_KEY, sessionId)
    }
    return sessionId
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

function emit(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const payload = {
    level,
    message,
    sessionId: typeof window !== 'undefined' ? getAnalyticsSessionId() : undefined,
    ...context,
  }

  if (level === 'error') {
    console.error(`[PowerProof] ${message}`, payload, error)
  } else if (level === 'warn') {
    console.warn(`[PowerProof] ${message}`, payload)
  } else if (isDev()) {
    console.log(`[PowerProof] ${message}`, payload)
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (dsn && level === 'error' && typeof window !== 'undefined') {
    // Optional: wire @sentry/react when VITE_SENTRY_DSN is set in deployment.
    void dsn
  }
}

export function logDebug(message: string, context?: LogContext) {
  if (isDev()) emit('debug', message, context)
}

export function logInfo(message: string, context?: LogContext) {
  emit('info', message, context)
}

export function logWarn(message: string, context?: LogContext) {
  emit('warn', message, context)
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  emit('error', message, context, error)
}
