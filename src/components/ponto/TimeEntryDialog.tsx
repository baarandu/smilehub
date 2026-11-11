import { useEffect, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTimeEntry, useUpdateTimeEntry } from '@/hooks/useTimeEntries';
import { timeEntriesService } from '@/services/timeEntries';
import { getWeekStart, hasOverlap, type TimeEntry } from '@/utils/timesheet';
import { useClinic } from '@/contexts/ClinicContext';

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  entry?: TimeEntry | null;
  defaultDate?: Date;
}

/** Admin: cria ou edita um registro (data, entrada, saída opcional). */
export function TimeEntryDialog({ open, onOpenChange, userId, entry, defaultDate }: TimeEntryDialogProps) {
  const { clinicId } = useClinic();
  const create = useCreateTimeEntry();
  const update = useUpdateTimeEntry();

  const [date, setDate] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [nextDay, setNextDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Reseta o formulário só quando o dialog abre (ou troca de registro) — não a cada
  // re-render da página, que acontece a cada minuto e apagaria o que foi digitado.
  const defaultDateRef = useRef(defaultDate);
  defaultDateRef.current = defaultDate;
  useEffect(() => {
    if (!open) return;
    const defaultDate = defaultDateRef.current;
    setError(null);
    if (entry) {
      const inAt = new Date(entry.clock_in);
      const outAt = entry.clock_out ? new Date(entry.clock_out) : null;
      setDate(format(inAt, 'yyyy-MM-dd'));
      setTimeIn(format(inAt, 'HH:mm'));
      setTimeOut(outAt ? format(outAt, 'HH:mm') : '');
      setNextDay(!!outAt && format(outAt, 'yyyy-MM-dd') !== format(inAt, 'yyyy-MM-dd'));
    } else {
      setDate(format(defaultDate ?? new Date(), 'yyyy-MM-dd'));
      setTimeIn('');
      setTimeOut('');
      setNextDay(false);
    }
  }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setError(null);
    if (!date || !timeIn) return setError('Informe a data e a hora de entrada');

    const clockIn = new Date(`${date}T${timeIn}`);
    let clockOut: Date | null = null;
    if (timeOut) {
      clockOut = new Date(`${date}T${timeOut}`);
      if (nextDay) clockOut = addDays(clockOut, 1);
      if (clockOut <= clockIn) return setError('Saída deve ser depois da entrada');
    }
    if (clockIn > new Date()) return setError('A entrada não pode ser no futuro');

    // Sobreposição: registros desta semana e da anterior (cobre registros que cruzam a virada)
    setChecking(true);
    try {
      const ws = getWeekStart(clockIn);
      const existing = await timeEntriesService.listRange(clinicId!, userId, addDays(ws, -7), addDays(ws, 14));
      if (hasOverlap(existing, { id: entry?.id, clock_in: clockIn, clock_out: clockOut })) {
        return setError('Este horário se sobrepõe a outro registro');
      }
    } catch (e) {
      return setError(e instanceof Error ? e.message : 'Erro ao validar registro');
    } finally {
      setChecking(false);
    }

    const payload = { clock_in: clockIn.toISOString(), clock_out: clockOut ? clockOut.toISOString() : null };
    if (entry) {
      await update.mutateAsync({ id: entry.id, ...payload }).then(() => onOpenChange(false)).catch(() => {});
    } else {
      await create.mutateAsync({ user_id: userId, ...payload }).then(() => onOpenChange(false)).catch(() => {});
    }
  };

  const saving = checking || create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar registro' : 'Adicionar registro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="te-date">Data</Label>
            <Input id="te-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="te-in">Entrada</Label>
              <Input id="te-in" type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="te-out">Saída</Label>
              <Input id="te-out" type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Deixe a saída em branco para manter o ponto aberto.</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={nextDay} onCheckedChange={v => setNextDay(v === true)} disabled={!timeOut} />
            Saída no dia seguinte
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
