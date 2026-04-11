import type { Procedure, Exam, Patient } from '@/types/database';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getAccessibleUrl } from '@/lib/utils';

interface ReportOptions {
    patient: Patient;
    procedures: Procedure[];
    exams: Exam[];
    includeHeader: boolean;
    notes?: string;
    clinicName?: string;
    clinicLogo?: string;
    dentistName?: string;
    dentistCRO?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    reportNumber?: string;
    /** Map of procedure ID → resolved procedure name from budget links */
    procedureNames?: Record<string, string>;
}

const formatDate = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');

const formatDateFull = (date: Date) => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const getDentistTitle = (name: string) => {
    if (!name) return 'Dr(a).';
    const firstName = name.split(' ')[0].toLowerCase();
    const femaleEndings = ['a', 'e', 'i'];
    const femaleNames = ['ana', 'maria', 'julia', 'juliana', 'fernanda', 'amanda', 'camila', 'carla', 'paula', 'patricia', 'mariana', 'beatriz', 'leticia', 'larissa', 'bruna', 'gabriela', 'rafaela', 'daniela', 'vanessa', 'jessica', 'aline', 'priscila', 'tatiana', 'renata', 'natalia', 'luciana', 'adriana', 'fabiana', 'cristiane', 'simone', 'denise', 'monica', 'claudia', 'sandra', 'regina', 'silvia', 'vera', 'lucia', 'rose', 'rosa', 'elaine', 'sueli', 'edilene', 'ivone', 'marta', 'edna', 'neide', 'tania', 'solange', 'cleide', 'celia', 'teresinha', 'elizabete', 'iracema', 'francisca', 'antonia', 'josefa', 'marlene', 'marcia', 'tereza', 'rita', 'lourdes', 'irene', 'dalva', 'nilza', 'luiza', 'lidia', 'aurora', 'ines', 'alice', 'helena', 'joana', 'cecilia', 'vitoria', 'isadora', 'valentina', 'sofia', 'laura', 'lorena', 'luana', 'bianca'];
    if (femaleNames.includes(firstName)) return 'Dra.';
    if (femaleEndings.includes(firstName.slice(-1)) && !['jose', 'jorge', 'carlos', 'marcos', 'lucas', 'matheus', 'felipe', 'andre', 'alexandre', 'ricardo'].includes(firstName)) return 'Dra.';
    return 'Dr.';
};

const formatCRO = (cro: string | undefined) => {
    if (!cro) return '';
    if (cro.includes('-')) return `CRO-${cro}`;
    const match = cro.match(/([A-Za-z]{2})[\s-]?(\d+)/);
    if (match) return `CRO-${match[1].toUpperCase()} ${match[2]}`;
    return `CRO ${cro}`;
};

const processExamsWithImages = async (exams: Exam[]) => {
    const results = await Promise.all(exams.map(async (exam) => {
        const uniquePaths = new Set<string>();
        if (exam.file_url) uniquePaths.add(exam.file_url);
        if (exam.file_urls && exam.file_urls.length > 0) {
            exam.file_urls.forEach(url => uniquePaths.add(url));
        }

        const isImage = (url: string) => {
            if (!url) return false;
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('.pdf') && !lowerUrl.includes('.pdf?')) return false;
            if (exam.file_type === 'photo') return true;
            return /\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(url);
        };

        const images: string[] = [];
        for (const path of uniquePaths) {
            if (path && isImage(path)) {
                const resolved = await getAccessibleUrl(path);
                if (resolved) images.push(resolved);
            }
        }

        return { ...exam, resolvedImages: images };
    }));
    return results;
};

export async function buildReportHtml({
    patient,
    procedures,
    exams,
    includeHeader,
    notes,
    clinicName = 'Organiza Odonto',
    clinicLogo,
    dentistName,
    dentistCRO,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    reportNumber,
    procedureNames = {},
}: ReportOptions): Promise<string> {
    const examsWithImages = await processExamsWithImages(exams);
    const dentistTitle = getDentistTitle(dentistName || '');
    const formattedCRO = formatCRO(dentistCRO);

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório do Paciente</title>
        <style>
            @page {
                margin: 12mm 10mm;
            }
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                padding: 0;
                color: #1f2937;
                line-height: 1.5;
                margin: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            /* Header Styles */
            .header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                background-color: #f8fafc;
                padding: 24px;
                border-radius: 12px;
                margin-bottom: 30px;
            }
            .header-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .avatar-placeholder {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #a03f3d 0%, #c45a58 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .avatar-placeholder svg {
                width: 32px;
                height: 32px;
                color: white;
            }
            .logo-img {
                width: 64px;
                height: 64px;
                border-radius: 12px;
                object-fit: contain;
            }
            .dentist-info h1 {
                font-size: 22px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 4px 0;
            }
            .dentist-specialty {
                font-size: 13px;
                font-weight: 600;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .dentist-cro {
                font-size: 13px;
                color: #6b7280;
            }
            .header-right {
                text-align: right;
            }
            .report-badge {
                display: inline-block;
                padding: 6px 12px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                background: white;
                margin-bottom: 8px;
            }
            .report-date {
                font-size: 13px;
                color: #6b7280;
            }

            /* Section Styles */
            .section {
                margin-bottom: 28px;
            }
            .section-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
                break-after: avoid;
                page-break-after: avoid;
            }
            .section-icon {
                width: 24px;
                height: 24px;
                color: #a03f3d;
            }
            .section-title {
                font-size: 14px;
                font-weight: 700;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0;
            }

            /* Patient Card */
            .patient-card {
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px 28px;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .patient-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }
            .patient-field label {
                display: block;
                font-size: 11px;
                font-weight: 600;
                color: #000000;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .patient-field span {
                font-size: 15px;
                font-weight: 500;
                color: #000000;
            }

            /* Procedures Table Card */
            .procedures-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                background-color: #f1f5f9;
            }
            .procedures-table {
                width: 100%;
                border-collapse: collapse;
            }
            .procedures-table thead {
                display: table-header-group;
            }
            .procedures-table tr {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .procedures-table th {
                text-align: left;
                padding: 14px 20px;
                font-size: 14px;
                font-weight: 600;
                color: #000000;
                background-color: #f1f5f9;
                border-bottom: 1px solid #e2e8f0;
            }
            .procedures-table td {
                padding: 16px 20px;
                font-size: 14px;
                color: #000000;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
                background-color: #f1f5f9;
            }
            .procedures-table tr:last-child td {
                border-bottom: none;
            }
            .procedures-table .date-col {
                width: 100px;
                color: #000000;
            }
            .procedures-table .proc-col {
                width: 200px;
            }
            .procedures-table .obs-col {
                font-size: 13px;
                color: #374151;
            }
            /* Exams Section */
            .exam-item {
                margin-bottom: 20px;
                border: 1px solid #e8c4c4;
                padding: 0;
                border-radius: 12px;
                background-color: #fdf2f2;
                overflow: hidden;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .exam-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 20px;
                background-color: #a03f3d;
                color: white;
            }
            .exam-name {
                font-weight: 600;
                color: #ffffff;
                font-size: 15px;
            }
            .exam-date {
                font-size: 13px;
                color: #fecaca;
            }
            .exam-content {
                padding: 16px;
            }
            .exam-images {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .exam-img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                max-height: 500px;
                object-fit: contain;
            }
            .no-images {
                font-style: italic;
                color: #9ca3af;
                font-size: 13px;
            }

            /* Notes Box */
            .notes-box {
                background-color: #f0fdf4;
                border: 1px solid #22c55e;
                border-left-width: 4px;
                padding: 16px 20px;
                border-radius: 8px;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .notes-title {
                font-weight: 700;
                color: #166534;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .notes-content {
                font-size: 14px;
                color: #374151;
                white-space: pre-wrap;
                line-height: 1.6;
            }

            /* Footer */
            .footer {
                margin-top: 50px;
                padding-top: 24px;
                border-top: 2px solid #a03f3d;
                text-align: center;
            }
            .footer-dentist {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
            }
            .footer-cro {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 16px;
            }
            .footer-clinic-info {
                font-size: 12px;
                color: #9ca3af;
            }
            .footer-clinic-info span {
                margin: 0 8px;
            }

            .page-break {
                page-break-before: always;
                break-before: page;
            }

            @media print {
                .no-print { display: none; }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
            }
        </style>
    </head>
    <body>
        ${includeHeader ? `
        <div class="header">
            <div class="header-left">
                ${clinicLogo ? `<img src="${clinicLogo}" class="logo-img" />` : ''}
                <div class="dentist-info">
                    <h1>${dentistTitle} ${dentistName || 'Dentista'}</h1>
                    <div class="dentist-specialty">Cirurgião(ã) Dentista</div>
                    ${formattedCRO ? `<div class="dentist-cro">${formattedCRO}</div>` : ''}
                </div>
            </div>
            <div class="header-right">
                <div class="report-date"><svg style="display:inline-block;vertical-align:middle;margin-right:4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDateFull(new Date())}</div>
            </div>
        </div>
        ` : ''}

        <!-- Patient Section -->
        <div class="section">
            <div class="section-header">
                <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <h2 class="section-title">Identificação do Paciente</h2>
            </div>
            <div class="patient-card">
                <div class="patient-grid">
                    <div class="patient-field">
                        <label>Nome Completo</label>
                        <span>${patient.name}</span>
                    </div>
                    <div class="patient-field">
                        <label>Data de Nascimento</label>
                        <span>${patient.birth_date ? formatDate(patient.birth_date) : 'Não informado'}</span>
                    </div>
                    <div class="patient-field">
                        <label>Convenio</label>
                        <span>${patient.health_insurance || 'Particular'}</span>
                    </div>
                </div>
            </div>
        </div>

        ${procedures.length > 0 ? `
        <!-- Procedures Section -->
        <div class="section">
            <div class="section-header">
                <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <path d="M9 12h6M9 16h6"/>
                </svg>
                <h2 class="section-title">Procedimentos Realizados</h2>
            </div>
            <div class="procedures-card">
                <table class="procedures-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Procedimento</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${procedures.map((p) => {
                            const resolvedName = procedureNames[p.id] || '';
                            const description = p.description || '';

                            let obs = description;
                            if (obs.startsWith('Obs: ')) obs = obs.substring(5);

                            let procName = resolvedName;
                            if (!procName && description) {
                                const parts = description.split('\n\nObs: ');
                                const itemsPart = parts[0];
                                if (!itemsPart.startsWith('Obs:')) {
                                    const lines = itemsPart.split('\n');
                                    const procedureLines: string[] = [];
                                    lines.forEach(line => {
                                        const cleanLine = line.trim().replace(/^•\s*/, '');
                                        if (!cleanLine || cleanLine.startsWith('Obs:')) return;
                                        let sections = cleanLine.split(' | ');
                                        if (sections.length < 3) sections = cleanLine.split(' - ');
                                        if (sections.length >= 3) {
                                            procedureLines.push(`${sections[0].trim()} - ${sections[1].trim()}`);
                                        } else {
                                            procedureLines.push(cleanLine);
                                        }
                                    });
                                    if (procedureLines.length > 0) {
                                        procName = procedureLines.join(', ');
                                        obs = parts.length > 1 ? parts[1] : '';
                                    }
                                }
                            }

                            if (resolvedName) {
                                obs = description.startsWith('Obs: ') ? description.substring(5) : description;
                            }

                            return `
                            <tr>
                                <td class="date-col">${formatDate(p.date)}</td>
                                <td class="proc-col">${procName || '-'}</td>
                                <td class="obs-col">${obs || '-'}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        ${examsWithImages.length > 0 ? `
        <!-- Exams Section -->
        <div class="section ${procedures.length > 0 ? 'page-break' : ''}">
            <div class="section-header">
                <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                </svg>
                <h2 class="section-title">Exames e Imagens</h2>
            </div>
            ${examsWithImages.map(e => `
            <div class="exam-item">
                <div class="exam-header">
                    <span class="exam-name">${e.name}</span>
                    <span class="exam-date">${formatDate(e.order_date)}</span>
                </div>
                <div class="exam-content">
                    ${e.resolvedImages && e.resolvedImages.length > 0 ? `
                    <div class="exam-images">
                        ${e.resolvedImages.map(img => `<img src="${img}" class="exam-img" />`).join('')}
                    </div>
                    ` : '<div class="no-images">Sem imagens disponíveis (apenas documento ou pendente)</div>'}
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}

        ${notes ? `
        <!-- Notes Section -->
        <div class="section">
            <div class="section-header">
                <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <h2 class="section-title">Observações Clínicas</h2>
            </div>
            <div class="notes-box">
                <div class="notes-content">${notes}</div>
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="footer-dentist">${dentistTitle} ${dentistName || 'Dentista'}</div>
            <div class="footer-cro">Cirurgião(ã) Dentista${formattedCRO ? ` - ${formattedCRO}` : ''}</div>
            ${(clinicPhone || clinicEmail || clinicAddress) ? `
            <div class="footer-clinic-info">
                ${[clinicPhone, clinicEmail, clinicAddress].filter(Boolean).map(item => `<span>${item}</span>`).join(' • ')}
            </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

export const generatePatientReport = async (options: ReportOptions, printWindow?: Window | null) => {
    const htmlContent = await buildReportHtml(options);

    const targetWindow = printWindow || window.open('', '_blank');
    if (targetWindow) {
        const parsed = new DOMParser().parseFromString(htmlContent, 'text/html');
        targetWindow.document.replaceChild(
            targetWindow.document.importNode(parsed.documentElement, true),
            targetWindow.document.documentElement
        );
        targetWindow.focus();

        setTimeout(() => {
            targetWindow.print();
        }, 1000);
    }
};

export const generateReportPdfBlob = async (options: ReportOptions): Promise<Blob> => {
    const htmlContent = await buildReportHtml(options);

    // Page layout constants (A4 portrait, margins in mm)
    const PAGE_MARGIN_TOP_MM = 12;
    const PAGE_MARGIN_BOTTOM_MM = 12;
    const PAGE_MARGIN_X_MM = 10;
    const BLOCK_GAP_MM = 3;

    // Create a hidden container to render the HTML. Width chosen so that when
    // mapped to (pdfWidth - 2*PAGE_MARGIN_X_MM) the scale matches ~96dpi.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width in pixels at 96dpi
    container.style.background = 'white';
    document.body.appendChild(container);

    // Parse HTML safely using DOMParser instead of innerHTML
    const parser = new DOMParser();
    const parsed = parser.parseFromString(htmlContent, 'text/html');

    // Extract and apply styles
    const parsedStyles = parsed.querySelectorAll('style');
    parsedStyles.forEach((s) => {
        const styleEl = document.createElement('style');
        styleEl.textContent = s.textContent || '';
        container.appendChild(styleEl);
    });

    const contentDiv = document.createElement('div');
    // Move parsed body children safely
    const parsedBody = parsed.body;
    while (parsedBody.firstChild) {
        contentDiv.appendChild(parsedBody.firstChild);
    }
    contentDiv.style.padding = '0';
    contentDiv.style.fontFamily = "'Helvetica', 'Arial', sans-serif";
    contentDiv.style.color = '#1f2937';
    contentDiv.style.lineHeight = '1.5';
    container.appendChild(contentDiv);

    try {
        // Wait a bit for styles to apply and images to load
        await new Promise(resolve => setTimeout(resolve, 300));

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const usableWidthMm = pdfWidth - 2 * PAGE_MARGIN_X_MM;
        const pageBottomMm = pdfHeight - PAGE_MARGIN_BOTTOM_MM;

        let cursorY = PAGE_MARGIN_TOP_MM;

        const renderBlock = async (el: HTMLElement) => {
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
            });
            const blockWidthPx = canvas.width;
            const blockHeightPx = canvas.height;
            if (blockWidthPx === 0 || blockHeightPx === 0) return;

            const blockHeightMm = (blockHeightPx * usableWidthMm) / blockWidthPx;
            const pxPerMm = blockWidthPx / usableWidthMm;

            // Case 1: block fits entirely on the current page
            if (cursorY + blockHeightMm <= pageBottomMm) {
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    PAGE_MARGIN_X_MM,
                    cursorY,
                    usableWidthMm,
                    blockHeightMm,
                );
                cursorY += blockHeightMm + BLOCK_GAP_MM;
                return;
            }

            // Case 2: block fits entirely on a fresh page → push to next page
            const fullPageHeightMm = pageBottomMm - PAGE_MARGIN_TOP_MM;
            if (blockHeightMm <= fullPageHeightMm) {
                pdf.addPage();
                cursorY = PAGE_MARGIN_TOP_MM;
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    PAGE_MARGIN_X_MM,
                    cursorY,
                    usableWidthMm,
                    blockHeightMm,
                );
                cursorY += blockHeightMm + BLOCK_GAP_MM;
                return;
            }

            // Case 3: block is taller than a full page → slice the canvas
            // across pages. Start a fresh page if current one is nearly full.
            if (cursorY + 10 > pageBottomMm) {
                pdf.addPage();
                cursorY = PAGE_MARGIN_TOP_MM;
            }

            let yOffsetPx = 0;
            while (yOffsetPx < blockHeightPx) {
                const availMm = pageBottomMm - cursorY;
                if (availMm < 10) {
                    pdf.addPage();
                    cursorY = PAGE_MARGIN_TOP_MM;
                    continue;
                }
                const availPx = Math.floor(availMm * pxPerMm);
                const slicePx = Math.min(availPx, blockHeightPx - yOffsetPx);
                if (slicePx <= 0) break;

                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = blockWidthPx;
                sliceCanvas.height = slicePx;
                const ctx = sliceCanvas.getContext('2d');
                if (!ctx) break;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, blockWidthPx, slicePx);
                ctx.drawImage(canvas, 0, -yOffsetPx);

                const sliceMm = slicePx / pxPerMm;
                pdf.addImage(
                    sliceCanvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    PAGE_MARGIN_X_MM,
                    cursorY,
                    usableWidthMm,
                    sliceMm,
                );
                yOffsetPx += slicePx;
                cursorY += sliceMm;

                if (yOffsetPx < blockHeightPx) {
                    pdf.addPage();
                    cursorY = PAGE_MARGIN_TOP_MM;
                }
            }
            cursorY += BLOCK_GAP_MM;
        };

        // Walk top-level children of contentDiv. Sections that contain a list
        // of independently-placeable items (exams, procedure rows) are
        // expanded so rows/items can flow across pages without mid-block cuts
        // while still filling the current page when they fit.
        for (const child of Array.from(contentDiv.children)) {
            if (!(child instanceof HTMLElement)) continue;
            if (child.tagName === 'STYLE') continue;

            const examItems = child.querySelectorAll(':scope > .exam-item');
            const proceduresCard = child.querySelector(':scope > .procedures-card') as HTMLElement | null;

            // Exams section — header, then each exam-item as its own block
            if (child.classList.contains('section') && examItems.length > 0) {
                const sectionHeader = child.querySelector(':scope > .section-header') as HTMLElement | null;
                if (sectionHeader) await renderBlock(sectionHeader);
                for (const e of Array.from(examItems)) {
                    await renderBlock(e as HTMLElement);
                }
                continue;
            }

            // Procedures section — header + table. Try whole table first so a
            // short table stays as a single visual card; if it doesn't fit in
            // the remaining page space, split into per-row mini-tables with
            // the column header repeated so rows flow across pages cleanly.
            if (child.classList.contains('section') && proceduresCard) {
                const sectionHeader = child.querySelector(':scope > .section-header') as HTMLElement | null;
                if (sectionHeader) await renderBlock(sectionHeader);

                const wholeCanvas = await html2canvas(proceduresCard, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                });
                const wholeHeightMm = (wholeCanvas.height * usableWidthMm) / wholeCanvas.width;

                if (cursorY + wholeHeightMm <= pageBottomMm) {
                    pdf.addImage(
                        wholeCanvas.toDataURL('image/jpeg', 0.95),
                        'JPEG',
                        PAGE_MARGIN_X_MM,
                        cursorY,
                        usableWidthMm,
                        wholeHeightMm,
                    );
                    cursorY += wholeHeightMm + BLOCK_GAP_MM;
                    continue;
                }

                // Doesn't fit — render each row as its own mini-table so they
                // pack onto the current page and flow to the next as needed.
                const table = proceduresCard.querySelector('table') as HTMLTableElement | null;
                const thead = table?.querySelector('thead') ?? null;
                const rows = table ? Array.from(table.querySelectorAll('tbody > tr')) : [];

                for (const row of rows) {
                    const cardClone = proceduresCard.cloneNode(false) as HTMLElement;
                    const tableClone = (table as HTMLTableElement).cloneNode(false) as HTMLTableElement;
                    if (thead) tableClone.appendChild(thead.cloneNode(true));
                    const tbodyClone = document.createElement('tbody');
                    tbodyClone.appendChild(row.cloneNode(true));
                    tableClone.appendChild(tbodyClone);
                    cardClone.appendChild(tableClone);
                    contentDiv.appendChild(cardClone);
                    try {
                        await renderBlock(cardClone);
                    } finally {
                        contentDiv.removeChild(cardClone);
                    }
                }
                continue;
            }

            // Default: render the child as a single block
            await renderBlock(child);
        }

        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
};
