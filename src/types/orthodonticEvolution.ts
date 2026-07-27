export interface OrthodonticEvolution {
  id: string;
  clinic_id: string;
  patient_id: string;
  entry_date: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrthodonticEvolutionWithCreator extends OrthodonticEvolution {
  created_by_name: string | null;
}

export interface OrthodonticEvolutionInsert {
  patient_id: string;
  entry_date: string;
  content: string;
}

export type OrthodonticEvolutionUpdate = Partial<OrthodonticEvolutionInsert>;
