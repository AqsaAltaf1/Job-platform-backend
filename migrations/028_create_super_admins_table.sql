-- Create super_admins table separate from employers/candidates
CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admin_level VARCHAR(20) NOT NULL DEFAULT 'super_admin' CHECK (admin_level IN ('super_admin', 'system_admin')),
    permissions JSONB NOT NULL DEFAULT '{
        "manage_users": true,
        "manage_subscriptions": true,
        "manage_packages": true,
        "manage_employers": true,
        "manage_candidates": true,
        "view_analytics": true,
        "manage_system": true,
        "manage_admins": true
    }',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX idx_super_admins_admin_level ON super_admins(admin_level);
CREATE INDEX idx_super_admins_status ON super_admins(status);

-- Create updated_at trigger
CREATE TRIGGER update_super_admins_updated_at 
    BEFORE UPDATE ON super_admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert the existing super admin user
INSERT INTO super_admins (user_id, admin_level, permissions, status, notes) 
VALUES (
    'd4206503-4fd7-4d96-b646-55eefa4820cc', 
    'super_admin', 
    '{
        "manage_users": true,
        "manage_subscriptions": true,
        "manage_packages": true,
        "manage_employers": true,
        "manage_candidates": true,
        "view_analytics": true,
        "manage_system": true,
        "manage_admins": true
    }', 
    'active', 
    'Initial super admin user'
);