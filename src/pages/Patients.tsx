import { useState, useMemo, useEffect } from 'react';
import { Users, FileText, FileClock } from 'lucide-react';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { PatientCard } from '@/components/patients/PatientCard';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';
import { DocumentsModal } from '@/components/patients/DocumentsModal';
import { PendingBudgetsDialog } from '@/components/patients/PendingBudgetsDialog';
import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { budgetsService } from '@/services/budgets';
import type { PatientFormData } from '@/types/database';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { data: patients, isLoading } = usePatients();
  const createPatient = useCreatePatient();

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const count = await budgetsService.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

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
          <Button
            variant="outline"
            onClick={() => setShowBudgetsModal(true)}
            className="relative"
          >
            <FileClock className="w-4 h-4 mr-2 text-amber-500" />
            Orçamentos Pendentes
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background min-w-[20px] h-[20px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowDocumentsModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Documentos
          </Button>
          <NewPatientDialog onAdd={handleAddPatient} isLoading={createPatient.isPending} />
        </div>
      </div>

      {/* Modals */}
      <DocumentsModal open={showDocumentsModal} onClose={() => setShowDocumentsModal(false)} />
      <PendingBudgetsDialog
        open={showBudgetsModal}
        onClose={() => {
          setShowBudgetsModal(false);
          loadPendingCount();
        }}
      />

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
