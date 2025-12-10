import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  Plus,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockPatients, mockConsultations } from '@/data/mockData';
import { Consultation } from '@/types';
import { toast } from 'sonner';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = mockPatients.find((p) => p.id === id);
  const [consultations, setConsultations] = useState<Consultation[]>(
    mockConsultations.filter((c) => c.patientId === id)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    notes: '',
    suggestedReturnDate: '',
  });

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button onClick={() => navigate('/pacientes')} variant="link" className="mt-4">
          Voltar para pacientes
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddConsultation = () => {
    if (!newConsultation.notes.trim()) {
      toast.error('Preencha as anotações da consulta');
      return;
    }

    const consultation: Consultation = {
      id: String(Date.now()),
      patientId: id!,
      date: new Date().toISOString().split('T')[0],
      notes: newConsultation.notes,
      attachments: [],
      suggestedReturnDate: newConsultation.suggestedReturnDate || undefined,
      createdAt: new Date().toISOString(),
    };

    setConsultations([consultation, ...consultations]);
    setNewConsultation({ notes: '', suggestedReturnDate: '' });
    setDialogOpen(false);
    toast.success('Consulta registrada com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar</span>
      </button>

      {/* Patient Info Card */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-foreground">
              {getInitials(patient.name)}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{patient.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{patient.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(patient.birthDate).toLocaleDateString('pt-BR')} ({calculateAge(patient.birthDate)} anos)
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Desde {new Date(patient.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultations Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Histórico de Consultas</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Consulta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Anotações da Consulta *</Label>
                <Textarea
                  value={newConsultation.notes}
                  onChange={(e) => setNewConsultation({ ...newConsultation, notes: e.target.value })}
                  placeholder="Diagnóstico, procedimentos realizados, observações..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Retorno Sugerida</Label>
                <Input
                  type="date"
                  value={newConsultation.suggestedReturnDate}
                  onChange={(e) => setNewConsultation({ ...newConsultation, suggestedReturnDate: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAddConsultation}>
                  Salvar Consulta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Consultations List */}
      {consultations.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhuma consulta registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation, index) => (
            <div
              key={consultation.id}
              className="bg-card rounded-xl p-5 shadow-card border border-border animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">
                      {new Date(consultation.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {consultation.suggestedReturnDate && (
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        Retorno: {new Date(consultation.suggestedReturnDate).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-foreground whitespace-pre-wrap">{consultation.notes}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
