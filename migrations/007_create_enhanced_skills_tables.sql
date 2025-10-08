-- Migration: Create enhanced skills system tables
-- Description: Creates tables for the enhanced skills system including skills, evidence, endorsements, and invitations
-- Dependencies: candidate_profiles table (001_create_candidate_profiles_table.sql)

-- Create enhanced_skills table
CREATE TABLE IF NOT EXISTS enhanced_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    taxonomy_source VARCHAR(50) DEFAULT 'ESCO',
    taxonomy_id TEXT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER,
    last_used DATE,
    verified_rating DECIMAL(2, 1),
    skill_rating DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create skill_evidence table
CREATE TABLE IF NOT EXISTS skill_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enhanced_skill_id UUID NOT NULL REFERENCES enhanced_skills(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('certification', 'project', 'work_sample', 'github_repo', 'portfolio', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    file_url TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create peer_endorsements table
CREATE TABLE IF NOT EXISTS peer_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enhanced_skill_id UUID NOT NULL REFERENCES enhanced_skills(id) ON DELETE CASCADE,
    endorser_name TEXT NOT NULL,
    endorser_email TEXT NOT NULL,
    endorser_position TEXT,
    endorser_company TEXT,
    relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('colleague', 'manager', 'client', 'mentor', 'peer', 'other')),
    endorsement_text TEXT NOT NULL,
    skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
    verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviewer_invitations table
CREATE TABLE IF NOT EXISTS reviewer_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    reviewer_email TEXT NOT NULL,
    reviewer_name TEXT,
    invitation_token TEXT NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
    skills_to_review JSON NOT NULL,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_skills_candidate_profile_id ON enhanced_skills(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_skills_name ON enhanced_skills(name);
CREATE INDEX IF NOT EXISTS idx_enhanced_skills_category ON enhanced_skills(category);
CREATE INDEX IF NOT EXISTS idx_enhanced_skills_level ON enhanced_skills(level);
CREATE INDEX IF NOT EXISTS idx_enhanced_skills_is_active ON enhanced_skills(is_active);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_enhanced_skill_id ON skill_evidence(enhanced_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_type ON skill_evidence(type);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_verified ON skill_evidence(verified);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_is_active ON skill_evidence(is_active);

CREATE INDEX IF NOT EXISTS idx_peer_endorsements_enhanced_skill_id ON peer_endorsements(enhanced_skill_id);
CREATE INDEX IF NOT EXISTS idx_peer_endorsements_endorser_email ON peer_endorsements(endorser_email);
CREATE INDEX IF NOT EXISTS idx_peer_endorsements_relationship ON peer_endorsements(relationship);
CREATE INDEX IF NOT EXISTS idx_peer_endorsements_verified ON peer_endorsements(verified);
CREATE INDEX IF NOT EXISTS idx_peer_endorsements_is_active ON peer_endorsements(is_active);

CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_candidate_profile_id ON reviewer_invitations(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_reviewer_email ON reviewer_invitations(reviewer_email);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_invitation_token ON reviewer_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_expires_at ON reviewer_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_is_active ON reviewer_invitations(is_active);

-- Add comments for documentation
COMMENT ON TABLE enhanced_skills IS 'Enhanced skills with detailed attributes and ratings';
COMMENT ON TABLE skill_evidence IS 'Supporting evidence for skills (certifications, projects, etc.)';
COMMENT ON TABLE peer_endorsements IS 'Peer endorsements for skills with ratings';
COMMENT ON TABLE reviewer_invitations IS 'Invitations for external reviewers to endorse skills';

