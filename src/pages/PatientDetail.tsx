import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, FileText, CreditCard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatient } from '@/hooks/usePatients';
import { appointmentsService } from '@/services/appointments';
import { 
  PatientHeader, 
  AppointmentsTab, 
  PaymentsTab, 
  PatientInfoTab,
  DocumentUpload,
  EditPatientDialog
} from '@/components/patients';
import type { AppointmentWithPatient } from '@/types/database';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading, error, refetch } = usePatient(id || '');
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadAppointments();
    }
  }, [id]);

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const data = await appointmentsService.getByPatient(id!);
      setAppointments(data as AppointmentWithPatient[]);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
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
      <PatientHeader patient={patient} onEdit={() => setShowEditDialog(true)} />

      {/* Edit Dialog */}
      <EditPatientDialog
        patient={patient}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={refetch}
      />

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Consultas</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Exames</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Info</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsTab appointments={appointments} loading={loadingAppointments} />
        </TabsContent>

        <TabsContent value="exams" className="mt-6">
          <DocumentUpload patientId={patient.id} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentsTab />
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <PatientInfoTab patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
