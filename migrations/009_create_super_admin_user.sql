-- Migration: Create Super Admin user
-- Description: Creates the initial super admin user for system administration
-- Dependencies: users table (000_create_users_table.sql)
-- Password: Admin1234@ (hashed with bcrypt)

-- Insert super admin user
-- Note: The password hash below is for 'Admin1234@' using bcrypt with 12 salt rounds
INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@jobplatform.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzqK2K', -- Admin1234@
    'super_admin',
    'Super',
    'Admin',
    '+1-555-0123',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT 
    id,
    email,
    role,
    first_name,
    last_name,
    is_active,
    created_at
FROM users 
WHERE email = 'admin@jobplatform.com';

-- Show success message
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@jobplatform.com') THEN
        RAISE NOTICE '✅ Super Admin created successfully!';
        RAISE NOTICE '📧 Email: admin@jobplatform.com';
        RAISE NOTICE '🔑 Password: Admin1234@';
        RAISE NOTICE '👤 Role: super_admin';
    ELSE
        RAISE NOTICE '❌ Failed to create Super Admin user';
    END IF;
END $$;
