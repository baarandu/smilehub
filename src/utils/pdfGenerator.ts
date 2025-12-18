import jsPDF from 'jspdf';
import type { BudgetWithItems } from '@/types/database';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';

interface BudgetPDFData {
    budget: BudgetWithItems;
    patientName: string;
    clinicName?: string;
    dentistName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
    clinicAddress?: string;
    clinicPhone?: string;
}

// Helper function to load image as base64
async function loadImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            console.error('Failed to fetch image:', response.status);
            return null;
        }
        const blob = await response.blob();

        // Detect format from MIME type
        let format = 'PNG';
        if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
            format = 'JPEG';
        } else if (blob.type.includes('webp')) {
            format = 'WEBP';
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (result) {
                    resolve({ data: result, format });
                } else {
                    resolve(null);
                }
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
}

// Core function that builds the PDF document
async function buildPDFDocument(data: BudgetPDFData): Promise<jsPDF> {
    const { budget, patientName, clinicName, dentistName, logoUrl, letterheadUrl, clinicAddress, clinicPhone } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 30; // Increased initial y to avoid top letterhead area
    let textStartX = margin;

    // Parse teeth from notes
    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Helper to add background to current page
    const addBackground = async () => {
        if (letterheadUrl) {
            try {
                const letterheadData = await loadImageAsBase64(letterheadUrl);
                if (letterheadData) {
                    doc.addImage(letterheadData.data, letterheadData.format, 0, 0, pageWidth, pageHeight);
                }
            } catch (error) {
                console.error('Error adding letterhead to PDF:', error);
            }
        }
    };

    // Add background to the first page
    await addBackground();

    // Load and add logo if available (only if no letterhead)
    if (logoUrl && !letterheadUrl) {
        try {
            const logoData = await loadImageAsBase64(logoUrl);
            if (logoData) {
                const logoWidth = 30;
                const logoHeight = 30;
                doc.addImage(logoData.data, logoData.format, margin, y, logoWidth, logoHeight);
                textStartX = margin + logoWidth + 10;
            }
        } catch (error) {
            console.error('Error adding logo to PDF:', error);
        }
    }

    // Header - Clinic Name (skip if letterhead present as it likely contains it)
    if (!letterheadUrl) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(clinicName || 'Clínica Odontológica', textStartX, y);
        y += 8;

        if (dentistName) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(dentistName, textStartX, y);
            doc.setTextColor(0, 0, 0);
            y += 6;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (clinicAddress) {
            doc.text(clinicAddress, textStartX, y);
            y += 5;
        }
        if (clinicPhone) {
            doc.text(`Tel: ${clinicPhone}`, textStartX, y);
            y += 5;
        }
    } else {
        // If letterhead is present, we start directly with the budget info but lower down
        y = 50;
    }

    // Divider
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ORÇAMENTO ODONTOLÓGICO', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Patient Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(patientName, margin + 25, y);

    // Date - right aligned
    const dateText = `Data: ${formatDisplayDate(budget.date)}`;
    doc.text(dateText, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // Treatment Title
    doc.setFont('helvetica', 'bold');
    doc.text('Tratamento Proposto:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(budget.treatment || 'Tratamento Odontológico', margin + 48, y);
    y += 15;

    // Divider
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Items Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ITENS DO ORÇAMENTO', margin, y);
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin + 2, y);
    doc.text('Procedimentos', margin + 60, y);
    doc.text('Valor', pageWidth - margin - 30, y);
    y += 10;

    // Items
    doc.setFont('helvetica', 'normal');
    let totalValue = 0;
    let index = 0;
    for (const tooth of teeth) {
        // Check if we need a new page
        if (y > 260) {
            doc.addPage();
            await addBackground();
            y = 40; // Higher margin on new pages as well
        }

        const toothName = getToothDisplayName(tooth.tooth);
        const treatments = tooth.treatments.join(', ');
        const itemValue = Object.values(tooth.values).reduce(
            (sum, val) => sum + (parseFloat(val as string) || 0) / 100,
            0
        );
        totalValue += itemValue;

        // Item row with subtle background for alternating rows
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
        }

        doc.setFontSize(9);
        doc.text(toothName, margin + 2, y);

        // Truncate treatments if too long
        const maxWidth = 80;
        let displayTreatments = treatments;
        if (doc.getTextWidth(treatments) > maxWidth) {
            while (doc.getTextWidth(displayTreatments + '...') > maxWidth && displayTreatments.length > 0) {
                displayTreatments = displayTreatments.slice(0, -1);
            }
            displayTreatments += '...';
        }
        doc.text(displayTreatments, margin + 60, y);

        doc.text(`R$ ${formatMoney(itemValue)}`, pageWidth - margin - 2, y, { align: 'right' });

        y += 8;
        index++;
    }

    // Total
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL:', margin, y);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`R$ ${formatMoney(budget.value)}`, pageWidth - margin, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Footer
    y += 20;
    if (y < 250) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('Este orçamento tem validade de 30 dias.', margin, y);
        y += 5;
        doc.text('Os valores podem sofrer alterações após este período.', margin, y);
    }

    return doc;
}

// Generate PDF and return blob URL for preview
export async function generateBudgetPDFPreview(data: BudgetPDFData): Promise<string> {
    const doc = await buildPDFDocument(data);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
}

// Generate PDF and download
export async function generateBudgetPDF(data: BudgetPDFData): Promise<void> {
    const doc = await buildPDFDocument(data);
    const filename = `orcamento_${data.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

// Download from existing blob URL
export function downloadPDFFromBlob(blobUrl: string, patientName: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `orcamento_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

