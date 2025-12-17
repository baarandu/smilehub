import jsPDF from 'jspdf';
import type { BudgetWithItems } from '@/types/database';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';

interface BudgetPDFData {
    budget: BudgetWithItems;
    patientName: string;
    clinicName?: string;
    dentistName?: string | null; // Shown below clinic name if different
    clinicAddress?: string;
    clinicPhone?: string;
}

export function generateBudgetPDF(data: BudgetPDFData): void {
    const { budget, patientName, clinicName, dentistName, clinicAddress, clinicPhone } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Parse teeth from notes
    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Header - Clinic Name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(clinicName || 'Clínica Odontológica', margin, y);

    y += 8;

    // Dentist Name (if clinic has a different dentist)
    if (dentistName) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(dentistName, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (clinicAddress) {
        doc.text(clinicAddress, margin, y);
        y += 5;
    }
    if (clinicPhone) {
        doc.text(`Tel: ${clinicPhone}`, margin, y);
        y += 5;
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
    y += 10;

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

    teeth.forEach((tooth, index) => {
        // Check if we need a new page
        if (y > 260) {
            doc.addPage();
            y = 20;
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
    });

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

        // Signature lines
        y += 25;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        const lineWidth = 70;
        const leftLineX = margin + 20;
        const rightLineX = pageWidth - margin - 90;

        doc.line(leftLineX, y, leftLineX + lineWidth, y);
        doc.line(rightLineX, y, rightLineX + lineWidth, y);

        y += 5;
        doc.setFontSize(9);
        doc.text('Assinatura do Profissional', leftLineX + lineWidth / 2, y, { align: 'center' });
        doc.text('Assinatura do Paciente', rightLineX + lineWidth / 2, y, { align: 'center' });
    }

    // Save the PDF
    const filename = `orcamento_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
