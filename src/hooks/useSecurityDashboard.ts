import { useQuery } from "@tanstack/react-query";
import { securityService, type AuditLogFilters } from "@/services/admin/security";

export function useSecurityMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["security-metrics", startDate, endDate],
    queryFn: () => securityService.getMetrics(startDate, endDate),
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => securityService.getLogs(filters),
    retry: 1,
  });
}
