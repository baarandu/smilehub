import { supabase } from "@/lib/supabase";

export const adminAuthService = {
    async isSuperAdmin(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('id', user.id)
            .single();

        if (error || !data) return false;

        return !!data.is_super_admin;
    }
};
