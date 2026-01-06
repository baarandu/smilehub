export interface FilterState {
    patientName: string;
    startDate: string; // DD/MM/YYYY
    endDate: string;   // DD/MM/YYYY
    methods: string[];
    locations: string[];
}

export const INITIAL_FILTERS: FilterState = {
    patientName: '',
    startDate: '',
    endDate: '',
    methods: [],
    locations: []
};

export const COMMON_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];
