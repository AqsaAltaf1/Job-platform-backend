-- Make old subscription plan columns nullable since we're using the new structure
-- This allows the new code to work without providing values for old columns

-- Make old price columns nullable
ALTER TABLE subscription_plans 
ALTER COLUMN price_monthly DROP NOT NULL,
ALTER COLUMN price_yearly DROP NOT NULL;

-- Make old stripe price ID columns nullable
ALTER TABLE subscription_plans 
ALTER COLUMN stripe_price_id_monthly DROP NOT NULL,
ALTER COLUMN stripe_price_id_yearly DROP NOT NULL;

-- Make new columns NOT NULL since they're required for new packages
ALTER TABLE subscription_plans 
ALTER COLUMN billing_cycle SET NOT NULL,
ALTER COLUMN price SET NOT NULL,
ALTER COLUMN stripe_price_id SET NOT NULL;
