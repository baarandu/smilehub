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
}

export const generatePatientReport = async ({
    patient,
    procedures,
    exams,
    includeHeader,
    notes,
    clinicName = 'Smile Care Hub',
    clinicLogo
}: ReportOptions) => {

    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

    // Process exams to resolve image URLs
    const examsWithImages = await Promise.all(exams.map(async (exam) => {
        // Collect all potential paths first to deduplicate
        const uniquePaths = new Set<string>();

        if (exam.file_url) uniquePaths.add(exam.file_url);
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
            if (exam.file_type === 'photo') return true;

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

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório do Paciente</title>
        <style>
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                padding: 40px; 
                color: #333; 
                line-height: 1.5;
            }
            .header { 
                display: flex; 
                align-items: center; 
                border-bottom: 2px solid #0d9488; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
            }
            .logo { 
                width: 80px; 
                height: 80px; 
                margin-right: 20px; 
                background-color: #f0fdfa;
                border-radius: 10px;
                object-fit: contain;
            }
            .clinic-info { 
                flex: 1; 
            }
            .clinic-name { 
                font-size: 24px; 
                font-weight: bold; 
                color: #0d9488; 
                margin: 0; 
            }
            .doc-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 30px;
                color: #1f2937;
            }
            .section { 
                margin-bottom: 30px; 
                break-inside: avoid;
            }
            .section-title { 
                font-size: 16px; 
                font-weight: bold; 
                color: #115e59; 
                margin-bottom: 15px; 
                border-bottom: 1px solid #ccfbf1; 
                padding-bottom: 5px; 
            }
            .patient-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px; 
            }
            th, td { 
                text-align: left; 
                padding: 10px; 
                border-bottom: 1px solid #e5e7eb; 
                font-size: 14px; 
            }
            th { 
                color: #115e59; 
                font-weight: 600; 
            }
            tr:last-child td {
                border-bottom: none;
            }
            .exam-item {
                margin-bottom: 20px;
                border: 1px solid #e5e7eb;
                padding: 15px;
                border-radius: 8px;
                background-color: #fafafa;
            }
            .exam-header {
                font-weight: bold;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
            }
            .exam-images {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
            }
            .exam-img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
                border: 1px solid #ddd;
                max-height: 400px;
                object-fit: contain;
            }
            .notes-box {
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                padding: 15px;
                border-radius: 8px;
                font-size: 14px;
                white-space: pre-wrap;
            }
            .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        ${includeHeader ? `
        <div class="header">
            ${clinicLogo ? `<img src="${clinicLogo}" class="logo" />` : ''}
            <div class="clinic-info">
                <h1 class="clinic-name">${clinicName}</h1>
                <p>Relatório Clínico Odontológico</p>
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
                        <td>${p.description}${p.location ? ` (${p.location})` : ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${examsWithImages.length > 0 ? `
        <div class="section">
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
