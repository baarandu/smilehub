// Currency Formatting
export const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

// Date Formatting - using T00:00:00 to prevent timezone shift
export const formatDate = (dateString: string) => {
    // If dateString is already in ISO format with time, just use it
    // Otherwise, append T00:00:00 to interpret as local date
    const dateStr = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const formatDateInput = (text: string): string => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

    let masked = cleaned;
    if (cleaned.length > 4) {
        masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
        masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return masked;
};

// Date Range Helpers
export const getToday = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR');
};

export const getWeekRange = () => {
    const today = new Date();
    const first = today.getDate() - today.getDay();
    const last = first + 6;

    const start = new Date(today.setDate(first));
    const end = new Date(today.setDate(last));

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

export const getMonthRange = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

export const getYearRange = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

// Payment Method Extraction
export const getPaymentMethod = (description: string): string | null => {
    const methodMatch = description.match(/\((.*?)\)/);
    if (!methodMatch) return null;

    const rawParts = methodMatch[1].split(' - ');
    let m = rawParts[0].trim();

    // Normalization
    if (m.toLowerCase().match(/^(crédito|credit)$/)) return 'Cartão de Crédito';
    if (m.toLowerCase().match(/^(débito|debit)$/)) return 'Cartão de Débito';
    if (m.toLowerCase().match(/^(pix)$/)) return 'Pix';
    if (m.toLowerCase().match(/^(dinheiro|cash)$/)) return 'Dinheiro';
    if (m.toLowerCase().match(/^(boleto)$/)) return 'Boleto';

    return m;
};

// Parse Transaction Description
export const parseTransactionDescription = (rawDesc: string, patientName: string = '') => {
    // Extract Installment info
    const installmentMatch = rawDesc.match(/\(\d+\/\d+\)/);
    const installmentInfo = installmentMatch ? installmentMatch[0].replace(/[()]/g, '') : null;

    let workingDesc = rawDesc;
    if (installmentMatch) {
        workingDesc = workingDesc.replace(installmentMatch[0], '');
    }

    // Extract Method
    const methodMatch = workingDesc.match(/\((.*?)\)/);
    const rawPaymentInfo = methodMatch ? methodMatch[1] : null;

    if (methodMatch) {
        workingDesc = workingDesc.replace(methodMatch[0], '');
    }

    let displayMethod = 'Não informado';
    let displayBrand: string | null = null;

    if (rawPaymentInfo) {
        const methodParts = rawPaymentInfo.split(' - ');
        let methodType = methodParts[0];
        if (methodType.toLowerCase() === 'crédito' || methodType.toLowerCase() === 'credit') methodType = 'Cartão de Crédito';
        if (methodType.toLowerCase() === 'débito' || methodType.toLowerCase() === 'debit') methodType = 'Cartão de Débito';
        displayMethod = methodType;
        if (methodParts.length > 1) {
            displayBrand = methodParts[1].replace('_', '/');
        }
    }

    const parts = workingDesc.split(' - ').map(p => p.trim());
    const filteredParts = parts.filter(p => p && p.toLowerCase() !== patientName.toLowerCase());

    let tooth = '';
    let procedure = '';
    filteredParts.forEach(part => {
        if (part.toLowerCase().startsWith('dente') || part.toLowerCase().startsWith('arcada')) {
            tooth = part;
        } else {
            procedure = procedure ? `${procedure} - ${part}` : part;
        }
    });

    if (!procedure && filteredParts.length > 0 && !tooth) procedure = filteredParts.join(' - ');
    if (!procedure) procedure = 'Procedimento';

    const displayDescription = tooth ? `${tooth} - ${procedure}` : procedure;

    return {
        installmentInfo,
        displayMethod,
        displayBrand,
        displayDescription
    };
};
