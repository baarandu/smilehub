export interface FeatureDefinition {
  id: string;
  key: string;
  label: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type FeatureDefinitionInsert = Omit<FeatureDefinition, 'id' | 'created_at'>;
export type FeatureDefinitionUpdate = Partial<FeatureDefinitionInsert>;
