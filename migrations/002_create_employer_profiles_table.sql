-- Migration: Create employer_profiles table
-- Description: Creates the employer profiles table for detailed employer information
-- Dependencies: users table (000_create_users_table.sql)

CREATE TABLE IF NOT EXISTS employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    bio TEXT,
    location VARCHAR(255),
    website TEXT,
    linkedin_url TEXT,
    profile_picture_url TEXT,
    position VARCHAR(255),
    company_name VARCHAR(255),
    company_description TEXT,
    company_website TEXT,
    company_size VARCHAR(50),
    company_industry VARCHAR(255),
    company_location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employer_profiles_user_id ON employer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_email ON employer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_is_active ON employer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_company_name ON employer_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_company_industry ON employer_profiles(company_industry);
CREATE INDEX IF NOT EXISTS idx_employer_profiles_company_location ON employer_profiles(company_location);

-- Add comments for documentation
COMMENT ON TABLE employer_profiles IS 'Detailed employer profile information';
COMMENT ON COLUMN employer_profiles.id IS 'Unique identifier for the employer profile';
COMMENT ON COLUMN employer_profiles.user_id IS 'Reference to the user account';
COMMENT ON COLUMN employer_profiles.email IS 'Employer email address';
COMMENT ON COLUMN employer_profiles.first_name IS 'Employer first name';
COMMENT ON COLUMN employer_profiles.last_name IS 'Employer last name';
COMMENT ON COLUMN employer_profiles.phone IS 'Employer phone number (optional)';
COMMENT ON COLUMN employer_profiles.bio IS 'Employer biography/description';
COMMENT ON COLUMN employer_profiles.location IS 'Employer location';
COMMENT ON COLUMN employer_profiles.website IS 'Employer personal website';
COMMENT ON COLUMN employer_profiles.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN employer_profiles.profile_picture_url IS 'URL to profile picture';
COMMENT ON COLUMN employer_profiles.position IS 'Employer position/title';
COMMENT ON COLUMN employer_profiles.company_name IS 'Company name';
COMMENT ON COLUMN employer_profiles.company_description IS 'Company description';
COMMENT ON COLUMN employer_profiles.company_website IS 'Company website URL';
COMMENT ON COLUMN employer_profiles.company_size IS 'Company size (e.g., 1-10, 11-50, etc.)';
COMMENT ON COLUMN employer_profiles.company_industry IS 'Company industry';
COMMENT ON COLUMN employer_profiles.company_location IS 'Company location';
COMMENT ON COLUMN employer_profiles.is_active IS 'Whether the profile is active';
COMMENT ON COLUMN employer_profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN employer_profiles.updated_at IS 'Timestamp when the profile was last updated';

