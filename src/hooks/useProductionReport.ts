import { useQuery } from '@tanstack/react-query';
import { productionReportService } from '@/services/productionReport';

export function useProductionReport(year: number, month: number) {
  return useQuery({
    queryKey: ['production-report', year, month],
    queryFn: () => productionReportService.getMonthly(year, month),
    staleTime: 30_000,
  });
}
