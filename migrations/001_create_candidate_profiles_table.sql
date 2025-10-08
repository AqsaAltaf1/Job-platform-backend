-- Migration: Create candidate_profiles table
-- Description: Creates the candidate profiles table for detailed candidate information
-- Dependencies: users table (000_create_users_table.sql)

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    bio TEXT,
    job_title VARCHAR(255),
    location VARCHAR(255),
    website TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    profile_picture_url TEXT,
    skills JSON DEFAULT '[]',
    experience_years INTEGER,
    education TEXT,
    resume_url TEXT,
    portfolio_url TEXT,
    salary_expectation INTEGER,
    availability VARCHAR(20) DEFAULT 'immediate' CHECK (availability IN ('immediate', '2-weeks', '1-month', 'not-available')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_email ON candidate_profiles(email);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_is_active ON candidate_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_location ON candidate_profiles(location);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_availability ON candidate_profiles(availability);

-- Add comments for documentation
COMMENT ON TABLE candidate_profiles IS 'Detailed candidate profile information';
COMMENT ON COLUMN candidate_profiles.id IS 'Unique identifier for the candidate profile';
COMMENT ON COLUMN candidate_profiles.user_id IS 'Reference to the user account';
COMMENT ON COLUMN candidate_profiles.email IS 'Candidate email address';
COMMENT ON COLUMN candidate_profiles.first_name IS 'Candidate first name';
COMMENT ON COLUMN candidate_profiles.last_name IS 'Candidate last name';
COMMENT ON COLUMN candidate_profiles.phone IS 'Candidate phone number (optional)';
COMMENT ON COLUMN candidate_profiles.bio IS 'Candidate biography/description';
COMMENT ON COLUMN candidate_profiles.job_title IS 'Candidate job title or desired position';
COMMENT ON COLUMN candidate_profiles.location IS 'Candidate location';
COMMENT ON COLUMN candidate_profiles.website IS 'Candidate personal website';
COMMENT ON COLUMN candidate_profiles.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN candidate_profiles.github_url IS 'GitHub profile URL';
COMMENT ON COLUMN candidate_profiles.profile_picture_url IS 'URL to profile picture';
COMMENT ON COLUMN candidate_profiles.skills IS 'JSON array of candidate skills';
COMMENT ON COLUMN candidate_profiles.experience_years IS 'Years of professional experience';
COMMENT ON COLUMN candidate_profiles.education IS 'Education summary';
COMMENT ON COLUMN candidate_profiles.resume_url IS 'URL to resume file';
COMMENT ON COLUMN candidate_profiles.portfolio_url IS 'URL to portfolio';
COMMENT ON COLUMN candidate_profiles.salary_expectation IS 'Expected salary in currency units';
COMMENT ON COLUMN candidate_profiles.availability IS 'When the candidate is available to start';
COMMENT ON COLUMN candidate_profiles.is_active IS 'Whether the profile is active';
COMMENT ON COLUMN candidate_profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN candidate_profiles.updated_at IS 'Timestamp when the profile was last updated';

