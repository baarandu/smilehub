import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import type { ProsthesisOrder, ProsthesisChecklist } from '@/types/prosthesis';
import { getChecklistItems, isChecklistComplete } from '@/utils/prosthesis';

interface ChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProsthesisOrder | null;
  onSaveAndSend: (checklist: ProsthesisChecklist) => void;
  isSaving?: boolean;
}

export function ChecklistDialog({ open, onOpenChange, order, onSaveAndSend, isSaving }: ChecklistDialogProps) {
  const [checklist, setChecklist] = useState<ProsthesisChecklist>({
    checklist_color_defined: false,
    checklist_material_defined: false,
    checklist_cementation_defined: false,
    checklist_photos_attached: false,
    checklist_observations_added: false,
  });

  useEffect(() => {
    if (order) {
      setChecklist({
        checklist_color_defined: order.checklist_color_defined,
        checklist_material_defined: order.checklist_material_defined,
        checklist_cementation_defined: order.checklist_cementation_defined,
        checklist_photos_attached: order.checklist_photos_attached,
        checklist_observations_added: order.checklist_observations_added,
      });
    }
  }, [order]);

  const items = getChecklistItems(checklist);
  const complete = isChecklistComplete(checklist);

  const toggleItem = (key: keyof ProsthesisChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Checklist de Envio</DialogTitle>
          <DialogDescription>
            Todos os itens devem ser confirmados antes de enviar ao laboratório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {items.map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <Checkbox
                id={item.key}
                checked={checklist[item.key]}
                onCheckedChange={() => toggleItem(item.key)}
              />
              <Label htmlFor={item.key} className="text-sm cursor-pointer">
                {item.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSaveAndSend(checklist)}
            disabled={!complete || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar e Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
