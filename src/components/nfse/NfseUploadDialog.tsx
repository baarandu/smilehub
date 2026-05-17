import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileCheck2, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateNfse } from '@/hooks/useNfseDocuments';

interface NfseUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-fill defaults
  defaultPatientId?: string | null;
  defaultBudgetId?: string | null;
  defaultToothIndex?: number | null;
  defaultTransactionId?: string | null;
  defaultDentistId?: string | null;
  defaultServiceValue?: number;
  defaultDescription?: string;
  contextLabel?: string; // e.g. "Restauração - Dente 11"
}

export function NfseUploadDialog({
  open,
  onClose,
  onSuccess,
  defaultPatientId,
  defaultBudgetId,
  defaultToothIndex,
  defaultTransactionId,
  defaultDentistId,
  defaultServiceValue,
  defaultDescription,
  contextLabel,
}: NfseUploadDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateNfse();

  const todayIso = new Date().toISOString().slice(0, 10);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso);
  const [serviceValue, setServiceValue] = useState<string>('');
  const [taxValue, setTaxValue] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setInvoiceNumber('');
      setIssueDate(todayIso);
      setServiceValue(defaultServiceValue ? defaultServiceValue.toFixed(2) : '');
      setTaxValue('');
      setDescription(defaultDescription || '');
      setNotes('');
      setXmlFile(null);
      setPdfFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      toast({ variant: 'destructive', title: 'Número da nota é obrigatório' });
      return;
    }
    const value = parseFloat(serviceValue);
    if (isNaN(value) || value <= 0) {
      toast({ variant: 'destructive', title: 'Valor do serviço inválido' });
      return;
    }
    if (!xmlFile && !pdfFile) {
      toast({ variant: 'destructive', title: 'Anexe pelo menos o XML ou o PDF da nota' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        invoice_number: invoiceNumber.trim(),
        issue_date: issueDate,
        service_value: value,
        tax_value: taxValue ? parseFloat(taxValue) : 0,
        service_description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        patient_id: defaultPatientId ?? undefined,
        budget_id: defaultBudgetId ?? undefined,
        tooth_index: defaultToothIndex ?? undefined,
        financial_transaction_id: defaultTransactionId ?? undefined,
        dentist_id: defaultDentistId ?? undefined,
        xml_file: xmlFile,
        pdf_file: pdfFile,
      });

      toast({ title: 'Nota fiscal anexada' });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message?.includes('duplicate') || err?.code === '23505'
        ? 'Já existe uma nota com esse número nesta clínica'
        : err?.message || 'Erro ao salvar nota fiscal';
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    }
  };

  const FileSlot = ({
    label,
    accept,
    file,
    onChange,
  }: {
    label: string;
    accept: string;
    file: File | null;
    onChange: (f: File | null) => void;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {file ? (
        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
          <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1 truncate text-emerald-700">{file.name}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-50 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Anexar {label}</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Nota Fiscal (NFS-e)</DialogTitle>
          <DialogDescription>
            {contextLabel
              ? `Vinculada a: ${contextLabel}`
              : 'Anexe o XML e/ou o PDF da nota emitida na prefeitura.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="invoice-number" className="text-xs">Nº da Nota *</Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: 000123"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="issue-date" className="text-xs">Data de Emissão *</Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="service-value" className="text-xs">Valor do Serviço (R$) *</Label>
              <Input
                id="service-value"
                type="number"
                step="0.01"
                value={serviceValue}
                onChange={(e) => setServiceValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax-value" className="text-xs">Impostos Retidos (R$)</Label>
              <Input
                id="tax-value"
                type="number"
                step="0.01"
                value={taxValue}
                onChange={(e) => setTaxValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Descrição do Serviço</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Restauração de resina composta"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FileSlot label="XML" accept=".xml,application/xml,text/xml" file={xmlFile} onChange={setXmlFile} />
            <FileSlot label="PDF" accept=".pdf,application/pdf" file={pdfFile} onChange={setPdfFile} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Anexar Nota
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
