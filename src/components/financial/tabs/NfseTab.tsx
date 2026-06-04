import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download, FileText, AlertCircle, FilePlus2, Trash2, MoreHorizontal,
  FileCheck2, FileX2, Loader2, ExternalLink, Package, Upload, User,
  Users, ChevronDown, ChevronUp, BarChart2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNfseByMonth, usePaymentsWithoutNfse, useUpdateNfseStatus, useDeleteNfse, useCreateNfse,
} from '@/hooks/useNfseDocuments';
import { NfseUploadDialog } from '@/components/nfse/NfseUploadDialog';
import { NfseStatusBadge } from '@/components/nfse/NfseStatusBadge';
import { nfseDocumentsService } from '@/services/nfseDocuments';
import { formatMoney, formatDisplayDate } from '@/utils/budgetUtils';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useQuery } from '@tanstack/react-query';
import type { NfseReportByDentist } from '@/types/nfseDocument';

interface NfseTabProps {
  year: number;
  month: number; // 0-based for consistency with rest of Financial.tsx
}

// ── SECTION: Relatório por Dentista ──────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function safeCsvFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Dentista';
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function nfseCsvRowsForDentists(dentists: NfseReportByDentist[]) {
  const rows: Array<Array<string | number | null | undefined>> = [
    ['Dentista', 'Paciente', 'Data', 'Valor (R$)', 'Descrição'],
  ];
  for (const dentist of dentists) {
    for (const note of dentist.notes) {
      rows.push([
        dentist.dentist_name,
        note.patient_name || 'Avulso',
        formatDisplayDate(note.issue_date),
        Number(note.service_value).toFixed(2),
        note.description || '',
      ]);
    }
  }
  return rows;
}

function NfseDentistReport({ year, month }: { year: number; month: number }) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [expandedDentist, setExpandedDentist] = useState<string | null>(null);

  const m = viewMode === 'month' ? month + 1 : undefined;

  const { data: report = [], isLoading } = useQuery<NfseReportByDentist[]>({
    queryKey: ['nfse-report-by-dentist', year, m],
    queryFn: () => nfseDocumentsService.getReportByDentist(year, m),
  });

  const grandTotal = useMemo(
    () => report.reduce((s, d) => s + d.total_service_value, 0),
    [report],
  );

  const handleExportCsv = () => {
    if (report.length === 0) { toast({ title: 'Nenhum dado para exportar' }); return; }

    downloadCsv(
      `NFS-e_Por_Dentista_${year}${viewMode === 'month' ? `_${String(month + 1).padStart(2, '0')}` : ''}.csv`,
      nfseCsvRowsForDentists(report),
    );
    toast({ title: 'CSV geral exportado com sucesso!' });
  };

  const handleExportDentistCsv = (dentist: NfseReportByDentist) => {
    if (dentist.notes.length === 0) { toast({ title: 'Nenhum dado para exportar' }); return; }

    const suffix = viewMode === 'month'
      ? `${year}_${String(month + 1).padStart(2, '0')}`
      : `${year}`;
    downloadCsv(
      `NFS-e_${safeCsvFilePart(dentist.dentist_name)}_${suffix}.csv`,
      nfseCsvRowsForDentists([dentist]),
    );
    toast({ title: `CSV de ${dentist.dentist_name} exportado com sucesso!` });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            onClick={() => setViewMode('month')}
            className={viewMode === 'month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-7' : 'h-7'}
          >
            {MONTH_NAMES[month]}
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'year' ? 'default' : 'ghost'}
            onClick={() => setViewMode('year')}
            className={viewMode === 'year' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-7' : 'h-7'}
          >
            Ano {year}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={report.length === 0}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Download className="w-4 h-4" />
          Exportar geral
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Carregando relatório...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && report.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma nota fiscal com dentista vinculado neste período.</p>
          <p className="text-xs mt-1 text-slate-400">
            Notas marcadas como "emitida externamente" nas fichas dos pacientes aparecerão aqui.
          </p>
        </div>
      )}

      {/* Cards by dentist */}
      {!isLoading && report.length > 0 && (
        <div className="space-y-3">
          {report.map((dentist) => {
            const isExpanded = expandedDentist === dentist.dentist_id;
            return (
              <Card key={dentist.dentist_id} className="overflow-hidden">
                {/* Card header — always visible */}
                <button
                  type="button"
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedDentist(isExpanded ? null : dentist.dentist_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">{dentist.dentist_name}</p>
                      <p className="text-xs text-slate-500">
                        {dentist.note_count} nota{dentist.note_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-emerald-700 text-lg">
                      R$ {formatMoney(dentist.total_service_value)}
                    </p>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Expanded note list */}
                {isExpanded && (
                  <div className="border-t animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2.5 bg-slate-50 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportDentistCsv(dentist)}
                        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Download className="w-4 h-4" />
                        Exportar desta dentista
                      </Button>
                    </div>
                    <div className="divide-y">
                      {dentist.notes.map((note) => (
                        <div key={note.id} className="px-4 py-2.5 flex items-center justify-between text-sm bg-slate-50/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{note.patient_name}</p>
                            <p className="text-xs text-slate-500 truncate">{note.description || '—'}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-semibold text-slate-700">R$ {formatMoney(note.service_value)}</p>
                            <p className="text-xs text-slate-400">{formatDisplayDate(note.issue_date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Grand total footer */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-800">
              Total do período — {report.length} dentista{report.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xl font-bold text-emerald-700">R$ {formatMoney(grandTotal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: Lista de Notas do Mês (conteúdo original) ───────────────────────

function NfseMonthList({ year, month }: { year: number; month: number }) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const m = month + 1;
  const { data: docs = [], isLoading } = useNfseByMonth(year, m);
  const { data: withoutNfse = [] } = usePaymentsWithoutNfse(year, m);

  const updateStatus = useUpdateNfseStatus();
  const deleteNfse = useDeleteNfse();
  const createNfse = useCreateNfse();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);

  const totals = useMemo(() => {
    const active = docs.filter((d) => d.status === 'issued');
    return {
      total: docs.length,
      issued: active.length,
      canceled: docs.filter((d) => d.status === 'canceled').length,
      substituted: docs.filter((d) => d.status === 'substituted').length,
      sumIssued: active.reduce((s, d) => s + Number(d.service_value), 0),
    };
  }, [docs]);

  const handleDownloadBundle = async () => {
    try {
      setDownloading(true);
      const blob = await nfseDocumentsService.downloadMonthlyBundle(year, m);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NFSe_${year}_${String(m).padStart(2, '0')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Pacote gerado', description: 'Envie este arquivo ao contador.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao gerar pacote' });
    } finally {
      setDownloading(false);
    }
  };

  const handleExportMonthCsv = () => {
    const activeDocs = docs.filter((doc) => doc.status !== 'canceled');
    if (activeDocs.length === 0) { toast({ title: 'Nenhum dado para exportar' }); return; }

    downloadCsv(
      `NFS-e_Notas_do_Mes_${year}_${String(m).padStart(2, '0')}.csv`,
      [
        ['Dentista', 'Paciente', 'Data', 'Valor (R$)', 'Descrição'],
        ...activeDocs.map((doc) => [
          doc.dentist_name || 'Sem dentista',
          doc.patient_name || 'Avulso',
          formatDisplayDate(doc.issue_date),
          Number(doc.service_value).toFixed(2),
          doc.service_description || '',
        ]),
      ],
    );
    toast({ title: 'Planilha do mês exportada com sucesso!' });
  };

  const handleBatchUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploading(true);
    let ok = 0, fail = 0;
    for (const file of Array.from(files)) {
      try {
        if (!file.name.toLowerCase().endsWith('.xml')) { fail++; continue; }
        const xmlText = await file.text();
        const parsed = parseNfseXml(xmlText);
        if (!parsed) { fail++; continue; }
        await createNfse.mutateAsync({
          invoice_number: parsed.invoice_number,
          issue_date: parsed.issue_date,
          service_value: parsed.service_value,
          tax_value: parsed.tax_value,
          service_description: parsed.description,
          xml_file: file,
        });
        ok++;
      } catch { fail++; }
    }
    setBatchUploading(false);
    toast({
      title: 'Upload em lote concluído',
      description: `${ok} nota(s) anexada(s)${fail > 0 ? `, ${fail} falha(s)` : ''}`,
      variant: fail > 0 && ok === 0 ? 'destructive' : 'default',
    });
  };

  const handleOpenFile = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await nfseDocumentsService.getSignedUrl(path);
      window.open(url, '_blank');
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível abrir o arquivo' });
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: 'Cancelar nota fiscal?',
      description: 'A nota ficará marcada como cancelada e não será incluída no pacote do contador.',
      confirmLabel: 'Cancelar nota',
      variant: 'destructive',
    });
    if (!ok) return;
    await updateStatus.mutateAsync({ id, status: 'canceled' });
    toast({ title: 'Nota marcada como cancelada' });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir nota fiscal?',
      description: 'Esta ação remove permanentemente a nota e seus arquivos. Use apenas para corrigir erros de upload.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteNfse.mutateAsync(id);
    toast({ title: 'Nota excluída' });
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 min-w-[260px]">
          <Card className="bg-emerald-50/60 border-emerald-100">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-600 font-medium">Emitidas</p>
              <p className="text-xl font-bold text-emerald-700">{totals.issued}</p>
              <p className="text-xs text-emerald-600/80">R$ {formatMoney(totals.sumIssued)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50/60 border-red-100">
            <CardContent className="p-3">
              <p className="text-xs text-red-600 font-medium">Canceladas</p>
              <p className="text-xl font-bold text-red-700">{totals.canceled}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50/60 border-amber-100">
            <CardContent className="p-3">
              <p className="text-xs text-amber-600 font-medium">Substituídas</p>
              <p className="text-xl font-bold text-amber-700">{totals.substituted}</p>
            </CardContent>
          </Card>
          <Card className={withoutNfse.length > 0 ? 'bg-orange-50/60 border-orange-200' : 'bg-slate-50 border-slate-100'}>
            <CardContent className="p-3">
              <p className={`text-xs font-medium ${withoutNfse.length > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                Sem nota
              </p>
              <p className={`text-xl font-bold ${withoutNfse.length > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
                {withoutNfse.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <Button variant="outline" disabled={batchUploading} asChild>
              <span className="cursor-pointer">
                {batchUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload em lote (XML)
              </span>
            </Button>
            <input
              type="file" accept=".xml,application/xml,text/xml" multiple className="hidden"
              onChange={(e) => handleBatchUpload(e.target.files)}
            />
          </label>
          <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <FilePlus2 className="w-4 h-4 mr-2" />
            Anexar nota
          </Button>
          <Button
            onClick={handleExportMonthCsv}
            disabled={docs.length === 0}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar planilha do mês
          </Button>
          <Button
            onClick={handleDownloadBundle}
            disabled={downloading || docs.length === 0}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
            Baixar pacote do mês
          </Button>
        </div>
      </div>

      {/* Alert: pagamentos sem nota */}
      {withoutNfse.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-4 h-4" />
              {withoutNfse.length} pagamento(s) sem nota fiscal anexada neste mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-orange-100 max-h-60 overflow-y-auto">
              {withoutNfse.map((p) => (
                <div key={p.transaction_id} className="py-2 flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-800">{p.description}</p>
                    <p className="text-xs text-slate-500">
                      {formatDisplayDate(p.transaction_date)}
                      {p.patient_name ? ` · ${p.patient_name}` : ''}
                    </p>
                  </div>
                  <span className="font-medium text-orange-700 ml-3">R$ {formatMoney(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de notas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notas Fiscais do Mês ({totals.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma nota fiscal anexada neste mês</p>
              <p className="text-xs mt-1">Anexe pelas abas de Pagamento dos pacientes ou pelo botão acima.</p>
            </div>
          ) : (
            <div className="divide-y">
              {docs.map((doc) => (
                <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">#{doc.invoice_number}</span>
                      <NfseStatusBadge status={doc.status} />
                      <span className="text-xs text-slate-500">{formatDisplayDate(doc.issue_date)}</span>
                      {doc.patient_name ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-slate-600">
                          <User className="w-2.5 h-2.5 mr-0.5" />
                          {doc.patient_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200">
                          Avulsa (sem paciente)
                        </Badge>
                      )}
                    </div>
                    {doc.service_description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{doc.service_description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">R$ {formatMoney(Number(doc.service_value))}</span>
                    {doc.xml_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir XML" onClick={() => handleOpenFile(doc.xml_url)}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    {doc.pdf_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir PDF" onClick={() => handleOpenFile(doc.pdf_url)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {doc.status === 'issued' && (
                          <DropdownMenuItem className="text-amber-700" onClick={() => handleCancel(doc.id)}>
                            <FileX2 className="w-4 h-4 mr-2" />
                            Marcar como cancelada
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {uploadOpen && <NfseUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />}
      {ConfirmDialog}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function NfseTab({ year, month }: NfseTabProps) {
  return (
    <Tabs defaultValue="month" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 h-10">
        <TabsTrigger value="month" className="gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
          <FileText className="w-4 h-4" />
          Notas do Mês
        </TabsTrigger>
        <TabsTrigger value="by-dentist" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <BarChart2 className="w-4 h-4" />
          Por Dentista
        </TabsTrigger>
      </TabsList>

      <TabsContent value="month">
        <NfseMonthList year={year} month={month} />
      </TabsContent>

      <TabsContent value="by-dentist">
        <NfseDentistReport year={year} month={month} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * Best-effort NFS-e XML parser for prefilling fields during batch upload.
 */
function parseNfseXml(xml: string): {
  invoice_number: string;
  issue_date: string;
  service_value: number;
  tax_value: number;
  description: string;
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const get = (tag: string): string => {
      const candidates = [tag, tag.toLowerCase(), tag.toUpperCase()];
      for (const t of candidates) {
        const el = doc.getElementsByTagName(t)[0];
        if (el?.textContent) return el.textContent.trim();
      }
      return '';
    };
    const invoiceNumber = get('Numero') || get('NumeroNFSe') || get('numero') || `SEM_NUMERO_${Date.now()}`;
    const issueDateRaw = get('DataEmissao') || get('dtEmissao') || get('data_emissao');
    const issueDate = issueDateRaw ? issueDateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const serviceValueRaw = get('ValorServicos') || get('valor_servicos') || get('vlrServicos');
    const taxValueRaw = get('ValorIss') || get('valor_iss') || get('vlrIss') || get('ValorIr') || '0';
    const description = get('Discriminacao') || get('discriminacao') || get('descricao') || '';
    return {
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      service_value: parseFloat(serviceValueRaw || '0') || 0,
      tax_value: parseFloat(taxValueRaw || '0') || 0,
      description,
    };
  } catch {
    return null;
  }
}
