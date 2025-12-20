export interface ApprovedItemOption {
    id: string;
    label: string;
    value: number;
    treatment: string;
    tooth: string;
    budgetId: string;
}

export interface ProcedureFormState {
    date: string;
    location: string;
    value: string;
    paymentMethod: string;
    installments: string;
    status: 'pending' | 'in_progress' | 'completed';
}

export interface Attachment {
    uri?: string;
    url?: string;
    name: string;
    type?: string;
    id?: string; // For existing attachments
    examId?: string; // For existing attachments logic
}
