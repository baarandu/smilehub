import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientForm } from './PatientForm';
import { useUpdatePatient } from '@/hooks/usePatients';
import type { Patient, PatientFormData } from '@/types/database';
import { toast } from 'sonner';

interface EditPatientDialogProps {
  patient: Patient;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditPatientDialog({ patient, open, onClose, onSuccess }: EditPatientDialogProps) {
  const updatePatient = useUpdatePatient();

  const initialData: Partial<PatientFormData> = {
    name: patient.name,
    phone: patient.phone,
    email: patient.email || '',
    birthDate: patient.birth_date || '',
    cpf: patient.cpf || '',
    rg: patient.rg || '',
    address: patient.address || '',
    city: patient.city || '',
    state: patient.state || '',
    zipCode: patient.zip_code || '',
    occupation: patient.occupation || '',
    emergencyContact: patient.emergency_contact || '',
    emergencyPhone: patient.emergency_phone || '',
    healthInsurance: patient.health_insurance || '',
    healthInsuranceNumber: patient.health_insurance_number || '',
    allergies: patient.allergies || '',
    medications: patient.medications || '',
    medicalHistory: patient.medical_history || '',
    notes: patient.notes || '',
  };

  const handleSubmit = async (data: PatientFormData) => {
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          birth_date: data.birthDate || null,
          cpf: data.cpf || null,
          rg: data.rg || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zipCode || null,
          occupation: data.occupation || null,
          emergency_contact: data.emergencyContact || null,
          emergency_phone: data.emergencyPhone || null,
          health_insurance: data.healthInsurance || null,
          health_insurance_number: data.healthInsuranceNumber || null,
          allergies: data.allergies || null,
          medications: data.medications || null,
          medical_history: data.medicalHistory || null,
          notes: data.notes || null,
        },
      });
      toast.success('Paciente atualizado com sucesso!');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Erro ao atualizar paciente');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>
        <PatientForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={updatePatient.isPending}
          submitLabel="Salvar Alterações"
        />
      </DialogContent>
    </Dialog>
  );
}


