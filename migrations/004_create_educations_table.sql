-- Migration: Create educations table
-- Description: Creates the educations table for candidate education records
-- Dependencies: candidate_profiles table (001_create_candidate_profiles_table.sql)

CREATE TABLE IF NOT EXISTS educations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    location VARCHAR(255),
    gpa DECIMAL(3, 2),
    activities TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_educations_user_profile_id ON educations(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_educations_institution_name ON educations(institution_name);
CREATE INDEX IF NOT EXISTS idx_educations_degree ON educations(degree);
CREATE INDEX IF NOT EXISTS idx_educations_field_of_study ON educations(field_of_study);
CREATE INDEX IF NOT EXISTS idx_educations_start_date ON educations(start_date);
CREATE INDEX IF NOT EXISTS idx_educations_is_current ON educations(is_current);
CREATE INDEX IF NOT EXISTS idx_educations_is_active ON educations(is_active);

-- Add comments for documentation
COMMENT ON TABLE educations IS 'Candidate education records';
COMMENT ON COLUMN educations.id IS 'Unique identifier for the education record';
COMMENT ON COLUMN educations.user_profile_id IS 'Reference to the candidate profile';
COMMENT ON COLUMN educations.institution_name IS 'Name of the educational institution';
COMMENT ON COLUMN educations.degree IS 'Degree obtained (e.g., Bachelor, Master, PhD)';
COMMENT ON COLUMN educations.field_of_study IS 'Field of study/major';
COMMENT ON COLUMN educations.description IS 'Description of the education program';
COMMENT ON COLUMN educations.start_date IS 'Start date of the education';
COMMENT ON COLUMN educations.end_date IS 'End date of the education (null for current)';
COMMENT ON COLUMN educations.is_current IS 'Whether this is current education';
COMMENT ON COLUMN educations.location IS 'Location of the institution';
COMMENT ON COLUMN educations.gpa IS 'Grade Point Average (0.00 to 4.00)';
COMMENT ON COLUMN educations.activities IS 'Extracurricular activities and achievements';
COMMENT ON COLUMN educations.is_active IS 'Whether the education record is active';
COMMENT ON COLUMN educations.created_at IS 'Timestamp when the education was created';
COMMENT ON COLUMN educations.updated_at IS 'Timestamp when the education was last updated';

