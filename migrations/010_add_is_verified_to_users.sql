-- Add is_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Update existing users to be verified (since they were created before this security fix)
UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false;

-- Add comment
COMMENT ON COLUMN users.is_verified IS 'Indicates if user has verified their email via OTP';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
