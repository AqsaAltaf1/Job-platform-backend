-- Make Stripe ID columns nullable since they are auto-generated
ALTER TABLE subscription_plans ALTER COLUMN stripe_price_id DROP NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN stripe_product_id DROP NOT NULL;
