type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || '').toLowerCase();
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') return env;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function enabled(level: LogLevel): boolean {
  return levelRank[level] >= levelRank[currentLevel()];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (enabled('debug')) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (enabled('info')) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (enabled('warn')) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (enabled('error')) console.error(...args);
  },
};


