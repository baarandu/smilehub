import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, FileClock, Loader2, RefreshCw, UserPlus, Sparkles, ArrowLeft, PenLine } from 'lucide-react';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { PatientCard } from '@/components/patients/PatientCard';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';
import { DocumentsModal } from '@/components/patients/DocumentsModal';
import { PendingBudgetsDialog } from '@/components/patients/PendingBudgetsDialog';
import { useInfinitePatients, usePatientSearch, useCreatePatient } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { budgetsService } from '@/services/budgets';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { PatientFormData } from '@/types/database';

export default function Patients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { markStepCompleted, shouldReturnToOnboarding, setShouldReturnToOnboarding, setIsOnboardingOpen } = useOnboarding();

  // Infinite Scroll Hook (Pagination)
  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfinitePatients();

  // Server-side Search Hook
  const {
    data: searchResults,
    isLoading: isSearchLoading
  } = usePatientSearch(debouncedSearch);

  const createPatient = useCreatePatient();

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const count = await budgetsService.getPendingPatientsCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPendingCount();
    // React Query will handle data refresh through cache invalidation
    setIsRefreshing(false);
  };

  // Determine which list to show
  const isSearching = debouncedSearch.length >= 2;
  const isLoading = isSearching ? isSearchLoading : isInfiniteLoading;

  const currentPatients = useMemo(() => {
    if (isSearching) return searchResults || [];
    if (infiniteData) {
      return infiniteData.pages.flat();
    }
    return [];
  }, [isSearching, searchResults, infiniteData]);

  const handleAddPatient = async (formData: PatientFormData) => {
    await createPatient.mutateAsync(formData);
    // Mark onboarding step as completed
    markStepCompleted('first_patient');
    // Return to onboarding if came from there
    if (shouldReturnToOnboarding) {
      setShouldReturnToOnboarding(false);
      setIsOnboardingOpen(true);
      navigate('/inicio');
    }
  };

  const handleBackToOnboarding = () => {
    setShouldReturnToOnboarding(false);
    setIsOnboardingOpen(true);
    navigate('/inicio');
  };

  return (
    <div className="space-y-6">
      {/* Onboarding context banner */}
      {shouldReturnToOnboarding && (
        <div className="flex items-center justify-between gap-3 p-3 bg-[#a03f3d]/5 border border-[#a03f3d]/20 rounded-xl">
          <p className="text-sm text-[#a03f3d]">
            <span className="font-medium">Configuração inicial:</span> Cadastre seu primeiro paciente para continuar
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToOnboarding}
            className="text-[#a03f3d] hover:text-[#8b3634] hover:bg-[#a03f3d]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#a03f3d]/10 rounded-xl">
            <Users className="w-6 h-6 text-[#a03f3d]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isLoading
                ? '...'
                : isSearching
                  ? `${searchResults?.length || 0} resultados encontrados`
                  : `${currentPatients.length} pacientes listados`
              }
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
            aria-label="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBudgetsModal(true)}
            className="relative"
          >
            <FileClock className="w-4 h-4 mr-2 text-amber-500" />
            <span className="hidden sm:inline">Orçamentos Pendentes</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background min-w-[20px] h-[20px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={() => navigate('/assinaturas')}>
            <PenLine className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Assinar Prontuários</span>
          </Button>
          <Button variant="outline" onClick={() => setShowDocumentsModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Documentos</span>
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
      ) : currentPatients.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card border border-border">
          {search ? (
            <>
              <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">Nenhum paciente encontrado</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UserPlus className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comece cadastrando seu primeiro paciente
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Adicione um paciente para começar a organizar seus atendimentos e criar históricos completos.
              </p>
              <NewPatientDialog onAdd={handleAddPatient} isLoading={createPatient.isPending} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3">
            {currentPatients.map((patient, index) => (
              <PatientCard key={patient.id} patient={patient} index={index} />
            ))}
          </div>

          {/* Load More Button (Only for main list) */}
          {!isSearching && hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full sm:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais pacientes'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
