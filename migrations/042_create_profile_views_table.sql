-- Create profile_views table
CREATE TABLE profile_views (
    id SERIAL PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewer_type VARCHAR(20) NOT NULL CHECK (viewer_type IN ('employer', 'recruiter', 'anonymous', 'candidate')),
    viewer_email VARCHAR(255),
    viewer_company VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profile_views_candidate_id ON profile_views(candidate_id);
CREATE INDEX idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at);
CREATE INDEX idx_profile_views_candidate_viewed ON profile_views(candidate_id, viewed_at);
