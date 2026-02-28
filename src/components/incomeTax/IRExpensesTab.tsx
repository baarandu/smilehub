import { useState, useMemo } from 'react';
import { Edit2, CheckCircle, XCircle, Filter, FileText, AlertCircle, Receipt } from 'lucide-react';
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
import { formatCurrency } from '@/utils/formatters';

interface IRExpensesTabProps {
  transactions: TransactionWithIR[];
  loading: boolean;
  onTransactionUpdated: () => void;
  globalSearch?: string;
}

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function IRExpensesTab({
  transactions,
  loading,
  onTransactionUpdated,
  globalSearch = '',
}: IRExpensesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deductibleFilter, setDeductibleFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithIR | null>(null);
  const [showFilterSection, setShowFilterSection] = useState(false);

  // Combine local and global search
  const effectiveSearch = globalSearch || searchTerm;

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
      // Search filter (combines local and global search)
      const searchLower = effectiveSearch.toLowerCase();
      const matchesSearch =
        !effectiveSearch ||
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
  }, [transactions, effectiveSearch, deductibleFilter, categoryFilter]);

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
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Despesas</p>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summaries.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Despesas Dedutíveis</p>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summaries.deductibleTotal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Livro Caixa</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${summaries.incompleteCount > 0 ? 'bg-rose-50' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dados Incompletos</p>
                <div className={`text-2xl font-bold ${summaries.incompleteCount > 0 ? 'text-[#a03f3d]' : 'text-green-600'}`}>
                  {summaries.incompleteCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summaries.incompleteCount > 0 ? 'Despesas dedutíveis para revisar' : 'Tudo em ordem'}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${summaries.incompleteCount > 0 ? 'bg-rose-100' : 'bg-green-100'}`}>
                <AlertCircle className={`h-5 w-5 ${summaries.incompleteCount > 0 ? 'text-[#a03f3d]' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base">Despesas (Livro Caixa)</CardTitle>
              <p className="text-sm text-muted-foreground">Organização com foco em revisão rápida</p>
            </div>
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
