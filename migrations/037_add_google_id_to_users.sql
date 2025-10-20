-- Add google_id column to users table for Google OAuth
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Add index for google_id for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);

-- Update existing users to have email_verified = true if they have verification_date
UPDATE users SET email_verified = TRUE WHERE verification_date IS NOT NULL;




