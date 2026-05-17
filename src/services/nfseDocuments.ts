import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import type {
  NfseDocument,
  NfseDocumentWithRelations,
  NfseUploadInput,
  NfseStatus,
  PaymentWithoutNfse,
} from '@/types/nfseDocument';

const BUCKET = 'nfse-documents';

function buildStoragePath(clinicId: string, invoiceNumber: string, ext: 'xml' | 'pdf'): string {
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const ts = Date.now();
  return `${clinicId}/${safe}_${ts}.${ext}`;
}

async function uploadFile(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export const nfseDocumentsService = {
  async create(input: NfseUploadInput): Promise<NfseDocument> {
    const { clinicId, userId } = await getClinicContext();

    let xml_url: string | null = null;
    let pdf_url: string | null = null;

    if (input.xml_file) {
      xml_url = await uploadFile(
        buildStoragePath(clinicId, input.invoice_number, 'xml'),
        input.xml_file,
      );
    }
    if (input.pdf_file) {
      pdf_url = await uploadFile(
        buildStoragePath(clinicId, input.invoice_number, 'pdf'),
        input.pdf_file,
      );
    }

    const { data, error } = await supabase
      .from('nfse_documents')
      .insert({
        clinic_id: clinicId,
        patient_id: input.patient_id ?? null,
        budget_id: input.budget_id ?? null,
        financial_transaction_id: input.financial_transaction_id ?? null,
        tooth_index: input.tooth_index ?? null,
        dentist_id: input.dentist_id ?? null,
        invoice_number: input.invoice_number,
        issue_date: input.issue_date,
        service_value: input.service_value,
        tax_value: input.tax_value ?? 0,
        net_value: input.net_value ?? null,
        service_description: input.service_description ?? null,
        notes: input.notes ?? null,
        xml_url,
        pdf_url,
        created_by: userId,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as NfseDocument;
  },

  async listByPatient(patientId: string): Promise<NfseDocument[]> {
    const { data, error } = await supabase
      .from('nfse_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return (data || []) as NfseDocument[];
  },

  async listByTransaction(transactionId: string): Promise<NfseDocument[]> {
    const { data, error } = await supabase
      .from('nfse_documents')
      .select('*')
      .eq('financial_transaction_id', transactionId)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return (data || []) as NfseDocument[];
  },

  async listByMonth(year: number, month: number): Promise<NfseDocumentWithRelations[]> {
    const { clinicId } = await getClinicContext();
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('nfse_documents')
      .select('*, patient:patients(name)')
      .eq('clinic_id', clinicId)
      .gte('issue_date', start)
      .lte('issue_date', end)
      .order('issue_date', { ascending: false });
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      patient_name: row.patient?.name ?? null,
    })) as NfseDocumentWithRelations[];
  },

  async getPaymentsWithoutNfse(year: number, month: number): Promise<PaymentWithoutNfse[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase.rpc('get_payments_without_nfse', {
      p_clinic_id: clinicId,
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    return (data || []) as PaymentWithoutNfse[];
  },

  /**
   * Lists income transactions for a patient that don't have a NFS-e attached yet.
   * Used to let the user link a manually-uploaded NFS-e to a specific payment.
   */
  async getUnlinkedPaymentsByPatient(patientId: string, limitMonths = 6): Promise<PaymentWithoutNfse[]> {
    const { clinicId } = await getClinicContext();
    const since = new Date();
    since.setMonth(since.getMonth() - limitMonths);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('financial_transactions')
      .select('id, date, amount, patient_id, dentist_id, description')
      .eq('clinic_id', clinicId)
      .eq('type', 'income')
      .eq('patient_id', patientId)
      .gte('date', sinceStr)
      .order('date', { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Filter out transactions that already have an active NFS-e
    const txIds = data.map((t) => t.id);
    const { data: linkedNfse } = await supabase
      .from('nfse_documents')
      .select('financial_transaction_id')
      .eq('clinic_id', clinicId)
      .in('financial_transaction_id', txIds)
      .neq('status', 'canceled');
    const linkedSet = new Set((linkedNfse || []).map((n) => n.financial_transaction_id));

    return data
      .filter((t) => !linkedSet.has(t.id))
      .map((t) => ({
        transaction_id: t.id,
        transaction_date: t.date,
        amount: Number(t.amount),
        patient_id: t.patient_id,
        patient_name: null, // not needed in this context
        dentist_id: t.dentist_id,
        description: t.description,
      })) as PaymentWithoutNfse[];
  },

  async updateStatus(
    id: string,
    status: NfseStatus,
    options?: { cancellation_reason?: string; substituted_by_id?: string },
  ): Promise<void> {
    const payload: Record<string, unknown> = { status };
    if (status === 'canceled') {
      payload.canceled_at = new Date().toISOString();
      if (options?.cancellation_reason) payload.cancellation_reason = options.cancellation_reason;
    }
    if (status === 'substituted' && options?.substituted_by_id) {
      payload.substituted_by_id = options.substituted_by_id;
    }
    const { error } = await supabase.from('nfse_documents').update(payload).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { data: existing } = await supabase
      .from('nfse_documents')
      .select('xml_url, pdf_url')
      .eq('id', id)
      .single();

    const paths = [existing?.xml_url, existing?.pdf_url].filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    const { error } = await supabase.from('nfse_documents').delete().eq('id', id);
    if (error) throw error;
  },

  async getSignedUrl(path: string, expiresIn = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Download all NFS-e files for a given month as a ZIP bundle.
   * Returns a Blob ready to be saved.
   */
  async downloadMonthlyBundle(year: number, month: number): Promise<Blob> {
    const docs = await this.listByMonth(year, month);
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folder = zip.folder(`NFSe_${year}_${String(month).padStart(2, '0')}`);
    if (!folder) throw new Error('Falha ao criar pacote');

    let added = 0;
    for (const doc of docs) {
      if (doc.status === 'canceled' && !doc.xml_url && !doc.pdf_url) continue;
      const safe = `${doc.invoice_number}_${doc.status}`;
      for (const [path, ext] of [
        [doc.xml_url, 'xml'],
        [doc.pdf_url, 'pdf'],
      ] as const) {
        if (!path) continue;
        const { data, error } = await supabase.storage.from(BUCKET).download(path);
        if (error || !data) continue;
        folder.file(`${safe}.${ext}`, data);
        added++;
      }
    }

    // Resumo em texto
    const summary = docs
      .map(
        (d) =>
          `${d.invoice_number} | ${d.issue_date} | R$ ${d.service_value.toFixed(2)} | ${d.status}` +
          (d.patient_name ? ` | ${d.patient_name}` : ''),
      )
      .join('\n');
    folder.file('_resumo.txt', `Total: ${docs.length} nota(s)\n\n${summary}`);

    if (added === 0 && docs.length === 0) {
      throw new Error('Nenhuma nota encontrada para o período');
    }

    return zip.generateAsync({ type: 'blob' });
  },
};
