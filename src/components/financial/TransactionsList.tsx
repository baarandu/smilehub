import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Transaction, FilterType, formatCurrency } from './types';

interface TransactionsListProps {
  transactions: Transaction[];
  filter: FilterType;
  onClearFilter: () => void;
}

export function TransactionsList({ transactions, filter, onClearFilter }: TransactionsListProps) {
  const getTitle = () => {
    if (filter === 'income') return 'Receitas';
    if (filter === 'expense') return 'Despesas';
    return 'Todas as Transações';
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground">{getTitle()}</h3>
          <p className="text-sm text-muted-foreground">{transactions.length} transação(ões)</p>
        </div>
        {filter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={onClearFilter}>
            Mostrar todas
          </Button>
        )}
      </div>
      <div className="divide-y divide-border">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma transação neste período
          </div>
        ) : (
          transactions.map((transaction, index) => (
            <TransactionItem key={transaction.id} transaction={transaction} index={index} />
          ))
        )}
      </div>
    </div>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
}

function TransactionItem({ transaction, index }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div
      className="p-4 hover:bg-muted/30 transition-colors animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isIncome ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            {isIncome ? (
              <ArrowUpRight className="w-5 h-5 text-success" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">
              {transaction.category} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <span className={`font-semibold ${isIncome ? 'text-success' : 'text-destructive'}`}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </span>
      </div>
    </div>
  );
}

