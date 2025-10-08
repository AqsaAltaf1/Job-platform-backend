-- Insert sample subscription plans
INSERT INTO subscription_plans (
    name, display_name, description, 
    price_monthly, price_yearly,
    stripe_price_id_monthly, stripe_price_id_yearly, stripe_product_id,
    features, limits, sort_order, is_popular
) VALUES 
(
    'starter',
    'Starter Plan',
    'Perfect for small teams getting started with hiring',
    29.00, 290.00,
    'price_starter_monthly', 'price_starter_yearly', 'prod_starter',
    '{
        "job_posting": true,
        "basic_analytics": true,
        "email_support": true,
        "candidate_tracking": true
    }',
    '{
        "job_postings": 5,
        "team_members": 2,
        "applications": 100,
        "storage_gb": 5
    }',
    1, false
),
(
    'professional',
    'Professional Plan',
    'Advanced features for growing companies',
    79.00, 790.00,
    'price_professional_monthly', 'price_professional_yearly', 'prod_professional',
    '{
        "job_posting": true,
        "advanced_analytics": true,
        "priority_support": true,
        "candidate_tracking": true,
        "team_collaboration": true,
        "custom_branding": true,
        "ai_matching": true
    }',
    '{
        "job_postings": 25,
        "team_members": 10,
        "applications": 500,
        "storage_gb": 25
    }',
    2, true
),
(
    'enterprise',
    'Enterprise Plan',
    'Full-featured solution for large organizations',
    199.00, 1990.00,
    'price_enterprise_monthly', 'price_enterprise_yearly', 'prod_enterprise',
    '{
        "job_posting": true,
        "advanced_analytics": true,
        "priority_support": true,
        "candidate_tracking": true,
        "team_collaboration": true,
        "custom_branding": true,
        "ai_matching": true,
        "bulk_actions": true,
        "api_access": true,
        "sso": true,
        "custom_integrations": true
    }',
    '{
        "job_postings": -1,
        "team_members": -1,
        "applications": -1,
        "storage_gb": 100
    }',
    3, false
);
