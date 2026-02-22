import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PatientForm } from './PatientForm';
import { PatientFormData } from '@/types/database';
import { toast } from 'sonner';

interface NewPatientDialogProps {
  onAdd: (formData: PatientFormData) => Promise<void>;
  isLoading?: boolean;
}

export function NewPatientDialog({ onAdd, isLoading }: NewPatientDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: PatientFormData) => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (formData.patientType === 'child') {
      if (!formData.motherPhone && !formData.fatherPhone) {
        toast.error('Informe o telefone de pelo menos um responsável (mãe ou pai)');
        return;
      }
    } else if (!formData.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }
    try {
      await onAdd(formData);
      setOpen(false);
      toast.success('Paciente cadastrado com sucesso!');
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast.error(error.message || error.details || 'Erro ao cadastrar paciente');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Novo Paciente
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cadastrar Novo Paciente</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <PatientForm
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            isLoading={isLoading}
            submitLabel="Cadastrar"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
