import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AnamneseTabProps {
    patientId: string;
}

export function AnamneseTab({ patientId }: AnamneseTabProps) {
    const { toast } = useToast();

    const handleAddAnamnese = () => {
        toast({
            title: "Em breve",
            description: "Adicionar anamnese em desenvolvimento",
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">Anamnese do Paciente</CardTitle>
                <Button onClick={handleAddAnamnese} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Adicionar</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma anamnese registrada</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Funcionalidade em desenvolvimento</p>
                </div>
            </CardContent>
        </Card>
    );
}
