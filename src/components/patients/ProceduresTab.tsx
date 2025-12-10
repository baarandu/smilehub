import { Hospital, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProceduresTab() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Procedimentos Realizados</h3>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Procedimento
        </Button>
      </div>
      
      <div className="text-center py-12 text-muted-foreground">
        <Hospital className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>Nenhum procedimento registrado</p>
        <p className="text-sm mt-2">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  );
}

