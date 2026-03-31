import { supabase } from '@/lib/supabase';

/**
 * Get authenticated user's ID and clinic ID.
 * Throws if user is not authenticated or clinic is not found.
 */
export async function getClinicContext(): Promise<{ userId: string; clinicId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

  return { userId: user.id, clinicId: (clinicUser as any).clinic_id };
}

/**
 * Same as getClinicContext but returns null instead of throwing.
 */
export async function getClinicContextSafe(): Promise<{ userId: string; clinicId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser?.clinic_id) return null;

  return { userId: user.id, clinicId: (clinicUser as any).clinic_id };
}

/**
 * Get clinic context including role information.
 * Returns null if user is not authenticated or clinic is not found.
 */
export async function getClinicContextWithRole(): Promise<{
  userId: string;
  clinicId: string;
  role: string;
  roles: string[];
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id, role, roles')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser) return null;

  return {
    userId: user.id,
    clinicId: (clinicUser as any).clinic_id,
    role: (clinicUser as any).role,
    roles: (clinicUser as any).roles || [],
  };
}
