import { useMemo } from 'react';
import {
    TrendingUp,
    CreditCard,
    PieChart,
    AlertTriangle,
    Lightbulb,
    Settings2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/components/financial/types';
import { formatCurrency } from '@/utils/formatters';

interface FinancialInsightsProps {
    transactions: Transaction[];
    onSettingsClick?: () => void;
}

interface Insight {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    type: 'success' | 'warning' | 'info' | 'tip';
}

export function FinancialInsights({ transactions, onSettingsClick }: FinancialInsightsProps) {
    const insights = useMemo(() => {
        const result: Insight[] = [];

        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        if (income.length === 0 && expenses.length === 0) {
            return result;
        }

        const totalGrossIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalNetIncome = income.reduce((sum, t) => sum + (t.net_amount || t.amount), 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        // 1. Picos de receita - identifica maior transação
        if (income.length > 0) {
            const highestTransaction = income.reduce((max, t) =>
                t.amount > max.amount ? t : max, income[0]);

            const averageTicket = totalGrossIncome / income.length;

            if (highestTransaction.amount > averageTicket * 1.5) {
                const patientName = highestTransaction.patients?.name || 'Um paciente';
                result.push({
                    id: 'peak',
                    icon: <TrendingUp className="h-4 w-4 text-green-600" />,
                    title: 'Picos de receita',
                    description: `Seu maior ticket foi ${formatCurrency(highestTransaction.amount)} (${patientName}). Considere criar pacotes de procedimentos similares.`,
                    type: 'success'
                });
            }
        }

        // 2. Formas de pagamento - analisa distribuição
        if (income.length >= 3) {
            const byMethod: Record<string, number> = {};
            income.forEach(t => {
                const pm = (t as any).payment_method;
                let method = 'outros';
                if (pm === 'credit') method = 'Cartão de Crédito';
                else if (pm === 'debit') method = 'Cartão de Débito';
                else if (pm === 'pix') method = 'Pix';
                else if (pm === 'cash') method = 'Dinheiro';
                else if (pm) method = pm;
                byMethod[method] = (byMethod[method] || 0) + t.amount;
            });

            const total = Object.values(byMethod).reduce((a, b) => a + b, 0);
            const entries = Object.entries(byMethod).sort((a, b) => b[1] - a[1]);

            if (entries.length > 0 && total > 0) {
                const [topMethod, topAmount] = entries[0];
                const percentage = Math.round((topAmount / total) * 100);

                if (percentage >= 50) {
                    const hasLowerFeeOption = topMethod.includes('Cartão');
                    result.push({
                        id: 'payment',
                        icon: <CreditCard className="h-4 w-4 text-blue-600" />,
                        title: 'Formas de pagamento',
                        description: `${topMethod} concentra ${percentage}% das entradas.${hasLowerFeeOption ? ' Considere incentivar Pix para reduzir taxas.' : ''}`,
                        type: 'info'
                    });
                }
            }
        }

        // 3. Revisão de despesas
        if (expenses.length > 0) {
            const expensesByCategory: Record<string, number> = {};
            expenses.forEach(t => {
                const cat = t.category || 'Outros';
                expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
            });

            const entries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
            if (entries.length > 0) {
                const [topCategory, topAmount] = entries[0];
                result.push({
                    id: 'expenses',
                    icon: <PieChart className="h-4 w-4 text-orange-600" />,
                    title: 'Revisão de despesas',
                    description: `Despesas com "${topCategory}" somam ${formatCurrency(topAmount)}. Revise se há oportunidades de economia.`,
                    type: 'tip'
                });
            }
        }

        // 4. Margem de lucro
        if (totalGrossIncome > 0) {
            const balance = totalNetIncome - totalExpenses;
            const marginPercentage = Math.round((balance / totalGrossIncome) * 100);

            if (marginPercentage < 30) {
                result.push({
                    id: 'margin',
                    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
                    title: 'Alerta de margem',
                    description: `Sua margem líquida está em ${marginPercentage}%. Considere revisar custos operacionais ou ajustar preços.`,
                    type: 'warning'
                });
            } else if (marginPercentage >= 50) {
                result.push({
                    id: 'margin',
                    icon: <TrendingUp className="h-4 w-4 text-green-600" />,
                    title: 'Margem saudável',
                    description: `Excelente! Sua margem líquida está em ${marginPercentage}%. Continue monitorando para manter esse resultado.`,
                    type: 'success'
                });
            }
        }

        return result;
    }, [transactions]);

    const getInsightStyle = (type: Insight['type']) => {
        switch (type) {
            case 'success':
                return 'border-l-green-500 bg-green-50/50';
            case 'warning':
                return 'border-l-amber-500 bg-amber-50/50';
            case 'info':
                return 'border-l-blue-500 bg-blue-50/50';
            case 'tip':
                return 'border-l-purple-500 bg-purple-50/50';
            default:
                return 'border-l-gray-500 bg-gray-50/50';
        }
    };

    if (insights.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-sm font-medium">Insights</CardTitle>
                        </div>
                    </div>
                    <CardDescription className="text-xs">
                        Dicas baseadas no período selecionado
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Adicione mais transações para ver insights personalizados.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-sm font-medium">Insights</CardTitle>
                    </div>
                    {onSettingsClick && (
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onSettingsClick}>
                            <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
                <CardDescription className="text-xs">
                    Dicas rápidas baseadas no período
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {insights.map((insight) => (
                    <div
                        key={insight.id}
                        className={`p-3 rounded-lg border-l-4 ${getInsightStyle(insight.type)}`}
                    >
                        <div className="flex items-start gap-2">
                            <div className="mt-0.5">{insight.icon}</div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {insight.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

