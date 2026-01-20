import { supabase } from "@/lib/supabase";
import { DiscountCoupon, DiscountCouponInsert, DiscountCouponUpdate } from "@/types/database";

export const couponsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('discount_coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DiscountCoupon[];
    },

    async create(coupon: DiscountCouponInsert) {
        const { data, error } = await supabase
            .from('discount_coupons')
            .insert(coupon)
            .select()
            .single();

        if (error) throw error;
        return data as DiscountCoupon;
    },

    async update(id: string, coupon: DiscountCouponUpdate) {
        const { data, error } = await supabase
            .from('discount_coupons')
            .update(coupon)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as DiscountCoupon;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('discount_coupons')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async validateCode(code: string, planId?: string) {
        const { data, error } = await supabase
            .from('discount_coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            throw new Error('Cupom inválido ou não encontrado');
        }

        const now = new Date();
        const validFrom = new Date(data.valid_from);
        const validUntil = new Date(data.valid_until);

        if (now < validFrom || now > validUntil) {
            throw new Error('Cupom expirado');
        }

        if (data.max_uses !== null && data.used_count >= data.max_uses) {
            throw new Error('Cupom esgotado');
        }

        if (planId && data.applicable_plan_ids && !data.applicable_plan_ids.includes(planId)) {
            throw new Error('Cupom não aplicável a este plano');
        }

        return data as DiscountCoupon;
    }
};
