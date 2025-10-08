-- Migration: Add team management fields to employer_profiles
-- Date: 2025-09-30

-- Add team management fields to employer_profiles
ALTER TABLE employer_profiles 
ADD COLUMN is_primary_owner BOOLEAN DEFAULT true,
ADD COLUMN account_role VARCHAR(50) DEFAULT 'primary_owner' CHECK (account_role IN ('primary_owner', 'hr_manager', 'recruiter', 'interviewer', 'admin')),
ADD COLUMN permissions JSONB DEFAULT '{"can_post_jobs": true, "can_view_applications": true, "can_interview_candidates": true, "can_manage_team": true, "can_access_analytics": true, "can_manage_company_profile": true}';

-- Add indexes for the new fields
CREATE INDEX idx_employer_profiles_account_role ON employer_profiles(account_role);
CREATE INDEX idx_employer_profiles_is_primary_owner ON employer_profiles(is_primary_owner);
