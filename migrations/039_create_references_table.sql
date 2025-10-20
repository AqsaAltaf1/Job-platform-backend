-- Create references table
CREATE TABLE IF NOT EXISTS professional_references (
    id SERIAL PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_id INTEGER REFERENCES reference_invitations(id) ON DELETE SET NULL,
    reviewer_email VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('former_manager', 'colleague', 'client', 'mentor', 'other')),
    relationship_description TEXT,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    work_quality_rating INTEGER NOT NULL CHECK (work_quality_rating >= 1 AND work_quality_rating <= 5),
    communication_rating INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    reliability_rating INTEGER NOT NULL CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    teamwork_rating INTEGER NOT NULL CHECK (teamwork_rating >= 1 AND teamwork_rating <= 5),
    reference_text TEXT NOT NULL,
    strengths TEXT,
    areas_for_improvement TEXT,
    would_recommend BOOLEAN NOT NULL DEFAULT true,
    would_hire_again BOOLEAN NOT NULL DEFAULT true,
    years_worked_together INTEGER CHECK (years_worked_together >= 0),
    last_worked_together DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_professional_references_candidate_id ON professional_references(candidate_id);
CREATE INDEX IF NOT EXISTS idx_professional_references_reviewer_email ON professional_references(reviewer_email);
CREATE INDEX IF NOT EXISTS idx_professional_references_status ON professional_references(status);
CREATE INDEX IF NOT EXISTS idx_professional_references_invitation_id ON professional_references(invitation_id);
