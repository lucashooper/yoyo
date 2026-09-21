type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogListener = (entry: LogEntry) => void;

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  detail?: unknown;
  timestamp: number;
}

const listeners = new Set<LogListener>();
const recent: LogEntry[] = [];
const MAX_RECENT = 80;

function emit(entry: LogEntry) {
  recent.push(entry);
  if (recent.length > MAX_RECENT) recent.shift();

  const prefix = `[Nobi:${entry.scope}]`;
  if (entry.level === 'error') {
    console.error(prefix, entry.message, entry.detail ?? '');
  } else if (entry.level === 'warn') {
    console.warn(prefix, entry.message, entry.detail ?? '');
  } else if (entry.level === 'debug') {
    if (__DEV__) console.debug(prefix, entry.message, entry.detail ?? '');
  } else {
    console.log(prefix, entry.message, entry.detail ?? '');
  }

  listeners.forEach((listener) => {
    try {
      listener(entry);
    } catch {
      // never let logging crash the app
    }
  });
}

export const logger = {
  info(scope: string, message: string, detail?: unknown) {
    emit({ level: 'info', scope, message, detail, timestamp: Date.now() });
  },
  warn(scope: string, message: string, detail?: unknown) {
    emit({ level: 'warn', scope, message, detail, timestamp: Date.now() });
  },
  error(scope: string, message: string, detail?: unknown) {
    emit({ level: 'error', scope, message, detail, timestamp: Date.now() });
  },
  debug(scope: string, message: string, detail?: unknown) {
    emit({ level: 'debug', scope, message, detail, timestamp: Date.now() });
  },
  subscribe(listener: LogListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  recent() {
    return [...recent];
  },
};

/** Friendly user-facing message for common API / network failures */
export function humanizeError(err: unknown, fallback = 'Something went wrong'): string {
  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network timeout — check your connection and try again.';
    }
    if (msg.includes('eleven') || msg.includes('tts') || msg.includes('api')) {
      return 'Voice service unavailable. Tap to reconnect.';
    }
    if (msg.includes('microphone') || msg.includes('permission')) {
      return 'Microphone permission is required.';
    }
    if (msg.includes('websocket') || msg.includes('socket')) {
      return 'Voice connection dropped. Tap to reconnect.';
    }
    return err.message || fallback;
  }
  return fallback;
}
