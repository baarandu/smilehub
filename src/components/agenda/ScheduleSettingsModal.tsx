import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { scheduleSettingsService, type ScheduleSetting } from '@/services/scheduleSettings';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface TimeSlot {
  id: string; // local unique key
  start_time: string;
  end_time: string;
  interval_minutes: number;
}

interface DayConfig {
  day_of_week: number;
  is_active: boolean;
  slots: TimeSlot[];
}

let slotCounter = 0;
function newSlotId() {
  return `slot_${++slotCounter}`;
}

function createDefaultSlot(): TimeSlot {
  return { id: newSlotId(), start_time: '08:00', end_time: '12:00', interval_minutes: 30 };
}

interface ScheduleSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  dentists: { id: string; name: string; specialty: string }[];
}

export function ScheduleSettingsModal({ open, onOpenChange, clinicId, dentists }: ScheduleSettingsModalProps) {
  const [selectedDentist, setSelectedDentist] = useState<string>('');
  const [days, setDays] = useState<DayConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-select first dentist
  useEffect(() => {
    if (open && dentists.length > 0 && !selectedDentist) {
      setSelectedDentist(dentists[0].id);
    }
  }, [open, dentists]);

  // Load settings when dentist changes
  useEffect(() => {
    if (!selectedDentist || !clinicId) return;
    loadSettings();
  }, [selectedDentist, clinicId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await scheduleSettingsService.getByProfessional(clinicId, selectedDentist);

      // Group by day_of_week (multiple slots per day)
      const byDay = new Map<number, ScheduleSetting[]>();
      for (const row of data) {
        const existing = byDay.get(row.day_of_week) || [];
        existing.push(row);
        byDay.set(row.day_of_week, existing);
      }

      const allDays: DayConfig[] = DAYS_OF_WEEK.map(({ value }) => {
        const daySlots = byDay.get(value);
        if (daySlots && daySlots.length > 0) {
          return {
            day_of_week: value,
            is_active: true,
            slots: daySlots.map(s => ({
              id: newSlotId(),
              start_time: s.start_time.slice(0, 5),
              end_time: s.end_time.slice(0, 5),
              interval_minutes: s.interval_minutes,
            })),
          };
        }
        return { day_of_week: value, is_active: false, slots: [] };
      });

      setDays(allDays);
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayOfWeek: number, active: boolean) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        is_active: active,
        slots: active && d.slots.length === 0 ? [createDefaultSlot()] : d.slots,
      };
    }));
  };

  const addSlot = (dayOfWeek: number) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      // Default new slot starts after last slot
      const lastSlot = d.slots[d.slots.length - 1];
      const newSlot: TimeSlot = lastSlot
        ? { id: newSlotId(), start_time: lastSlot.end_time, end_time: '18:00', interval_minutes: lastSlot.interval_minutes }
        : createDefaultSlot();
      return { ...d, slots: [...d.slots, newSlot] };
    }));
  };

  const removeSlot = (dayOfWeek: number, slotId: string) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      const newSlots = d.slots.filter(s => s.id !== slotId);
      return { ...d, slots: newSlots, is_active: newSlots.length > 0 };
    }));
  };

  const updateSlot = (dayOfWeek: number, slotId: string, field: keyof Omit<TimeSlot, 'id'>, value: string | number) => {
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        slots: d.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s),
      };
    }));
  };

  const handleSave = async () => {
    // Flatten all active day slots into the format the service expects
    const allSlots: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[] = [];
    for (const day of days) {
      if (!day.is_active) continue;
      for (const slot of day.slots) {
        allSlots.push({
          day_of_week: day.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          interval_minutes: slot.interval_minutes,
          is_active: true,
        });
      }
    }

    setSaving(true);
    try {
      await scheduleSettingsService.upsert(clinicId, selectedDentist, allSlots);
      toast.success('Horários salvos com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Horários</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Dentist selector */}
          {dentists.length > 1 && (
            <div className="space-y-2">
              <Label>Dentista</Label>
              <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {dentists.length === 1 && (
            <p className="text-sm text-muted-foreground">
              Configurando horários de <strong>{dentists[0].name}</strong>
            </p>
          )}

          {dentists.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-muted-foreground text-sm">
                Nenhum profissional cadastrado.
              </p>
              <p className="text-muted-foreground text-xs">
                Cadastre profissionais na <strong>Secretária IA &rarr; Profissionais</strong> para configurar horários.
              </p>
            </div>
          )}

          {/* Days grid */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : dentists.length > 0 && (
            <div className="space-y-3">
              {days.map((day) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label;
                return (
                  <div key={day.day_of_week} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{dayLabel}</span>
                      <Switch
                        checked={day.is_active}
                        onCheckedChange={(checked) => toggleDay(day.day_of_week, checked)}
                      />
                    </div>

                    {day.is_active && (
                      <div className="space-y-2">
                        {day.slots.map((slot, idx) => (
                          <div key={slot.id} className="flex items-end gap-2">
                            <div className="flex-1 space-y-1">
                              {idx === 0 && <Label className="text-xs text-muted-foreground">Início</Label>}
                              <Input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) => updateSlot(day.day_of_week, slot.id, 'start_time', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              {idx === 0 && <Label className="text-xs text-muted-foreground">Fim</Label>}
                              <Input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) => updateSlot(day.day_of_week, slot.id, 'end_time', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              {idx === 0 && <Label className="text-xs text-muted-foreground">Duração</Label>}
                              <Input
                                type="number"
                                min={5}
                                max={480}
                                step={5}
                                value={slot.interval_minutes}
                                onChange={(e) => updateSlot(day.day_of_week, slot.id, 'interval_minutes', parseInt(e.target.value) || 30)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => removeSlot(day.day_of_week, slot.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border"
                          onClick={() => addSlot(day.day_of_week)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar horário
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {dentists.length > 0 && (
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !selectedDentist}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
