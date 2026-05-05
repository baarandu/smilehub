import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, ExternalLink, UserPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { usePatientSearch } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { scheduleSettingsService, computeWeekIndex, type ScheduleSetting, type ProfessionalScheduleCycle } from '@/services/scheduleSettings';
import { LocationsModal } from '@/components/profile/LocationsModal';
import type { NewAppointmentDialogProps } from './types';

interface SlotInfo {
  time: string;
  locationIds: string[]; // possible locations for this slot
}

function generateTimeSlots(
  settings: ScheduleSetting[],
  dayOfWeek: number,
  weekIndex: number,
  bookedTimes: string[],
): SlotInfo[] {
  const daySettings = settings.filter(
    s => s.day_of_week === dayOfWeek && s.is_active && (s.week_index ?? 0) === weekIndex,
  );
  if (daySettings.length === 0) return [];

  const slotsMap = new Map<string, Set<string>>(); // time -> set of locationIds
  for (const setting of daySettings) {
    const [startH, startM] = setting.start_time.slice(0, 5).split(':').map(Number);
    const [endH, endM] = setting.end_time.slice(0, 5).split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const interval = setting.interval_minutes;

    const ids = setting.location_ids ? setting.location_ids.split(',') : setting.location_id ? [setting.location_id] : [];

    for (let m = startMinutes; m + interval <= endMinutes; m += interval) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const time = `${hh}:${mm}`;
      if (!slotsMap.has(time)) slotsMap.set(time, new Set());
      const set = slotsMap.get(time)!;
      ids.forEach(id => set.add(id));
    }
  }

  return [...slotsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([t]) => !bookedTimes.includes(t))
    .map(([time, locSet]) => ({ time, locationIds: [...locSet] }));
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  locations,
  selectedDate,
  onAdd,
  onUpdate,
  appointmentToEdit,
  onRequestCreatePatient,
  onRequestAddDentist,
  preSelectedPatient,
  dentists = [],
  showDentistField = false,
  isAdmin = false,
  clinicId,
  existingAppointments = [],
}: NewAppointmentDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    date: '',
    time: '',
    location: '',
    notes: '',
    procedure: '',
    dentistId: '',
    isWalkIn: false,
  });
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebounce(patientSearch, 300);
  const { data: filteredPatients = [], isFetching: isSearchingPatients } = usePatientSearch(debouncedPatientSearch);
  const [showPatientList, setShowPatientList] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSetting[]>([]);
  const [scheduleCycle, setScheduleCycle] = useState<ProfessionalScheduleCycle | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Auto-fill location when the clinic has a single location (selector is hidden in that case)
  useEffect(() => {
    if (locations.length === 1 && !form.location) {
      setForm(prev => ({ ...prev, location: locations[0].name }));
    }
  }, [locations]);

  useEffect(() => {
    if (open) {
      if (appointmentToEdit) {
        setForm({
          patientId: appointmentToEdit.patient_id,
          patientName: appointmentToEdit.patients?.name || '',
          date: appointmentToEdit.date || '',
          time: appointmentToEdit.time?.slice(0, 5) || '',
          location: appointmentToEdit.location || '',
          notes: appointmentToEdit.notes || '',
          procedure: appointmentToEdit.procedure_name || '',
          dentistId: appointmentToEdit.dentist_id || '',
          isWalkIn: !!(appointmentToEdit as any).is_walk_in,
        });
      } else {
        const defaultDentistId = dentists.length === 1 ? dentists[0].id : '';
        setForm({ patientId: '', patientName: '', date: '', time: '', location: '', notes: '', procedure: '', dentistId: defaultDentistId, isWalkIn: false });
      }
      setPatientSearch('');
      setShowPatientList(false);
    }
  }, [open, appointmentToEdit]);

  // Handle pre-selected patient from patient creation flow
  useEffect(() => {
    if (preSelectedPatient) {
      setForm(prev => ({
        ...prev,
        patientId: preSelectedPatient.id,
        patientName: preSelectedPatient.name
      }));
      setPatientSearch('');
      setShowPatientList(false);
    }
  }, [preSelectedPatient]);

  // Load schedule settings + cycle metadata when dentist changes
  useEffect(() => {
    const dentistId = form.dentistId || (dentists.length === 1 ? dentists[0].id : '');
    if (!dentistId || !clinicId) {
      setScheduleSettings([]);
      setScheduleCycle(null);
      return;
    }
    setLoadingSlots(true);
    let cancelled = false;
    Promise.all([
      scheduleSettingsService.getByProfessional(clinicId, dentistId),
      scheduleSettingsService.getCycle(clinicId, dentistId),
    ])
      .then(([settings, cycle]) => {
        if (cancelled) return;
        setScheduleSettings(settings);
        setScheduleCycle(cycle);
      })
      .catch(() => {
        if (cancelled) return;
        setScheduleSettings([]);
        setScheduleCycle(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [form.dentistId, clinicId, dentists]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showPatientList) {
        setShowPatientList(false);
      }
    };

    if (showPatientList) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPatientList]);

  // Compute available slots
  const dateForSlots = appointmentToEdit ? form.date : selectedDate;
  const dateObj = dateForSlots ? new Date(dateForSlots + 'T00:00:00') : null;
  const dayOfWeek = dateObj ? dateObj.getDay() : -1;

  const cycleLength = scheduleCycle?.cycle_length ?? 1;
  const cycleStart = scheduleCycle?.cycle_start_date ?? dateForSlots ?? '';
  const weekIndex = dateForSlots && cycleStart
    ? computeWeekIndex(dateForSlots, cycleStart, cycleLength)
    : 0;

  const activeDentistId = form.dentistId || (dentists.length === 1 ? dentists[0].id : '');
  const bookedTimes = existingAppointments
    .filter(a => (!activeDentistId || !a.dentist_id || a.dentist_id === activeDentistId) && a.id !== appointmentToEdit?.id)
    .map(a => a.time?.slice(0, 5) || '');

  const availableSlots = dayOfWeek >= 0
    ? generateTimeSlots(scheduleSettings, dayOfWeek, weekIndex, bookedTimes)
    : [];

  const hasScheduleForDay = scheduleSettings.some(
    s => s.day_of_week === dayOfWeek && s.is_active && (s.week_index ?? 0) === weekIndex,
  );
  // True when the dentist DOES work this weekday in some week of the cycle,
  // but not in the current week — lets us show a clearer empty-state message.
  const dayExistsInOtherWeek = cycleLength > 1 && scheduleSettings.some(
    s => s.day_of_week === dayOfWeek && s.is_active && (s.week_index ?? 0) !== weekIndex,
  );

  // Filter locations based on selected time slot's configured locations
  const selectedSlot = form.time ? availableSlots.find(s => s.time === form.time) : null;
  const filteredLocations = selectedSlot && selectedSlot.locationIds.length > 0
    ? locations.filter(l => selectedSlot.locationIds.includes(l.id))
    : locations;

  const handleSelectPatient = (patient: { id: string; name: string }) => {
    setForm({ ...form, patientId: patient.id, patientName: patient.name });
    setPatientSearch('');
    setShowPatientList(false);
  };

  const handleSubmit = () => {
    if (appointmentToEdit && onUpdate) {
      onUpdate(appointmentToEdit.id, form);
    } else {
      onAdd(form);
    }
    setForm({ patientId: '', patientName: '', date: '', time: '', location: '', notes: '', procedure: '', dentistId: '', isWalkIn: false });
    setPatientSearch('');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!appointmentToEdit && (
        <DialogTrigger asChild>
          <Button className="h-10 px-5 rounded-lg shadow-md gap-2">
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{appointmentToEdit ? 'Editar Consulta' : 'Agendar Consulta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Paciente *</Label>
              {appointmentToEdit && form.patientId && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[#a03f3d]"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/pacientes/${form.patientId}`);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Ver perfil
                </Button>
              )}
            </div>
            {form.patientId ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="flex-1 font-medium">{form.patientName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setForm({ ...form, patientId: '', patientName: '' })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o nome do paciente..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientList(true);
                    }}
                    onFocus={() => setShowPatientList(true)}
                    className="pl-9"
                  />
                </div>
                {showPatientList && filteredPatients.length > 0 && (
                  <div
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {filteredPatients.slice(0, 10).map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <div className="font-medium">{patient.name}</div>
                        {patient.phone && (
                          <div className="text-sm text-muted-foreground">{patient.phone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showPatientList && debouncedPatientSearch.length >= 2 && !isSearchingPatients && filteredPatients.length === 0 && (
                  <div
                    className="absolute z-50 w-full mt-1 bg-amber-50 border border-amber-200 rounded-md shadow-lg p-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-amber-800 mb-3">Paciente "{patientSearch}" não encontrado.</p>
                    {onRequestCreatePatient && (
                      <Button
                        size="sm"
                        onClick={() => onRequestCreatePatient(patientSearch)}
                        className="w-full"
                      >
                        + Cadastrar Novo Paciente
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Dentist selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dentista *</Label>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={() => onRequestAddDentist?.()}
                >
                  <UserPlus className="w-3 h-3" />
                  Novo
                </Button>
              )}
            </div>
            {dentists.length > 0 ? (
              <Select
                value={form.dentistId}
                onValueChange={(v) => setForm({ ...form, dentistId: v, time: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                {isAdmin
                  ? 'Nenhum dentista na equipe. Clique em "Novo" para adicionar.'
                  : 'Nenhum dentista na equipe. Solicite ao administrador para adicionar.'}
              </p>
            )}
          </div>
          {appointmentToEdit && (
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })}
              />
            </div>
          )}

          {/* Time selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horário *</Label>
              {activeDentistId && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isWalkIn: !form.isWalkIn, time: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  {form.isWalkIn ? 'Usar horário regular' : 'Encaixe (urgência)'}
                </button>
              )}
            </div>
            {form.isWalkIn ? (
              <div className="space-y-1.5">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Horário fora da grade regular do dentista. Vale só para esta consulta.
                </p>
              </div>
            ) : loadingSlots ? (
              <p className="text-xs text-muted-foreground py-2">Carregando horários...</p>
            ) : !activeDentistId ? (
              <p className="text-xs text-muted-foreground py-2">Selecione um dentista para ver os horários disponíveis.</p>
            ) : hasScheduleForDay && availableSlots.length > 0 ? (
              <Select
                value={form.time}
                onValueChange={(v) => {
                  const slot = availableSlots.find(s => s.time === v);
                  // Auto-fill location from slot's configured locations
                  const slotLocationNames = slot?.locationIds
                    .map(id => locations.find(l => l.id === id)?.name)
                    .filter(Boolean) || [];
                  const locationName = slotLocationNames.length === 1
                    ? slotLocationNames[0]!
                    : form.location;
                  setForm({ ...form, time: v, location: locationName });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => {
                    const slotLocationNames = slot.locationIds
                      .map(id => locations.find(l => l.id === id)?.name)
                      .filter(Boolean);
                    return (
                      <SelectItem key={slot.time} value={slot.time}>
                        <span>{slot.time}</span>
                        {slotLocationNames.length > 0 && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            — {slotLocationNames.join(' / ')}
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : hasScheduleForDay && availableSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Todos os horários estão ocupados neste dia.</p>
            ) : dayExistsInOtherWeek ? (
              <p className="text-xs text-muted-foreground py-2">Este dia não está incluído na semana atual do ciclo deste dentista.</p>
            ) : activeDentistId && scheduleSettings.length > 0 ? (
              <p className="text-xs text-muted-foreground py-2">Este dentista não atende neste dia da semana.</p>
            ) : activeDentistId ? (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Nenhum horário configurado para este dentista.</p>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Procedimento</Label>
            <Input
              value={form.procedure}
              onChange={(e) => setForm({ ...form, procedure: e.target.value })}
              placeholder="Ex: Limpeza, Exodontia"
            />
          </div>
          {locations.length !== 1 && (
            <div className="space-y-2">
              <Label>Local de Atendimento</Label>
              {locations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-sm text-amber-800">Nenhum local de atendimento cadastrado.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setShowLocationsModal(true)}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Cadastrar Local
                  </Button>
                </div>
              ) : selectedSlot && selectedSlot.locationIds.length > 0 && filteredLocations.length === 1 ? (
                <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg">
                  <span className="text-sm">{filteredLocations[0].name}</span>
                </div>
              ) : (
                <Select
                  value={form.location}
                  onValueChange={(v) => setForm({ ...form, location: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: Consulta de rotina"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              {appointmentToEdit ? 'Salvar' : 'Agendar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <LocationsModal
      open={showLocationsModal}
      onOpenChange={(isOpen) => {
        setShowLocationsModal(isOpen);
        if (!isOpen) {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        }
      }}
    />
    </>
  );
}
