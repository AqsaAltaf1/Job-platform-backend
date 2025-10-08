-- Migration: Add comprehensive company information fields to employer_profiles
-- Date: 2025-09-30

ALTER TABLE employer_profiles 
ADD COLUMN company_legal_name VARCHAR(255),
ADD COLUMN company_display_name VARCHAR(255),
ADD COLUMN company_logo_url TEXT,
ADD COLUMN careers_page_url VARCHAR(500),
ADD COLUMN company_sector VARCHAR(255),
ADD COLUMN headquarters_location VARCHAR(255),
ADD COLUMN remote_policy VARCHAR(20) CHECK (remote_policy IN ('on-site', 'remote', 'hybrid', 'flexible'));

-- Update company_size to use ENUM values
-- First, update existing data to match new ENUM values
UPDATE employer_profiles 
SET company_size = CASE 
    WHEN company_size = 'small' OR company_size = 'Small' THEN '1-10'
    WHEN company_size = 'medium' OR company_size = 'Medium' THEN '51-200'
    WHEN company_size = 'large' OR company_size = 'Large' THEN '501-1000'
    WHEN company_size = 'enterprise' OR company_size = 'Enterprise' THEN '1001-5000'
    ELSE company_size
END;

-- Drop the old constraint if it exists and create new one
ALTER TABLE employer_profiles 
DROP CONSTRAINT IF EXISTS employer_profiles_company_size_check;

ALTER TABLE employer_profiles 
ADD CONSTRAINT employer_profiles_company_size_check 
CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'));

-- Add constraint for remote_policy
ALTER TABLE employer_profiles 
ADD CONSTRAINT employer_profiles_remote_policy_check 
CHECK (remote_policy IN ('on-site', 'remote', 'hybrid', 'flexible'));

-- Add indexes for commonly queried fields
CREATE INDEX idx_employer_profiles_company_industry ON employer_profiles(company_industry);
CREATE INDEX idx_employer_profiles_company_size ON employer_profiles(company_size);
CREATE INDEX idx_employer_profiles_company_location ON employer_profiles(company_location);
CREATE INDEX idx_employer_profiles_remote_policy ON employer_profiles(remote_policy);
