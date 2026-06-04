import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import { csvBlob } from '@/utils/csv';
import type { ProductionReport } from '@/types/productionReport';

export const productionReportService = {
  async getMonthly(year: number, month: number): Promise<ProductionReport> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase.rpc('get_production_by_dentist', {
      p_clinic_id: clinicId,
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    return data as ProductionReport;
  },

  /**
   * Builds a spreadsheet-friendly CSV summary of the production report.
   * Returned as a Blob ready for download / inclusion in ZIP bundle.
   */
  toCsv(report: ProductionReport, year: number, month: number): Blob {
    const monthLabel = `${String(month).padStart(2, '0')}/${year}`;
    const rows: Array<Array<string | number | null | undefined>> = [
      ['Periodo', 'Categoria', 'Nome', 'Receita (R$)', 'Atendimentos', 'Ticket Medio (R$)', 'Percentual do Total'],
      [monthLabel, 'Resumo', 'Receita total', report.total_revenue.toFixed(2), '', '', '100.00'],
      [monthLabel, 'Resumo', 'Individual (socios)', report.individual_revenue.toFixed(2), '', '', percentage(report.individual_revenue, report.total_revenue)],
      [monthLabel, 'Resumo', 'Clinica (compartilhada)', report.clinic_revenue.toFixed(2), '', '', percentage(report.clinic_revenue, report.total_revenue)],
      [monthLabel, 'Resumo', 'Sem atribuicao', report.unassigned_individual_revenue.toFixed(2), '', '', percentage(report.unassigned_individual_revenue, report.total_revenue)],
    ];

    for (const d of report.dentists) {
      rows.push([
        monthLabel,
        'Dentista',
        d.dentist_name,
        d.revenue.toFixed(2),
        d.transaction_count,
        d.avg_ticket.toFixed(2),
        percentage(d.revenue, report.total_revenue),
      ]);
    }

    return csvBlob(rows);
  },
};

function percentage(value: number, total: number): string {
  if (!total) return '0.00';
  return ((value / total) * 100).toFixed(2);
}
