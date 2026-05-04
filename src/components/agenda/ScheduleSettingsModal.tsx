import { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, UserPlus, Calendar } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { scheduleSettingsService, computeWeekIndex, type ScheduleSetting } from '@/services/scheduleSettings';
import type { Location } from '@/services/locations';
import { useOnboarding } from '@/contexts/OnboardingContext';
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

const MAX_CYCLE_LENGTH = 8;

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  location_ids: string[]; // array of location IDs
}

interface DayConfig {
  day_of_week: number;
  is_active: boolean;
  slots: TimeSlot[];
}

type WeekConfig = DayConfig[]; // 7 entries, one per day_of_week

let slotCounter = 0;
function newSlotId() {
  return `slot_${++slotCounter}`;
}

function createDefaultSlot(): TimeSlot {
  return { id: newSlotId(), start_time: '08:00', end_time: '12:00', interval_minutes: 30, location_ids: [] };
}

function emptyWeek(): WeekConfig {
  return DAYS_OF_WEEK.map(({ value }) => ({
    day_of_week: value,
    is_active: false,
    slots: [],
  }));
}

function nextMondayISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const offset = day === 1 ? 0 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ScheduleSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  dentists: { id: string; name: string }[];
  locations: Location[];
  isAdmin?: boolean;
  onRequestAddDentist?: () => void;
}

export function ScheduleSettingsModal({ open, onOpenChange, clinicId, dentists, locations, isAdmin = false, onRequestAddDentist }: ScheduleSettingsModalProps) {
  const { markStepCompleted } = useOnboarding();
  const [selectedDentist, setSelectedDentist] = useState<string>('');
  const [cycle, setCycle] = useState<WeekConfig[]>([emptyWeek()]);
  const [activeWeekTab, setActiveWeekTab] = useState(0);
  const [cycleStartDate, setCycleStartDate] = useState<string>(nextMondayISO());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationMode, setLocationMode] = useState<'single' | 'per-slot'>('single');
  const [globalLocationId, setGlobalLocationId] = useState<string>('');

  const showLocationSection = locations.length > 0;
  const showPerSlotLocation = showLocationSection && locationMode === 'per-slot';
  const cycleLength = cycle.length;
  const isAlternating = cycleLength > 1;
  const activeWeek = cycle[activeWeekTab] || cycle[0];
  const days = activeWeek;

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
      const [data, cycleMeta] = await Promise.all([
        scheduleSettingsService.getByProfessional(clinicId, selectedDentist),
        scheduleSettingsService.getCycle(clinicId, selectedDentist),
      ]);

      // Determine cycle length from data (max across rows) or metadata
      const dataCycleLength = data.reduce(
        (max, s) => Math.max(max, s.cycle_length ?? 1),
        1,
      );
      const effectiveCycleLength = Math.max(
        dataCycleLength,
        cycleMeta?.cycle_length ?? 1,
        1,
      );

      // Bucket rows by week_index
      const newCycle: WeekConfig[] = Array.from({ length: effectiveCycleLength }, (_, weekIdx) => {
        const weekRows = data.filter(s => (s.week_index ?? 0) === weekIdx);
        const byDay = new Map<number, ScheduleSetting[]>();
        for (const row of weekRows) {
          const existing = byDay.get(row.day_of_week) || [];
          existing.push(row);
          byDay.set(row.day_of_week, existing);
        }
        return DAYS_OF_WEEK.map(({ value }) => {
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
                location_ids: s.location_ids ? s.location_ids.split(',') : s.location_id ? [s.location_id] : [],
              })),
            };
          }
          return { day_of_week: value, is_active: false, slots: [] };
        });
      });

      setCycle(newCycle);
      setActiveWeekTab(0);
      setCycleStartDate(cycleMeta?.cycle_start_date || nextMondayISO());

      // Auto-detect location mode across ALL weeks (single mode iff all match)
      if (locations.length > 0) {
        const allActiveSlots = newCycle.flatMap(w => w.flatMap(d => d.is_active ? d.slots : []));
        const slotsWithLocations = allActiveSlots.filter(s => s.location_ids.length > 0);

        if (slotsWithLocations.length > 0) {
          const firstIds = slotsWithLocations[0].location_ids.slice().sort().join(',');
          const allSame = slotsWithLocations.every(s => s.location_ids.slice().sort().join(',') === firstIds);
          if (allSame && slotsWithLocations[0].location_ids.length === 1) {
            setLocationMode('single');
            setGlobalLocationId(slotsWithLocations[0].location_ids[0]);
          } else {
            setLocationMode('per-slot');
            setGlobalLocationId('');
          }
        } else if (locations.length === 1) {
          setLocationMode('single');
          setGlobalLocationId(locations[0].id);
        } else {
          setLocationMode('single');
          setGlobalLocationId('');
        }
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  // Helpers operate on the currently-active week tab
  const updateActiveWeek = (updater: (week: WeekConfig) => WeekConfig) => {
    setCycle(prev => prev.map((w, i) => i === activeWeekTab ? updater(w) : w));
  };

  const toggleDay = (dayOfWeek: number, active: boolean) => {
    updateActiveWeek(week => week.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        is_active: active,
        slots: active && d.slots.length === 0 ? [createDefaultSlot()] : d.slots,
      };
    }));
  };

  const addSlot = (dayOfWeek: number) => {
    updateActiveWeek(week => week.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      const lastSlot = d.slots[d.slots.length - 1];
      const newSlot: TimeSlot = lastSlot
        ? { id: newSlotId(), start_time: lastSlot.end_time, end_time: '18:00', interval_minutes: lastSlot.interval_minutes, location_ids: [...lastSlot.location_ids] }
        : createDefaultSlot();
      return { ...d, slots: [...d.slots, newSlot] };
    }));
  };

  const removeSlot = (dayOfWeek: number, slotId: string) => {
    updateActiveWeek(week => week.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      const newSlots = d.slots.filter(s => s.id !== slotId);
      return { ...d, slots: newSlots, is_active: newSlots.length > 0 };
    }));
  };

  const toggleSlotLocation = (dayOfWeek: number, slotId: string, locationId: string) => {
    updateActiveWeek(week => week.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        slots: d.slots.map(s => {
          if (s.id !== slotId) return s;
          const has = s.location_ids.includes(locationId);
          return { ...s, location_ids: has ? s.location_ids.filter(id => id !== locationId) : [...s.location_ids, locationId] };
        }),
      };
    }));
  };

  const updateSlot = (dayOfWeek: number, slotId: string, field: keyof Omit<TimeSlot, 'id'>, value: string | number) => {
    updateActiveWeek(week => week.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        slots: d.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s),
      };
    }));
  };

  const handleLocationModeChange = (mode: 'single' | 'per-slot') => {
    if (mode === 'single' && locationMode === 'per-slot') {
      // Find the most common location across all weeks' active slots
      const allLocationIds = cycle.flatMap(w =>
        w.flatMap(d => d.is_active ? d.slots.flatMap(s => s.location_ids) : []),
      );
      if (allLocationIds.length > 0) {
        const counts = new Map<string, number>();
        for (const id of allLocationIds) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        let mostCommon = '';
        let maxCount = 0;
        for (const [id, count] of counts) {
          if (count > maxCount) { mostCommon = id; maxCount = count; }
        }
        setGlobalLocationId(mostCommon);
      }
    }
    setLocationMode(mode);
  };

  const handleAlternatingToggle = (alternating: boolean) => {
    if (alternating && cycle.length === 1) {
      // Promote single week to a 2-week cycle (week B starts empty)
      setCycle(prev => [...prev, emptyWeek()]);
      setActiveWeekTab(0);
    } else if (!alternating && cycle.length > 1) {
      // Collapse to first week only — warn if other weeks have content
      const otherWeeksHaveContent = cycle.slice(1).some(w => w.some(d => d.is_active));
      if (otherWeeksHaveContent) {
        const ok = window.confirm(
          'Voltar para semanas iguais vai descartar a configuração das outras semanas. Continuar?',
        );
        if (!ok) return;
      }
      setCycle(prev => [prev[0]]);
      setActiveWeekTab(0);
    }
  };

  const addWeek = () => {
    if (cycle.length >= MAX_CYCLE_LENGTH) return;
    setCycle(prev => [...prev, emptyWeek()]);
    setActiveWeekTab(cycle.length);
  };

  const removeWeek = (idx: number) => {
    if (cycle.length <= 1) return;
    const week = cycle[idx];
    const hasContent = week.some(d => d.is_active);
    if (hasContent) {
      const label = String.fromCharCode(65 + idx);
      const ok = window.confirm(`Remover Semana ${label}? A configuração será descartada.`);
      if (!ok) return;
    }
    setCycle(prev => prev.filter((_, i) => i !== idx));
    setActiveWeekTab(prev => Math.min(prev, cycle.length - 2));
  };

  const handleSave = async () => {
    const allSlots: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[] = [];
    cycle.forEach((week, weekIdx) => {
      for (const day of week) {
        if (!day.is_active) continue;
        for (const slot of day.slots) {
          const effectiveLocationIds = locationMode === 'single' && globalLocationId
            ? [globalLocationId]
            : slot.location_ids;
          allSlots.push({
            day_of_week: day.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            interval_minutes: slot.interval_minutes,
            location_id: effectiveLocationIds[0] || null,
            location_ids: effectiveLocationIds.length > 0 ? effectiveLocationIds.join(',') : null,
            is_active: true,
            week_index: weekIdx,
            cycle_length: cycle.length,
          });
        }
      }
    });

    setSaving(true);
    try {
      await scheduleSettingsService.upsertWithCycle(
        clinicId,
        selectedDentist,
        allSlots,
        { cycle_start_date: cycleStartDate, cycle_length: cycle.length },
      );
      toast.success('Horários salvos com sucesso!');
      markStepCompleted('schedule');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving schedule settings:', error);
      toast.error(`Erro ao salvar: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // Compute today's week-of-cycle for the indicator
  const currentWeekIndex = isAlternating
    ? computeWeekIndex(todayISO(), cycleStartDate, cycle.length)
    : 0;
  const startDateObj = cycleStartDate ? new Date(`${cycleStartDate}T12:00:00Z`) : null;
  const startsOnMonday = startDateObj ? startDateObj.getUTCDay() === 1 : true;

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
              <div className="flex items-center justify-between">
                <Label>Dentista</Label>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => onRequestAddDentist?.()}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Novo
                  </Button>
                )}
              </div>
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Configurando horários de <strong>{dentists[0].name}</strong>
              </p>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onRequestAddDentist?.()}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Novo
                </Button>
              )}
            </div>
          )}

          {dentists.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground text-sm">
                Nenhum dentista na equipe.
              </p>
              {isAdmin ? (
                <Button size="sm" variant="outline" onClick={() => onRequestAddDentist?.()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar dentista na equipe
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Solicite ao administrador para adicionar dentistas na aba Equipe das configurações.
                </p>
              )}
            </div>
          )}

          {/* Cycle (week alternation) */}
          {dentists.length > 0 && !loading && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-sm font-medium">Repetição semanal</Label>
              </div>
              <RadioGroup
                value={isAlternating ? 'alternating' : 'weekly'}
                onValueChange={(v) => handleAlternatingToggle(v === 'alternating')}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weekly" id="cycle-weekly" />
                  <Label htmlFor="cycle-weekly" className="text-sm font-normal cursor-pointer">
                    Repete toda semana
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="alternating" id="cycle-alternating" />
                  <Label htmlFor="cycle-alternating" className="text-sm font-normal cursor-pointer">
                    Alterna entre semanas
                  </Label>
                </div>
              </RadioGroup>

              {isAlternating && (
                <div className="space-y-2 pt-1">
                  <div>
                    <Label className="text-xs text-muted-foreground">Início do ciclo (segunda-feira)</Label>
                    <Input
                      type="date"
                      value={cycleStartDate}
                      onChange={(e) => setCycleStartDate(e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                    {!startsOnMonday && (
                      <p className="text-xs text-amber-600 mt-1">
                        A data escolhida não cai numa segunda — recomendamos ajustar para evitar confusão.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                    Hoje está na <strong>Semana {String.fromCharCode(65 + currentWeekIndex)}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Location mode */}
          {showLocationSection && dentists.length > 0 && !loading && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-sm font-medium">Local de atendimento</Label>
              </div>
              <RadioGroup
                value={locationMode}
                onValueChange={(v) => handleLocationModeChange(v as 'single' | 'per-slot')}
                className="space-y-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="single" id="loc-single" />
                    <Label htmlFor="loc-single" className="text-sm font-normal cursor-pointer">
                      Mesmo local para todos os horários
                    </Label>
                  </div>
                  {locationMode === 'single' && (
                    <div className="ml-6">
                      <Select value={globalLocationId} onValueChange={setGlobalLocationId}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="per-slot" id="loc-per-slot" />
                  <Label htmlFor="loc-per-slot" className="text-sm font-normal cursor-pointer">
                    Configurar por horário
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Week tabs (only when alternating) */}
          {isAlternating && !loading && dentists.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1">
              {cycle.map((_, idx) => {
                const label = `Semana ${String.fromCharCode(65 + idx)}`;
                const isActive = idx === activeWeekTab;
                const isToday = idx === currentWeekIndex;
                return (
                  <div key={idx} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveWeekTab(idx)}
                      className={`text-xs px-3 py-1.5 rounded-t border-b-2 transition-colors ${
                        isActive
                          ? 'border-primary text-primary font-medium'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                      {isToday && <span className="ml-1 text-[10px] opacity-70">(hoje)</span>}
                    </button>
                    {cycle.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWeek(idx)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        title={`Remover Semana ${String.fromCharCode(65 + idx)}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {cycle.length < MAX_CYCLE_LENGTH && (
                <button
                  type="button"
                  onClick={addWeek}
                  className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground"
                  title="Adicionar semana"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
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
                          <div key={slot.id} className="space-y-1.5">
                            <div className="flex items-end gap-2">
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
                            {showPerSlotLocation && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full justify-start font-normal">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {slot.location_ids.length === 0
                                        ? 'Selecionar locais'
                                        : slot.location_ids.map(id => locations.find(l => l.id === id)?.name).filter(Boolean).join(' / ')}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                  <div className="space-y-1">
                                    {locations.map(loc => (
                                      <label key={loc.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                                        <Checkbox
                                          checked={slot.location_ids.includes(loc.id)}
                                          onCheckedChange={() => toggleSlotLocation(day.day_of_week, slot.id, loc.id)}
                                        />
                                        <span className="text-sm">{loc.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
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
