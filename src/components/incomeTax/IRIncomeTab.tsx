import { useState, useMemo } from 'react';
import { Edit2, User, Building, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PayerDataDialog } from './PayerDataDialog';
import { IRSummaryCards } from './IRSummaryCards';
import type { TransactionWithIR, PJSource } from '@/types/incomeTax';

interface IRIncomeTabProps {
  transactions: TransactionWithIR[];
  pjSources: PJSource[];
  loading: boolean;
  onTransactionUpdated: () => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function IRIncomeTab({
  transactions,
  pjSources,
  loading,
  onTransactionUpdated,
}: IRIncomeTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithIR | null>(null);
  const [showFilterSection, setShowFilterSection] = useState(false);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        t.description.toLowerCase().includes(searchLower) ||
        t.patient?.name?.toLowerCase().includes(searchLower) ||
        t.payer_name?.toLowerCase().includes(searchLower);

      // Payer type filter
      let matchesPayerType = true;
      if (payerTypeFilter === 'pf') {
        matchesPayerType = t.payer_type === 'PF' || (!t.pj_source_id && t.payer_is_patient);
      } else if (payerTypeFilter === 'pj') {
        matchesPayerType = t.payer_type === 'PJ' || !!t.pj_source_id;
      } else if (payerTypeFilter === 'incomplete') {
        const hasMissingData =
          (t.payer_type === 'PF' || t.payer_is_patient) &&
          (!t.payer_cpf && !t.patient?.cpf);
        matchesPayerType = hasMissingData;
      }

      return matchesSearch && matchesPayerType;
    });
  }, [transactions, searchTerm, payerTypeFilter]);

  // Calculate summaries
  const summaries = useMemo(() => {
    const pfTotal = transactions
      .filter((t) => t.payer_type === 'PF' || (!t.pj_source_id && t.payer_is_patient))
      .reduce((sum, t) => sum + t.amount, 0);

    const pjTotal = transactions
      .filter((t) => t.payer_type === 'PJ' || !!t.pj_source_id)
      .reduce((sum, t) => sum + t.amount, 0);

    const irrfTotal = transactions.reduce((sum, t) => sum + (t.irrf_amount || 0), 0);

    const incompleteCount = transactions.filter((t) => {
      if (t.payer_type === 'PF' || t.payer_is_patient) {
        return !t.payer_cpf && !t.patient?.cpf;
      }
      if (t.payer_type === 'PJ') {
        return !t.pj_source_id;
      }
      return false;
    }).length;

    return { pfTotal, pjTotal, irrfTotal, incompleteCount, total: pfTotal + pjTotal };
  }, [transactions]);

  const getPayerInfo = (t: TransactionWithIR) => {
    if (t.pj_source_id && t.pj_source) {
      return {
        type: 'PJ',
        name: t.pj_source.nome_fantasia || t.pj_source.razao_social,
        document: t.pj_source.cnpj,
      };
    }

    if (t.payer_is_patient && t.patient) {
      return {
        type: 'PF',
        name: t.patient.name,
        document: t.patient.cpf || 'CPF não informado',
      };
    }

    return {
      type: t.payer_type || 'PF',
      name: t.payer_name || 'Não informado',
      document: t.payer_cpf || 'Documento não informado',
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <IRSummaryCards
        pfTotal={summaries.pfTotal}
        pjTotal={summaries.pjTotal}
        irrfTotal={summaries.irrfTotal}
        incompleteCount={summaries.incompleteCount}
        onIncompleteClick={() => {
          setPayerTypeFilter('incomplete');
          setShowFilterSection(true);
        }}
      />

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Receitas</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />
              <Button
                variant="outline"
                onClick={() => setShowFilterSection(!showFilterSection)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {showFilterSection && (
            <div className="flex gap-4 pt-4">
              <Select value={payerTypeFilter} onValueChange={setPayerTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de pagador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pf">Pessoa Física</SelectItem>
                  <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                  <SelectItem value="incomplete">Dados incompletos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma receita encontrada para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">IRRF</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const payerInfo = getPayerInfo(transaction);
                    const hasIssue =
                      payerInfo.document === 'CPF não informado' ||
                      payerInfo.document === 'Documento não informado' ||
                      payerInfo.name === 'Não informado';

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payerInfo.type === 'PJ' ? 'default' : 'secondary'}>
                            {payerInfo.type === 'PJ' ? (
                              <Building className="w-3 h-3 mr-1" />
                            ) : (
                              <User className="w-3 h-3 mr-1" />
                            )}
                            {payerInfo.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          <div className="flex items-center gap-1">
                            {payerInfo.name}
                            {hasIssue && (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payerInfo.document}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {transaction.irrf_amount > 0
                            ? formatCurrency(transaction.irrf_amount)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTransaction(transaction)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payer Dialog */}
      <PayerDataDialog
        transaction={editingTransaction}
        pjSources={pjSources}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onSaved={() => {
          setEditingTransaction(null);
          onTransactionUpdated();
        }}
      />
    </div>
  );
}
