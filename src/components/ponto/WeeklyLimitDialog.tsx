import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetWeeklyLimit, useWeeklyLimit } from '@/hooks/useTimeEntries';

interface WeeklyLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyLimitDialog({ open, onOpenChange }: WeeklyLimitDialogProps) {
  const limit = useWeeklyLimit();
  const save = useSetWeeklyLimit();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(String(limit.data ?? 44));
      setError(null);
    }
  }, [open, limit.data]);

  const handleSave = () => {
    const hours = Number(value.replace(',', '.'));
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      return setError('Informe um valor entre 1 e 168 horas');
    }
    save.mutate(hours, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Jornada semanal</DialogTitle>
          <DialogDescription>Limite de horas usado no controle de ponto para calcular o excedente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="weekly-limit">Horas por semana</Label>
          <Input
            id="weekly-limit"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={1}
            max={168}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A PEC do fim da 6x1 reduz para 42h e depois 40h. Atualize quando a nova regra entrar em vigor.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || limit.isLoading}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
