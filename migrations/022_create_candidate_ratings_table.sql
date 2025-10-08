-- Migration: Create candidate_ratings table
-- Description: Table to store structured candidate evaluations and ratings

CREATE TABLE candidate_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
    
    -- Rating Criteria (1-10 scale)
    technical_skills INTEGER CHECK (technical_skills >= 1 AND technical_skills <= 10),
    technical_skills_notes TEXT,
    
    communication_skills INTEGER CHECK (communication_skills >= 1 AND communication_skills <= 10),
    communication_skills_notes TEXT,
    
    problem_solving INTEGER CHECK (problem_solving >= 1 AND problem_solving <= 10),
    problem_solving_notes TEXT,
    
    cultural_fit INTEGER CHECK (cultural_fit >= 1 AND cultural_fit <= 10),
    cultural_fit_notes TEXT,
    
    experience_qualifications INTEGER CHECK (experience_qualifications >= 1 AND experience_qualifications <= 10),
    experience_qualifications_notes TEXT,
    
    leadership_potential INTEGER CHECK (leadership_potential >= 1 AND leadership_potential <= 10),
    leadership_potential_notes TEXT,
    
    -- Calculated and Overall Fields
    overall_rating DECIMAL(3,2),
    overall_comments TEXT,
    recommendation VARCHAR(50) CHECK (recommendation IN ('strongly_recommend', 'recommend', 'neutral', 'do_not_recommend')),
    
    -- Rating Context
    rating_type VARCHAR(50) NOT NULL DEFAULT 'resume_review' 
        CHECK (rating_type IN ('resume_review', 'phone_screen', 'technical_interview', 'behavioral_interview', 'final_interview')),
    
    -- Custom Criteria (JSON for flexibility)
    custom_criteria JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'submitted', 'approved')),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_candidate_ratings_application_id ON candidate_ratings(application_id);
CREATE INDEX idx_candidate_ratings_rater_id ON candidate_ratings(rater_id);
CREATE INDEX idx_candidate_ratings_interview_id ON candidate_ratings(interview_id);
CREATE INDEX idx_candidate_ratings_rating_type ON candidate_ratings(rating_type);
CREATE INDEX idx_candidate_ratings_status ON candidate_ratings(status);
CREATE INDEX idx_candidate_ratings_created_at ON candidate_ratings(created_at);
CREATE INDEX idx_candidate_ratings_overall_rating ON candidate_ratings(overall_rating);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_candidate_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_candidate_ratings_updated_at
    BEFORE UPDATE ON candidate_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_ratings_updated_at();

-- Function to calculate overall rating
CREATE OR REPLACE FUNCTION calculate_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average of non-null criteria
    NEW.overall_rating = (
        SELECT AVG(score)::DECIMAL(3,2)
        FROM (
            SELECT unnest(ARRAY[
                NEW.technical_skills,
                NEW.communication_skills,
                NEW.problem_solving,
                NEW.cultural_fit,
                NEW.experience_qualifications,
                NEW.leadership_potential
            ]) as score
        ) scores
        WHERE score IS NOT NULL
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_overall_rating_trigger
    BEFORE INSERT OR UPDATE ON candidate_ratings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_overall_rating();
