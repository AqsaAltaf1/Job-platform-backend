-- Migration: Create otps table
-- Description: Creates the OTP (One-Time Password) table for email verification
-- Dependencies: None (standalone table)

CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0 CHECK (attempts <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_otp_code ON otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Add comments for documentation
COMMENT ON TABLE otps IS 'One-Time Password records for email verification';
COMMENT ON COLUMN otps.id IS 'Unique identifier for the OTP record';
COMMENT ON COLUMN otps.email IS 'Email address for verification';
COMMENT ON COLUMN otps.otp_code IS '6-digit OTP code';
COMMENT ON COLUMN otps.expires_at IS 'Expiration timestamp for the OTP';
COMMENT ON COLUMN otps.is_used IS 'Whether the OTP has been used';
COMMENT ON COLUMN otps.attempts IS 'Number of verification attempts (max 3)';
COMMENT ON COLUMN otps.created_at IS 'Timestamp when the OTP was created';
COMMENT ON COLUMN otps.updated_at IS 'Timestamp when the OTP was last updated';

