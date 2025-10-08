-- Migration: Create experiences table
-- Description: Creates the experiences table for candidate work experience
-- Dependencies: candidate_profiles table (001_create_candidate_profiles_table.sql)

CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    description TEXT,
    from_date DATE NOT NULL,
    to_date DATE,
    is_current BOOLEAN DEFAULT false,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_experiences_user_profile_id ON experiences(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_experiences_company_name ON experiences(company_name);
CREATE INDEX IF NOT EXISTS idx_experiences_role ON experiences(role);
CREATE INDEX IF NOT EXISTS idx_experiences_from_date ON experiences(from_date);
CREATE INDEX IF NOT EXISTS idx_experiences_is_current ON experiences(is_current);
CREATE INDEX IF NOT EXISTS idx_experiences_is_active ON experiences(is_active);

-- Add comments for documentation
COMMENT ON TABLE experiences IS 'Candidate work experience records';
COMMENT ON COLUMN experiences.id IS 'Unique identifier for the experience record';
COMMENT ON COLUMN experiences.user_profile_id IS 'Reference to the candidate profile';
COMMENT ON COLUMN experiences.company_name IS 'Name of the company';
COMMENT ON COLUMN experiences.role IS 'Job title/role at the company';
COMMENT ON COLUMN experiences.description IS 'Description of responsibilities and achievements';
COMMENT ON COLUMN experiences.from_date IS 'Start date of the experience';
COMMENT ON COLUMN experiences.to_date IS 'End date of the experience (null for current)';
COMMENT ON COLUMN experiences.is_current IS 'Whether this is the current job';
COMMENT ON COLUMN experiences.location IS 'Location of the job';
COMMENT ON COLUMN experiences.is_active IS 'Whether the experience record is active';
COMMENT ON COLUMN experiences.created_at IS 'Timestamp when the experience was created';
COMMENT ON COLUMN experiences.updated_at IS 'Timestamp when the experience was last updated';

