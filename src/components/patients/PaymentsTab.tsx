import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaymentsTab() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Pagamentos Realizados</h3>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Registrar Pagamento
        </Button>
      </div>
      
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>Nenhum pagamento registrado</p>
        <p className="text-sm mt-2">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  );
}

