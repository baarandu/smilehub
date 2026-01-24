import { useState } from 'react';
import { FileDown, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ValidationWarnings } from './ValidationWarnings';
import { incomeTaxService } from '@/services/incomeTaxService';
import { generateIRPdf } from '@/utils/incomeTaxPdfGenerator';
import type { IRSummary, IRValidationIssue } from '@/types/incomeTax';
import { toast } from 'sonner';

interface AnnualReportTabProps {
  year: number;
  summary: IRSummary | null;
  loading: boolean;
  onRefresh: () => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function AnnualReportTab({ year, summary, loading, onRefresh }: AnnualReportTabProps) {
  const [validationIssues, setValidationIssues] = useState<IRValidationIssue[]>([]);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const issues = await incomeTaxService.validateTransactionsForYear(year);
      setValidationIssues(issues);
      if (issues.length === 0) {
        toast.success('Todos os dados estao completos');
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erro ao validar dados');
    } finally {
      setValidating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!summary) return;

    setExporting(true);
    try {
      await generateIRPdf(summary);
      toast.success('PDF gerado com sucesso');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = await incomeTaxService.exportToExcel(year);

      // Create CSV content for incomes
      const incomeHeaders = Object.keys(data.incomes[0] || {}).join(';');
      const incomeRows = data.incomes.map((row) => Object.values(row).join(';')).join('\n');
      const incomeCSV = `${incomeHeaders}\n${incomeRows}`;

      // Create CSV content for expenses
      const expenseHeaders = Object.keys(data.expenses[0] || {}).join(';');
      const expenseRows = data.expenses.map((row) => Object.values(row).join(';')).join('\n');
      const expenseCSV = `${expenseHeaders}\n${expenseRows}`;

      // Download incomes CSV
      if (data.incomes.length > 0) {
        const incomeBlob = new Blob(['\ufeff' + incomeCSV], { type: 'text/csv;charset=utf-8;' });
        const incomeUrl = URL.createObjectURL(incomeBlob);
        const incomeLink = document.createElement('a');
        incomeLink.href = incomeUrl;
        incomeLink.download = `receitas-ir-${year}.csv`;
        incomeLink.click();
        URL.revokeObjectURL(incomeUrl);
      }

      // Download expenses CSV
      if (data.expenses.length > 0) {
        const expenseBlob = new Blob(['\ufeff' + expenseCSV], { type: 'text/csv;charset=utf-8;' });
        const expenseUrl = URL.createObjectURL(expenseBlob);
        const expenseLink = document.createElement('a');
        expenseLink.href = expenseUrl;
        expenseLink.download = `despesas-ir-${year}.csv`;
        expenseLink.click();
        URL.revokeObjectURL(expenseUrl);
      }

      toast.success('Arquivos CSV gerados com sucesso');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado disponivel para o ano selecionado.
        </CardContent>
      </Card>
    );
  }

  const hasErrors = validationIssues.some((i) => i.severity === 'error');
  const hasWarnings = validationIssues.some((i) => i.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* Summary Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Anual - {year}</CardTitle>
          <CardDescription>Visao geral para declaracao de Imposto de Renda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Receita PF</p>
              <p className="text-xl font-bold text-teal-600">
                {formatCurrency(summary.total_income_pf)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Receita PJ</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(summary.total_income_pj)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-xl font-bold">{formatCurrency(summary.total_income)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">IRRF Retido</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(summary.total_irrf)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Despesas Dedutiveis</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.total_expenses_deductible)}
              </p>
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm text-teal-700">Resultado Liquido</p>
              <p className="text-xl font-bold text-teal-700">
                {formatCurrency(summary.net_result)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleValidate} disabled={validating} variant="outline">
          {validating ? (
            'Validando...'
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Validar Dados
            </>
          )}
        </Button>
        <Button
          onClick={handleExportPdf}
          disabled={exporting || hasErrors}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Gerar PDF (Dossie IR)
        </Button>
        <Button onClick={handleExportExcel} disabled={exporting} variant="outline">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Validation Warnings */}
      {validationIssues.length > 0 && (
        <ValidationWarnings issues={validationIssues} onRefresh={onRefresh} />
      )}

      {/* Detailed Tables */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="payers_pf">Pagadores PF</TabsTrigger>
          <TabsTrigger value="payers_pj">Fontes PJ</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Receitas por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Receita PF</TableHead>
                    <TableHead className="text-right">Receita PJ</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">IRRF</TableHead>
                    <TableHead className="text-right">Deducoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.monthly.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell>{month.month_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.income_pf)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.income_pj)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(month.income_total)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(month.irrf_total)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(month.expenses_deductible)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.total_income_pf)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.total_income_pj)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.total_income)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {formatCurrency(summary.total_irrf)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(summary.total_expenses_deductible)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payers_pf">
          <Card>
            <CardHeader>
              <CardTitle>Relacao de Pagadores Pessoa Fisica</CardTitle>
              <CardDescription>
                Lista de pacientes e terceiros que efetuaram pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.payers_pf.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum pagador PF encontrado no periodo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Qtd. Transacoes</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.payers_pf.map((payer) => (
                      <TableRow key={payer.cpf}>
                        <TableCell className="font-mono">{payer.cpf}</TableCell>
                        <TableCell>{payer.name}</TableCell>
                        <TableCell className="text-right">{payer.transaction_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payer.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payers_pj">
          <Card>
            <CardHeader>
              <CardTitle>Relacao de Fontes Pagadoras PJ</CardTitle>
              <CardDescription>Convenios e empresas que efetuaram pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.payers_pj.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma fonte PJ encontrada no periodo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Razao Social</TableHead>
                      <TableHead className="text-right">Qtd. Transacoes</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">IRRF Retido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.payers_pj.map((source) => (
                      <TableRow key={source.cnpj}>
                        <TableCell className="font-mono">{source.cnpj}</TableCell>
                        <TableCell>
                          {source.nome_fantasia || source.razao_social}
                        </TableCell>
                        <TableCell className="text-right">{source.transaction_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(source.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {formatCurrency(source.irrf_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Despesas Dedutiveis por Categoria</CardTitle>
              <CardDescription>Resumo do Livro Caixa</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.expenses_by_category.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa dedutivel encontrada no periodo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd. Transacoes</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.expenses_by_category.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell>{cat.category}</TableCell>
                        <TableCell className="text-right">{cat.transaction_count}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(cat.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {summary.expenses_by_category.reduce(
                          (sum, cat) => sum + cat.transaction_count,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(summary.total_expenses_deductible)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
