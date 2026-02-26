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
    dentistCRO?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    reportNumber?: string;
    /** Map of procedure ID → resolved procedure name from budget links */
    procedureNames?: Record<string, string>;
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
    accountType = 'solo',
    dentistCRO,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    reportNumber,
    procedureNames = {},
}: ReportOptions) => {

    const formatDate = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');

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

    // Helper to format date in full Brazilian format
    const formatDateFull = (date: Date) => {
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                       'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    // Helper to detect gender from name for Dr/Dra
    const getDentistTitle = (name: string) => {
        if (!name) return 'Dr(a).';
        const firstName = name.split(' ')[0].toLowerCase();
        const femaleEndings = ['a', 'e', 'i'];
        const femaleNames = ['ana', 'maria', 'julia', 'juliana', 'fernanda', 'amanda', 'camila', 'carla', 'paula', 'patricia', 'mariana', 'beatriz', 'leticia', 'larissa', 'bruna', 'gabriela', 'rafaela', 'daniela', 'vanessa', 'jessica', 'aline', 'priscila', 'tatiana', 'renata', 'natalia', 'luciana', 'adriana', 'fabiana', 'cristiane', 'simone', 'denise', 'monica', 'claudia', 'sandra', 'regina', 'silvia', 'vera', 'lucia', 'rose', 'rosa', 'elaine', 'sueli', 'edilene', 'ivone', 'marta', 'edna', 'neide', 'tania', 'solange', 'cleide', 'celia', 'teresinha', 'elizabete', 'iracema', 'francisca', 'antonia', 'josefa', 'marlene', 'marcia', 'tereza', 'rita', 'lourdes', 'irene', 'dalva', 'nilza', 'luiza', 'lidia', 'aurora', 'ines', 'alice', 'helena', 'joana', 'cecilia', 'vitoria', 'isadora', 'valentina', 'sofia', 'laura', 'lorena', 'luana', 'bianca'];
        if (femaleNames.includes(firstName)) return 'Dra.';
        if (femaleEndings.includes(firstName.slice(-1)) && !['jose', 'jorge', 'carlos', 'marcos', 'lucas', 'matheus', 'felipe', 'andre', 'alexandre', 'ricardo'].includes(firstName)) return 'Dra.';
        return 'Dr.';
    };

    // Get formatted CRO
    const formatCRO = (cro: string | undefined) => {
        if (!cro) return '';
        if (cro.includes('-')) return `CRO-${cro}`;
        const match = cro.match(/([A-Za-z]{2})[\s-]?(\d+)/);
        if (match) return `CRO-${match[1].toUpperCase()} ${match[2]}`;
        return `CRO ${cro}`;
    };

    const dentistTitle = getDentistTitle(dentistName || '');
    const formattedCRO = formatCRO(dentistCRO);
    const currentReportNumber = reportNumber || `#${new Date().getFullYear()}-001`;

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
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                padding: 40px;
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
                break-inside: avoid;
            }
            .section-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
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
                padding-top: 40px;
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
                            // Use resolved procedure name from budget links if available
                            const resolvedName = procedureNames[p.id] || '';
                            const description = p.description || '';

                            // Clean description for observations column
                            let obs = description;
                            if (obs.startsWith('Obs: ')) obs = obs.substring(5);

                            // If no resolved name, try to extract from description (legacy format)
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

                            // If we have a resolved name, use description as observations
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
            ` : `
            <div class="footer-clinic-info">
                <span>${clinicName}</span>
            </div>
            `}
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
    dentistCRO?: string | null;
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
    const { budget, patientName, clinicName, dentistName, logoUrl, isClinic, dentistCRO } = data;

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
    const croText = dentistCRO ? ` — CRO ${dentistCRO}` : '';

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
                        <div class="info-sub">Responsável: ${responsibleName}${croText}</div>
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
