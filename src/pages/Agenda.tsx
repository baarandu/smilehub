import { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentsService } from '@/services/appointments';
import { locationsService, type Location } from '@/services/locations';
import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import type { AppointmentWithPatient, Patient, PatientFormData } from '@/types/database';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AgendaCalendar,
  WeekNavigation,
  AppointmentCard,
  NewAppointmentDialog,
} from '@/components/agenda';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // React Query hooks for patients
  const { data: patients = [] } = usePatients();
  const createPatientMutation = useCreatePatient();

  // Patient creation flow
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [preSelectedPatient, setPreSelectedPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({ name: '', phone: '' });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDayAppointments(), loadMonthDates()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadDayAppointments();
  }, [selectedDate]);

  useEffect(() => {
    loadMonthDates();
  }, [calendarMonth]);

  useEffect(() => {
    loadLocations();
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
  const dayAppointments = appointments.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

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

  const handleAddAppointment = async (data: { patientId: string; time: string; location: string; notes: string; procedure: string }) => {
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

  const handleUpdateAppointment = async (id: string, data: { patientId: string; time: string; location: string; notes: string; procedure: string }) => {
    // Check for time conflict (exclude current appointment)
    const timeConflict = appointments.find(
      apt => apt.id !== id && apt.time?.slice(0, 5) === data.time.slice(0, 5)
    );
    if (timeConflict) {
      toast.error(`Já existe uma consulta agendada às ${data.time.slice(0, 5)} com ${timeConflict.patients?.name || 'outro paciente'}`);
      return;
    }

    try {
      await appointmentsService.update(id, {
        patient_id: data.patientId,
        date: dateString,
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

  const handleWeekChange = (days: number) => {
    setSelectedDate(addDays(selectedDate, days));
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
    setDialogOpen(false); // Close appointment dialog
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
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

      {/* Calendar */}
      <AgendaCalendar
        selectedDate={selectedDate}
        calendarMonth={calendarMonth}
        datesWithAppointments={datesWithAppointments}
        onDateSelect={handleDateSelect}
        onMonthChange={setCalendarMonth}
        onDayDoubleClick={() => {
          setEditingAppointment(null);
          setDialogOpen(true);
        }}
      />

      {/* Week Navigation */}
      <WeekNavigation
        selectedDate={selectedDate}
        datesWithAppointments={datesWithAppointments}
        onDateSelect={setSelectedDate}
        onWeekChange={handleWeekChange}
      />

      {/* Appointments List */}
      {loading ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : dayAppointments.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
          <p className="text-muted-foreground">Nenhuma consulta agendada para este dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayAppointments.map((appointment, index) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              index={index}
              onStatusChange={handleStatusChange}
              onPatientClick={(patientId) => navigate(`/pacientes/${patientId}`)}
              onEdit={handleEditAppointment}
              onDelete={handleDeleteAppointment}
            />
          ))}
        </div>
      )}

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
