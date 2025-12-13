import { useState, useEffect, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { NewAppointmentDialogProps } from './types';

export function NewAppointmentDialog({
  open,
  onOpenChange,
  patients,
  locations,
  onAdd,
}: NewAppointmentDialogProps) {
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
      setForm({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
      setPatientSearch('');
      setShowPatientList(false);
    }
  }, [open]);

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
    onAdd(form);
    setForm({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
    setPatientSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Consulta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Paciente *</Label>
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
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-4 text-center text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Nenhum paciente encontrado
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
              Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
