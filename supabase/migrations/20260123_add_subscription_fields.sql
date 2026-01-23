-- Migration: Add fields for plan change management
-- Date: 2026-01-23

-- Add stripe_subscription_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscriptions'
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD COLUMN stripe_subscription_id text;
    END IF;
END $$;

-- Add stripe_customer_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscriptions'
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD COLUMN stripe_customer_id text;
    END IF;
END $$;

-- Add pending_plan_id for scheduled downgrades
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscriptions'
        AND column_name = 'pending_plan_id'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD COLUMN pending_plan_id uuid REFERENCES public.subscription_plans(id);
    END IF;
END $$;

-- Add index for stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
ON public.subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe Subscription ID for managing payments';
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe Customer ID';
COMMENT ON COLUMN public.subscriptions.pending_plan_id IS 'Plan ID for scheduled downgrades (applied at next billing cycle)';
