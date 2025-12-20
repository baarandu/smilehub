import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterType, formatCurrency } from './types';

interface FinancialStatsCardsProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  filter: FilterType;
  onFilterClick: (type: FilterType) => void;
}

export function FinancialStatsCards({
  totalIncome,
  totalExpenses,
  balance,
  filter,
  onFilterClick,
}: FinancialStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Income Card */}
      <div 
        onClick={() => onFilterClick('income')}
        className={cn(
          "bg-card rounded-xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
          filter === 'income' 
            ? "border-success shadow-md ring-2 ring-success/20" 
            : "border-border hover:border-success/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Receitas</p>
            <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
        </div>
        {filter === 'income' && (
          <p className="text-xs text-success mt-2 font-medium">✓ Filtro ativo</p>
        )}
      </div>

      {/* Expense Card */}
      <div 
        onClick={() => onFilterClick('expense')}
        className={cn(
          "bg-card rounded-xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
          filter === 'expense' 
            ? "border-destructive shadow-md ring-2 ring-destructive/20" 
            : "border-border hover:border-destructive/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold text-destructive mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-destructive" />
          </div>
        </div>
        {filter === 'expense' && (
          <p className="text-xs text-destructive mt-2 font-medium">✓ Filtro ativo</p>
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Lucro líquido do período</p>
      </div>
    </div>
  );
}




