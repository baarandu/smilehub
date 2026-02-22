export interface ShoppingItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    supplier: string;
}

export interface ShoppingOrder {
    id: string;
    items: ShoppingItem[];
    total_amount: number;
    status: 'pending' | 'completed';
    completed_at: string | null;
    created_by: string | null;
    created_by_name?: string | null;
    location: string | null;
    invoice_url: string | null;
    created_at: string;
}
