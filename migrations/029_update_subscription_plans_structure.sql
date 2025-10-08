-- Update subscription_plans table structure for simplified monthly/yearly packages
-- This migration changes the table to support separate monthly and yearly packages

-- Add new columns
ALTER TABLE subscription_plans 
ADD COLUMN billing_cycle VARCHAR(10),
ADD COLUMN price DECIMAL(10, 2);

-- Add constraint for billing_cycle
ALTER TABLE subscription_plans 
ADD CONSTRAINT check_billing_cycle 
CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Add new column for single stripe price ID
ALTER TABLE subscription_plans 
ADD COLUMN stripe_price_id VARCHAR(255);

-- Create index for billing_cycle
CREATE INDEX idx_subscription_plans_billing_cycle ON subscription_plans(billing_cycle);

-- Note: The old columns (price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly) 
-- will remain for backward compatibility but should not be used in new code
-- They can be removed in a future migration after data migration is complete
