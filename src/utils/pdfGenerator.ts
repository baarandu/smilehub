import jsPDF from 'jspdf';
import type { BudgetWithItems } from '@/types/database';
import { formatMoney, type ToothEntry } from '@/utils/budgetUtils';

interface BudgetPDFData {
    budget: BudgetWithItems;
    patientName: string;
    clinicName?: string;
    dentistName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
    clinicAddress?: string;
    clinicPhone?: string;
    isClinic?: boolean;
    dentistCRO?: string | null;
}

// Helper to get status label
function getStatusLabel(status: string): string {
    switch (status) {
        case 'approved': return 'Confirmado';
        case 'paid': return 'Pago';
        default: return 'Pendente';
    }
}

// Helper to draw rounded rectangle
function drawRoundedRect(doc: jsPDF, x: number, y: number, width: number, height: number, radius: number, fill: boolean = true) {
    doc.roundedRect(x, y, width, height, radius, radius, fill ? 'F' : 'S');
}

// Core function that builds the PDF document
async function buildPDFDocument(data: BudgetPDFData): Promise<jsPDF> {
    const { budget, patientName, clinicName, dentistName, dentistCRO } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Parse teeth from notes
    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Calculate dates
    const budgetDate = new Date(budget.date + 'T00:00:00');
    const validityDate = new Date(budgetDate);
    validityDate.setDate(validityDate.getDate() + 30);

    // Get unique treatments
    const allTreatments = [...new Set(teeth.flatMap(t => t.treatments))];

    // Generate budget number
    const year = budgetDate.getFullYear();
    const budgetNumber = `ORC-${year}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

    // Get responsible name
    const responsibleName = dentistName || clinicName || 'Dentista';
    const croText = dentistCRO ? ` — CRO ${dentistCRO}` : '';

    // ========== HEADER ==========
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('Orçamento Odontológico', margin, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('Proposta de Tratamento Personalizada', margin, y + 13);

    // Calendar icon + date (right side)
    const dateText = budgetDate.toLocaleDateString('pt-BR');
    const dateTextWidth = doc.getTextWidth(dateText);
    const calendarX = pageWidth - margin - dateTextWidth - 10;

    // Draw calendar icon (Lucide style)
    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.4);
    doc.roundedRect(calendarX, y + 2, 6, 6, 0.8, 0.8, 'S'); // Calendar body
    doc.line(calendarX + 1.5, y + 1, calendarX + 1.5, y + 3); // Left pin
    doc.line(calendarX + 4.5, y + 1, calendarX + 4.5, y + 3); // Right pin
    doc.line(calendarX, y + 4, calendarX + 6, y + 4); // Divider line

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(dateText, pageWidth - margin, y + 7, { align: 'right' });

    y += 25;

    // ========== INFO CARD ==========
    // Draw card background (light burgundy/red)
    doc.setFillColor(254, 242, 242);
    drawRoundedRect(doc, margin, y, pageWidth - 2 * margin, 35, 4);

    const infoY = y + 8;
    const colWidth = (pageWidth - 2 * margin - 20) / 3;

    // Column 1: Patient
    let colX = margin + 8;

    // Icon background
    doc.setFillColor(255, 255, 255);
    drawRoundedRect(doc, colX, infoY - 2, 10, 10, 2);

    // Person icon (like mobile - head circle + shoulders curve)
    doc.setDrawColor(185, 74, 72);
    doc.setLineWidth(0.4);
    doc.circle(colX + 5, infoY + 1, 1.5, 'S'); // Head
    // Shoulders/body curve
    doc.line(colX + 2, infoY + 7, colX + 3, infoY + 5);
    doc.line(colX + 3, infoY + 5, colX + 7, infoY + 5);
    doc.line(colX + 7, infoY + 5, colX + 8, infoY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text('PACIENTE', colX + 13, infoY + 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);

    // Truncate patient name if too long
    let displayName = patientName;
    const maxNameWidth = colWidth - 15;
    while (doc.getTextWidth(displayName) > maxNameWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
    }
    if (displayName !== patientName) displayName += '...';
    doc.text(displayName, colX + 13, infoY + 9);

    // Column 2: Treatment
    colX = margin + 8 + colWidth + 5;

    // Icon background
    doc.setFillColor(255, 255, 255);
    drawRoundedRect(doc, colX, infoY - 2, 10, 10, 2);

    // Document icon (like mobile - rectangle with folded corner)
    doc.setDrawColor(185, 74, 72);
    doc.setLineWidth(0.4);
    // Main document outline
    doc.line(colX + 2.5, infoY - 0.5, colX + 2.5, infoY + 6); // Left
    doc.line(colX + 2.5, infoY + 6, colX + 7.5, infoY + 6); // Bottom
    doc.line(colX + 7.5, infoY + 6, colX + 7.5, infoY + 1.5); // Right
    doc.line(colX + 7.5, infoY + 1.5, colX + 5.5, infoY - 0.5); // Diagonal fold
    doc.line(colX + 5.5, infoY - 0.5, colX + 2.5, infoY - 0.5); // Top
    // Fold corner
    doc.line(colX + 5.5, infoY - 0.5, colX + 5.5, infoY + 1.5); // Fold vertical
    doc.line(colX + 5.5, infoY + 1.5, colX + 7.5, infoY + 1.5); // Fold horizontal
    // Small content rectangle inside
    doc.setFillColor(185, 74, 72);
    doc.rect(colX + 3.5, infoY + 3, 3, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text('TRATAMENTO PROPOSTO', colX + 13, infoY + 2);

    // Treatment tags
    let tagX = colX + 13;
    let tagY = infoY + 7;
    doc.setFontSize(8);
    for (let i = 0; i < Math.min(allTreatments.length, 3); i++) {
        const treatment = allTreatments[i];
        const tagWidth = doc.getTextWidth(treatment) + 6;

        if (tagX + tagWidth > colX + colWidth - 5) {
            tagX = colX + 13;
            tagY += 6;
        }

        doc.setFillColor(255, 255, 255);
        drawRoundedRect(doc, tagX, tagY - 3, tagWidth, 5, 1.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(treatment, tagX + 3, tagY);
        tagX += tagWidth + 2;
    }
    if (allTreatments.length > 3) {
        doc.text(`+${allTreatments.length - 3}`, tagX + 2, tagY);
    }

    // Column 3: Validity
    colX = margin + 8 + (colWidth + 5) * 2;

    // Icon background
    doc.setFillColor(255, 255, 255);
    drawRoundedRect(doc, colX, infoY - 2, 10, 10, 2);

    // Clock icon (Lucide Clock style)
    doc.setDrawColor(185, 74, 72);
    doc.setLineWidth(0.4);
    doc.circle(colX + 5, infoY + 3, 3.5, 'S'); // Clock face
    // Clock hands
    doc.line(colX + 5, infoY + 3, colX + 5, infoY + 0.8); // Hour hand (12 o'clock)
    doc.line(colX + 5, infoY + 3, colX + 7, infoY + 4.2); // Minute hand

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text('VALIDADE', colX + 13, infoY + 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(validityDate.toLocaleDateString('pt-BR'), colX + 13, infoY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Responsável: ${responsibleName}${croText}`, colX + 13, infoY + 15);

    y += 45;

    // ========== ITEMS CARD ==========
    // Draw white card with shadow effect
    doc.setFillColor(250, 250, 250);
    drawRoundedRect(doc, margin + 1, y + 1, pageWidth - 2 * margin, 10, 4); // Shadow
    doc.setFillColor(255, 255, 255);
    drawRoundedRect(doc, margin, y, pageWidth - 2 * margin, 10, 4);

    // Card title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.text('Itens do Orçamento', margin + 10, y + 8);

    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text('Detalhamento dos procedimentos clínicos', margin + 10, y + 4);

    y += 12;

    // Table header
    const tableX = margin + 5;
    const tableWidth = pageWidth - 2 * margin - 10;
    const col1 = tableX;
    const col2 = tableX + 40;
    const col3 = tableX + tableWidth - 80;
    const col4 = tableX + tableWidth - 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Dente', col1, y);
    doc.text('Procedimento', col2, y);
    doc.text('Status', col3, y);
    doc.text('Valor', col4, y, { align: 'right' });

    y += 3;
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.3);
    doc.line(tableX, y, tableX + tableWidth, y);

    y += 7;

    // Table rows
    for (const tooth of teeth) {
        // Check if we need a new page
        if (y > 265) {
            doc.addPage();
            y = 20;
        }

        const toothNumber = tooth.tooth.includes('Arcada') ? tooth.tooth : tooth.tooth;
        const treatments = tooth.treatments.join(', ');
        const itemValue = Object.values(tooth.values).reduce(
            (sum, val) => sum + (parseFloat(val as string) || 0) / 100,
            0
        );
        const status = tooth.status || 'pending';
        const statusLabel = getStatusLabel(status);

        // Tooth number
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(toothNumber, col1, y);

        // Procedure
        doc.setTextColor(31, 41, 55);
        let displayTreatment = treatments;
        const maxTreatmentWidth = col3 - col2 - 10;
        while (doc.getTextWidth(displayTreatment) > maxTreatmentWidth && displayTreatment.length > 0) {
            displayTreatment = displayTreatment.slice(0, -1);
        }
        if (displayTreatment !== treatments) displayTreatment += '...';
        doc.text(displayTreatment, col2, y);

        // Status badge
        const badgeWidth = doc.getTextWidth(statusLabel) + 12;
        const badgeX = col3 - 5;
        const badgeY = y - 3;

        if (status === 'paid') {
            doc.setFillColor(219, 234, 254); // Blue bg
            doc.setTextColor(29, 78, 216); // Blue text
        } else if (status === 'approved') {
            doc.setFillColor(220, 252, 231); // Green bg
            doc.setTextColor(21, 128, 61); // Green text
        } else {
            doc.setFillColor(254, 243, 199); // Yellow bg
            doc.setTextColor(180, 83, 9); // Yellow text
        }

        drawRoundedRect(doc, badgeX, badgeY, badgeWidth, 6, 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(statusLabel, badgeX + 6, y);

        // Value
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`R$ ${formatMoney(itemValue)}`, col4, y, { align: 'right' });

        // Row separator
        y += 4;
        doc.setDrawColor(243, 244, 246);
        doc.line(tableX, y, tableX + tableWidth, y);

        y += 8;
    }

    // ========== TOTALS ==========
    y += 5;
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.5);
    doc.line(tableX + tableWidth - 80, y, tableX + tableWidth, y);

    y += 10;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('Valor Total', col4 - 60, y);
    doc.setFontSize(16);
    doc.setTextColor(185, 74, 72); // Burgundy
    doc.text(`R$ ${formatMoney(budget.value)}`, col4, y, { align: 'right' });

    // ========== FOOTER ==========
    y += 20;
    if (y < 270) {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        const footerText = 'Este orçamento tem validade de 30 dias a partir da data de emissão. Os valores podem sofrer alterações após este período.';
        doc.text(footerText, pageWidth / 2, y, { align: 'center', maxWidth: pageWidth - 2 * margin });
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
