import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
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
   * Builds a CSV (semicolon-delimited, BR locale) summary of the production report.
   * Returned as a Blob ready for download / inclusion in ZIP bundle.
   */
  toCsv(report: ProductionReport, year: number, month: number): Blob {
    const lines: string[] = [];
    const monthLabel = `${String(month).padStart(2, '0')}/${year}`;
    lines.push(`Relatorio de Producao - ${monthLabel}`);
    lines.push('');
    lines.push('Receita Total;Individual (Socios);Clinica (Compartilhada);Sem Atribuicao');
    lines.push(
      [
        report.total_revenue,
        report.individual_revenue,
        report.clinic_revenue,
        report.unassigned_individual_revenue,
      ]
        .map((v) => v.toFixed(2).replace('.', ','))
        .join(';'),
    );
    lines.push('');
    lines.push('Producao por Socio');
    lines.push('Dentista;Receita;Atendimentos;Ticket Medio');
    for (const d of report.dentists) {
      lines.push(
        [
          d.dentist_name,
          d.revenue.toFixed(2).replace('.', ','),
          d.transaction_count,
          d.avg_ticket.toFixed(2).replace('.', ','),
        ].join(';'),
      );
    }
    return new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  },
};
