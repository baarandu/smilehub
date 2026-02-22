import { useState, useEffect } from 'react';
import { Plus, Search, X, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
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
import { scheduleSettingsService, type ScheduleSetting } from '@/services/scheduleSettings';
import type { NewAppointmentDialogProps } from './types';

function generateTimeSlots(
  settings: ScheduleSetting[],
  dayOfWeek: number,
  bookedTimes: string[],
): string[] {
  const daySettings = settings.filter(s => s.day_of_week === dayOfWeek && s.is_active);
  if (daySettings.length === 0) return [];

  const slots: string[] = [];
  for (const setting of daySettings) {
    const [startH, startM] = setting.start_time.slice(0, 5).split(':').map(Number);
    const [endH, endM] = setting.end_time.slice(0, 5).split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const interval = setting.interval_minutes;

    for (let m = startMinutes; m + interval <= endMinutes; m += interval) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }

  // Sort and deduplicate
  const unique = [...new Set(slots)].sort();
  // Filter out booked times
  return unique.filter(t => !bookedTimes.includes(t));
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  patients,
  locations,
  selectedDate,
  onAdd,
  onUpdate,
  appointmentToEdit,
  onRequestCreatePatient,
  preSelectedPatient,
  dentists = [],
  showDentistField = false,
  clinicId,
  existingAppointments = [],
}: NewAppointmentDialogProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    date: '',
    time: '',
    location: '',
    notes: '',
    procedure: '',
    dentistId: '',
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSetting[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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
        });
      } else {
        const defaultDentistId = dentists.length === 1 ? dentists[0].id : '';
        setForm({ patientId: '', patientName: '', date: '', time: '', location: '', notes: '', procedure: '', dentistId: defaultDentistId });
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

  // Load schedule settings when dentist changes
  useEffect(() => {
    const dentistId = form.dentistId || (dentists.length === 1 ? dentists[0].id : '');
    if (!dentistId || !clinicId) {
      setScheduleSettings([]);
      return;
    }
    setLoadingSlots(true);
    scheduleSettingsService.getByProfessional(clinicId, dentistId)
      .then(data => setScheduleSettings(data))
      .catch(() => setScheduleSettings([]))
      .finally(() => setLoadingSlots(false));
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

  const activeDentistId = form.dentistId || (dentists.length === 1 ? dentists[0].id : '');
  const bookedTimes = existingAppointments
    .filter(a => (!activeDentistId || a.dentist_id === activeDentistId) && a.id !== appointmentToEdit?.id)
    .map(a => a.time?.slice(0, 5) || '');

  const availableSlots = dayOfWeek >= 0
    ? generateTimeSlots(scheduleSettings, dayOfWeek, bookedTimes)
    : [];

  const hasScheduleForDay = scheduleSettings.some(s => s.day_of_week === dayOfWeek && s.is_active);

  const filteredPatients = patientSearch.length > 0
    ? patients.filter(p =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.includes(patientSearch)
    )
    : [];

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
    setForm({ patientId: '', patientName: '', date: '', time: '', location: '', notes: '', procedure: '', dentistId: '' });
    setPatientSearch('');
  };

  return (
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
                {showPatientList && patientSearch.length > 0 && filteredPatients.length === 0 && (
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
          {showDentistField && dentists.length > 1 && (
            <div className="space-y-2">
              <Label>Dentista *</Label>
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
            </div>
          )}
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
            <Label>Horário *</Label>
            {loadingSlots ? (
              <p className="text-xs text-muted-foreground py-2">Carregando horários...</p>
            ) : hasScheduleForDay && availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm({ ...form, time: slot })}
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                      form.time === slot
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {slot}
                  </button>
                ))}
              </div>
            ) : hasScheduleForDay && availableSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Todos os horários estão ocupados neste dia.</p>
            ) : (
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Procedimento</Label>
            <Input
              value={form.procedure}
              onChange={(e) => setForm({ ...form, procedure: e.target.value })}
              placeholder="Ex: Limpeza, Exodontia"
            />
          </div>
          <div className="space-y-2">
            <Label>Local de Atendimento</Label>
            <Select
              value={form.location}
              onValueChange={(v) => setForm({ ...form, location: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.name}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
  );
}
