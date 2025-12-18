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
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Generate HTML string for preview
export function generateBudgetPDFHtml(data: BudgetPDFData): string {
    const { budget, patientName, clinicName, dentistName, logoUrl } = data;

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
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${toothName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${treatments}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${formatMoney(itemValue)}</td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            color: #333;
        }
        .header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ddd;
        }
        .clinic-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .dentist-name {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .label {
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th {
            background-color: #f0f0f0;
            padding: 10px 8px;
            text-align: left;
            font-size: 12px;
        }
        th:last-child {
            text-align: right;
        }
        .total-row {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #333;
            display: flex;
            justify-content: space-between;
            font-size: 16px;
        }
        .total-label {
            font-weight: bold;
        }
        .total-value {
            font-weight: bold;
            color: #10b981;
            font-size: 18px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            font-size: 11px;
            color: #888;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; align-items: center; gap: 15px;">
            ${logoUrl ? `<img src="${logoUrl}" style="width: 60px; height: 60px; object-fit: contain;" />` : ''}
            <div>
                <div class="clinic-name">${clinicName || 'Clínica Odontológica'}</div>
                ${dentistName ? `<div class="dentist-name">${dentistName}</div>` : ''}
            </div>
        </div>
    </div>

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
                <th>Item</th>
                <th>Procedimentos</th>
                <th>Valor</th>
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
        <p>Este orçamento tem validade de 30 dias.</p>
        <p>Os valores podem sofrer alterações após este período.</p>
    </div>
</body>
</html>
    `;
}

// Generate PDF file and return URI (without sharing)
export async function generateBudgetPDFFile(data: BudgetPDFData): Promise<string> {
    const html = generateBudgetPDFHtml(data);
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

