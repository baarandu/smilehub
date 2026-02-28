export type FilterType = 'all' | 'income' | 'expense';
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string | null;
  location?: string | null;
  net_amount?: number;
  location_amount?: number;
  tax_amount?: number;
  card_fee_amount?: number;
  patients?: {
    name: string;
  } | null;
  status?: string;
  created_at?: string;
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export { formatCurrency } from '@/utils/formatters';






