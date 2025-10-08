-- Update users table to add admin-specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) CHECK (admin_level IN ('super_admin', 'admin', 'moderator'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_status VARCHAR(20) DEFAULT NULL CHECK (admin_status IN ('active', 'inactive', 'suspended'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_admin_login TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level) WHERE admin_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_admin_status ON users(admin_status) WHERE admin_status IS NOT NULL;
