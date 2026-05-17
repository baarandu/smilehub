import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download, FileText, AlertCircle, FilePlus2, Trash2, MoreHorizontal,
  FileCheck2, FileX2, Loader2, ExternalLink, Package, Upload, User,
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

interface NfseTabProps {
  year: number;
  month: number; // 0-based for consistency with rest of Financial.tsx
}

export function NfseTab({ year, month }: NfseTabProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Convert to 1-based month for queries
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
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao gerar pacote',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleBatchUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploading(true);
    let ok = 0;
    let fail = 0;

    for (const file of Array.from(files)) {
      try {
        if (!file.name.toLowerCase().endsWith('.xml')) {
          fail++;
          continue;
        }
        const xmlText = await file.text();
        const parsed = parseNfseXml(xmlText);
        if (!parsed) {
          fail++;
          continue;
        }
        await createNfse.mutateAsync({
          invoice_number: parsed.invoice_number,
          issue_date: parsed.issue_date,
          service_value: parsed.service_value,
          tax_value: parsed.tax_value,
          service_description: parsed.description,
          xml_file: file,
        });
        ok++;
      } catch (err) {
        console.error(err);
        fail++;
      }
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
                Pagamentos sem nota
              </p>
              <p className={`text-xl font-bold ${withoutNfse.length > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
                {withoutNfse.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <Button
              variant="outline"
              disabled={batchUploading}
              asChild
            >
              <span className="cursor-pointer">
                {batchUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload em lote (XML)
              </span>
            </Button>
            <input
              type="file"
              accept=".xml,application/xml,text/xml"
              multiple
              className="hidden"
              onChange={(e) => handleBatchUpload(e.target.files)}
            />
          </label>
          <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <FilePlus2 className="w-4 h-4 mr-2" />
            Anexar nota
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
                  <span className="font-medium text-orange-700 ml-3">
                    R$ {formatMoney(Number(p.amount))}
                  </span>
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
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {doc.service_description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      R$ {formatMoney(Number(doc.service_value))}
                    </span>
                    {doc.xml_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Abrir XML"
                        onClick={() => handleOpenFile(doc.xml_url)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    {doc.pdf_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Abrir PDF"
                        onClick={() => handleOpenFile(doc.pdf_url)}
                      >
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

      {uploadOpen && (
        <NfseUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
      {ConfirmDialog}
    </div>
  );
}

/**
 * Best-effort NFS-e XML parser for prefilling fields during batch upload.
 * NFS-e XML format varies by municipality, so this is intentionally
 * lenient — falls back to "" or 0 if a field cannot be found.
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

    const invoiceNumber =
      get('Numero') || get('NumeroNFSe') || get('numero') || `SEM_NUMERO_${Date.now()}`;
    const issueDateRaw = get('DataEmissao') || get('dtEmissao') || get('data_emissao');
    const issueDate = issueDateRaw ? issueDateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const serviceValueRaw = get('ValorServicos') || get('valor_servicos') || get('vlrServicos');
    const taxValueRaw =
      get('ValorIss') || get('valor_iss') || get('vlrIss') || get('ValorIr') || '0';
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
