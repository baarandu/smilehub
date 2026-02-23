import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mail, Calendar as CalendarIcon, Clock, Edit, Trash2, FileText, AlertTriangle, Stethoscope, Download, ChevronDown, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Patient } from '@/types/database';
import { useAnamneses } from '@/hooks/useAnamneses';
import { toggleReturnAlert } from '@/services/patients';
import { toast } from 'sonner';
import { ReportGenerationModal } from './ReportGenerationModal';
import { PatientAiConsent } from './PatientAiConsent';
import { MinorConsentBadge } from './MinorConsentBadge';
import { useClinic } from '@/contexts/ClinicContext';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generatePatientDataPDF } from '@/utils/patientDataPdfGenerator';
import { AnonymizePatientDialog } from './AnonymizePatientDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PatientHeaderProps {
  patient: Patient;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Small delay to ensure download starts before cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function PatientHeader({ patient, onEdit, onDelete, onRefresh }: PatientHeaderProps) {
  const navigate = useNavigate();
  const { isAdmin } = useClinic();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [togglingAlert, setTogglingAlert] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAnonymizeDialog, setShowAnonymizeDialog] = useState(false);
  const [alertDays, setAlertDays] = useState('180');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.birth_date);

  const { data: anamneses } = useAnamneses(patient.id);
  const latestAnamnese = anamneses?.[0];

  const getBadges = () => {
    if (!latestAnamnese) return [];

    const badges = [
      { condition: latestAnamnese.medical_treatment, label: 'Em Tratamento Médico', color: 'bg-blue-100 text-blue-800' },
      { condition: latestAnamnese.pregnant_or_breastfeeding, label: 'Gestante/Lactante', color: 'bg-pink-100 text-pink-800' },
      { condition: latestAnamnese.diabetes, label: 'Diabetes', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.hypertension, label: 'Hipertensão', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.heart_disease, label: 'Doença Cardíaca', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.pacemaker, label: 'Marcapasso', color: 'bg-purple-100 text-purple-800' },
      { condition: latestAnamnese.infectious_disease, label: 'Doença Infecciosa', color: 'bg-yellow-100 text-yellow-800' },
      { condition: latestAnamnese.anesthesia_reaction, label: 'Reação a Anestesia', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.smoker_or_drinker, label: 'Fumante/Etilista', color: 'bg-gray-100 text-gray-800' },
      { condition: latestAnamnese.healing_problems, label: 'Prob. Cicatrização', color: 'bg-orange-100 text-orange-800' },
      { condition: latestAnamnese.current_medication, label: 'Medicação em Uso', color: 'bg-blue-100 text-blue-800' },
      { condition: latestAnamnese.allergy, label: 'Alergia', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.drug_allergy, label: 'Alergia Medicamentosa', color: 'bg-red-100 text-red-800' },
      { condition: latestAnamnese.recent_surgery, label: 'Cirurgia Recente', color: 'bg-orange-100 text-orange-800' },
      { condition: latestAnamnese.depression_anxiety_panic, label: 'Ansiedade/Depressão', color: 'bg-purple-100 text-purple-800' },
      { condition: latestAnamnese.seizure_epilepsy, label: 'Epilepsia', color: 'bg-purple-100 text-purple-800' },
      { condition: latestAnamnese.arthritis, label: 'Artrite/Artrose', color: 'bg-orange-100 text-orange-800' },
      { condition: latestAnamnese.gastritis_reflux, label: 'Gastrite/Refluxo', color: 'bg-yellow-100 text-yellow-800' },
      { condition: latestAnamnese.local_anesthesia_history, label: 'Anestesia Local', color: 'bg-green-100 text-green-800' },
      { condition: latestAnamnese.fasting, label: 'Jejum', color: 'bg-blue-100 text-blue-800' },
    ];

    return badges.filter(b => b.condition);
  };

  const badges = getBadges();

  const sanitizedPhone = patient.phone?.replace(/\D/g, '');
  const whatsappUrl = sanitizedPhone ? `https://wa.me/55${sanitizedPhone}` : '#';

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteDialog(false);
    }
  };

  const handleAlertClick = () => {
    if (!patient.return_alert_flag) {
      setShowAlertConfirm(true);
    } else {
      executeToggleAlert();
    }
  };

  const executeToggleAlert = async () => {
    try {
      setTogglingAlert(true);
      const newState = !patient.return_alert_flag;
      const days = newState ? parseInt(alertDays, 10) || 180 : undefined;
      await toggleReturnAlert(patient.id, newState, days);
      toast.success(newState ? 'Alerta de retorno importante ativado' : 'Alerta removido');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Erro ao atualizar alerta');
    } finally {
      setTogglingAlert(false);
      setShowAlertConfirm(false);
      setAlertDays('180');
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      setExporting(true);

      if (format === 'pdf') {
        // Fetch JSON first, then generate PDF client-side
        const { data, error } = await supabase.functions.invoke('patient-data-export', {
          body: { patientId: patient.id, clinicId: patient.clinic_id, format: 'json' },
        });
        if (error) throw error;
        if (!data) throw new Error('Nenhum dado retornado');
        await generatePatientDataPDF(data, patient.name);
        toast.success('PDF gerado com sucesso');
        return;
      }

      const { data, error } = await supabase.functions.invoke('patient-data-export', {
        body: { patientId: patient.id, clinicId: patient.clinic_id, format },
      });

      if (error) {
        console.error('Export function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Nenhum dado retornado');
      }

      const fileName = `dados-paciente-${patient.name.replace(/\s+/g, '-').toLowerCase()}`;
      if (format === 'csv') {
        const csvStr = typeof data === 'string' ? data : String(data);
        downloadBlob(csvStr, `${fileName}.csv`, 'text/csv;charset=utf-8');
      } else {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        downloadBlob(jsonStr, `${fileName}.json`, 'application/json;charset=utf-8');
      }

      toast.success('Dados exportados com sucesso');
    } catch (error: any) {
      console.error('Export error:', error);
      const msg = error?.message || error?.context?.body || String(error);
      toast.error(`Erro ao exportar: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl p-6 shadow-card border border-border animate-fade-in space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-foreground">
              {getInitials(patient.name)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {patient.name}
                  {patient.return_alert_flag && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-0.5 rounded-full cursor-help">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            {patient.return_alert_date && (
                              <span className="text-xs font-bold text-orange-700">
                                {new Date(patient.return_alert_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Retorno Importante Sinalizado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </h1>
                {patient.occupation && (
                  <p className="text-muted-foreground mt-1">{patient.occupation}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={patient.return_alert_flag ? "default" : "outline"}
                        size="sm"
                        className={`gap-2 ${patient.return_alert_flag ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' : ''}`}
                        onClick={handleAlertClick}
                        disabled={togglingAlert}
                      >
                        <AlertTriangle className={`w-4 h-4 ${patient.return_alert_flag ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline">
                          {patient.return_alert_flag ? 'Sinalizado' : 'Sinalizar'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sinalizar retorno importante</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate(`/dentista-ia?patient_id=${patient.id}`)}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="hidden sm:inline">Dentista IA</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowReportModal(true)}>
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Relatório</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">{exporting ? 'Exportando...' : 'Exportar'}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportData('json')}>
                      JSON (dados brutos)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportData('csv')}>
                      CSV (planilha)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportData('pdf')}>
                      PDF (relatório)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                {onDelete && isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Arquivar</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowAnonymizeDialog(true)}
                  >
                    <UserX className="w-4 h-4" />
                    <span className="hidden sm:inline">Anonimizar</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">{patient.phone}</span>
              </a>
              {patient.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{patient.email}</span>
                </div>
              )}
              {patient.birth_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                    {age && ` (${age} anos)`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Desde {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {patient.clinic_id && (
          <div className="pt-4 border-t border-border space-y-2">
            <PatientAiConsent patientId={patient.id} clinicId={patient.clinic_id} />
            {(patient as any).patient_type === 'child' && (
              <MinorConsentBadge
                patientId={patient.id}
                clinicId={patient.clinic_id}
                guardianNameDefault={(patient as any).legal_guardian || (patient as any).mother_name || (patient as any).father_name || ''}
              />
            )}
          </div>
        )}

        {badges.length > 0 && (
          <div className="pt-4 border-t border-border flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              O paciente e todos os seus registros clínicos serão arquivados. Os dados serão preservados por no mínimo 20 anos, conforme exigência do CFO e da Lei 13.787. Esta ação não exclui dados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAlertConfirm} onOpenChange={(open) => {
        setShowAlertConfirm(open);
        if (!open) setAlertDays('180');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alertar Retorno Importante?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar este paciente para um retorno importante? Informe em quantos dias o alerta deve aparecer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="alertDays" className="text-sm font-medium">
              Dias para o retorno
            </Label>
            <Input
              id="alertDays"
              type="number"
              min="1"
              value={alertDays}
              onChange={(e) => setAlertDays(e.target.value)}
              placeholder="Ex: 180 (6 meses)"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Sugestões: 30 (1 mês), 90 (3 meses), 180 (6 meses), 365 (1 ano)
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeToggleAlert}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportGenerationModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        patient={patient}
      />

      {patient.clinic_id && (
        <AnonymizePatientDialog
          open={showAnonymizeDialog}
          onOpenChange={setShowAnonymizeDialog}
          patientId={patient.id}
          clinicId={patient.clinic_id}
          patientName={patient.name}
          onSuccess={() => {
            if (onRefresh) onRefresh();
            navigate('/pacientes');
          }}
        />
      )}
    </>
  );
}

