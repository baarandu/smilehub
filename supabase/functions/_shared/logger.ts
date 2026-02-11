/**
 * Structured Logger for Edge Functions
 * Outputs JSON logs with requestId, function name, and severity levels.
 * Includes audit() helper for fire-and-forget audit_logs inserts.
 */

interface LogEntry {
  timestamp: string;
  level: string;
  function: string;
  requestId: string;
  message: string;
  [key: string]: unknown;
}

interface AuditEvent {
  action: string;
  table_name: string;
  record_id?: string;
  user_id?: string;
  clinic_id?: string;
  details?: Record<string, unknown>;
}

export interface StructuredLogger {
  requestId: string;
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
  debug: (message: string, extra?: Record<string, unknown>) => void;
  audit: (supabase: any, event: AuditEvent) => void;
}

function formatLog(level: string, functionName: string, requestId: string, message: string, extra?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    function: functionName,
    requestId,
    message,
    ...extra,
  };
  return JSON.stringify(entry);
}

export function createLogger(functionName: string): StructuredLogger {
  const requestId = crypto.randomUUID().slice(0, 8);

  return {
    requestId,

    info(message: string, extra?: Record<string, unknown>) {
      console.log(formatLog("info", functionName, requestId, message, extra));
    },

    warn(message: string, extra?: Record<string, unknown>) {
      console.warn(formatLog("warn", functionName, requestId, message, extra));
    },

    error(message: string, extra?: Record<string, unknown>) {
      console.error(formatLog("error", functionName, requestId, message, extra));
    },

    debug(message: string, extra?: Record<string, unknown>) {
      console.debug(formatLog("debug", functionName, requestId, message, extra));
    },

    audit(supabase: any, event: AuditEvent) {
      // Fire-and-forget: don't block the request
      supabase
        .from("audit_logs")
        .insert({
          action: event.action,
          table_name: event.table_name,
          record_id: event.record_id || null,
          user_id: event.user_id || null,
          clinic_id: event.clinic_id || null,
          new_data: event.details || {},
          source: "edge_function",
          function_name: functionName,
          request_id: requestId,
        })
        .then(() => {})
        .catch((err: any) => {
          console.error(formatLog("error", functionName, requestId, `Audit insert failed: ${err.message}`));
        });
    },
  };
}

// Backward-compatible default export
export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export default logger;
