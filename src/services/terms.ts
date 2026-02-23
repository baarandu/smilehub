import { supabase } from '@/lib/supabase';
import { CURRENT_TERMS_VERSION } from '@/lib/termsVersion';

export async function acceptTerms(ipAddress?: string, userAgent?: string): Promise<void> {
  const ua = userAgent || navigator.userAgent;

  const { error: tosError } = await supabase.rpc('accept_terms', {
    p_policy_type: 'terms_of_service',
    p_policy_version: CURRENT_TERMS_VERSION,
    p_ip_address: ipAddress || null,
    p_user_agent: ua,
  });

  if (tosError) throw tosError;

  const { error: ppError } = await supabase.rpc('accept_terms', {
    p_policy_type: 'privacy_policy',
    p_policy_version: CURRENT_TERMS_VERSION,
    p_ip_address: ipAddress || null,
    p_user_agent: ua,
  });

  if (ppError) throw ppError;
}

export async function checkTermsAccepted(): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_terms_accepted', {
    p_policy_version: CURRENT_TERMS_VERSION,
  });

  if (error) {
    console.error('Error checking terms acceptance:', error);
    return false;
  }

  return data === true;
}
