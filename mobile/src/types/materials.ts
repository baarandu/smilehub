export interface ShoppingItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    brand: string;
    type?: string;
    code?: string;
}

export interface ShoppingOrder {
    id: string;
    items: ShoppingItem[];
    total_amount: number;
    status: 'pending' | 'completed';
    completed_at: string | null;
    invoice_url: string | null;
    created_at: string;
}

export interface ParsedMaterialItem {
    name: string;
    quantity: number;
    unitPrice: number;
    brand: string;
    type?: string;
    code?: string;
}

export interface ParseMaterialsResponse {
    items: ParsedMaterialItem[];
    brand?: string | null;
    payment_method?: string | null;
    total_amount?: number | null;
    tokens_used?: number;
}
