import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import type { Procedure, Exam, Patient } from '../types/database';
import { getAccessibleUrl } from './storage';

interface ReportOptions {
    patient: Patient;
    procedures: Procedure[];
    exams: Exam[];
    includeHeader: boolean;
    notes?: string;
    clinicName?: string;
    clinicLogo?: string;
    dentistName?: string;
    accountType?: 'solo' | 'clinic';
}

export const generatePatientReport = async ({
    patient,
    procedures,
    exams,
    includeHeader,
    notes,
    clinicName = 'Organiza Odonto',
    clinicLogo,
    dentistName,
    accountType = 'solo'
}: ReportOptions) => {

    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

    // Process exams to resolve image URLs
    const examsWithImages = await Promise.all(exams.map(async (exam) => {
        // Collect all potential paths first to deduplicate
        const uniquePaths = new Set<string>();

        if (exam.file_urls && exam.file_urls.length > 0) {
            exam.file_urls.forEach(url => uniquePaths.add(url));
        }

        const images: string[] = [];

        const isImage = (url: string) => {
            if (!url) return false;
            const lowerUrl = url.toLowerCase();
            // Check if it's NOT a PDF and has an image extension (allowing query params)
            if (lowerUrl.includes('.pdf') && !lowerUrl.includes('.pdf?')) return false; // Basic pdf check

            // If explicit type is photo, trust it
            if (exam.type === 'photo') return true;

            // Otherwise check extension, allowing for query params like ?token=...
            // Matches .ext followed by end of string OR ?
            return /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(url);
        };

        // Resolve URLs for unique paths only
        for (const path of uniquePaths) {
            const url = await getAccessibleUrl(path);
            if (url && isImage(url)) {
                images.push(url);
            }
        }

        return { ...exam, resolvedImages: images };
    }));

    // Helper to sanitize description removing values
    const sanitizeDescription = (description: string) => {
        if (!description) return '';

        // Split potential Obs part
        const parts = description.split('\n\nObs: ');
        const itemsPart = parts[0];
        const obsPart = parts.length > 1 ? parts[1] : (itemsPart.startsWith('Obs: ') ? itemsPart.replace('Obs: ', '') : null);

        const lines = itemsPart.split('\n');
        const sanitizedLines: string[] = [];

        lines.forEach(line => {
            const cleanLine = line.trim().replace(/^•\s*/, '');
            if (!cleanLine) return;

            // Check for structure like "Treatment | Tooth | Value" or "Treatment - Tooth - Value"
            let sections = cleanLine.split(' | ');
            if (sections.length < 3) {
                sections = cleanLine.split(' - ');
            }

            if (sections.length >= 3) {
                // Keep only Treatment and Tooth, discard Value
                sanitizedLines.push(`${sections[0].trim()} - ${sections[1].trim()}`);
            } else if (!cleanLine.startsWith('Obs:')) {
                // Keep unstructured lines as is
                sanitizedLines.push(line);
            }
        });

        const result = sanitizedLines.join('\n');
        return obsPart ? `${result}\n\nObs: ${obsPart}` : result;
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório do Paciente</title>
        <style>
            /* ... (styles remain same) ... */
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                padding: 20px; 
                color: #333; 
                line-height: 1.4;
            }
            .header { 
                display: flex; 
                align-items: center; 
                border-bottom: 2px solid #b94a48; 
                padding-bottom: 10px; 
                margin-bottom: 20px; 
            }
            .logo { 
                width: 60px; 
                height: 60px; 
                margin-right: 15px; 
                background-color: #fef2f2;
                border-radius: 8px;
                object-fit: contain;
            }
            .clinic-info { 
                flex: 1; 
            }
            .clinic-title { 
                font-size: 20px; 
                font-weight: bold; 
                color: #b94a48; 
                margin: 0; 
                line-height: 1.2;
            }
            .dentist-title { 
                font-size: 20px; 
                font-weight: bold; 
                color: #000000; 
                margin: 0; 
                line-height: 1.2;
            }
            .sub-title {
                font-size: 14px;
                color: #555;
                margin-top: 2px;
                font-weight: 500;
            }
            .doc-title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 20px;
                color: #1f2937;
            }
            .section { 
                margin-bottom: 20px; 
                break-inside: avoid;
            }
            .section-title { 
                font-size: 14px; 
                font-weight: bold; 
                color: #6b2a28; 
                margin-bottom: 10px; 
                border-bottom: 1px solid #fee2e2; 
                padding-bottom: 5px; 
            }
            .patient-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 5px; 
            }
            th, td { 
                text-align: left; 
                padding: 8px; 
                border-bottom: 1px solid #e5e7eb; 
                font-size: 12px; 
            }
            th { 
                color: #6b2a28; 
                font-weight: 600; 
            }
            tr:last-child td {
                border-bottom: none;
            }
            .exam-item {
                margin-bottom: 15px;
                border: 1px solid #e5e7eb;
                padding: 10px;
                border-radius: 8px;
                background-color: #fafafa;
                break-inside: avoid;
            }
            .exam-header {
                font-weight: bold;
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
                font-size: 12px;
            }
            .exam-images {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 5px;
            }
            .exam-img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
                border: 1px solid #ddd;
                max-height: 250px;
                object-fit: contain;
            }
            .notes-box {
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                padding: 10px;
                border-radius: 8px;
                font-size: 12px;
                white-space: pre-wrap;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
            }
            .page-break {
                page-break-before: always;
                padding-top: 50px;
            }
        </style>
    </head>
    <body>
        ${includeHeader ? `
        <div class="header">
            ${clinicLogo ? `<img src="${clinicLogo}" class="logo" />` : ''}
            <div class="clinic-info">
                ${accountType === 'clinic' ? `
                    <h1 class="clinic-title">${clinicName}</h1>
                    ${dentistName ? `<div class="sub-title">Dr(a). ${dentistName}</div>` : ''}
                ` : `
                    <h1 class="dentist-title">Dr(a). ${dentistName || 'Dentista'}</h1>
                `}
            </div>
        </div>
        ` : ''}

        <div class="doc-title">Relatório de Procedimentos e Exames</div>

        <div class="section">
            <div class="section-title">Paciente</div>
            <div class="patient-name">${patient.name}</div>
        </div>

        ${procedures.length > 0 ? `
        <div class="section">
            <div class="section-title">Procedimentos Realizados</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 120px;">Data</th>
                        <th>Descrição</th>
                    </tr>
                </thead>
                <tbody>
                    ${procedures.map(p => `
                    <tr>
                        <td>${formatDate(p.date)}</td>
                        <td>${sanitizeDescription(p.description)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${examsWithImages.length > 0 ? `
        <div class="section page-break">
            <div class="section-title">Exames</div>
            ${examsWithImages.map(e => `
            <div class="exam-item">
                <div class="exam-header">
                    <span>${e.name}</span>
                    <span style="font-weight: normal; color: #666;">${formatDate(e.order_date)}</span>
                </div>
                ${e.resolvedImages && e.resolvedImages.length > 0 ? `
                <div class="exam-images">
                    ${e.resolvedImages.map(img => `<img src="${img}" class="exam-img" />`).join('')}
                </div>
                ` : '<div style="font-style: italic; color: #888;">Sem imagens disponíveis (apenas documento ou pendente)</div>'}
            </div>
            `).join('')}
        </div>
        ` : ''}

        ${notes ? `
        <div class="section">
            <div class="section-title">Observações</div>
            <div class="notes-box">
                ${notes}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br>
            ${clinicName}
        </div>
    </body>
    </html>
    `;

    try {
        const { uri } = await printToFileAsync({
            html: htmlContent,
            base64: false
        });

        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

interface BudgetPDFData {
    budget: any;
    patientName: string;
    clinicName?: string;
    dentistName?: string | null;
    logoUrl?: string | null;
    letterheadUrl?: string | null;
    clinicAddress?: string;
    clinicPhone?: string;
    isClinic?: boolean;
}

const formatMoney = (value: number) => {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'approved': return 'Confirmado';
        case 'paid': return 'Pago';
        default: return 'Pendente';
    }
};

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'approved': return '#16a34a'; // Green
        case 'paid': return '#2563eb'; // Blue
        default: return '#ca8a04'; // Yellow/amber
    }
};

export const generateBudgetPDFHtml = (data: BudgetPDFData) => {
    const { budget, patientName, clinicName, dentistName, logoUrl, isClinic } = data;

    const teeth = JSON.parse(budget.notes || '{"teeth":[]}').teeth || [];

    // Calculate validity date (30 days from budget date)
    const budgetDate = new Date(budget.date + 'T00:00:00');
    const validityDate = new Date(budgetDate);
    validityDate.setDate(validityDate.getDate() + 30);

    // Get unique treatments for tags
    const allTreatments = [...new Set(teeth.flatMap((t: any) => t.treatments))];

    // Generate budget number
    const year = budgetDate.getFullYear();
    const budgetNumber = `ORC-${year}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

    // Get dentist display name
    const responsibleName = dentistName || clinicName || 'Dentista';

    // Status icon SVGs
    const checkIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const clockIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=750, shrink-to-fit=yes">
        <title>Orçamento</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                padding: 24px;
                color: #1f2937;
                line-height: 1.5;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                min-width: 750px;
            }
            .container {
                width: 750px;
                margin: 0 auto;
            }

            /* Header */
            .header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 12px;
            }
            .header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .header-icon {
                width: 40px;
                height: 40px;
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header-icon svg {
                width: 20px;
                height: 20px;
                color: #b94a48;
            }
            .header-title {
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
            }
            .header-subtitle {
                font-size: 12px;
                color: #6b7280;
                margin-top: 2px;
            }
            .header-right {
                text-align: right;
            }
            .budget-number {
                display: inline-block;
                padding: 4px 12px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 4px;
            }
            .budget-date {
                font-size: 12px;
                color: #6b7280;
                display: flex;
                align-items: center;
                gap: 4px;
                justify-content: flex-end;
            }

            /* Info Card */
            .info-card {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .info-item {
                flex: 1 1 200px;
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            .info-icon {
                width: 32px;
                height: 32px;
                background-color: #ffffff;
                border: 1px solid #fecaca;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .info-icon svg {
                width: 16px;
                height: 16px;
                color: #b94a48;
            }
            .info-label {
                font-size: 10px;
                font-weight: 600;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .info-value {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }
            .info-sub {
                font-size: 11px;
                color: #6b7280;
                margin-top: 2px;
            }
            .treatment-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 4px;
            }
            .treatment-tag {
                display: inline-block;
                padding: 3px 8px;
                background: white;
                border-radius: 4px;
                font-size: 11px;
                color: #374151;
            }

            /* Items Card */
            .items-card {
                background-color: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .items-title {
                font-size: 16px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 4px;
            }
            .items-subtitle {
                font-size: 12px;
                color: #374151;
                margin-bottom: 16px;
            }

            /* Table */
            .table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .table th {
                text-align: left;
                padding: 10px 6px;
                font-size: 10px;
                font-weight: 600;
                color: #1f2937;
                border-bottom: 1px solid #f3f4f6;
            }
            .table th:first-child { width: 60px; }
            .table th:nth-child(2) { width: 45%; }
            .table th:nth-child(3) { width: 120px; text-align: center; }
            .table th:last-child { width: 100px; text-align: right; }
            .table td:nth-child(3) { text-align: center; }
            .table td {
                padding: 12px 6px;
                font-size: 12px;
                border-bottom: 1px solid #f3f4f6;
                vertical-align: middle;
            }
            .table td:first-child {
                font-weight: 500;
                color: #6b7280;
            }
            .table td:last-child {
                text-align: right;
                font-weight: 600;
                color: #1f2937;
            }
            .table tr:last-child td {
                border-bottom: none;
            }

            /* Status badges */
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .status-paid {
                background-color: #dbeafe;
                color: #1d4ed8;
                border: 1px solid #93c5fd;
            }
            .status-approved {
                background-color: #dcfce7;
                color: #15803d;
                border: 1px solid #86efac;
            }
            .status-pending {
                background-color: #fef3c7;
                color: #b45309;
                border: 1px solid #fcd34d;
            }

            /* Totals */
            .totals {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 2px solid #f3f4f6;
                text-align: right;
            }
            .subtotal-row {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
            }
            .subtotal-row span {
                font-weight: 600;
                color: #1f2937;
                margin-left: 16px;
            }
            .total-row {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
            }
            .total-row span {
                font-size: 20px;
                font-weight: 700;
                color: #b94a48;
                margin-left: 16px;
            }

            /* Footer */
            .footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
                font-size: 11px;
                color: #9ca3af;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="header-left">
                    <div>
                        <div class="header-title">Orçamento Odontológico</div>
                        <div class="header-subtitle">Proposta de Tratamento Personalizada</div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="budget-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${budgetDate.toLocaleDateString('pt-BR')}
                    </div>
                </div>
            </div>

            <!-- Info Card -->
            <div class="info-card">
                <div class="info-item">
                    <div class="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div>
                        <div class="info-label">Paciente</div>
                        <div class="info-value">${patientName}</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                    </div>
                    <div>
                        <div class="info-label">Tratamento Proposto</div>
                        <div class="treatment-tags">
                            ${allTreatments.map((t: any) => `<span class="treatment-tag">${t}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <div class="info-label">Validade</div>
                        <div class="info-value">${validityDate.toLocaleDateString('pt-BR')}</div>
                        <div class="info-sub">Responsável: ${responsibleName}</div>
                    </div>
                </div>
            </div>

            <!-- Items Card -->
            <div class="items-card">
                <div class="items-title">Itens do Orçamento</div>
                <div class="items-subtitle">Detalhamento dos procedimentos clínicos</div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Dente</th>
                            <th>Procedimento</th>
                            <th>Status</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teeth.map((t: any) => {
                            const status = t.status || 'pending';
                            const statusLabel = getStatusLabel(status);
                            const statusClass = status === 'paid' ? 'status-paid' : status === 'approved' ? 'status-approved' : 'status-pending';
                            const icon = status === 'pending' ? clockIcon : checkIcon;
                            const itemValue = Object.values(t.values as object).reduce((a: any, b: any) => a + Number(b), 0) / 100;
                            const toothNumber = t.tooth.includes('Arcada') ? t.tooth : t.tooth;
                            return `
                            <tr>
                                <td>${toothNumber}</td>
                                <td>${t.treatments.join(', ')}</td>
                                <td><span class="status-badge ${statusClass}">${icon} ${statusLabel}</span></td>
                                <td>R$ ${formatMoney(itemValue)}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">Valor Total <span>R$ ${formatMoney(budget.value)}</span></div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Este orçamento tem validade de 30 dias a partir da data de emissão.<br>
                Os valores podem sofrer alterações após este período.
            </div>
        </div>
    </body>
    </html>
    `;
};

export const generateBudgetPDFFile = async (data: BudgetPDFData) => {
    const html = generateBudgetPDFHtml(data);
    const { uri } = await printToFileAsync({
        html,
        base64: false
    });
    return uri;
};

export const sharePDF = async (uri: string) => {
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};
