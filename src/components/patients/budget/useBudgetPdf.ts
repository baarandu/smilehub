import { useState } from 'react';
import { profileService } from '@/services/profile';
import { generateBudgetPDFPreview, downloadPDFFromBlob } from '@/utils/pdfGenerator';
import type { ToothEntry } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';

interface UseBudgetPdfProps {
    budget: BudgetWithItems;
    parsedNotes: any;
    teeth: ToothEntry[];
    patientName: string;
    getItemValue: (tooth: ToothEntry) => number;
    toast: (opts: { title: string; description: string; variant?: 'destructive' }) => void;
}

export function useBudgetPdf({ budget, parsedNotes, teeth, patientName, getItemValue, toast }: UseBudgetPdfProps) {
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [showPdfItemSelection, setShowPdfItemSelection] = useState(false);
    const [pdfSelectedItems, setPdfSelectedItems] = useState<Set<number>>(new Set());

    const handleOpenPdfSelection = () => {
        const allIndices = new Set(teeth.map((_, index) => index));
        setPdfSelectedItems(allIndices);
        setShowPdfItemSelection(true);
    };

    const togglePdfItemSelection = (index: number) => {
        setPdfSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleAllPdfItems = () => {
        if (pdfSelectedItems.size === teeth.length) {
            setPdfSelectedItems(new Set());
        } else {
            setPdfSelectedItems(new Set(teeth.map((_, index) => index)));
        }
    };

    const handleExportPDF = async () => {
        if (pdfSelectedItems.size === 0) return;

        setShowPdfItemSelection(false);

        try {
            setGeneratingPdf(true);
            setShowPdfPreview(true);

            const clinicInfo = await profileService.getClinicInfo();

            const selectedTeeth = teeth.filter((_, index) => pdfSelectedItems.has(index));
            const selectedTotal = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

            const filteredBudget = {
                ...budget,
                notes: JSON.stringify({ ...parsedNotes, teeth: selectedTeeth }),
                value: selectedTotal
            };

            const blobUrl = await generateBudgetPDFPreview({
                budget: filteredBudget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
                isClinic: clinicInfo.isClinic,
            });

            setPdfPreviewUrl(blobUrl);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar PDF" });
            setShowPdfPreview(false);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleDownloadPDF = () => {
        if (pdfPreviewUrl) {
            downloadPDFFromBlob(pdfPreviewUrl, patientName || 'Paciente');
            toast({ title: "Sucesso", description: "PDF baixado com sucesso!" });
        }
    };

    const handleClosePdfPreview = () => {
        setShowPdfPreview(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    };

    const getSelectedTotal = () => {
        return teeth
            .filter((_, index) => pdfSelectedItems.has(index))
            .reduce((sum, t) => sum + getItemValue(t), 0);
    };

    return {
        showPdfPreview,
        pdfPreviewUrl,
        generatingPdf,
        showPdfItemSelection,
        pdfSelectedItems,
        setShowPdfItemSelection,
        handleOpenPdfSelection,
        togglePdfItemSelection,
        toggleAllPdfItems,
        handleExportPDF,
        handleDownloadPDF,
        handleClosePdfPreview,
        getSelectedTotal,
    };
}
