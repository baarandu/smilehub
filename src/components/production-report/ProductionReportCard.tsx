import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Download, AlertCircle } from 'lucide-react';
import { useProductionReport } from '@/hooks/useProductionReport';
import { productionReportService } from '@/services/productionReport';
import { formatMoney } from '@/utils/budgetUtils';
import { useToast } from '@/hooks/use-toast';

interface Props {
  year: number;
  month: number; // 1-based
}

export function ProductionReportCard({ year, month }: Props) {
  const { toast } = useToast();
  const { data: report, isLoading } = useProductionReport(year, month);

  const handleDownload = () => {
    if (!report) return;
    const csv = productionReportService.toCsv(report, year, month);
    const url = URL.createObjectURL(csv);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Producao_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV baixado' });
  };

  if (isLoading || !report) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400 text-sm">
          {isLoading ? 'Carregando relatório...' : 'Sem dados'}
        </CardContent>
      </Card>
    );
  }

  const individualPct = report.total_revenue > 0
    ? (report.individual_revenue / report.total_revenue) * 100
    : 0;
  const clinicPct = report.total_revenue > 0
    ? (report.clinic_revenue / report.total_revenue) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Produção por Sócio
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!report || report.total_revenue === 0}>
            <Download className="w-3 h-3 mr-1" />
            Baixar CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo Individual vs Clínica */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Receitas Individuais</span>
            </div>
            <p className="text-xl font-bold text-emerald-800">R$ {formatMoney(report.individual_revenue)}</p>
            <p className="text-[10px] text-emerald-600/80">{individualPct.toFixed(1)}% do total · produção técnica dos sócios</p>
          </div>
          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/60">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Receitas da Clínica</span>
            </div>
            <p className="text-xl font-bold text-purple-800">R$ {formatMoney(report.clinic_revenue)}</p>
            <p className="text-[10px] text-purple-600/80">{clinicPct.toFixed(1)}% do total · estrutura compartilhada</p>
          </div>
        </div>

        {/* Alerta sobre receita individual sem dentist_id */}
        {report.unassigned_individual_revenue > 0 && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>
              <strong>R$ {formatMoney(report.unassigned_individual_revenue)}</strong> de receita individual sem dentista atribuído.
              Edite as transações em "Receitas" pra atribuir um dentista ou marque como receita da clínica.
            </div>
          </div>
        )}

        {/* Tabela por dentista */}
        {report.dentists.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-medium text-slate-600">Sócio</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-600 text-right">Receita</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-600 text-right">Atendimentos</th>
                  <th className="px-3 py-2 text-xs font-medium text-slate-600 text-right">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.dentists.map((d) => {
                  const pct = report.individual_revenue > 0
                    ? (d.revenue / report.individual_revenue) * 100
                    : 0;
                  return (
                    <tr key={d.dentist_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {d.dentist_name}
                        <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1">
                          {pct.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                        R$ {formatMoney(d.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{d.transaction_count}</td>
                      <td className="px-3 py-2 text-right text-slate-600">R$ {formatMoney(d.avg_ticket)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-sm border rounded-lg">
            Nenhuma produção individual atribuída a sócio neste mês
          </div>
        )}
      </CardContent>
    </Card>
  );
}
