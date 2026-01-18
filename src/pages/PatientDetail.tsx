import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, CreditCard, Hospital, ClipboardList, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatient, useDeletePatient } from '@/hooks/usePatients';
import { toast } from 'sonner';
import {
  PatientHeader,
  ProceduresTab,
  PaymentsTab,
  ExamsTab,
  EditPatientDialog,
  AnamneseTab,
  BudgetsTab
} from '@/components/patients';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: patient, isLoading, error, refetch } = usePatient(id || '');
  const deletePatient = useDeletePatient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'anamnese');

  // Sync state if URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleDelete = async () => {
    if (!patient?.id) return;

    try {
      await deletePatient.mutateAsync(patient.id);
      toast.success('Paciente excluído com sucesso');
      navigate('/pacientes');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao excluir paciente');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button onClick={() => navigate('/pacientes')} variant="link" className="mt-4">
          Voltar para pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/pacientes')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar</span>
      </button>

      {/* Patient Header Card */}
      <PatientHeader
        patient={patient}
        onEdit={() => setShowEditDialog(true)}
        onDelete={handleDelete}
        onRefresh={refetch}
      />

      {/* Edit Dialog */}
      <EditPatientDialog
        patient={patient}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={refetch}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="anamnese" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Anamnese</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Orçamentos</span>
          </TabsTrigger>
          <TabsTrigger value="procedures" className="gap-2">
            <Hospital className="w-4 h-4" />
            <span className="hidden sm:inline">Procedimentos</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Exames</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anamnese" className="mt-6">
          <AnamneseTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="budgets" className="mt-6">
          <BudgetsTab
            patientId={patient.id}
            patientName={patient.name}
            onNavigateToPayments={() => handleTabChange('payments')}
          />
        </TabsContent>

        <TabsContent value="procedures" className="mt-6">
          <ProceduresTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="exams" className="mt-6">
          <ExamsTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentsTab patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
