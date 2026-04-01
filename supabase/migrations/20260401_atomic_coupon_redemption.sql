-- Atomic coupon redemption: validates and increments used_count in a single statement.
-- Prevents race condition where concurrent requests bypass max_uses limit.
-- Returns the coupon row if successful, empty result if coupon is exhausted.
CREATE OR REPLACE FUNCTION redeem_coupon(p_coupon_id uuid)
RETURNS SETOF discount_coupons
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE discount_coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id
    AND is_active = true
    AND (max_uses IS NULL OR used_count < max_uses)
  RETURNING *;
$$;
