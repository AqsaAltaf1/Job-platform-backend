-- Migration: Create team_members table for employer team management
-- Date: 2025-09-30

-- Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_profile_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'recruiter' CHECK (role IN ('primary_owner', 'hr_manager', 'recruiter', 'interviewer', 'admin')),
    permissions JSONB DEFAULT '{"can_post_jobs": false, "can_view_applications": false, "can_interview_candidates": false, "can_manage_team": false, "can_access_analytics": false, "can_manage_company_profile": false}',
    phone VARCHAR(50),
    department VARCHAR(255),
    job_title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES team_members(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_team_members_employer_profile_id ON team_members(employer_profile_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_role ON team_members(role);

-- Add unique constraint for email per employer
CREATE UNIQUE INDEX idx_team_members_employer_email ON team_members(employer_profile_id, email);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_members_updated_at();
