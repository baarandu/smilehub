-- Allow authenticated users to read active discount coupons (for validation)
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active coupons"
    ON discount_coupons
    FOR SELECT
    TO authenticated
    USING (is_active = true);
