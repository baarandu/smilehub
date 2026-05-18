export interface DentistProduction {
  dentist_id: string;
  dentist_name: string;
  revenue: number;
  transaction_count: number;
  avg_ticket: number;
}

export interface ProductionReport {
  reference_month: string;
  individual_revenue: number;
  clinic_revenue: number;
  total_revenue: number;
  unassigned_individual_revenue: number;
  dentists: DentistProduction[];
}
