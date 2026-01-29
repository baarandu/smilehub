import { useState, useEffect, useRef } from 'react';
import { Plus, Search, X, ExternalLink } from 'lucide-react';
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
import type { NewAppointmentDialogProps } from './types';

export function NewAppointmentDialog({
  open,
  onOpenChange,
  patients,
  locations,
  onAdd,
  onUpdate,
  appointmentToEdit,
  onRequestCreatePatient,
  preSelectedPatient,
}: NewAppointmentDialogProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    time: '',
    location: '',
    notes: '',
    procedure: '',
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  useEffect(() => {
    if (open) {
      if (appointmentToEdit) {
        setForm({
          patientId: appointmentToEdit.patient_id,
          patientName: appointmentToEdit.patients?.name || '',
          time: appointmentToEdit.time?.slice(0, 5) || '',
          location: appointmentToEdit.location || '',
          notes: appointmentToEdit.notes || '',
          procedure: appointmentToEdit.procedure_name || '',
        });
      } else {
        setForm({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
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
    setForm({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
    setPatientSearch('');
  };

  const handleCreateNew = () => {
    onOpenChange(true);
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
          <div className="space-y-2">
            <Label>Horário *</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
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
