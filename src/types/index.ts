export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  date: string;
  notes: string;
  attachments: Attachment[];
  suggestedReturnDate?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document';
  name: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  notes?: string;
}

export interface ReturnAlert {
  patientId: string;
  patientName: string;
  phone: string;
  suggestedReturnDate: string;
  daysUntilReturn: number;
}
