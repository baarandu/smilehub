import { useState } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { mockAppointments, mockPatients } from '@/data/mockData';
import { Appointment } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Agenda() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date('2024-12-10'));
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    time: '',
    notes: '',
  });

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = appointments
    .filter((a) => a.date === dateString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentCountForDate = (date: Date) => {
    const str = format(date, 'yyyy-MM-dd');
    return appointments.filter((a) => a.date === str).length;
  };

  const handleStatusChange = (appointmentId: string, status: Appointment['status']) => {
    setAppointments(
      appointments.map((a) =>
        a.id === appointmentId ? { ...a, status } : a
      )
    );
    toast.success('Status atualizado!');
  };

  const handleAddAppointment = () => {
    if (!newAppointment.patientId || !newAppointment.time) {
      toast.error('Selecione um paciente e horário');
      return;
    }

    const patient = mockPatients.find((p) => p.id === newAppointment.patientId);
    if (!patient) return;

    const appointment: Appointment = {
      id: String(Date.now()),
      patientId: newAppointment.patientId,
      patientName: patient.name,
      date: dateString,
      time: newAppointment.time,
      status: 'scheduled',
      notes: newAppointment.notes || undefined,
    };

    setAppointments([...appointments, appointment]);
    setNewAppointment({ patientId: '', time: '', notes: '' });
    setDialogOpen(false);
    toast.success('Consulta agendada com sucesso!');
  };

  const statusConfig = {
    scheduled: { label: 'Agendado', class: 'bg-primary text-primary-foreground' },
    completed: { label: 'Compareceu', class: 'bg-success text-success-foreground' },
    missed: { label: 'Faltou', class: 'bg-destructive text-destructive-foreground' },
    rescheduled: { label: 'Reagendou', class: 'bg-warning text-warning-foreground' },
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agendar Consulta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select
                  value={newAppointment.patientId}
                  onValueChange={(v) => setNewAppointment({ ...newAppointment, patientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  placeholder="Ex: Consulta de rotina"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAddAppointment}>
                  Agendar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-foreground">
            {format(weekStart, "d MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = format(day, 'yyyy-MM-dd') === dateString;
            const count = getAppointmentCountForDate(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span className="text-xs uppercase opacity-70">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-lg font-semibold">{format(day, 'd')}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-xs mt-1 px-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground/20" : "bg-accent text-accent-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments List */}
      {dayAppointments.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
          <p className="text-muted-foreground">Nenhuma consulta agendada para este dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayAppointments.map((appointment, index) => (
            <div
              key={appointment.id}
              className="bg-card rounded-xl p-4 shadow-card border border-border animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-bold text-primary">{appointment.time}</p>
                </div>
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/pacientes/${appointment.patientId}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.patientName}</p>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Select
                  value={appointment.status}
                  onValueChange={(v) => handleStatusChange(appointment.id, v as Appointment['status'])}
                >
                  <SelectTrigger className={cn("w-[130px] h-8 text-xs", statusConfig[appointment.status].class)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Compareceu</SelectItem>
                    <SelectItem value="missed">Faltou</SelectItem>
                    <SelectItem value="rescheduled">Reagendou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
