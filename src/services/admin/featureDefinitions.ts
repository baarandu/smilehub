import { supabase } from '@/lib/supabase';
import type { FeatureDefinition, FeatureDefinitionInsert, FeatureDefinitionUpdate } from '@/types/featureDefinition';

export const featureDefinitionsService = {
  async getAll(): Promise<FeatureDefinition[]> {
    const { data, error } = await supabase
      .from('plan_feature_definitions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as FeatureDefinition[];
  },

  async getActive(): Promise<FeatureDefinition[]> {
    const { data, error } = await supabase
      .from('plan_feature_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as FeatureDefinition[];
  },

  async create(def: FeatureDefinitionInsert): Promise<FeatureDefinition> {
    const { data, error } = await supabase
      .from('plan_feature_definitions')
      .insert(def)
      .select()
      .single();

    if (error) throw error;
    return data as FeatureDefinition;
  },

  async update(id: string, def: FeatureDefinitionUpdate): Promise<FeatureDefinition> {
    const { data, error } = await supabase
      .from('plan_feature_definitions')
      .update(def)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FeatureDefinition;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('plan_feature_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
