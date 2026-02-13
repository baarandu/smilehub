import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentsService } from '@/services/appointments';
import { locationsService, type Location } from '@/services/locations';
import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import type { AppointmentWithPatient, Patient, PatientFormData } from '@/types/database';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Plus, Settings, X, Bell, Calendar as CalendarIcon, Clock, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { useDebounce } from '@/hooks/useDebounce';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewAppointmentDialog } from '@/components/agenda';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  scheduled: { label: 'Agendado', color: 'bg-primary/10 text-primary border-primary/20' },
  confirmed: { label: 'Confirmado', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  completed: { label: 'Compareceu', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  no_show: { label: 'Não compareceu', color: 'bg-red-50 text-red-600 border-red-200' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  rescheduled: { label: 'Remarcado', color: 'bg-purple-50 text-purple-600 border-purple-200' },
} as const;

export default function Agenda() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [datesWithAppointments, setDatesWithAppointments] = useState<Date[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentWithPatient | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<AppointmentWithPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // React Query hooks for patients
  const { data: patients = [] } = usePatients();
  const createPatientMutation = useCreatePatient();

  // Patient creation flow
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [preSelectedPatient, setPreSelectedPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({ name: '', phone: '' });
  useEffect(() => {
    loadDayAppointments();
  }, [selectedDate]);

  useEffect(() => {
    loadMonthDates();
  }, [calendarMonth]);

  useEffect(() => {
    loadLocations();
  }, []);

  // Global search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await appointmentsService.search(debouncedSearch);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error searching appointments:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDayAppointments = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await appointmentsService.getByDate(dateStr);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthDates = async () => {
    try {
      const start = startOfMonth(calendarMonth);
      const end = endOfMonth(calendarMonth);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const dates = await appointmentsService.getDatesWithAppointments(startStr, endStr);
      setDatesWithAppointments(dates.map(d => new Date(d + 'T00:00:00')));
    } catch (error) {
      console.error('Error loading month dates:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await locationsService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Filter appointments by status only (search is now global)
  const filteredAppointments = appointments
    .filter(apt => statusFilter === 'all' || apt.status === statusFilter)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleStatusChange = async (appointmentId: string, status: AppointmentWithPatient['status']) => {
    try {
      await appointmentsService.updateStatus(appointmentId, status);
      setAppointments(
        appointments.map((a) =>
          a.id === appointmentId ? { ...a, status } : a
        )
      );
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAddAppointment = async (data: { patientId: string; date: string; time: string; location: string; notes: string; procedure: string }) => {
    if (!data.patientId || !data.time) {
      toast.error('Selecione um paciente e horário');
      return;
    }

    // Check for time conflict
    const timeConflict = appointments.find(
      apt => apt.time?.slice(0, 5) === data.time.slice(0, 5)
    );
    if (timeConflict) {
      toast.error(`Já existe uma consulta agendada às ${data.time.slice(0, 5)} com ${timeConflict.patients?.name || 'outro paciente'}`);
      return;
    }

    try {
      await appointmentsService.create({
        patient_id: data.patientId,
        date: dateString,
        time: data.time,
        status: 'scheduled',
        location: data.location || null,
        notes: data.notes || null,
        procedure_name: data.procedure || null,
      });

      setDialogOpen(false);
      toast.success('Consulta agendada com sucesso!');
      loadDayAppointments();
      loadMonthDates();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao agendar consulta');
    }
  };

  const handleUpdateAppointment = async (id: string, data: { patientId: string; date: string; time: string; location: string; notes: string; procedure: string }) => {
    // Check for time conflict (exclude current appointment)
    const timeConflict = appointments.find(
      apt => apt.id !== id && apt.time?.slice(0, 5) === data.time.slice(0, 5)
    );
    if (timeConflict) {
      toast.error(`Já existe uma consulta agendada às ${data.time.slice(0, 5)} com ${timeConflict.patients?.name || 'outro paciente'}`);
      return;
    }

    try {
      const newDate = data.date || dateString;
      await appointmentsService.update(id, {
        patient_id: data.patientId,
        date: newDate,
        time: data.time,
        location: data.location || null,
        notes: data.notes || null,
        procedure_name: data.procedure || null,
      });

      setDialogOpen(false);
      setEditingAppointment(null);
      toast.success('Consulta atualizada com sucesso!');
      loadDayAppointments();
      loadMonthDates();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar consulta');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleDayChange = (days: number) => {
    setSelectedDate(addDays(selectedDate, days));
  };

  const handleSearchResultClick = (appointment: AppointmentWithPatient) => {
    const appointmentDate = parseISO(appointment.date);
    setSelectedDate(appointmentDate);
    setCalendarMonth(appointmentDate);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleEditAppointment = (appointment: AppointmentWithPatient) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  const handleDeleteAppointment = (appointment: AppointmentWithPatient) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
      await appointmentsService.delete(appointmentToDelete.id);
      toast.success('Consulta excluída com sucesso!');
      loadDayAppointments();
      loadMonthDates();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir consulta');
    } finally {
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  // Patient creation flow handlers
  const handleRequestCreatePatient = (prefillName: string) => {
    setDialogOpen(false);
    setPatientForm({ name: prefillName, phone: '' });
    setPatientDialogOpen(true);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleSavePatient = async () => {
    if (!patientForm.name || !patientForm.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    createPatientMutation.mutate(
      { name: patientForm.name, phone: patientForm.phone } as PatientFormData,
      {
        onSuccess: (newPatient) => {
          setPreSelectedPatient(newPatient);
          setPatientDialogOpen(false);
          setPatientForm({ name: '', phone: '' });
          setDialogOpen(true);
          toast.success(`Paciente "${newPatient.name}" cadastrado!`);
        },
        onError: (error) => {
          console.error('Error creating patient:', error);
          toast.error('Erro ao cadastrar paciente');
        },
      }
    );
  };

  const hasAppointments = (date: Date) => {
    return datesWithAppointments.some(
      d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente, procedimento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              className="pl-9 w-[280px] bg-card"
            />

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-elevated z-50 max-h-[400px] overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Buscando...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum resultado encontrado
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                      {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full px-3 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {result.patients?.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {format(parseISO(result.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span>-</span>
                            <span>{result.time?.slice(0, 5)}</span>
                            {result.procedure_name && (
                              <>
                                <span>-</span>
                                <span className="truncate">{result.procedure_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full border",
                            STATUS_CONFIG[result.status]?.color
                          )}>
                            {STATUS_CONFIG[result.status]?.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Consultation */}
          <Button
            variant="outline"
            onClick={() => navigate('/consulta-voz')}
            className="gap-2 hidden sm:flex"
          >
            <Mic className="w-4 h-4" />
            Consulta por Voz
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/consulta-voz')}
            className="sm:hidden h-10 w-10"
            title="Consulta por Voz"
          >
            <Mic className="w-4 h-4" />
          </Button>

          {/* Day Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => handleDayChange(-1)} className="h-10 w-10">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleDayChange(1)} className="h-10 w-10">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* New Appointment Button */}
          <NewAppointmentDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingAppointment(null);
                setPreSelectedPatient(null);
              }
            }}
            patients={patients}
            locations={locations}
            selectedDate={dateString}
            onAdd={handleAddAppointment}
            onUpdate={handleUpdateAppointment}
            appointmentToEdit={editingAppointment}
            onRequestCreatePatient={handleRequestCreatePatient}
            preSelectedPatient={preSelectedPatient}
          />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left Column - Calendar */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border h-fit">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Calendário</h2>
              <p className="text-sm text-muted-foreground">Selecione um dia para ver a agenda.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={ptBR}
            className="w-full"
            classNames={{
              months: "flex flex-col w-full",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 pb-3 relative items-center",
              caption_label: "text-sm font-semibold",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-accent rounded-md transition-colors",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full justify-between mb-1",
              head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs text-center py-1.5 uppercase",
              row: "flex w-full justify-between mt-0.5",
              cell: "flex-1 text-center text-sm p-0.5 relative [&:has([aria-selected])]:bg-accent/50 rounded-md",
              day: "h-9 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors flex items-center justify-center cursor-pointer text-sm",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
              day_today: "bg-accent text-accent-foreground font-semibold",
              day_outside: "text-muted-foreground opacity-40",
              day_disabled: "text-muted-foreground opacity-50",
            }}
            components={{
              DayContent: ({ date }) => (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  {hasAppointments(date) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  )}
                </div>
              ),
            }}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Confirmado
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Agendado
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Não compareceu
            </div>
          </div>
        </div>

        {/* Right Column - Appointments List */}
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          {/* List Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Consultas do dia</h2>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "d MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {filteredAppointments.length} atendimento{filteredAppointments.length !== 1 ? 's' : ''}
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Filtros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="scheduled">Agendados</SelectItem>
                    <SelectItem value="confirmed">Confirmados</SelectItem>
                    <SelectItem value="completed">Compareceu</SelectItem>
                    <SelectItem value="no_show">Não compareceu</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div className="p-5">
            {loading ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {statusFilter !== 'all'
                    ? 'Nenhuma consulta encontrada com o filtro aplicado'
                    : 'Nenhuma consulta agendada para este dia'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Time */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {appointment.time?.slice(0, 5)}
                        </span>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/pacientes/${appointment.patient_id}`)}
                    >
                      <p className="font-semibold text-foreground truncate">
                        {appointment.patients?.name}
                      </p>
                      {appointment.procedure_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {appointment.procedure_name}
                        </p>
                      )}
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                          {appointment.notes}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      <Select
                        value={appointment.status}
                        onValueChange={(v) => handleStatusChange(appointment.id, v as AppointmentWithPatient['status'])}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[140px] h-8 text-xs border font-medium",
                            STATUS_CONFIG[appointment.status]?.color
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Compareceu</SelectItem>
                          <SelectItem value="no_show">Não Compareceu</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                          <SelectItem value="rescheduled">Remarcado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Consulta por Voz"
                        onClick={() => navigate(`/consulta-voz/${appointment.id}`)}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleEditAppointment(appointment)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Bell className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Consulta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a consulta de{' '}
              <strong>{appointmentToDelete?.patients?.name}</strong> às{' '}
              <strong>{appointmentToDelete?.time?.slice(0, 5)}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Patient Creation Dialog */}
      <AlertDialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cadastrar Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Cadastro rápido de paciente. Você poderá completar o perfil depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                placeholder="Nome do paciente"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: formatPhone(e.target.value) })}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPatientDialogOpen(false);
              setPatientForm({ name: '', phone: '' });
              // Reopen appointment dialog
              setDialogOpen(true);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSavePatient} disabled={createPatientMutation.isPending}>
              {createPatientMutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
