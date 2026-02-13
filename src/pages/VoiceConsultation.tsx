import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import { useClinic } from '@/contexts/ClinicContext';
import { useVoiceConsultation } from '@/hooks/useVoiceConsultation';
import { VoiceConsultationStepper } from '@/components/voice-consultation/VoiceConsultationStepper';
import { ConsentBanner } from '@/components/voice-consultation/ConsentBanner';
import { AudioRecorder } from '@/components/voice-consultation/AudioRecorder';
import { ProcessingProgress } from '@/components/voice-consultation/ProcessingProgress';
import { TranscriptionPreview } from '@/components/voice-consultation/TranscriptionPreview';
import { PatientReviewForm } from '@/components/voice-consultation/PatientReviewForm';
import {
  AnamnesisReviewForm,
  extractedToFormState,
  getEmptyAnamnesisForm,
  type AnamnesisFormState,
} from '@/components/voice-consultation/AnamnesisReviewForm';
import {
  ConsultationReviewForm,
  extractedToConsultationForm,
  type ConsultationFormState,
} from '@/components/voice-consultation/ConsultationReviewForm';

import { createPatientFromForm, updatePatientFromForm } from '@/services/patients';
import { anamnesesService } from '@/services/anamneses';
import { proceduresService } from '@/services/procedures';
import { budgetsService } from '@/services/budgets';
import { locationsService, type Location } from '@/services/locations';
import { supabase } from '@/lib/supabase';
import { getShortToothId, calculateToothTotal, type ToothEntry } from '@/utils/budgetUtils';
import {
  ProceduresReviewForm,
  extractedToProcedureForm,
  type ProcedureFormItem,
} from '@/components/voice-consultation/ProceduresReviewForm';
import {
  BudgetReviewForm,
  extractedToBudgetForm,
} from '@/components/voice-consultation/BudgetReviewForm';

import type { PatientFormData, Patient, Anamnese, BudgetInsert } from '@/types/database';

const emptyPatientForm: PatientFormData = {
  name: '', phone: '', email: '', birthDate: '', cpf: '', rg: '',
  address: '', city: '', state: '', zipCode: '', occupation: '',
  emergencyContact: '', emergencyPhone: '', healthInsurance: '',
  healthInsuranceNumber: '', allergies: '', medications: '',
  medicalHistory: '', notes: '',
};

export default function VoiceConsultation() {
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  const navigate = useNavigate();
  const { clinicId } = useClinic();

  const [userId, setUserId] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Existing data (for existing patients)
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  const [existingAnamnesis, setExistingAnamnesis] = useState<Anamnese | null>(null);

  // Appointment data
  const [appointmentPatientName, setAppointmentPatientName] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');

  // Review form states
  const [patientForm, setPatientForm] = useState<PatientFormData>(emptyPatientForm);
  const [anamnesisForm, setAnamnesisForm] = useState<AnamnesisFormState>(getEmptyAnamnesisForm());
  const [consultationForm, setConsultationForm] = useState<ConsultationFormState>({
    chiefComplaint: '', treatmentPlan: '', suggestedReturnDate: '', notes: '',
  });
  const [proceduresForm, setProceduresForm] = useState<ProcedureFormItem[]>([]);
  const [budgetForm, setBudgetForm] = useState<ToothEntry[]>([]);
  const [budgetLocation, setBudgetLocation] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load locations
  useEffect(() => {
    locationsService.getAll().then(setLocations).catch(console.error);
  }, []);

  // Load appointment data if provided
  useEffect(() => {
    if (!appointmentId) return;

    const loadAppointment = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*, patients(id, name, phone, email, birth_date, cpf, rg, address, city, state, zip_code, occupation, emergency_contact, emergency_phone, health_insurance, health_insurance_number, allergies, medications, medical_history, notes)')
        .eq('id', appointmentId)
        .single();

      if (data) {
        const patient = (data as any).patients;
        if (patient) {
          setExistingPatient(patient);
          setAppointmentPatientName(patient.name);
          setIsNewPatient(false);

          // Load latest anamnesis
          const { data: anamneses } = await supabase
            .from('anamneses')
            .select('*')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (anamneses?.[0]) {
            setExistingAnamnesis(anamneses[0] as Anamnese);
          }
        }
        if (data.time) {
          setAppointmentTime((data.time as string).slice(0, 5));
        }
      }
    };

    loadAppointment();
  }, [appointmentId]);

  // Load patient data from query param (when coming from PatientDetail)
  useEffect(() => {
    if (appointmentId || !queryPatientId) return;

    const loadPatient = async () => {
      const { data } = await supabase
        .from('patients_secure')
        .select('*')
        .eq('id', queryPatientId)
        .single();

      if (data) {
        setExistingPatient(data as Patient);
        setAppointmentPatientName(data.name);
        setIsNewPatient(false);

        // Load latest anamnesis
        const { data: anamneses } = await supabase
          .from('anamneses')
          .select('*')
          .eq('patient_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (anamneses?.[0]) {
          setExistingAnamnesis(anamneses[0] as Anamnese);
        }
      }
    };

    loadPatient();
  }, [queryPatientId, appointmentId]);

  const voiceConsultation = useVoiceConsultation({
    clinicId: clinicId || '',
    userId: userId || '',
    appointmentId,
    patientId: existingPatient?.id,
    isNewPatient,
    existingPatientData: existingPatient ? patientToRecord(existingPatient) : null,
    existingAnamnesisData: existingAnamnesis ? (existingAnamnesis as any) : null,
  });

  // Populate forms when extraction completes
  useEffect(() => {
    if (!voiceConsultation.extractionResult) return;
    const { patient, anamnesis, consultation, procedures, budget } = voiceConsultation.extractionResult;

    // Patient form
    if (patient) {
      const base = existingPatient
        ? patientToFormData(existingPatient)
        : emptyPatientForm;

      setPatientForm({
        ...base,
        name: patient.name || base.name,
        phone: patient.phone || base.phone,
        email: patient.email || base.email,
        birthDate: patient.birthDate || base.birthDate,
        cpf: patient.cpf || base.cpf,
        rg: patient.rg || base.rg,
        address: patient.address || base.address,
        city: patient.city || base.city,
        state: patient.state || base.state,
        zipCode: patient.zipCode || base.zipCode,
        occupation: patient.occupation || base.occupation,
        emergencyContact: patient.emergencyContact || base.emergencyContact,
        emergencyPhone: patient.emergencyPhone || base.emergencyPhone,
        healthInsurance: patient.healthInsurance || base.healthInsurance,
        healthInsuranceNumber: patient.healthInsuranceNumber || base.healthInsuranceNumber,
        allergies: patient.allergies || base.allergies,
        medications: patient.medications || base.medications,
        medicalHistory: base.medicalHistory,
        notes: base.notes,
      });
    }

    // Anamnesis form
    if (anamnesis) {
      setAnamnesisForm(extractedToFormState(anamnesis));
    }

    // Consultation form
    if (consultation) {
      setConsultationForm(extractedToConsultationForm(consultation));
    }

    // Procedures form
    if (procedures) {
      setProceduresForm(extractedToProcedureForm(procedures, locations));
    }

    // Budget form
    if (budget) {
      const result = extractedToBudgetForm(budget, locations);
      setBudgetForm(result.items);
      setBudgetLocation(result.location);
    }
  }, [voiceConsultation.extractionResult, locations]);

  // Warn before leaving during recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (voiceConsultation.phase === 'recording' || voiceConsultation.phase === 'processing') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [voiceConsultation.phase]);

  const handleStart = () => {
    if (!clinicId || !userId) {
      toast.error('Erro de autenticação');
      return;
    }
    voiceConsultation.startConsultation();
  };

  const handleSaveAll = async () => {
    try {
      let savedPatientId = existingPatient?.id;

      // 1. Save or create patient
      if (isNewPatient) {
        if (!patientForm.name || !patientForm.phone) {
          toast.error('Nome e telefone do paciente são obrigatórios');
          return;
        }
        try {
          const newPatient = await createPatientFromForm(patientForm);
          savedPatientId = newPatient.id;
          toast.success('Paciente cadastrado!');
        } catch (err) {
          console.error('Error creating patient:', err);
          toast.error('Erro ao cadastrar paciente');
          return;
        }
      } else if (savedPatientId) {
        try {
          await updatePatientFromForm(savedPatientId, patientForm);
        } catch (err) {
          console.error('Error updating patient:', err);
          toast.error('Erro ao atualizar paciente');
          return;
        }
      }

      if (!savedPatientId) {
        toast.error('Erro: paciente não identificado');
        return;
      }

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // 2. Create anamnesis ONLY if there's meaningful data
      const hasAnamnesisData = [
        anamnesisForm.medicalTreatment, anamnesisForm.recentSurgery,
        anamnesisForm.healingProblems, anamnesisForm.respiratoryProblems,
        anamnesisForm.currentMedication, anamnesisForm.allergy,
        anamnesisForm.drugAllergy, anamnesisForm.continuousMedication,
        anamnesisForm.localAnesthesiaHistory, anamnesisForm.anesthesiaReaction,
        anamnesisForm.pregnantOrBreastfeeding, anamnesisForm.smokerOrDrinker,
        anamnesisForm.fasting, anamnesisForm.diabetes,
        anamnesisForm.depressionAnxietyPanic, anamnesisForm.seizureEpilepsy,
        anamnesisForm.heartDisease, anamnesisForm.hypertension,
        anamnesisForm.pacemaker, anamnesisForm.infectiousDisease,
        anamnesisForm.arthritis, anamnesisForm.gastritisReflux,
        anamnesisForm.bruxismDtmOrofacialPain,
      ].some(Boolean) || !!(anamnesisForm.notes?.trim()) || !!(anamnesisForm.observations?.trim())
        || !!(consultationForm.chiefComplaint?.trim()) || !!(consultationForm.treatmentPlan?.trim())
        || !!(consultationForm.notes?.trim());

      if (hasAnamnesisData) {
        const anamneseData = {
          patient_id: savedPatientId,
          date: dateStr,
          medical_treatment: anamnesisForm.medicalTreatment,
          medical_treatment_details: anamnesisForm.medicalTreatment ? anamnesisForm.medicalTreatmentDetails || null : null,
          recent_surgery: anamnesisForm.recentSurgery,
          recent_surgery_details: anamnesisForm.recentSurgery ? anamnesisForm.recentSurgeryDetails || null : null,
          healing_problems: anamnesisForm.healingProblems,
          healing_problems_details: anamnesisForm.healingProblems ? anamnesisForm.healingProblemsDetails || null : null,
          respiratory_problems: anamnesisForm.respiratoryProblems,
          respiratory_problems_details: anamnesisForm.respiratoryProblems ? anamnesisForm.respiratoryProblemsDetails || null : null,
          current_medication: anamnesisForm.currentMedication,
          current_medication_details: anamnesisForm.currentMedication ? anamnesisForm.currentMedicationDetails || null : null,
          allergy: anamnesisForm.allergy,
          allergy_details: anamnesisForm.allergy ? anamnesisForm.allergyDetails || null : null,
          drug_allergy: anamnesisForm.drugAllergy,
          drug_allergy_details: anamnesisForm.drugAllergy ? anamnesisForm.drugAllergyDetails || null : null,
          continuous_medication: anamnesisForm.continuousMedication,
          continuous_medication_details: anamnesisForm.continuousMedication ? anamnesisForm.continuousMedicationDetails || null : null,
          local_anesthesia_history: anamnesisForm.localAnesthesiaHistory,
          local_anesthesia_history_details: anamnesisForm.localAnesthesiaHistory ? anamnesisForm.localAnesthesiaHistoryDetails || null : null,
          anesthesia_reaction: anamnesisForm.anesthesiaReaction,
          anesthesia_reaction_details: anamnesisForm.anesthesiaReaction ? anamnesisForm.anesthesiaReactionDetails || null : null,
          pregnant_or_breastfeeding: anamnesisForm.pregnantOrBreastfeeding,
          pregnant_or_breastfeeding_details: anamnesisForm.pregnantOrBreastfeeding ? anamnesisForm.pregnantOrBreastfeedingDetails || null : null,
          smoker_or_drinker: anamnesisForm.smokerOrDrinker,
          smoker_or_drinker_details: anamnesisForm.smokerOrDrinker ? anamnesisForm.smokerOrDrinkerDetails || null : null,
          fasting: anamnesisForm.fasting,
          fasting_details: anamnesisForm.fasting ? anamnesisForm.fastingDetails || null : null,
          diabetes: anamnesisForm.diabetes,
          diabetes_details: anamnesisForm.diabetes ? anamnesisForm.diabetesDetails || null : null,
          depression_anxiety_panic: anamnesisForm.depressionAnxietyPanic,
          depression_anxiety_panic_details: anamnesisForm.depressionAnxietyPanic ? anamnesisForm.depressionAnxietyPanicDetails || null : null,
          seizure_epilepsy: anamnesisForm.seizureEpilepsy,
          seizure_epilepsy_details: anamnesisForm.seizureEpilepsy ? anamnesisForm.seizureEpilepsyDetails || null : null,
          heart_disease: anamnesisForm.heartDisease,
          heart_disease_details: anamnesisForm.heartDisease ? anamnesisForm.heartDiseaseDetails || null : null,
          hypertension: anamnesisForm.hypertension,
          hypertension_details: anamnesisForm.hypertension ? anamnesisForm.hypertensionDetails || null : null,
          pacemaker: anamnesisForm.pacemaker,
          pacemaker_details: anamnesisForm.pacemaker ? anamnesisForm.pacemakerDetails || null : null,
          infectious_disease: anamnesisForm.infectiousDisease,
          infectious_disease_details: anamnesisForm.infectiousDisease ? anamnesisForm.infectiousDiseaseDetails || null : null,
          arthritis: anamnesisForm.arthritis,
          arthritis_details: anamnesisForm.arthritis ? anamnesisForm.arthritisDetails || null : null,
          gastritis_reflux: anamnesisForm.gastritisReflux,
          gastritis_reflux_details: anamnesisForm.gastritisReflux ? anamnesisForm.gastritisRefluxDetails || null : null,
          bruxism_dtm_orofacial_pain: anamnesisForm.bruxismDtmOrofacialPain,
          bruxism_dtm_orofacial_pain_details: anamnesisForm.bruxismDtmOrofacialPain ? anamnesisForm.bruxismDtmOrofacialPainDetails || null : null,
          notes: anamnesisForm.notes || null,
          observations: [
            anamnesisForm.observations,
            consultationForm.chiefComplaint && `Queixa: ${consultationForm.chiefComplaint}`,
            consultationForm.treatmentPlan && `Plano: ${consultationForm.treatmentPlan}`,
            consultationForm.suggestedReturnDate && `Retorno sugerido: ${consultationForm.suggestedReturnDate}`,
            consultationForm.notes && `Notas: ${consultationForm.notes}`,
          ].filter(Boolean).join('\n\n') || null,
        };

        try {
          await anamnesesService.create(anamneseData as any);
        } catch (err) {
          console.error('Error creating anamnesis:', err);
          toast.error('Erro ao salvar anamnese');
          return;
        }
      }

      // 3. Create procedures
      const savedProcedureIds: string[] = [];
      for (const proc of proceduresForm) {
        if (!proc.treatment && !proc.description) continue;
        try {
          const description = [
            proc.treatment,
            proc.tooth && `Dente ${proc.tooth}`,
            proc.material && `Material: ${proc.material}`,
            proc.description,
          ].filter(Boolean).join(' - ');

          const created = await proceduresService.create({
            patient_id: savedPatientId,
            date: dateStr,
            description,
            location: proc.location || null,
            status: proc.status || 'completed',
          });
          savedProcedureIds.push(created.id);
        } catch (err) {
          console.error('Error creating procedure:', err);
          toast.error('Erro ao salvar procedimento');
        }
      }

      // 4. Create budget if items exist
      let savedBudgetId: string | null = null;
      if (budgetForm.length > 0) {
        try {
          const total = budgetForm.reduce(
            (sum, item) => sum + calculateToothTotal(item.values),
            0,
          );
          const allTreatments = [
            ...new Set(budgetForm.flatMap((t) => t.treatments)),
          ].join(', ');

          const notesData = JSON.stringify({
            teeth: budgetForm.map((t) => ({ ...t, status: 'pending' })),
            location: budgetLocation,
          });

          const budgetItems = budgetForm.map((t) => ({
            tooth: getShortToothId(t.tooth),
            faces: t.faces || [],
          }));

          const budgetData: BudgetInsert = {
            patient_id: savedPatientId,
            date: dateStr,
            treatment: allTreatments || 'Orçamento via consulta por voz',
            value: total,
            notes: notesData,
            status: 'pending',
            location: budgetLocation || null,
          };

          const created = await budgetsService.create(budgetData, budgetItems);
          savedBudgetId = created.id;
        } catch (err) {
          console.error('Error creating budget:', err);
          toast.error('Erro ao salvar orçamento');
        }
      }

      // 5. Mark session as completed with IDs
      await voiceConsultation.saveAll(
        patientForm as any,
        anamnesisForm as any,
        consultationForm as any,
        savedProcedureIds,
        savedBudgetId,
      );

      toast.success('Todos os dados foram salvos com sucesso!');
      navigate(existingPatient ? `/pacientes/${savedPatientId}` : '/agenda');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar dados. Tente novamente.');
    }
  };

  const handleDiscard = async () => {
    await voiceConsultation.discard();
    navigate('/agenda');
  };

  if (!clinicId || !userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const confidence = voiceConsultation.extractionResult?.confidence;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agenda')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consulta por Voz</h1>
          <p className="text-sm text-muted-foreground">
            Grave a consulta e a IA preenche automaticamente
          </p>
        </div>
      </div>

      {/* Stepper */}
      <VoiceConsultationStepper currentPhase={voiceConsultation.phase} />

      {/* Phase Content */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card min-h-[400px]">
        {/* Phase 1: Consent */}
        {voiceConsultation.phase === 'consent' && (
          <ConsentBanner
            consentGiven={consentGiven}
            onConsentChange={setConsentGiven}
            isNewPatient={isNewPatient}
            onNewPatientChange={setIsNewPatient}
            patientName={appointmentPatientName || undefined}
            appointmentTime={appointmentTime || undefined}
            onStart={handleStart}
          />
        )}

        {/* Phase 2: Recording */}
        {voiceConsultation.phase === 'recording' && (
          <AudioRecorder
            isRecording={voiceConsultation.recorder.isRecording}
            isPaused={voiceConsultation.recorder.isPaused}
            duration={voiceConsultation.recorder.duration}
            analyserNode={voiceConsultation.recorder.analyserNode}
            onPause={voiceConsultation.recorder.pauseRecording}
            onResume={voiceConsultation.recorder.resumeRecording}
            onStop={voiceConsultation.finishRecording}
          />
        )}

        {/* Phase 3: Processing */}
        {voiceConsultation.phase === 'processing' && (
          <div className="space-y-6">
            <ProcessingProgress
              currentStep={voiceConsultation.processingStep}
              error={voiceConsultation.processingError}
            />
            <TranscriptionPreview transcription={voiceConsultation.transcription} />
          </div>
        )}

        {/* Phase 4: Review */}
        {voiceConsultation.phase === 'review' && (
          <div className="space-y-6">
            <TranscriptionPreview transcription={voiceConsultation.transcription} />

            <Accordion type="multiple" defaultValue={[
              'patient',
              'anamnesis',
              'consultation',
              ...(proceduresForm.length > 0 ? ['procedures'] : []),
              ...(budgetForm.length > 0 ? ['budget'] : []),
            ]} className="space-y-3">
              {/* Patient Section */}
              <AccordionItem value="patient" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold">Cadastro do Paciente</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <PatientReviewForm
                    data={patientForm}
                    onChange={setPatientForm}
                    confidence={confidence?.patient || 'medium'}
                    previousData={existingPatient ? patientToFormData(existingPatient) : null}
                    isNewPatient={isNewPatient}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Anamnesis Section */}
              <AccordionItem value="anamnesis" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold">Anamnese</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <AnamnesisReviewForm
                    data={anamnesisForm}
                    onChange={setAnamnesisForm}
                    confidence={confidence?.anamnesis || 'medium'}
                    aiExtracted={voiceConsultation.extractionResult?.anamnesis || null}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Consultation Section */}
              <AccordionItem value="consultation" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold">Notas da Consulta</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ConsultationReviewForm
                    data={consultationForm}
                    onChange={setConsultationForm}
                    confidence={confidence?.consultation || 'medium'}
                    aiExtracted={voiceConsultation.extractionResult?.consultation || null}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Procedures Section */}
              <AccordionItem value="procedures" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold">
                    Procedimentos ({proceduresForm.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ProceduresReviewForm
                    data={proceduresForm}
                    onChange={setProceduresForm}
                    locations={locations}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Budget Section */}
              <AccordionItem value="budget" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold">
                    Orçamento ({budgetForm.length} {budgetForm.length === 1 ? 'item' : 'itens'})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <BudgetReviewForm
                    data={budgetForm}
                    onChange={setBudgetForm}
                    location={budgetLocation}
                    onLocationChange={setBudgetLocation}
                    locations={locations}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setDiscardDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Descartar
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={voiceConsultation.isSaving}
                className="flex-1 gap-2"
              >
                {voiceConsultation.isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Tudo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Discard Dialog */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados extraídos serão perdidos. O áudio já foi descartado e a transcrição não será salva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helpers

function patientToFormData(patient: Patient): PatientFormData {
  return {
    name: patient.name || '',
    phone: patient.phone || '',
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
}

function patientToRecord(patient: Patient): Record<string, unknown> {
  return {
    name: patient.name,
    phone: patient.phone,
    email: patient.email,
    birthDate: patient.birth_date,
    cpf: patient.cpf,
    rg: patient.rg,
    address: patient.address,
    city: patient.city,
    state: patient.state,
    zipCode: patient.zip_code,
    occupation: patient.occupation,
    emergencyContact: patient.emergency_contact,
    emergencyPhone: patient.emergency_phone,
    healthInsurance: patient.health_insurance,
    healthInsuranceNumber: patient.health_insurance_number,
  };
}
