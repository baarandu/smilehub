import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileCheck2, FileWarning, FileX2, Upload, Send, Package, Loader2,
  CalendarClock, CheckCircle2, AlertTriangle, Building2, CreditCard,
  Receipt, TrendingUp, Wallet, FileText, Trash2, ExternalLink, RotateCcw,
} from 'lucide-react';
import {
  useAccountantChecklist,
  useAccountantFiles,
  useUploadAccountantFile,
  useDeleteAccountantFile,
  useMarkSubmissionSent,
  useRevertSubmissionToDraft,
} from '@/hooks/useAccountantChecklist';
import { accountantChecklistService } from '@/services/accountantChecklist';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { formatMoney } from '@/utils/budgetUtils';
import type {
  ChecklistData, ChecklistItemStatus, SubmissionFile, SubmissionFileType,
} from '@/types/accountantChecklist';

interface Props {
  year: number;
  month: number; // 0-based to match Financial.tsx
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function AccountantChecklistTab({ year, month }: Props) {
  const m = month + 1; // RPC uses 1-based
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const { data: checklist, isLoading } = useAccountantChecklist(year, m);
  const { data: files = [] } = useAccountantFiles(year, m);
  const uploadMutation = useUploadAccountantFile();
  const deleteFileMutation = useDeleteAccountantFile();
  const sendMutation = useMarkSubmissionSent();
  const revertMutation = useRevertSubmissionToDraft();

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Deadline: dia 03 do mês seguinte
  const deadline = useMemo(() => {
    const d = new Date(year, m, 3); // m é 1-based, então month+1 → próximo mês
    return d;
  }, [year, m]);

  const deadlineInfo = useMemo(() => {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isPast = diffMs < 0;
    return { date: deadline, daysUntil: diffDays, isPast };
  }, [deadline]);

  const items = useMemo(() => buildChecklistItems(checklist, files), [checklist, files]);

  const completedCount = items.filter((i) => i.status === 'complete' || i.status === 'not_applicable').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const isSent = checklist?.submission?.status === 'sent';

  const handleUpload = async (fileType: SubmissionFileType, file: File | null) => {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({ year, month: m, fileType, file });
      toast({ title: 'Arquivo enviado', description: file.name });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha no upload' });
    }
  };

  const handleDeleteFile = async (file: SubmissionFile) => {
    const ok = await confirm({
      title: 'Remover arquivo?',
      description: `Remover "${file.file_name}" desta submissão?`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteFileMutation.mutateAsync({ id: file.id, year, month: m });
    toast({ title: 'Arquivo removido' });
  };

  const handleOpenFile = async (path: string) => {
    try {
      const url = await accountantChecklistService.getSignedUrl(path);
      window.open(url, '_blank');
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível abrir' });
    }
  };

  const handleDownloadBundle = async () => {
    try {
      setDownloading(true);
      const blob = await accountantChecklistService.downloadFullBundle(year, m);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contador_${year}_${String(m).padStart(2, '0')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Pacote gerado' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao gerar pacote' });
    } finally {
      setDownloading(false);
    }
  };

  const handleRevert = async () => {
    const ok = await confirm({
      title: 'Voltar para rascunho?',
      description: 'Você poderá editar/anexar arquivos e enviar novamente.',
      confirmLabel: 'Voltar para rascunho',
    });
    if (!ok) return;
    await revertMutation.mutateAsync({ year, month: m });
    toast({ title: 'Submissão revertida para rascunho' });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Carregando checklist...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com progresso + deadline */}
      <Card className={isSent ? 'border-emerald-200 bg-emerald-50/30' : ''}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  Checklist de {MONTHS_PT[month]} {year}
                </h3>
                {isSent && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enviado ao contador
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {completedCount} de {totalCount} itens prontos · Prazo: dia 03/{String(m + 1).padStart(2, '0')}/{year}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isSent ? (
                <>
                  <Button onClick={handleDownloadBundle} disabled={downloading} variant="outline">
                    {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                    Baixar pacote
                  </Button>
                  <Button
                    onClick={() => setSendDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Marcar como enviado
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleDownloadBundle} disabled={downloading} variant="outline">
                    {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                    Baixar pacote
                  </Button>
                  <Button variant="ghost" onClick={handleRevert} className="text-slate-500">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reverter para rascunho
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Deadline banner */}
          {!isSent && (
            <DeadlineBanner deadlineInfo={deadlineInfo} />
          )}
        </CardContent>
      </Card>

      {/* Lista de itens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <ChecklistItemCard
            key={item.key}
            item={item}
            files={files.filter((f) => item.acceptedFileTypes?.includes(f.file_type))}
            onUpload={(file) => item.acceptedFileTypes?.[0] && handleUpload(item.acceptedFileTypes[0], file)}
            onUploadType={(type, file) => handleUpload(type, file)}
            onDeleteFile={handleDeleteFile}
            onOpenFile={handleOpenFile}
            uploading={uploadMutation.isPending}
            disabled={isSent}
          />
        ))}
      </div>

      <SendDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        onConfirm={async ({ email, notes }) => {
          try {
            await sendMutation.mutateAsync({ year, month: m, recipient_email: email, notes });
            toast({ title: 'Submissão marcada como enviada', description: 'Lembre de enviar o pacote por e-mail ou pela pasta compartilhada.' });
            setSendDialogOpen(false);
          } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao marcar como enviado' });
          }
        }}
        loading={sendMutation.isPending}
      />

      {ConfirmDialog}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  Icon: typeof FileText;
  status: ChecklistItemStatus;
  statusLabel: string;
  detail: string;
  acceptedFileTypes?: SubmissionFileType[]; // null = auto-derived, no upload
  acceptedMimeTypes?: string;
  uploadHint?: string;
}

function buildChecklistItems(
  data: ChecklistData | undefined,
  files: SubmissionFile[],
): ChecklistItem[] {
  if (!data) return [];

  const { items } = data;

  return [
    {
      key: 'nfse',
      title: 'Notas Fiscais (NFS-e)',
      description: 'XML e PDF de todas as NFS-e emitidas no mês.',
      Icon: FileCheck2,
      status: items.nfse.status,
      statusLabel: statusLabel(items.nfse.status),
      detail:
        items.nfse.count === 0
          ? 'Nenhuma NFS-e anexada'
          : `${items.nfse.count} nota(s) anexada(s)` +
            (items.nfse.payments_without_nfse > 0
              ? ` · ⚠️ ${items.nfse.payments_without_nfse} pagamento(s) sem nota`
              : ''),
    },
    {
      key: 'income',
      title: 'Receitas e Produção',
      description: 'Lançamentos de receita com identificação por dentista.',
      Icon: TrendingUp,
      status: items.income.status,
      statusLabel: statusLabel(items.income.status),
      detail:
        items.income.count === 0
          ? 'Nenhuma receita lançada'
          : `${items.income.count} lançamento(s) · R$ ${formatMoney(items.income.total)} · ${items.income.dentists_with_revenue} dentista(s)`,
    },
    {
      key: 'expenses',
      title: 'Despesas',
      description: 'Notas e recibos de aluguel, energia, materiais, etc.',
      Icon: Receipt,
      status: items.expenses.status,
      statusLabel: statusLabel(items.expenses.status),
      detail:
        items.expenses.count === 0
          ? 'Nenhuma despesa lançada'
          : `${items.expenses.count} lançamento(s) · R$ ${formatMoney(items.expenses.total)}`,
    },
    {
      key: 'prolabore',
      title: 'Pró-labore',
      description: 'Retiradas mensais dos sócios (alimenta o Fator R).',
      Icon: Wallet,
      status: items.prolabore.status,
      statusLabel: statusLabel(items.prolabore.status),
      detail:
        items.prolabore.paid === 0 && items.prolabore.planned === 0
          ? 'Nenhum pró-labore registrado'
          : `${items.prolabore.paid} pago(s) · ${items.prolabore.planned} planejado(s)`,
    },
    {
      key: 'card_machine',
      title: 'Maquininha de Cartão',
      description: 'Relatório de vendas e extrato de repasses.',
      Icon: CreditCard,
      status: items.card_machine.status,
      statusLabel:
        items.card_machine.status === 'not_applicable'
          ? 'Não se aplica'
          : statusLabel(items.card_machine.status),
      detail:
        items.card_machine.transactions === 0
          ? 'Sem transações via maquininha neste mês'
          : `${items.card_machine.transactions} transação(ões) · ${items.card_machine.report_uploaded} relatório(s) anexado(s)`,
      acceptedFileTypes: ['card_machine_report'],
      acceptedMimeTypes: '.pdf,.csv,.xlsx,.xls',
      uploadHint: 'PDF, CSV ou Excel',
    },
    {
      key: 'bank_statement',
      title: 'Extratos Bancários',
      description: 'PDF e OFX de todas as contas do consultório.',
      Icon: Building2,
      status: items.bank_statement.status,
      statusLabel: statusLabel(items.bank_statement.status),
      detail: `${items.bank_statement.pdf_count} PDF · ${items.bank_statement.ofx_count} OFX`,
      acceptedFileTypes: ['bank_statement_pdf', 'bank_statement_ofx'],
      uploadHint: 'Anexe os dois formatos',
    },
  ];
}

function statusLabel(s: ChecklistItemStatus): string {
  switch (s) {
    case 'complete': return 'Pronto';
    case 'incomplete': return 'Incompleto';
    case 'empty': return 'Pendente';
    case 'not_applicable': return 'N/A';
  }
}

function StatusBadge({ status }: { status: ChecklistItemStatus }) {
  const cfg = {
    complete: { cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2, label: 'Pronto' },
    incomplete: { cls: 'bg-amber-100 text-amber-700', Icon: FileWarning, label: 'Incompleto' },
    empty: { cls: 'bg-slate-100 text-slate-600', Icon: FileX2, label: 'Pendente' },
    not_applicable: { cls: 'bg-slate-50 text-slate-400', Icon: FileX2, label: 'N/A' },
  }[status];
  const Icon = cfg.Icon;
  return (
    <Badge className={`text-[10px] h-5 gap-1 ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function ChecklistItemCard({
  item,
  files,
  onUpload,
  onUploadType,
  onDeleteFile,
  onOpenFile,
  uploading,
  disabled,
}: {
  item: ChecklistItem;
  files: SubmissionFile[];
  onUpload: (file: File | null) => void;
  onUploadType: (type: SubmissionFileType, file: File) => void;
  onDeleteFile: (file: SubmissionFile) => void;
  onOpenFile: (path: string) => void;
  uploading: boolean;
  disabled: boolean;
}) {
  const Icon = item.Icon;
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUpload = !!item.acceptedFileTypes?.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-sm">{item.title}</CardTitle>
          </div>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-xs text-slate-500">{item.description}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <p className="text-xs text-slate-600 font-medium">{item.detail}</p>

        {hasUpload && item.acceptedFileTypes && (
          <>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 p-1.5 bg-slate-50 rounded text-xs"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="flex-1 truncate text-slate-700">{f.file_name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {fileTypeShortLabel(f.file_type)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Abrir"
                      onClick={() => onOpenFile(f.file_url)}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                        title="Remover"
                        onClick={() => onDeleteFile(f)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!disabled && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.acceptedFileTypes.map((type) => (
                  <label key={type} className="inline-flex">
                    <Button variant="outline" size="sm" className="h-7 text-xs cursor-pointer pointer-events-none">
                      <Upload className="w-3 h-3 mr-1" />
                      {uploadButtonLabel(type)}
                    </Button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept={fileTypeAccept(type)}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadType(type, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ))}
                {uploading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function uploadButtonLabel(type: SubmissionFileType): string {
  switch (type) {
    case 'bank_statement_pdf': return 'Anexar extrato PDF';
    case 'bank_statement_ofx': return 'Anexar extrato OFX';
    case 'card_machine_report': return 'Anexar relatório';
    case 'expense_receipt': return 'Anexar recibo';
    case 'other': return 'Anexar arquivo';
  }
}

function fileTypeShortLabel(type: SubmissionFileType): string {
  switch (type) {
    case 'bank_statement_pdf': return 'PDF';
    case 'bank_statement_ofx': return 'OFX';
    case 'card_machine_report': return 'Maquin.';
    case 'expense_receipt': return 'Recibo';
    case 'other': return 'Outro';
  }
}

function fileTypeAccept(type: SubmissionFileType): string {
  switch (type) {
    case 'bank_statement_pdf': return '.pdf,application/pdf';
    case 'bank_statement_ofx': return '.ofx';
    case 'card_machine_report': return '.pdf,.csv,.xlsx,.xls';
    default: return '*';
  }
}

function DeadlineBanner({
  deadlineInfo,
}: {
  deadlineInfo: { daysUntil: number; isPast: boolean; date: Date };
}) {
  const { daysUntil, isPast } = deadlineInfo;

  if (isPast) {
    return (
      <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
        <AlertTriangle className="w-4 h-4" />
        Prazo de envio passou há {Math.abs(daysUntil)} dia(s). Envie ao contador o quanto antes.
      </div>
    );
  }
  if (daysUntil <= 7) {
    return (
      <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
        <CalendarClock className="w-4 h-4" />
        Faltam {daysUntil} dia(s) para o prazo de envio (dia 03 do mês seguinte).
      </div>
    );
  }
  return null;
}

function SendDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (params: { email?: string; notes?: string }) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como enviado ao contador</DialogTitle>
          <DialogDescription>
            Confirme que você enviou os documentos do mês. Isso bloqueia edições e marca a competência como concluída.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">E-mail do contador (opcional)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contador@email.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Observações (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex: enviei pela pasta compartilhada" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={() => onConfirm({ email: email.trim() || undefined, notes: notes.trim() || undefined })}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar envio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
