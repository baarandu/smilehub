export const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getNumericValue = (text: string) => {
    return Number(text.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
};

export const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Get local date in YYYY-MM-DD format (without timezone conversion)
export const getLocalDateString = (date?: Date): string => {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatCurrencyInput = (text: string) => {
    const raw = text.replace(/\D/g, '');
    const val = Number(raw) / 100;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
