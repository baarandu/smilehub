import { supabase } from '../../lib/supabase';

export interface SecurityMetrics {
  total: number;
  auth_failures: number;
  ai_requests: number;
  exports: number;
  patient_reads: number;
  rate_limits: number;
  consent_denials: number;
  events_by_action: { action: string; count: number }[];
  events_by_function: { function_name: string; count: number }[];
  daily_events: { date: string; count: number }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  description: string | null;
  source: string;
  function_name: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
  action?: string;
  source?: string;
  function_name?: string;
  start_date?: string;
  end_date?: string;
  table_name?: string;
}

export const securityService = {
  async getMetrics(startDate?: string, endDate?: string): Promise<SecurityMetrics> {
    const { data, error } = await supabase.rpc('admin_get_security_metrics', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });
    if (error) throw error;
    return data;
  },

  async getAuditLogs(filters: AuditLogFilters = {}): Promise<{ total: number; logs: AuditLogEntry[] }> {
    const { data, error } = await supabase.rpc('admin_get_security_audit_logs', {
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0,
      p_action: filters.action || null,
      p_source: filters.source || null,
      p_function_name: filters.function_name || null,
      p_start_date: filters.start_date || null,
      p_end_date: filters.end_date || null,
      p_table_name: filters.table_name || null,
    });
    if (error) throw error;
    return { total: data?.length || 0, logs: data || [] };
  },
};
