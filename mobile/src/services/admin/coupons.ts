import { supabase } from '../../lib/supabase';

export interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description: string | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean | null;
  max_uses: number | null;
  used_count: number | null;
  applicable_plan_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

const table = () => supabase.from('discount_coupons') as any;

export const couponsService = {
  async getAll(): Promise<DiscountCoupon[]> {
    const { data, error } = await table().select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(coupon: Partial<DiscountCoupon>): Promise<DiscountCoupon> {
    const { data, error } = await table().insert(coupon).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, coupon: Partial<DiscountCoupon>): Promise<void> {
    const { error } = await table().update(coupon).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await table().delete().eq('id', id);
    if (error) throw error;
  },
};
