-- Add verification fields to users table
-- Migration: 011_add_verification_fields_to_users.sql

-- Add verification status field
ALTER TABLE users ADD COLUMN verification_status VARCHAR(255);

-- Add verification code field  
ALTER TABLE users ADD COLUMN verification_code VARCHAR(255);

-- Add verification date field
ALTER TABLE users ADD COLUMN verification_date TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN users.verification_status IS 'Veriff verification status (PENDING, APPROVED, DECLINED, etc.)';
COMMENT ON COLUMN users.verification_code IS 'Veriff verification code (VERIFIED, FRAUD, etc.)';
COMMENT ON COLUMN users.verification_date IS 'Date when verification was completed';
