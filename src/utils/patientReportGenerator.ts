import type { Procedure, Exam, Patient } from '@/types/database';

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

    // Process exams to resolve image URLs
    // On web, URLs are typically accessible if they are consistent with how the app loads them.
    // If they are public URLs or signed URLs already, they should work in an img tag.
    // We'll assume the exam objects passed in already have accessible URLs or the component logic handles it.
    // However, if we need to resolve them like in mobile, we might need a helper.
    // For now, mapping resolvedImages similar to mobile logic but using the URL directly if available.
    // Ideally the caller passes fully resolved URLs or we assume file_urls are usable.

    // NOTE: On web, we might encounter cross-origin issues with images in print. 
    // Converting to base64 is safer for specific print libraries, but browser print often handles links fine if accessible.

    const examsWithImages = exams.map((exam) => {
        const uniquePaths = new Set<string>();
        if (exam.file_url) uniquePaths.add(exam.file_url);
        if (exam.file_urls && exam.file_urls.length > 0) {
            exam.file_urls.forEach(url => uniquePaths.add(url));
        }

        const images: string[] = [];
        const isImage = (url: string) => {
            if (!url) return false;
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('.pdf') && !lowerUrl.includes('.pdf?')) return false;
            if (exam.file_type === 'photo') return true;
            return /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(url);
        };

        uniquePaths.forEach(path => {
            // Check if path is a full URL or relative. 
            // In this app, file_url seems to be a full URL (signed or public).
            if (path && isImage(path)) {
                images.push(path);
            }
        });

        return { ...exam, resolvedImages: images };
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório do Paciente</title>
        <style>
            @page {
                margin: 0;
            }
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                padding: 40px; 
                color: #333; 
                line-height: 1.5;
                margin: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
            .clinic-title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #0d9488; 
                margin: 0; 
                line-height: 1.2;
            }
            .dentist-title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #000000; 
                margin: 0; 
                line-height: 1.2;
            }
            .sub-title {
                font-size: 16px;
                color: #555;
                margin-top: 5px;
                font-weight: 500;
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
                break-inside: avoid;
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
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
            .page-break {
                page-break-before: always;
                padding-top: 50px;
            }
            @media print {
                .no-print { display: none; }
                body { -webkit-print-color-adjust: exact; }
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

    // Open in new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for images to load before printing
        setTimeout(() => {
            printWindow.print();
            // Optional: Close window after print (some browsers block this or it's annoying)
            // printWindow.close(); 
        }, 1000);
    }
};
