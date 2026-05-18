import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'selected_clinic_id';

export async function getSelectedClinicId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setSelectedClinicId(clinicId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, clinicId);
  } catch {
    // Non-blocking: selection won't persist but session can continue
  }
}

export async function clearSelectedClinicId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * Resolve the active clinic_id for a given user, handling the multi-clinic case.
 * Precedence: AsyncStorage selected → admin role → first row.
 * Returns null if user belongs to no clinic.
 */
export async function resolveActiveClinicId(userId: string): Promise<string | null> {
  const { data: rows } = await supabase
    .from('clinic_users')
    .select('clinic_id, role, roles')
    .eq('user_id', userId)
    .order('role', { ascending: true });

  const list = (rows || []) as Array<{ clinic_id: string; role: string; roles?: string[] | null }>;
  if (list.length === 0) return null;

  const savedId = await getSelectedClinicId();
  const match = list.find(r => savedId && r.clinic_id === savedId)
    || list.find(r => (r.roles || [r.role]).includes('admin'))
    || list[0];

  return match.clinic_id;
}
