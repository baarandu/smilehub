// Lista de dentes
export const TEETH = [
    '11', '12', '13', '14', '15', '16', '17', '18',
    '21', '22', '23', '24', '25', '26', '27', '28',
    '31', '32', '33', '34', '35', '36', '37', '38',
    '41', '42', '43', '44', '45', '46', '47', '48',
];

// Faces para restauração
export const FACES = [
    { id: 'M', label: 'Mesial' },
    { id: 'D', label: 'Distal' },
    { id: 'O', label: 'Oclusal' },
    { id: 'V', label: 'Vestibular' },
    { id: 'L', label: 'Lingual/Palatina' },
];

// Lista de tratamentos
export const TREATMENTS = [
    'Bloco',
    'Canal',
    'Clareamento',
    'Coroa',
    'Extração',
    'Faceta',
    'Implante',
    'Limpeza',
    'Outros',
    'Pino',
    'Radiografia',
    'Raspagem Subgengival',
    'Restauração',
];

// Tratamentos que precisam de material
export const TREATMENTS_WITH_MATERIAL = ['Bloco', 'Coroa', 'Faceta'];

// Tratamentos que precisam de descrição
export const TREATMENTS_WITH_DESCRIPTION = ['Outros'];

// Estrutura de cada dente com seus tratamentos
export type ToothEntry = {
    tooth: string;
    treatments: string[];
    values: Record<string, string>;
    materials?: Record<string, string>;
    faces?: string[];
    status: 'pending' | 'approved' | 'paid' | 'completed';
    paymentMethod?: string;
    paymentInstallments?: number;
    paymentDate?: string;
    location?: string;
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
    return includePrefix ? `Dente ${tooth}` : tooth;
};
