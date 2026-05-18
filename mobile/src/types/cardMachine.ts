export interface CardMachine {
  id: string;
  clinic_id: string;
  name: string;
  dentist_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardMachineInsert {
  clinic_id?: string;
  name: string;
  dentist_id?: string | null;
  active?: boolean;
}

export interface CardMachineUpdate {
  name?: string;
  dentist_id?: string | null;
  active?: boolean;
}

export interface CardMachineWithDentist extends CardMachine {
  dentist_name?: string | null;
}
