import { useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PeriodType,
  Transaction,
  PeriodSelector,
} from '@/components/financial';
import { IncomeTab } from '@/components/financial/tabs/IncomeTab';
import { ExpensesTab } from '@/components/financial/tabs/ExpensesTab';
import { ClosureTab } from '@/components/financial/tabs/ClosureTab';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';

export default function Financial() {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [date, setDate] = useState(new Date());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let start: Date, end: Date;

      if (periodType === 'daily') {
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
      } else if (periodType === 'weekly') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);

        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (periodType === 'monthly') {
        const year = date.getFullYear();
        const month = date.getMonth();
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        const year = date.getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        end.setHours(23, 59, 59, 999);
      }

      const data = await financialService.getTransactions(start, end);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [date, periodType]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle completo de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/financeiro/configuracoes'}>
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      <PeriodSelector
        periodType={periodType}
        setPeriodType={setPeriodType}
        date={date}
        setDate={setDate}
      />

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="closure">Fechamento</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <IncomeTab transactions={transactions} loading={loading} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab transactions={transactions} loading={loading} />
        </TabsContent>

        <TabsContent value="closure">
          <ClosureTab transactions={transactions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div >
  );
}

