-- Migration: Create projects table
-- Description: Creates the projects table for candidate project portfolios
-- Dependencies: candidate_profiles table (001_create_candidate_profiles_table.sql)

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_url TEXT,
    github_url TEXT,
    image_url TEXT,
    technologies JSON DEFAULT '[]',
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_profile_id ON projects(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Candidate project portfolio records';
COMMENT ON COLUMN projects.id IS 'Unique identifier for the project record';
COMMENT ON COLUMN projects.user_profile_id IS 'Reference to the candidate profile';
COMMENT ON COLUMN projects.title IS 'Project title/name';
COMMENT ON COLUMN projects.description IS 'Project description and details';
COMMENT ON COLUMN projects.project_url IS 'URL to the live project';
COMMENT ON COLUMN projects.github_url IS 'URL to the GitHub repository';
COMMENT ON COLUMN projects.image_url IS 'URL to project screenshot/image';
COMMENT ON COLUMN projects.technologies IS 'JSON array of technologies used';
COMMENT ON COLUMN projects.start_date IS 'Project start date';
COMMENT ON COLUMN projects.end_date IS 'Project end date';
COMMENT ON COLUMN projects.is_active IS 'Whether the project record is active';
COMMENT ON COLUMN projects.created_at IS 'Timestamp when the project was created';
COMMENT ON COLUMN projects.updated_at IS 'Timestamp when the project was last updated';

