import { useState, useMemo } from 'react';
import { Edit2, CheckCircle, XCircle, Filter, FileText, AlertCircle } from 'lucide-react';
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
import { ExpenseDataDialog } from './ExpenseDataDialog';
import type { TransactionWithIR } from '@/types/incomeTax';

interface IRExpensesTabProps {
  transactions: TransactionWithIR[];
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

export function IRExpensesTab({
  transactions,
  loading,
  onTransactionUpdated,
}: IRExpensesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deductibleFilter, setDeductibleFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithIR | null>(null);
  const [showFilterSection, setShowFilterSection] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        t.description.toLowerCase().includes(searchLower) ||
        t.supplier_name?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower);

      // Deductible filter
      let matchesDeductible = true;
      if (deductibleFilter === 'yes') {
        matchesDeductible = t.is_deductible === true;
      } else if (deductibleFilter === 'no') {
        matchesDeductible = !t.is_deductible;
      } else if (deductibleFilter === 'incomplete') {
        matchesDeductible = t.is_deductible && (!t.supplier_name || !t.receipt_number);
      }

      // Category filter
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      return matchesSearch && matchesDeductible && matchesCategory;
    });
  }, [transactions, searchTerm, deductibleFilter, categoryFilter]);

  // Calculate summaries
  const summaries = useMemo(() => {
    const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
    const deductibleTotal = transactions
      .filter((t) => t.is_deductible)
      .reduce((sum, t) => sum + t.amount, 0);
    const incompleteCount = transactions.filter(
      (t) => t.is_deductible && (!t.supplier_name || !t.receipt_number)
    ).length;

    return { totalExpenses, deductibleTotal, incompleteCount };
  }, [transactions]);

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summaries.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">No periodo selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Dedutiveis</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaries.deductibleTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Livro Caixa</p>
          </CardContent>
        </Card>

        <Card className={summaries.incompleteCount > 0 ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dados Incompletos</CardTitle>
            <AlertCircle
              className={`h-4 w-4 ${
                summaries.incompleteCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summaries.incompleteCount > 0 ? 'text-amber-600' : 'text-green-600'
              }`}
            >
              {summaries.incompleteCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaries.incompleteCount > 0
                ? 'Despesas dedutiveis para revisar'
                : 'Tudo em ordem'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Despesas (Livro Caixa)</CardTitle>
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
            <div className="flex flex-wrap gap-4 pt-4">
              <Select value={deductibleFilter} onValueChange={setDeductibleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Dedutibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Dedutiveis</SelectItem>
                  <SelectItem value="no">Nao dedutiveis</SelectItem>
                  <SelectItem value="incomplete">Dados incompletos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma despesa encontrada para o periodo selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead>Dedutivel</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const hasIssue =
                      transaction.is_deductible &&
                      (!transaction.supplier_name || !transaction.receipt_number);

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          <div className="flex items-center gap-1">
                            {transaction.supplier_name || (
                              <span className="text-muted-foreground">Nao informado</span>
                            )}
                            {hasIssue && (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.receipt_number ? (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{transaction.receipt_number}</span>
                            </div>
                          ) : transaction.receipt_attachment_url ? (
                            <FileText className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.is_deductible ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction.amount)}
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

      {/* Edit Expense Dialog */}
      <ExpenseDataDialog
        transaction={editingTransaction}
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
