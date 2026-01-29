import { User, Building, AlertCircle, Receipt, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface IRSummaryCardsProps {
  pfTotal: number;
  pjTotal: number;
  irrfTotal?: number;
  expensesTotal?: number;
  incompleteCount?: number;
  onIncompleteClick?: () => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function IRSummaryCards({
  pfTotal,
  pjTotal,
  irrfTotal = 0,
  expensesTotal = 0,
  incompleteCount = 0,
  onIncompleteClick,
}: IRSummaryCardsProps) {
  const total = pfTotal + pjTotal;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* PF Income */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Receita PF</p>
              <div className="text-2xl font-bold text-[#a03f3d]">
                {formatCurrency(pfTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {total > 0 ? `${((pfTotal / total) * 100).toFixed(1)}% do total` : 'Sem receitas'}
              </p>
            </div>
            <div className="p-2 bg-rose-100 rounded-lg">
              <User className="h-5 w-5 text-[#a03f3d]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PJ Income */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Receita PJ</p>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(pjTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {total > 0 ? `${((pjTotal / total) * 100).toFixed(1)}% do total` : 'Sem receitas'}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IRRF or Expenses */}
      {irrfTotal > 0 || expensesTotal === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">IRRF Retido</p>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(irrfTotal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Retido na fonte por PJ
                </p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Despesas Dedutíveis</p>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(expensesTotal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Livro Caixa
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Data Warning */}
      <Card
        className={`border-0 shadow-sm ${incompleteCount > 0 ? 'bg-rose-50' : ''} ${incompleteCount > 0 && onIncompleteClick ? 'cursor-pointer hover:bg-rose-100 transition-colors' : ''}`}
        onClick={incompleteCount > 0 ? onIncompleteClick : undefined}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dados incompletos</p>
              <div className={`text-2xl font-bold ${incompleteCount > 0 ? 'text-[#a03f3d]' : 'text-green-600'}`}>
                {incompleteCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {incompleteCount > 0 ? 'Clique para revisar' : 'Tudo em ordem'}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${incompleteCount > 0 ? 'bg-rose-100' : 'bg-green-100'}`}>
              {incompleteCount > 0 ? (
                <ArrowUpRight className="h-5 w-5 text-[#a03f3d]" />
              ) : (
                <AlertCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
