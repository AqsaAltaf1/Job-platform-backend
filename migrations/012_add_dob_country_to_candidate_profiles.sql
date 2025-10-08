-- Migration: Add date_of_birth and country fields to candidate_profiles table
-- Created: 2024-01-29

-- Add date_of_birth column (YYYY-MM-DD format)
ALTER TABLE candidate_profiles 
ADD COLUMN date_of_birth DATE;

-- Add country column (2-character ISO country code)
ALTER TABLE candidate_profiles 
ADD COLUMN country VARCHAR(2);

-- Add comments for documentation
COMMENT ON COLUMN candidate_profiles.date_of_birth IS 'Candidate date of birth for identity verification';
COMMENT ON COLUMN candidate_profiles.country IS 'Candidate country (ISO 2-letter code) for identity verification';
