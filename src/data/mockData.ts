import { Patient, Consultation, Appointment, ReturnAlert } from '@/types';

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '(11) 99999-1234',
    email: 'maria.silva@email.com',
    birthDate: '1985-03-15',
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'João Santos',
    phone: '(11) 98888-5678',
    email: 'joao.santos@email.com',
    birthDate: '1990-07-22',
    createdAt: '2024-02-05',
  },
  {
    id: '3',
    name: 'Ana Oliveira',
    phone: '(11) 97777-9012',
    email: 'ana.oliveira@email.com',
    birthDate: '1978-11-08',
    createdAt: '2024-03-12',
  },
  {
    id: '4',
    name: 'Pedro Costa',
    phone: '(11) 96666-3456',
    email: 'pedro.costa@email.com',
    birthDate: '1995-01-30',
    createdAt: '2024-04-20',
  },
  {
    id: '5',
    name: 'Lucia Fernandes',
    phone: '(11) 95555-7890',
    email: 'lucia.fernandes@email.com',
    birthDate: '1982-09-12',
    createdAt: '2024-05-08',
  },
];

export const mockConsultations: Consultation[] = [
  {
    id: 'c1',
    patientId: '1',
    date: '2024-12-01',
    notes: 'Limpeza completa realizada. Paciente apresentou sensibilidade nos dentes 14 e 15. Recomendado uso de creme dental para sensibilidade. Radiografia panorâmica realizada - sem alterações significativas.',
    attachments: [],
    suggestedReturnDate: '2025-06-01',
    createdAt: '2024-12-01',
  },
  {
    id: 'c2',
    patientId: '1',
    date: '2024-06-15',
    notes: 'Restauração do dente 36 (classe II). Anestesia local aplicada. Procedimento sem intercorrências.',
    attachments: [],
    suggestedReturnDate: '2024-12-15',
    createdAt: '2024-06-15',
  },
  {
    id: 'c3',
    patientId: '2',
    date: '2024-11-20',
    notes: 'Avaliação inicial. Necessita tratamento de canal no dente 46. Encaminhado para endodontista.',
    attachments: [],
    suggestedReturnDate: '2025-01-20',
    createdAt: '2024-11-20',
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'a1',
    patientId: '1',
    patientName: 'Maria Silva',
    date: '2024-12-10',
    time: '09:00',
    status: 'scheduled',
    notes: 'Retorno - avaliação pós limpeza',
  },
  {
    id: 'a2',
    patientId: '3',
    patientName: 'Ana Oliveira',
    date: '2024-12-10',
    time: '10:30',
    status: 'scheduled',
    notes: 'Consulta de rotina',
  },
  {
    id: 'a3',
    patientId: '4',
    patientName: 'Pedro Costa',
    date: '2024-12-10',
    time: '14:00',
    status: 'scheduled',
  },
  {
    id: 'a4',
    patientId: '5',
    patientName: 'Lucia Fernandes',
    date: '2024-12-10',
    time: '15:30',
    status: 'scheduled',
    notes: 'Clareamento dental',
  },
  {
    id: 'a5',
    patientId: '2',
    patientName: 'João Santos',
    date: '2024-12-11',
    time: '09:30',
    status: 'scheduled',
  },
];

export const mockReturnAlerts: ReturnAlert[] = [
  {
    patientId: '2',
    patientName: 'João Santos',
    phone: '(11) 98888-5678',
    suggestedReturnDate: '2025-01-20',
    daysUntilReturn: 41,
  },
  {
    patientId: '3',
    patientName: 'Ana Oliveira',
    phone: '(11) 97777-9012',
    suggestedReturnDate: '2024-12-15',
    daysUntilReturn: 5,
  },
  {
    patientId: '5',
    patientName: 'Lucia Fernandes',
    phone: '(11) 95555-7890',
    suggestedReturnDate: '2024-12-20',
    daysUntilReturn: 10,
  },
];
