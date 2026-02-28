import { ShoppingItem } from '@/types/materials';

export { formatCurrency } from './formatters';

/** Migrates old items with `supplier` field to `brand` and ensures type/code */
export const migrateItems = (items: any[]): ShoppingItem[] =>
    (items || []).map((item: any) => ({
        ...item,
        brand: item.brand || item.supplier || 'Sem marca',
        type: item.type || '',
        code: item.code || '',
    }));

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
