export const EXPENSE_CATEGORIES: string[] = [
    'Materiais',
    'Equipamento',
    'Laboratório',
    'Manutenção',
    'Aluguel/Condomínio',
    'Impostos',
    'CRO',
    'Marketing',
    'Pessoal',
    'Outros'
];

export type PaymentMethod =
    | 'Cartão de Crédito'
    | 'Cartão de Débito'
    | 'Pix'
    | 'Dinheiro'
    | 'Boleto'
    | 'Transferência';

export const PAYMENT_METHODS: PaymentMethod[] = [
    'Cartão de Crédito',
    'Cartão de Débito',
    'Pix',
    'Dinheiro',
    'Boleto',
    'Transferência'
];

export interface InstallmentItem {
    id: number;
    date: string;
    value: string;
    rawValue: number;
}

// Simple UUID generator
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Date Mask Helper (DD/MM/YYYY)
export function applyDateMask(text: string): string {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

    let masked = cleaned;
    if (cleaned.length > 4) {
        masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
        masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return masked;
}

// Currency Formatting (Brazilian Real)
export function formatCurrency(val: number): string {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse currency string to number
export function getNumericValue(currencyString: string): number {
    return Number(currencyString.replace(/\./g, '').replace(',', '.')) || 0;
}

// Convert DD/MM/YYYY to YYYY-MM-DD for database
export function dateToDbFormat(dateStr: string): string {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
}

// Convert database date to DD/MM/YYYY for display
export function dbDateToDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// Generate installment list from base values (value is divided)
export function generateInstallments(
    totalValue: number,
    count: number,
    startDateStr: string
): InstallmentItem[] {
    if (!startDateStr || startDateStr.length !== 10) return [];

    const [day, month, year] = startDateStr.split('/').map(Number);
    if (!day || !month || !year) return [];

    const baseDateObj = new Date(year, month - 1, day);
    const splitValue = totalValue / count;

    const items: InstallmentItem[] = [];
    for (let i = 0; i < count; i++) {
        const nextDate = new Date(baseDateObj);
        nextDate.setMonth(nextDate.getMonth() + i);

        const d = String(nextDate.getDate()).padStart(2, '0');
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const y = nextDate.getFullYear();

        items.push({
            id: i,
            date: `${d}/${m}/${y}`,
            value: formatCurrency(splitValue),
            rawValue: splitValue
        });
    }
    return items;
}

// Generate fixed expenses list (same value repeated each month)
export function generateFixedExpenses(
    monthlyValue: number,
    months: number,
    startDateStr: string
): InstallmentItem[] {
    if (!startDateStr || startDateStr.length !== 10) return [];

    const [day, month, year] = startDateStr.split('/').map(Number);
    if (!day || !month || !year) return [];

    const baseDateObj = new Date(year, month - 1, day);

    const items: InstallmentItem[] = [];
    for (let i = 0; i < months; i++) {
        const nextDate = new Date(baseDateObj);
        nextDate.setMonth(nextDate.getMonth() + i);

        const d = String(nextDate.getDate()).padStart(2, '0');
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const y = nextDate.getFullYear();

        items.push({
            id: i,
            date: `${d}/${m}/${y}`,
            value: formatCurrency(monthlyValue),
            rawValue: monthlyValue
        });
    }
    return items;
}

// Extract payment method from description string
export function extractPaymentMethod(description: string): PaymentMethod | null {
    const found = PAYMENT_METHODS.find(pm => description.includes(`(${pm})`));
    return found || null;
}

// Parse expense description to extract parts
export function parseExpenseDescription(fullDesc: string): { description: string; observations: string } {
    let rawDesc = fullDesc;
    let obs = '';

    if (fullDesc.includes(' - ')) {
        const match = fullDesc.match(/^(.*?) \((.*?)\)(?: \(\d+\/\d+\))?(?: - (.*))?$/);
        if (match) {
            rawDesc = match[1];
            if (match[3]) obs = match[3];
        } else {
            const split = fullDesc.split(' - ');
            if (split.length > 1) {
                obs = split.pop() || '';
                rawDesc = split.join(' - ');
            }
            if (rawDesc.includes(' (')) {
                rawDesc = rawDesc.split(' (')[0];
            }
        }
    } else {
        if (rawDesc.includes(' (')) {
            rawDesc = rawDesc.split(' (')[0];
        }
    }

    return { description: rawDesc, observations: obs };
}
