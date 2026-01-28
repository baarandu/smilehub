/**
 * Logger para Edge Functions - silencia logs em produção
 * Usa a variável de ambiente para determinar o ambiente
 */

const isDev = Deno.env.get('ENVIRONMENT') !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  error: (...args: unknown[]) => {
    // Erros sempre são logados (útil para debug no Supabase)
    console.error(...args);
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
};

export default logger;
