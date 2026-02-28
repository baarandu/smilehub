import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarPlus, CalendarCheck, Loader2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentsService } from '@/services/appointments';
import { orthodonticsService } from '@/services/orthodontics';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { OrthodonticCase } from '@/types/orthodontics';

interface MaintenanceScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orthoCase: OrthodonticCase;
  onSuccess: () => void;
}

export function MaintenanceScheduleDialog({ open, onOpenChange, orthoCase, onSuccess }: MaintenanceScheduleDialogProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const frequencyDays = orthoCase.return_frequency_days || 30;
  const fee = orthoCase.maintenance_fee;

  const defaultDate = useMemo(() => {
    const base = orthoCase.last_session_at
      ? parseISO(orthoCase.last_session_at)
      : new Date();
    return format(addDays(base, frequencyDays), 'yyyy-MM-dd');
  }, [orthoCase.last_session_at, frequencyDays]);

  const [bulkMode, setBulkMode] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [quantity, setQuantity] = useState('6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bulkDates = useMemo(() => {
    const qty = parseInt(quantity) || 1;
    const start = date ? parseISO(date) : new Date();
    return Array.from({ length: qty }, (_, i) => addDays(start, i * frequencyDays));
  }, [date, quantity, frequencyDays]);

  const handleSubmit = async () => {
    if (!date || !time) return;
    setIsSubmitting(true);

    try {
      const dates = bulkMode ? bulkDates : [parseISO(date)];
      let earliestDate: string | null = null;

      for (const d of dates) {
        const formattedDate = format(d, 'yyyy-MM-dd');
        await appointmentsService.create({
          patient_id: orthoCase.patient_id,
          clinic_id: clinicId,
          date: formattedDate,
          time,
          status: 'scheduled',
          procedure_name: 'Manutenção Ortodôntica',
          notes: 'Manutenção ortodôntica',
        });
        if (!earliestDate || formattedDate < earliestDate) {
          earliestDate = formattedDate;
        }
      }

      if (earliestDate) {
        await orthodonticsService.updateCase(orthoCase.id, {
          next_appointment_at: earliestDate,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
      onSuccess();

      toast({
        title: `${dates.length} manutenção(ões) agendada(s)`,
        description: bulkMode
          ? `De ${format(dates[0], "dd/MM/yyyy")} a ${format(dates[dates.length - 1], "dd/MM/yyyy")}`
          : `Para ${format(dates[0], "dd/MM/yyyy")} às ${time}`,
      });

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao agendar manutenção', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Agendar Manutenção
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">{orthoCase.patient_name}</p>
            <p className="text-muted-foreground">
              Retorno a cada <strong>{frequencyDays} dias</strong>
              {fee ? ` · R$ ${fee.toFixed(2).replace('.', ',')}/sessão` : ''}
            </p>
            {orthoCase.last_session_at && (
              <p className="text-muted-foreground">
                Última sessão: {format(parseISO(orthoCase.last_session_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Toggle mode */}
          <div className="flex items-center gap-3">
            <Switch checked={bulkMode} onCheckedChange={setBulkMode} id="bulk-mode" />
            <Label htmlFor="bulk-mode" className="text-sm cursor-pointer">
              {bulkMode ? 'Múltiplas consultas' : 'Próxima consulta'}
            </Label>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maint-date" className="text-sm">
                {bulkMode ? 'Data da primeira' : 'Data'}
              </Label>
              <Input
                id="maint-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maint-time" className="text-sm">Horário</Label>
              <Input
                id="maint-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk quantity */}
          {bulkMode && (
            <div className="space-y-1.5">
              <Label className="text-sm">Quantidade de consultas</Label>
              <Select value={quantity} onValueChange={setQuantity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} consultas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bulk preview */}
          {bulkMode && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Datas previstas:</p>
              <div className="grid grid-cols-2 gap-1">
                {bulkDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{format(d, "dd/MM/yyyy (EEE)", { locale: ptBR })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={isSubmitting || !date || !time} className="w-full">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CalendarPlus className="w-4 h-4 mr-2" />
            )}
            {bulkMode ? `Agendar ${quantity} Manutenções` : 'Agendar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
