
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProcedures } from '@/hooks/useProcedures';
import { useExams } from '@/hooks/useExams';
import { generatePatientReport } from '@/utils/patientReportGenerator';
import type { Patient } from '@/types/database';
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

    const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [includeHeader, setIncludeHeader] = useState(true);
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

            await generatePatientReport({
                patient,
                procedures: proceduresToInclude,
                exams: examsToInclude,
                includeHeader,
                notes: notes.trim(),
                clinicName: metadata.clinic_name || 'Organiza Odonto',
                dentistName: metadata.full_name || '',
                accountType: (metadata.account_type as 'solo' | 'clinic') || 'solo',
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

        return sanitizedLines.join('\n');
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
                        {/* Header Option */}
                        <div className="flex items-center space-x-2 border p-4 rounded-lg bg-slate-50">
                            <Checkbox
                                id="header"
                                checked={includeHeader}
                                onCheckedChange={(checked) => setIncludeHeader(!!checked)}
                            />
                            <Label htmlFor="header" className="cursor-pointer font-medium">
                                Incluir Cabeçalho Personalizado
                            </Label>
                        </div>

                        {/* Procedures */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-teal-600" />
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
                                                        {sanitizeDescription(proc.description)}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(new Date(proc.date), 'dd/MM/yyyy')}
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
                                    <Search className="w-5 h-5 text-teal-600" />
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
                                                        {format(new Date(exam.order_date), 'dd/MM/yyyy')}
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
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        {generating ? 'Gerando...' : 'Gerar Relatório PDF'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
