import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/contexts/ClinicContext';
import { planHasFeature } from '@/lib/planFeatures';

interface PlanFeatureResult {
  hasFeature: boolean;
  planSlug: string | null;
  loading: boolean;
}

/**
 * Hook to check if the current clinic's plan includes a specific feature.
 * Returns { hasFeature, planSlug, loading }.
 */
export function usePlanFeature(featureKey: string): PlanFeatureResult {
  const { clinicId } = useClinic();
  const [hasFeature, setHasFeature] = useState(true); // default true to avoid flash
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('clinic_id', clinicId)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1);

        const sub = subs?.[0];
        if (!sub) {
          setHasFeature(false);
          setLoading(false);
          return;
        }

        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('slug, features')
          .eq('id', sub.plan_id)
          .single();

        if (!plan) {
          setHasFeature(false);
          setLoading(false);
          return;
        }

        setPlanSlug(plan.slug);
        const features = Array.isArray(plan.features)
          ? plan.features
          : typeof plan.features === 'string'
            ? JSON.parse(plan.features)
            : [];
        setHasFeature(planHasFeature(features, featureKey));
      } catch (error) {
        console.error('Error checking plan feature:', error);
        setHasFeature(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [clinicId, featureKey]);

  return { hasFeature, planSlug, loading };
}
