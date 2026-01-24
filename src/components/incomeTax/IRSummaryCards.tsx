import { User, Building, AlertCircle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IRSummaryCardsProps {
  pfTotal: number;
  pjTotal: number;
  irrfTotal?: number;
  expensesTotal?: number;
  incompleteCount?: number;
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
}: IRSummaryCardsProps) {
  const total = pfTotal + pjTotal;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* PF Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita PF</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#a03f3d]">
            {formatCurrency(pfTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${((pfTotal / total) * 100).toFixed(1)}% do total` : 'Sem receitas'}
          </p>
        </CardContent>
      </Card>

      {/* PJ Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita PJ</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(pjTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${((pjTotal / total) * 100).toFixed(1)}% do total` : 'Sem receitas'}
          </p>
        </CardContent>
      </Card>

      {/* IRRF or Expenses */}
      {irrfTotal > 0 || expensesTotal === 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IRRF Retido</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(irrfTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Retido na fonte por PJ
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Dedutiveis</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(expensesTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Livro Caixa
            </p>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Data Warning */}
      <Card className={incompleteCount > 0 ? 'border-amber-200 bg-amber-50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dados Incompletos</CardTitle>
          <AlertCircle className={`h-4 w-4 ${incompleteCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${incompleteCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {incompleteCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {incompleteCount > 0 ? 'Transacoes para revisar' : 'Tudo em ordem'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
