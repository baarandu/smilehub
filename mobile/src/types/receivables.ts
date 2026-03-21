export interface PaymentReceivable {
    id: string;
    clinic_id: string;
    patient_id: string;
    budget_id: string;
    split_group_id: string;
    split_index: number;
    amount: number;
    payment_method: string;
    installments: number;
    brand: string | null;
    due_date: string;
    status: 'pending' | 'confirmed' | 'overdue' | 'cancelled';
    confirmed_at: string | null;
    confirmed_by: string | null;
    financial_transaction_id: string | null;
    tooth_index: number;
    tooth_description: string;
    tax_rate: number;
    tax_amount: number;
    card_fee_rate: number;
    card_fee_amount: number;
    anticipation_rate: number;
    anticipation_amount: number;
    location_rate: number;
    location_amount: number;
    net_amount: number;
    payer_is_patient: boolean;
    payer_type: string;
    payer_name: string | null;
    payer_cpf: string | null;
    pj_source_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    patients?: { name: string; phone: string | null };
}

export interface OverdueSummary {
    total_count: number;
    total_amount: number;
    patients_count: number;
}

export interface ReceivableFilters {
    status?: string;
    startDate?: string;
    endDate?: string;
    patientId?: string;
}
