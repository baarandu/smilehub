// Lista de dentes permanentes
export const TEETH = [
    '11', '12', '13', '14', '15', '16', '17', '18',
    '21', '22', '23', '24', '25', '26', '27', '28',
    '31', '32', '33', '34', '35', '36', '37', '38',
    '41', '42', '43', '44', '45', '46', '47', '48',
];

// Lista de dentes decíduos
export const DECIDUOUS_TEETH = [
    '51', '52', '53', '54', '55',
    '61', '62', '63', '64', '65',
    '71', '72', '73', '74', '75',
    '81', '82', '83', '84', '85',
];

// Todos os dentes
export const ALL_TEETH = [...TEETH, ...DECIDUOUS_TEETH];

// Faces para restauração
export const FACES = [
    { id: 'M', label: 'Mesial' },
    { id: 'D', label: 'Distal' },
    { id: 'O', label: 'Oclusal' },
    { id: 'V', label: 'Vestibular' },
    { id: 'L', label: 'Lingual' },
    { id: 'P', label: 'Palatina' },
];

// Lista de tratamentos
export const TREATMENTS = [
    'Aparelho ortopédico',
    'Aplicação tópica de flúor',
    'Ataque com verniz fluoretado',
    'Avaliação',
    'Banda ortodôntica adaptada',
    'Batente oclusal',
    'Bloco',
    'Canal',
    'Canal obturado por Hidróxido de cálcio + iodofórmio',
    'Canal obturado por OZE',
    'Clareamento',
    'Coroa',
    'Coroa de acetato',
    'Coroa de aço',
    'CTZ',
    'Exodontia',
    'Extração',
    'Faceta',
    'Frenectomia labial',
    'Frenectomia lingual',
    'Implante',
    'Ionômero de vidro em cápsula',
    'Laserterapia',
    'Limpeza',
    'Mantenedor de espaço',
    'Outros',
    'Pino',
    'Pino de fibra de vidro',
    'Pistas diretas planas',
    'Placa miorrelaxante',
    'Prótese Removível',
    'Punção aspirativa',
    'Radiografia',
    'Raspagem Subgengival',
    'Restauração',
    'Restauração direta com resina',
    'Sedação consciente',
    'Selante resinoso',
    'Splintagem',
    'Ulectomia',
];

// Tratamentos que precisam de material
export const TREATMENTS_WITH_MATERIAL = ['Bloco', 'Coroa', 'Faceta', 'Pino', 'Prótese Removível'];

// Tratamentos que precisam de descrição
export const TREATMENTS_WITH_DESCRIPTION = ['Outros'];

// Estrutura de cada dente com seus tratamentos
export type ToothEntry = {
    tooth: string;
    treatments: string[];
    values: Record<string, string>;
    status: 'pending' | 'approved' | 'paid' | 'completed';
    paymentMethod?: string;
    paymentInstallments?: number;
    paymentDate?: string;
    location?: string;
    financialBreakdown?: any;
    faces?: string[];
    materials?: Record<string, string>;
    labTreatments?: Record<string, boolean>;
    locationRate?: number;
    // Prosthesis lab fields (collected at budget time)
    prosthesisType?: string;
    prosthesisLabId?: string;
    prosthesisColor?: string;
    prosthesisShadeDetails?: string;
    prosthesisCementation?: string;
    prosthesisLabCost?: string;
    prosthesisDeliveryDate?: string;
    prosthesisNotes?: string;
    prosthesisInstructions?: string;
};

// Helper to get short tooth ID for database (max 10 chars)
export const getShortToothId = (tooth: string): string => {
    if (tooth === 'Arcada Superior') return 'ARC_SUP';
    if (tooth === 'Arcada Inferior') return 'ARC_INF';
    if (tooth === 'Arcada Superior + Arcada Inferior') return 'ARC_AMBAS';
    if (tooth.includes('Arcada')) return 'ARC';
    return tooth;
};

// Format currency value
export const formatCurrency = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    const value = parseInt(numbers || '0', 10) / 100;
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format numeric value to currency
export const formatMoney = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format date for display
export const formatDisplayDate = (dateStr: string): string => {
    if (dateStr.includes('-')) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    }
    return dateStr;
};

// Format date input (DD/MM/YYYY)
export const formatDateInput = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Parse DD/MM/YYYY to YYYY-MM-DD
export const parseBrazilianDate = (dateStr: string): string | null => {
    if (dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
    return `${year}-${month}-${day}`;
};

// Calculate total value for a tooth entry
export const calculateToothTotal = (values: Record<string, string>): number => {
    return Object.values(values).reduce((sum, val) => {
        return sum + (parseInt(val || '0', 10) / 100);
    }, 0);
};

// Get display name for a tooth (without 'Dente' prefix for Arcada)
export const getToothDisplayName = (tooth: string, includePrefix = true): string => {
    // Convert short IDs back to full names
    if (tooth === 'ARC_SUP') return 'Arcada Superior';
    if (tooth === 'ARC_INF') return 'Arcada Inferior';
    if (tooth === 'ARC_AMBAS') return 'Arcada Superior + Arcada Inferior';

    if (tooth.includes('Arcada')) {
        return tooth;
    }

    // Check if deciduous tooth (quadrants 5-8)
    const quadrant = parseInt(tooth.charAt(0), 10);
    if (quadrant >= 5 && quadrant <= 8) {
        return includePrefix ? `Dente ${tooth} (decíduo)` : `${tooth} (decíduo)`;
    }

    return includePrefix ? `Dente ${tooth}` : tooth;
};

// Calculate overall budget status based on items
export const calculateBudgetStatus = (teeth: ToothEntry[]): 'pending' | 'approved' | 'completed' => {
    if (teeth.length === 0) return 'pending';

    const allPaid = teeth.every(t => t.status === 'paid' || t.status === 'completed');
    if (allPaid) return 'completed';

    const hasApprovedOrPaid = teeth.some(t => t.status === 'approved' || t.status === 'paid' || t.status === 'completed');
    if (hasApprovedOrPaid) return 'approved';

    return 'pending';
};
