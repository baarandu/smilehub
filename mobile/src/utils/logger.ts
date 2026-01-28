/**
 * Logger utilitário que só exibe logs em desenvolvimento
 * Em produção, os logs são silenciados automaticamente
 */

const isDev = __DEV__;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },

  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },

  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },

  // Para logs que DEVEM aparecer em produção (erros críticos)
  critical: (...args: unknown[]) => {
    console.error('[CRITICAL]', ...args);
  },
};

export default logger;
