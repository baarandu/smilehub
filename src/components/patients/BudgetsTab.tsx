import { Calculator, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface BudgetsTabProps {
    patientId: string;
}

export function BudgetsTab({ patientId }: BudgetsTabProps) {
    const { toast } = useToast();

    const handleAddBudget = () => {
        toast({
            title: "Em breve",
            description: "Adicionar orçamento em desenvolvimento",
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">Orçamentos</CardTitle>
                <Button onClick={handleAddBudget} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Adicionar</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Calculator className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Nenhum orçamento registrado</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Funcionalidade em desenvolvimento</p>
                </div>
            </CardContent>
        </Card>
    );
}
