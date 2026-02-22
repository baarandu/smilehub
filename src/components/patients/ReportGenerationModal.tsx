
import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Calendar, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useProcedures } from '@/hooks/useProcedures';
import { useExams } from '@/hooks/useExams';
import { generatePatientReport } from '@/utils/patientReportGenerator';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, type ToothEntry } from '@/utils/budgetUtils';
import type { Patient } from '@/types/database';
import type { BudgetLink } from '@/services/procedures';
import { format } from 'date-fns';

interface ReportGenerationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: Patient;
}

export function ReportGenerationModal({
    open,
    onOpenChange,
    patient,
}: ReportGenerationModalProps) {
    const { data: procedures = [], isLoading: loadingProcedures } = useProcedures(patient.id);
    const { data: exams = [], isLoading: loadingExams } = useExams(patient.id);
    const { data: budgets = [] } = useQuery({
        queryKey: ['budgets', patient.id],
        queryFn: () => budgetsService.getByPatient(patient.id),
        enabled: !!patient.id,
    });

    // Resolve procedure names from budget links for display
    const procedureNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        const budgetMap = new Map(budgets.map((b) => [b.id, b]));

        for (const proc of procedures) {
            const links = (proc as any).budget_links as BudgetLink[] | null;
            if (!links || links.length === 0) continue;

            const names: string[] = [];
            for (const link of links) {
                const budget = budgetMap.get(link.budgetId);
                if (!budget?.notes) continue;
                try {
                    const parsed = JSON.parse(budget.notes);
                    const teeth = parsed.teeth as ToothEntry[];
                    if (!teeth || !teeth[link.toothIndex]) continue;
                    const tooth = teeth[link.toothIndex];
                    const toothName = getToothDisplayName(tooth.tooth, false);
                    const treatments = tooth.treatments.join(', ');
                    names.push(`${treatments} - ${toothName}`);
                } catch { /* skip */ }
            }
            if (names.length > 0) map[proc.id] = names.join('; ');
        }
        return map;
    }, [procedures, budgets]);

    const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [generating, setGenerating] = useState(false);

    // Auto-select all when data loads or modal opens
    useEffect(() => {
        if (open) {
            if (procedures.length > 0) setSelectedProcedures(procedures.map((p) => p.id));
            if (exams.length > 0) setSelectedExams(exams.map((e) => e.id));
            setNotes('');
        }
    }, [open, procedures.length, exams.length]);

    const toggleProcedure = (id: string) => {
        setSelectedProcedures((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    const toggleExam = (id: string) => {
        setSelectedExams((prev) =>
            prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const proceduresToInclude = procedures.filter((p) =>
                selectedProcedures.includes(p.id)
            );
            const examsToInclude = exams.filter((e) => selectedExams.includes(e.id));

            const { data: { user } } = await supabase.auth.getUser();
            const metadata = user?.user_metadata || {};

            // Get clinic_id from clinic_users table
            let clinicId: string | null = null;
            if (user) {
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id')
                    .eq('user_id', user.id)
                    .single();
                clinicId = (clinicUser as any)?.clinic_id || null;
            }

            // Fetch CRO from logged-in dentist's profile
            let dentistCRO: string | undefined;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('cro')
                    .eq('id', user.id)
                    .maybeSingle();
                dentistCRO = (profile as any)?.cro || undefined;
            }

            // Fetch clinic contact info from ai_secretary_settings
            let clinicPhone: string | undefined;
            let clinicEmail: string | undefined;
            let clinicAddress: string | undefined;
            if (clinicId) {
                const { data: secretarySettings } = await supabase
                    .from('ai_secretary_settings')
                    .select('clinic_phone, clinic_email, clinic_address')
                    .eq('clinic_id', clinicId)
                    .single();
                if (secretarySettings) {
                    clinicPhone = (secretarySettings as any).clinic_phone || undefined;
                    clinicEmail = (secretarySettings as any).clinic_email || undefined;
                    clinicAddress = (secretarySettings as any).clinic_address || undefined;
                }
            }

            // Generate report number
            const reportNumber = `#${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

            await generatePatientReport({
                patient,
                procedures: proceduresToInclude,
                exams: examsToInclude,
                includeHeader: true,
                notes: notes.trim(),
                clinicName: metadata.clinic_name || 'Organiza Odonto',
                dentistName: metadata.full_name || '',
                dentistCRO,
                clinicPhone,
                clinicEmail,
                clinicAddress,
                reportNumber,
                procedureNames: procedureNameMap,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setGenerating(false);
        }
    };

    // Helper to sanitize description for display (same as generator)
    const sanitizeDescription = (description: string) => {
        if (!description) return '';

        // Split potential Obs part
        const parts = description.split('\n\nObs: ');
        const itemsPart = parts[0];
        const obsPart = parts.length > 1 ? parts[1] : null;

        const lines = itemsPart.split('\n');
        const sanitizedLines: string[] = [];

        lines.forEach(line => {
            const cleanLine = line.trim().replace(/^•\s*/, '');
            if (!cleanLine) return;

            let sections = cleanLine.split(' | ');
            if (sections.length < 3) {
                sections = cleanLine.split(' - ');
            }

            if (sections.length >= 3) {
                // Keep only Treatment and Tooth
                sanitizedLines.push(`${sections[0].trim()} - ${sections[1].trim()} `);
            } else if (!cleanLine.startsWith('Obs:')) {
                sanitizedLines.push(cleanLine);
            }
        });

        // If description is purely observational (starts with "Obs:"), show it
        if (sanitizedLines.length === 0) {
            const obsText = itemsPart.startsWith('Obs: ') ? itemsPart.substring(5) : (obsPart || itemsPart);
            return obsText ? `Obs: ${obsText}` : '';
        }

        return obsPart ? `${sanitizedLines.join('\n')}\n\nObs: ${obsPart}` : sanitizedLines.join('\n');
    };

    const isLoading = loadingProcedures || loadingExams;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gerar Relatório do Paciente</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <span className="loading-spinner">Carregando dados...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-6 px-1">
                        {/* Procedures */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#a03f3d]" />
                                    Procedimentos ({selectedProcedures.length}/{procedures.length})
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setSelectedProcedures(
                                            selectedProcedures.length === procedures.length
                                                ? []
                                                : procedures.map((p) => p.id)
                                        )
                                    }
                                >
                                    {selectedProcedures.length === procedures.length
                                        ? 'Desmarcar Todos'
                                        : 'Marcar Todos'}
                                </Button>
                            </div>

                            <ScrollArea className="h-[200px] border rounded-md p-4">
                                <div className="space-y-4">
                                    {procedures.length > 0 ? (
                                        procedures.map((proc) => (
                                            <div
                                                key={proc.id}
                                                className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                                onClick={() => toggleProcedure(proc.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedProcedures.includes(proc.id)}
                                                    onCheckedChange={() => toggleProcedure(proc.id)}
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <p className="font-medium text-sm text-slate-900 leading-tight">
                                                        {procedureNameMap[proc.id] || sanitizeDescription(proc.description)}
                                                    </p>
                                                    {procedureNameMap[proc.id] && proc.description && (
                                                        <p className="text-xs text-slate-500 line-clamp-1">
                                                            {proc.description.startsWith('Obs: ') ? proc.description.substring(5) : proc.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(new Date(proc.date + 'T00:00:00'), 'dd/MM/yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            Nenhum procedimento registrado.
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Exams */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Search className="w-5 h-5 text-[#a03f3d]" />
                                    Exames ({selectedExams.length}/{exams.length})
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setSelectedExams(
                                            selectedExams.length === exams.length
                                                ? []
                                                : exams.map((e) => e.id)
                                        )
                                    }
                                >
                                    {selectedExams.length === exams.length
                                        ? 'Desmarcar Todos'
                                        : 'Marcar Todos'}
                                </Button>
                            </div>

                            <ScrollArea className="h-[150px] border rounded-md p-4">
                                <div className="space-y-4">
                                    {exams.length > 0 ? (
                                        exams.map((exam) => (
                                            <div
                                                key={exam.id}
                                                className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                                onClick={() => toggleExam(exam.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedExams.includes(exam.id)}
                                                    onCheckedChange={() => toggleExam(exam.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-slate-900">
                                                        {exam.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {format(new Date(exam.order_date + 'T00:00:00'), 'dd/MM/yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            Nenhum exame registrado.
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Observações Adicionais</Label>
                            <Textarea
                                id="notes"
                                placeholder="Digite observações para aparecerem no final do relatório..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-[#a03f3d] hover:bg-[#8b3634] text-white"
                    >
                        {generating ? 'Gerando...' : 'Gerar Relatório PDF'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
