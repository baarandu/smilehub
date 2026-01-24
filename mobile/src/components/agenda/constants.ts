export const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  scheduled: { label: 'Agendado', bgColor: 'bg-[#fee2e2]', textColor: 'text-[#8b3634]' },
  confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  completed: { label: 'Compareceu', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  cancelled: { label: 'Cancelado', bgColor: 'bg-[#fee2e2]', textColor: 'text-[#8b3634]' },
};






