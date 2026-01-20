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
                border-bottom: 2px solid #0d9488; 
                padding-bottom: 10px; 
                margin-bottom: 20px; 
            }
            .logo { 
                width: 60px; 
                height: 60px; 
                margin-right: 15px; 
                background-color: #f0fdfa;
                border-radius: 8px;
                object-fit: contain;
            }
            .clinic-info { 
                flex: 1; 
            }
            .clinic-title { 
                font-size: 20px; 
                font-weight: bold; 
                color: #0d9488; 
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
                color: #115e59; 
                margin-bottom: 10px; 
                border-bottom: 1px solid #ccfbf1; 
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
                color: #115e59; 
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
}

export const generateBudgetPDFHtml = (data: BudgetPDFData) => {
    const { budget, patientName, clinicName, dentistName, logoUrl } = data;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Orçamento</title>
        <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-height: 80px; margin-bottom: 10px; }
            .title { font-size: 24px; font-weight: bold; color: #0d9488; }
            .meta { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
            .table th { color: #0f766e; }
            .total { margin-top: 30px; text-align: right; font-size: 18px; font-weight: bold; color: #0d9488; }
        </style>
    </head>
    <body>
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
            <div class="title">${clinicName || 'Orçamento Odontológico'}</div>
            ${dentistName ? `<div>Dr(a). ${dentistName}</div>` : ''}
        </div>

        <div class="meta">
            <p><strong>Paciente:</strong> ${patientName}</p>
            <p><strong>Data:</strong> ${new Date(budget.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Tratamento:</strong> ${budget.treatment}</p>
        </div>

        <h3>Itens do Orçamento</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Dente</th>
                    <th>Procedimentos</th>
                    <th style="text-align: right;">Valor</th>
                </tr>
            </thead>
            <tbody>
                 ${JSON.parse(budget.notes || '{"teeth":[]}').teeth?.map((t: any) => `
                    <tr>
                        <td>${t.tooth}</td>
                        <td>${t.treatments.join(', ')}</td>
                        <td style="text-align: right;">R$ ${(Object.values(t.values as object).reduce((a: any, b: any) => a + Number(b), 0) / 100).toFixed(2).replace('.', ',')}</td>
                    </tr>
                 `).join('') || ''}
            </tbody>
        </table>

        <div class="total">
            Valor Total: R$ ${(budget.value / 100).toFixed(2).replace('.', ',')}
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
