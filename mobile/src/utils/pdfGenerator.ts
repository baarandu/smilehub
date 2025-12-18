import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { BudgetWithItems } from '../types/database';
import { getToothDisplayName, formatMoney, type ToothEntry } from '../components/patients/budgetUtils';

interface BudgetPDFData {
    budget: BudgetWithItems;
    patientName: string;
    clinicName?: string;
    dentistName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
}

// Helper to load image as base64 for PDF embedding
async function loadImageAsBase64(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image as base64:', error);
        return null;
    }
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Generate HTML string for preview
export function generateBudgetPDFHtml(data: BudgetPDFData): string {
    const { budget, patientName, clinicName, dentistName, logoUrl, letterheadUrl } = data;

    // Parse teeth from notes
    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Generate items HTML
    const itemsHtml = teeth.map((tooth, index) => {
        const toothName = getToothDisplayName(tooth.tooth);
        const treatments = tooth.treatments.join(', ');
        const itemValue = Object.values(tooth.values).reduce(
            (sum, val) => sum + (parseFloat(val as string) || 0) / 100,
            0
        );

        return `
            <tr style="background-color: ${index % 2 === 0 ? '#fafafa' : 'white'}">
                <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">${toothName}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">${treatments}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${formatMoney(itemValue)}</td>
            </tr>
        `;
    }).join('');

    const backgroundHtml = letterheadUrl
        ? `<div style="position: fixed; top: 0; left: 0; right: 0; margin-left: auto; margin-right: auto; width: 210mm; height: 297mm; z-index: -1;">
             <img src="${letterheadUrl}" style="width: 100%; height: 100%; object-fit: fill; border: none; padding: 0; margin: 0; display: block;" />
           </div>`
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
        }
        body {
            font-family: Arial, sans-serif;
            min-height: 297mm;
            box-sizing: border-box;
            color: #000;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background: transparent !important;
        }
        .container {
            width: 210mm;
            padding: 60mm 20mm 30mm;
            box-sizing: border-box;
            margin: 0 auto;
        }
        .header-content {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .clinic-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .dentist-name {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
        }
        .title {
            text-align: center;
            margin-bottom: 25px;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 13px;
        }
        .label {
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
        }
        th {
            background-color: #f5f5f5;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
        }
        th:last-child {
            text-align: right;
        }
        .total-row {
            margin-top: 25px;
            padding: 15px 0;
            border-top: 1.5px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .total-label {
            font-weight: bold;
            font-size: 15px;
        }
        .total-value {
            font-weight: bold;
            color: #10B981;
            font-size: 20px;
        }
        .footer {
            margin-top: 40px;
            font-size: 11px;
            color: #666;
            font-style: italic;
            text-align: justify;
        }
    </style>
</head>
<body>
    ${backgroundHtml}
    <div class="container">
        ${!letterheadUrl ? `
        <div class="header-content">
            <div style="display: flex; align-items: center; gap: 15px;">
                ${logoUrl ? `<img src="${logoUrl}" style="width: 50px; height: 50px; object-fit: contain;" />` : ''}
                <div>
                    <div class="clinic-name">${clinicName || 'Clínica Odontológica'}</div>
                    ${dentistName ? `<div class="dentist-name">${dentistName}</div>` : ''}
                </div>
            </div>
        </div>
        ` : ''}

        <div class="title">ORÇAMENTO ODONTOLÓGICO</div>

        <div class="info-row">
            <span><span class="label">Paciente:</span> ${patientName}</span>
            <span><span class="label">Data:</span> ${formatDisplayDate(budget.date)}</span>
        </div>

        <div class="info-row">
            <span><span class="label">Tratamento Proposto:</span> ${budget.treatment || 'Tratamento Odontológico'}</span>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25%">Item</th>
                    <th style="width: 50%">Procedimentos</th>
                    <th style="width: 25%; text-align: right;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="total-row">
            <span class="total-label">VALOR TOTAL:</span>
            <span class="total-value">R$ ${formatMoney(budget.value)}</span>
        </div>

        <div class="footer">
            <p>Este orçamento tem validade de 30 dias. Os valores podem sofrer alterações após este período.</p>
        </div>
    </div>
</body>
</html>
    `;
}

// Generate PDF file and return URI (without sharing)
export async function generateBudgetPDFFile(data: BudgetPDFData): Promise<string> {
    const letterheadBase64 = await loadImageAsBase64(data.letterheadUrl || null);
    const html = generateBudgetPDFHtml({
        ...data,
        letterheadUrl: letterheadBase64 || data.letterheadUrl
    });
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
}

// Share an existing PDF file
export async function sharePDF(uri: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Compartilhar Orçamento',
            UTI: 'com.adobe.pdf'
        });
    }
}

// Legacy function: Generate PDF and share directly (for backwards compatibility)
export async function generateBudgetPDF(data: BudgetPDFData): Promise<void> {
    const uri = await generateBudgetPDFFile(data);
    await sharePDF(uri);
}

