import { useState, useMemo } from 'react';
import { Users, FileText } from 'lucide-react';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { PatientCard } from '@/components/patients/PatientCard';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';
import { DocumentsModal } from '@/components/patients/DocumentsModal';
import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { PatientFormData } from '@/types/database';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const { data: patients, isLoading } = usePatients();
  const createPatient = useCreatePatient();

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!search) return patients;
    const query = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.cpf && p.cpf.includes(query))
    );
  }, [search, patients]);

  const handleAddPatient = async (formData: PatientFormData) => {
    await createPatient.mutateAsync(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? '...' : `${patients?.length || 0} pacientes cadastrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDocumentsModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Documentos
          </Button>
          <NewPatientDialog onAdd={handleAddPatient} isLoading={createPatient.isPending} />
        </div>
      </div>

      {/* Documents Modal */}
      <DocumentsModal open={showDocumentsModal} onClose={() => setShowDocumentsModal(false)} />

      {/* Search */}
      <PatientSearch value={search} onChange={setSearch} />

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-card border border-border">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPatients.map((patient, index) => (
            <PatientCard key={patient.id} patient={patient} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
