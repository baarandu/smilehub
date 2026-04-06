import { supabase } from '@/lib/supabase';

/**
 * Resolve the user's clinic_users rows, preferring the localStorage selection.
 * Falls back to admin role, then first entry.
 */
async function resolveClinicUser<T extends { clinic_id: string }>(
  userId: string,
  selectFields: string
): Promise<T | null> {
  const { data: rows } = await supabase
    .from('clinic_users')
    .select(selectFields)
    .eq('user_id', userId)
    .order('role', { ascending: true });

  if (!rows || rows.length === 0) return null;

  const savedClinicId = localStorage.getItem('selected_clinic_id');
  if (savedClinicId) {
    const match = rows.find((r: any) => r.clinic_id === savedClinicId);
    if (match) return match as T;
  }

  // Fallback: prefer admin role, then first
  const admin = rows.find((r: any) => {
    const roles = (r as any).roles || [(r as any).role];
    return roles.includes('admin');
  });
  return (admin || rows[0]) as T;
}

/**
 * Get authenticated user's ID and clinic ID.
 * Throws if user is not authenticated or clinic is not found.
 */
export async function getClinicContext(): Promise<{ userId: string; clinicId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const clinicUser = await resolveClinicUser<{ clinic_id: string }>(user.id, 'clinic_id');
  if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

  return { userId: user.id, clinicId: clinicUser.clinic_id };
}

/**
 * Same as getClinicContext but returns null instead of throwing.
 */
export async function getClinicContextSafe(): Promise<{ userId: string; clinicId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const clinicUser = await resolveClinicUser<{ clinic_id: string }>(user.id, 'clinic_id');
  if (!clinicUser?.clinic_id) return null;

  return { userId: user.id, clinicId: clinicUser.clinic_id };
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

  const clinicUser = await resolveClinicUser<{ clinic_id: string; role: string; roles: string[] }>(
    user.id, 'clinic_id, role, roles'
  );
  if (!clinicUser) return null;

  return {
    userId: user.id,
    clinicId: clinicUser.clinic_id,
    role: clinicUser.role,
    roles: clinicUser.roles || [],
  };
}
