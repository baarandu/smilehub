// Tax Configuration Service
// Handles CRUD operations for tax rate configurations

import { supabase } from '@/lib/supabase';
import type {
  TaxRateConfiguration,
  TaxRateBracket,
  ISSMunicipalRate,
  TaxRegime,
  TaxType,
  TaxRateConfigurationFormData,
  TaxRateBracketFormData,
  ISSMunicipalRateFormData,
} from '@/types/taxCalculations';

export const taxConfigService = {
  /**
   * Get the user's clinic ID
   */
  async getClinicId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: clinicUser } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single();

    return (clinicUser as any)?.clinic_id || null;
  },

  // ============================================
  // TAX CONFIGURATIONS
  // ============================================

  /**
   * Get all tax configurations for the clinic
   */
  async getTaxConfigurations(): Promise<TaxRateConfiguration[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const { data, error } = await supabase
      .from('tax_rate_configurations')
      .select(`
        *,
        brackets:tax_rate_brackets(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('tax_regime')
      .order('tax_type');

    if (error) throw error;

    // Sort brackets by bracket_order
    return ((data as any[]) || []).map(config => ({
      ...config,
      brackets: config.brackets?.sort((a: TaxRateBracket, b: TaxRateBracket) => a.bracket_order - b.bracket_order) || [],
    }));
  },

  /**
   * Get configurations for a specific regime
   */
  async getConfigurationsForRegime(regime: TaxRegime): Promise<TaxRateConfiguration[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const { data, error } = await supabase
      .from('tax_rate_configurations')
      .select(`
        *,
        brackets:tax_rate_brackets(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('tax_regime', regime)
      .eq('is_active', true)
      .order('tax_type');

    if (error) throw error;

    return ((data as any[]) || []).map(config => ({
      ...config,
      brackets: config.brackets?.sort((a: TaxRateBracket, b: TaxRateBracket) => a.bracket_order - b.bracket_order) || [],
    }));
  },

  /**
   * Get a specific configuration by regime and tax type
   */
  async getConfiguration(regime: TaxRegime, taxType: TaxType): Promise<TaxRateConfiguration | null> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return null;

    const { data, error } = await supabase
      .from('tax_rate_configurations')
      .select(`
        *,
        brackets:tax_rate_brackets(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('tax_regime', regime)
      .eq('tax_type', taxType)
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      ...data,
      brackets: (data as any).brackets?.sort((a: TaxRateBracket, b: TaxRateBracket) => a.bracket_order - b.bracket_order) || [],
    } as TaxRateConfiguration;
  },

  /**
   * Initialize default tax rates for the clinic
   */
  async initializeDefaultRates(): Promise<void> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    // Check if already initialized
    const { count } = await supabase
      .from('tax_rate_configurations')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    if (count && count > 0) {
      // Already has configurations
      return;
    }

    // Try RPC first, fallback to direct insert
    const { error: rpcError } = await supabase.rpc('seed_default_tax_rates', {
      p_clinic_id: clinicId,
    });

    if (rpcError) {
      console.log('RPC not available, using direct insert');
      await this.seedDefaultRatesDirectly(clinicId);
    }
  },

  /**
   * Seed default rates directly via inserts (fallback when RPC not available)
   */
  async seedDefaultRatesDirectly(clinicId: string): Promise<void> {
    // ============================================
    // PF Carne-Leão (IRPF 2026)
    // ============================================

    // IRPF Progressive
    const { data: irpfConfig } = await supabase
      .from('tax_rate_configurations')
      .insert({
        clinic_id: clinicId,
        tax_regime: 'pf_carne_leao',
        tax_type: 'irpf',
        rate_type: 'progressive',
        description: 'IRPF 2026 - Isento ate R$5.000/mes',
      })
      .select()
      .single();

    if (irpfConfig) {
      await supabase.from('tax_rate_brackets').insert([
        { tax_configuration_id: irpfConfig.id, min_value: 0, max_value: 5000, rate: 0, deduction: 0, bracket_order: 1 },
        { tax_configuration_id: irpfConfig.id, min_value: 5000.01, max_value: 7350, rate: 0.15, deduction: 750, bracket_order: 2 },
        { tax_configuration_id: irpfConfig.id, min_value: 7350.01, max_value: null, rate: 0.275, deduction: 908.73, bracket_order: 3 },
      ]);
    }

    // INSS Autonomo (20%)
    await supabase.from('tax_rate_configurations').insert({
      clinic_id: clinicId,
      tax_regime: 'pf_carne_leao',
      tax_type: 'inss',
      rate_type: 'flat',
      flat_rate: 0.20,
      description: 'INSS Autonomo - 20%',
    });

    // ISS PF
    await supabase.from('tax_rate_configurations').insert({
      clinic_id: clinicId,
      tax_regime: 'pf_carne_leao',
      tax_type: 'iss',
      rate_type: 'flat',
      flat_rate: 0.05,
      description: 'ISS - 2% a 5% conforme municipio',
    });

    // ============================================
    // Simples Nacional - Anexo III
    // ============================================

    const { data: simplesAnexo3 } = await supabase
      .from('tax_rate_configurations')
      .insert({
        clinic_id: clinicId,
        tax_regime: 'simples',
        tax_type: 'das',
        rate_type: 'progressive',
        description: 'Anexo III - Fator R >= 28%',
      })
      .select()
      .single();

    if (simplesAnexo3) {
      await supabase.from('tax_rate_brackets').insert([
        { tax_configuration_id: simplesAnexo3.id, min_value: 0, max_value: 180000, rate: 0.06, deduction: 0, bracket_order: 1 },
        { tax_configuration_id: simplesAnexo3.id, min_value: 180000.01, max_value: 360000, rate: 0.112, deduction: 9360, bracket_order: 2 },
        { tax_configuration_id: simplesAnexo3.id, min_value: 360000.01, max_value: 720000, rate: 0.135, deduction: 17640, bracket_order: 3 },
        { tax_configuration_id: simplesAnexo3.id, min_value: 720000.01, max_value: 1800000, rate: 0.16, deduction: 35640, bracket_order: 4 },
        { tax_configuration_id: simplesAnexo3.id, min_value: 1800000.01, max_value: 3600000, rate: 0.21, deduction: 125640, bracket_order: 5 },
        { tax_configuration_id: simplesAnexo3.id, min_value: 3600000.01, max_value: 4800000, rate: 0.33, deduction: 648000, bracket_order: 6 },
      ]);
    }

    // Simples Nacional - Anexo V
    const { data: simplesAnexo5 } = await supabase
      .from('tax_rate_configurations')
      .insert({
        clinic_id: clinicId,
        tax_regime: 'simples',
        tax_type: 'das_anexo_v',
        rate_type: 'progressive',
        description: 'Anexo V - Fator R < 28%',
      })
      .select()
      .single();

    if (simplesAnexo5) {
      await supabase.from('tax_rate_brackets').insert([
        { tax_configuration_id: simplesAnexo5.id, min_value: 0, max_value: 180000, rate: 0.155, deduction: 0, bracket_order: 1 },
        { tax_configuration_id: simplesAnexo5.id, min_value: 180000.01, max_value: 360000, rate: 0.18, deduction: 4500, bracket_order: 2 },
        { tax_configuration_id: simplesAnexo5.id, min_value: 360000.01, max_value: 720000, rate: 0.195, deduction: 9900, bracket_order: 3 },
        { tax_configuration_id: simplesAnexo5.id, min_value: 720000.01, max_value: 1800000, rate: 0.205, deduction: 17100, bracket_order: 4 },
        { tax_configuration_id: simplesAnexo5.id, min_value: 1800000.01, max_value: 3600000, rate: 0.23, deduction: 62100, bracket_order: 5 },
        { tax_configuration_id: simplesAnexo5.id, min_value: 3600000.01, max_value: 4800000, rate: 0.305, deduction: 540000, bracket_order: 6 },
      ]);
    }

    // ============================================
    // Lucro Presumido
    // ============================================

    await supabase.from('tax_rate_configurations').insert([
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'irpj', rate_type: 'flat', flat_rate: 0.048, presumption_rate: 0.32, description: 'IRPJ - 4,8% s/ faturamento' },
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'irpj_adicional', rate_type: 'flat', flat_rate: 0.10, presumption_rate: 0.32, description: 'IRPJ Adicional - 10% s/ excedente' },
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'csll', rate_type: 'flat', flat_rate: 0.0288, presumption_rate: 0.32, description: 'CSLL - 2,88% s/ faturamento' },
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'pis', rate_type: 'flat', flat_rate: 0.0065, description: 'PIS - 0,65% cumulativo' },
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'cofins', rate_type: 'flat', flat_rate: 0.03, description: 'COFINS - 3% cumulativo' },
      { clinic_id: clinicId, tax_regime: 'lucro_presumido', tax_type: 'iss', rate_type: 'flat', flat_rate: 0.05, description: 'ISS - 2% a 5%' },
    ]);

    // ============================================
    // Lucro Real
    // ============================================

    await supabase.from('tax_rate_configurations').insert([
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'irpj', rate_type: 'flat', flat_rate: 0.15, description: 'IRPJ - 15% sobre lucro' },
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'irpj_adicional', rate_type: 'flat', flat_rate: 0.10, description: 'IRPJ Adicional - 10% s/ excedente' },
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'csll', rate_type: 'flat', flat_rate: 0.09, description: 'CSLL - 9% sobre lucro' },
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'pis', rate_type: 'flat', flat_rate: 0.0165, description: 'PIS - 1,65% nao-cumulativo' },
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'cofins', rate_type: 'flat', flat_rate: 0.076, description: 'COFINS - 7,6% nao-cumulativo' },
      { clinic_id: clinicId, tax_regime: 'lucro_real', tax_type: 'iss', rate_type: 'flat', flat_rate: 0.05, description: 'ISS - 2% a 5%' },
    ]);

    // ============================================
    // ISS Municipal Default
    // ============================================

    await supabase.from('iss_municipal_rates').insert({
      clinic_id: clinicId,
      city: 'Padrao',
      state: 'XX',
      rate: 0.05,
      is_default: true,
    });
  },

  /**
   * Update a tax configuration (flat rate)
   */
  async updateConfiguration(
    id: string,
    data: Partial<TaxRateConfigurationFormData>
  ): Promise<TaxRateConfiguration> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.flat_rate !== undefined) updateData.flat_rate = data.flat_rate;
    if (data.presumption_rate !== undefined) updateData.presumption_rate = data.presumption_rate;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: result, error } = await supabase
      .from('tax_rate_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result as TaxRateConfiguration;
  },

  /**
   * Create a new tax configuration
   */
  async createConfiguration(formData: TaxRateConfigurationFormData): Promise<TaxRateConfiguration> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    const { data, error } = await supabase
      .from('tax_rate_configurations')
      .insert({
        clinic_id: clinicId,
        tax_regime: formData.tax_regime,
        tax_type: formData.tax_type,
        rate_type: formData.rate_type,
        flat_rate: formData.flat_rate || null,
        presumption_rate: formData.presumption_rate || null,
        description: formData.description || null,
        effective_from: formData.effective_from || new Date().toISOString().split('T')[0],
        is_active: formData.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaxRateConfiguration;
  },

  // ============================================
  // TAX BRACKETS
  // ============================================

  /**
   * Get brackets for a configuration
   */
  async getBrackets(configurationId: string): Promise<TaxRateBracket[]> {
    const { data, error } = await supabase
      .from('tax_rate_brackets')
      .select('*')
      .eq('tax_configuration_id', configurationId)
      .order('bracket_order');

    if (error) throw error;
    return (data as TaxRateBracket[]) || [];
  },

  /**
   * Update a bracket
   */
  async updateBracket(id: string, data: Partial<TaxRateBracketFormData>): Promise<TaxRateBracket> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.min_value !== undefined) updateData.min_value = data.min_value;
    if (data.max_value !== undefined) updateData.max_value = data.max_value;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.deduction !== undefined) updateData.deduction = data.deduction;

    const { data: result, error } = await supabase
      .from('tax_rate_brackets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result as TaxRateBracket;
  },

  /**
   * Create a new bracket
   */
  async createBracket(configurationId: string, formData: TaxRateBracketFormData): Promise<TaxRateBracket> {
    const { data, error } = await supabase
      .from('tax_rate_brackets')
      .insert({
        tax_configuration_id: configurationId,
        min_value: formData.min_value,
        max_value: formData.max_value,
        rate: formData.rate,
        deduction: formData.deduction,
        bracket_order: formData.bracket_order,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaxRateBracket;
  },

  /**
   * Delete a bracket
   */
  async deleteBracket(id: string): Promise<void> {
    const { error } = await supabase
      .from('tax_rate_brackets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Replace all brackets for a configuration
   */
  async replaceBrackets(configurationId: string, brackets: TaxRateBracketFormData[]): Promise<TaxRateBracket[]> {
    // Delete existing brackets
    const { error: deleteError } = await supabase
      .from('tax_rate_brackets')
      .delete()
      .eq('tax_configuration_id', configurationId);

    if (deleteError) throw deleteError;

    // Insert new brackets
    const { data, error } = await supabase
      .from('tax_rate_brackets')
      .insert(
        brackets.map((b, index) => ({
          tax_configuration_id: configurationId,
          min_value: b.min_value,
          max_value: b.max_value,
          rate: b.rate,
          deduction: b.deduction,
          bracket_order: index + 1,
        }))
      )
      .select();

    if (error) throw error;
    return (data as TaxRateBracket[]) || [];
  },

  // ============================================
  // ISS MUNICIPAL RATES
  // ============================================

  /**
   * Get all ISS rates for the clinic
   */
  async getISSRates(): Promise<ISSMunicipalRate[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const { data, error } = await supabase
      .from('iss_municipal_rates')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('is_default', { ascending: false })
      .order('state')
      .order('city');

    if (error) throw error;
    return (data as ISSMunicipalRate[]) || [];
  },

  /**
   * Get the default ISS rate
   */
  async getDefaultISSRate(): Promise<ISSMunicipalRate | null> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return null;

    const { data, error } = await supabase
      .from('iss_municipal_rates')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as ISSMunicipalRate | null;
  },

  /**
   * Get ISS rate for a specific city
   */
  async getISSRateForCity(city: string, state: string): Promise<ISSMunicipalRate | null> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return null;

    const { data, error } = await supabase
      .from('iss_municipal_rates')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('city', city)
      .eq('state', state)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      // Return default rate
      return this.getDefaultISSRate();
    }

    return data as ISSMunicipalRate;
  },

  /**
   * Create ISS rate
   */
  async createISSRate(formData: ISSMunicipalRateFormData): Promise<ISSMunicipalRate> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    // If setting as default, unset other defaults
    if (formData.is_default) {
      await supabase
        .from('iss_municipal_rates')
        .update({ is_default: false })
        .eq('clinic_id', clinicId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('iss_municipal_rates')
      .insert({
        clinic_id: clinicId,
        city: formData.city,
        state: formData.state,
        rate: formData.rate,
        is_default: formData.is_default || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ISSMunicipalRate;
  },

  /**
   * Update ISS rate
   */
  async updateISSRate(id: string, formData: Partial<ISSMunicipalRateFormData>): Promise<ISSMunicipalRate> {
    const clinicId = await this.getClinicId();

    // If setting as default, unset other defaults
    if (formData.is_default && clinicId) {
      await supabase
        .from('iss_municipal_rates')
        .update({ is_default: false })
        .eq('clinic_id', clinicId)
        .eq('is_default', true)
        .neq('id', id);
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (formData.city !== undefined) updateData.city = formData.city;
    if (formData.state !== undefined) updateData.state = formData.state;
    if (formData.rate !== undefined) updateData.rate = formData.rate;
    if (formData.is_default !== undefined) updateData.is_default = formData.is_default;

    const { data, error } = await supabase
      .from('iss_municipal_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ISSMunicipalRate;
  },

  /**
   * Delete ISS rate
   */
  async deleteISSRate(id: string): Promise<void> {
    const { error } = await supabase
      .from('iss_municipal_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ============================================
  // RESET / RESTORE DEFAULTS
  // ============================================

  /**
   * Reset all tax configurations to defaults
   */
  async resetToDefaults(): Promise<void> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    // Delete all existing configurations (will cascade to brackets)
    await supabase
      .from('tax_rate_configurations')
      .delete()
      .eq('clinic_id', clinicId);

    // Delete all ISS rates
    await supabase
      .from('iss_municipal_rates')
      .delete()
      .eq('clinic_id', clinicId);

    // Re-seed defaults - try RPC first, fallback to direct insert
    const { error } = await supabase.rpc('seed_default_tax_rates', {
      p_clinic_id: clinicId,
    });

    if (error) {
      console.log('RPC not available, using direct insert');
      await this.seedDefaultRatesDirectly(clinicId);
    }
  },
};
