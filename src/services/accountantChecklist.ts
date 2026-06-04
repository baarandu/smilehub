import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import { nfseDocumentsService } from './nfseDocuments';
import { productionReportService } from './productionReport';
import { buildCsv } from '@/utils/csv';
import type {
  ChecklistData,
  SubmissionFile,
  SubmissionFileType,
  AccountantSubmission,
} from '@/types/accountantChecklist';

const BUCKET = 'accountant-submissions';

function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function buildStoragePath(
  clinicId: string,
  year: number,
  month: number,
  fileType: SubmissionFileType,
  originalName: string,
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  return `${clinicId}/${year}_${String(month).padStart(2, '0')}/${fileType}/${ts}_${safe}`;
}

export const accountantChecklistService = {
  async getChecklist(year: number, month: number): Promise<ChecklistData> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase.rpc('get_accountant_checklist', {
      p_clinic_id: clinicId,
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    return data as ChecklistData;
  },

  async listFiles(year: number, month: number): Promise<SubmissionFile[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('accountant_submission_files')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('reference_month', firstOfMonth(year, month))
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SubmissionFile[];
  },

  async uploadFile(
    year: number,
    month: number,
    fileType: SubmissionFileType,
    file: File,
    notes?: string,
  ): Promise<SubmissionFile> {
    const { clinicId, userId } = await getClinicContext();
    const path = buildStoragePath(clinicId, year, month, fileType, file.name);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('accountant_submission_files')
      .insert({
        clinic_id: clinicId,
        reference_month: firstOfMonth(year, month),
        file_type: fileType,
        file_name: file.name,
        file_url: path,
        file_size: file.size,
        mime_type: file.type,
        notes: notes ?? null,
        uploaded_by: userId,
      } as any)
      .select()
      .single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
    return data as SubmissionFile;
  },

  async deleteFile(id: string): Promise<void> {
    const { data: existing } = await supabase
      .from('accountant_submission_files')
      .select('file_url')
      .eq('id', id)
      .single();
    if (existing?.file_url) {
      await supabase.storage.from(BUCKET).remove([existing.file_url]);
    }
    const { error } = await supabase.from('accountant_submission_files').delete().eq('id', id);
    if (error) throw error;
  },

  async getSignedUrl(path: string, expiresIn = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async markAsSent(
    year: number,
    month: number,
    options: { recipient_email?: string; notes?: string },
  ): Promise<AccountantSubmission> {
    const { clinicId, userId } = await getClinicContext();
    const ref = firstOfMonth(year, month);

    const { data, error } = await supabase
      .from('accountant_submissions')
      .upsert(
        {
          clinic_id: clinicId,
          reference_month: ref,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: userId,
          recipient_email: options.recipient_email ?? null,
          notes: options.notes ?? null,
        } as any,
        { onConflict: 'clinic_id,reference_month' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as AccountantSubmission;
  },

  async revertToDraft(year: number, month: number): Promise<void> {
    const { clinicId } = await getClinicContext();
    const { error } = await supabase
      .from('accountant_submissions')
      .update({ status: 'draft', sent_at: null, sent_by: null })
      .eq('clinic_id', clinicId)
      .eq('reference_month', firstOfMonth(year, month));
    if (error) throw error;
  },

  /**
   * Builds a comprehensive ZIP bundle for the accountant:
   *   - All NFS-e XML+PDF for the month (via nfseDocumentsService)
   *   - All manual files uploaded (bank statements, card reports, etc.)
   *   - A plain-text summary of revenue/expenses/pro-labore for the month
   */
  async downloadFullBundle(year: number, month: number): Promise<Blob> {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folder = zip.folder(`Contador_${year}_${String(month).padStart(2, '0')}`);
    if (!folder) throw new Error('Falha ao criar pacote');

    // 1) NFS-e
    try {
      const nfseDocs = await nfseDocumentsService.listByMonth(year, month);
      const activeNfseDocs = nfseDocs.filter((doc) => doc.status !== 'canceled');
      folder.file(
        `Notas_Fiscais_NFSe_${year}_${String(month).padStart(2, '0')}.csv`,
        buildCsv([
          ['Numero', 'Dentista', 'Paciente', 'Data', 'Valor (R$)', 'Status', 'Descricao'],
          ...activeNfseDocs.map((doc) => [
            doc.invoice_number,
            doc.dentist_name || 'Sem dentista',
            doc.patient_name || 'Avulso',
            doc.issue_date,
            Number(doc.service_value).toFixed(2),
            doc.status,
            doc.service_description || '',
          ]),
        ]),
      );

      const nfseBundle = await nfseDocumentsService.downloadMonthlyBundle(year, month);
      folder.file(`NFSe_${year}_${String(month).padStart(2, '0')}.zip`, nfseBundle);
    } catch {
      // sem NFS-e — segue
    }

    // 2) Arquivos manuais
    const files = await this.listFiles(year, month);
    const byType = new Map<string, SubmissionFile[]>();
    for (const f of files) {
      const arr = byType.get(f.file_type) || [];
      arr.push(f);
      byType.set(f.file_type, arr);
    }

    const typeLabels: Record<string, string> = {
      bank_statement_pdf: 'Extratos_Bancarios_PDF',
      bank_statement_ofx: 'Extratos_Bancarios_OFX',
      card_machine_report: 'Maquininha_Cartao',
      expense_receipt: 'Recibos_Despesas',
      other: 'Outros',
    };

    for (const [type, items] of byType.entries()) {
      const sub = folder.folder(typeLabels[type] || type);
      if (!sub) continue;
      for (const f of items) {
        const { data, error } = await supabase.storage.from(BUCKET).download(f.file_url);
        if (error || !data) continue;
        sub.file(f.file_name, data);
      }
    }

    // 3) Relatório de Produção por Sócio (CSV)
    try {
      const report = await productionReportService.getMonthly(year, month);
      const csv = productionReportService.toCsv(report, year, month);
      folder.file(`Producao_por_Socio_${year}_${String(month).padStart(2, '0')}.csv`, csv);
    } catch {
      // sem dados — segue
    }

    // 4) Resumo do checklist
    const checklist = await this.getChecklist(year, month);
    const summary = [
      `Resumo Mensal — ${year}/${String(month).padStart(2, '0')}`,
      ``,
      `NFS-e emitidas: ${checklist.items.nfse.count}`,
      `Pagamentos sem NFS-e: ${checklist.items.nfse.payments_without_nfse}`,
      ``,
      `Receitas: ${checklist.items.income.count} lançamento(s) — R$ ${checklist.items.income.total.toFixed(2)}`,
      `  Dentistas com produção: ${checklist.items.income.dentists_with_revenue}`,
      ``,
      `Despesas: ${checklist.items.expenses.count} lançamento(s) — R$ ${checklist.items.expenses.total.toFixed(2)}`,
      ``,
      `Pró-labore: ${checklist.items.prolabore.paid} pago(s), ${checklist.items.prolabore.planned} planejado(s)`,
      ``,
      `Transações via maquininha: ${checklist.items.card_machine.transactions}`,
      `Extratos bancários: ${checklist.items.bank_statement.pdf_count} PDF · ${checklist.items.bank_statement.ofx_count} OFX`,
    ].join('\n');
    folder.file('_resumo.txt', summary);

    return zip.generateAsync({ type: 'blob' });
  },
};
