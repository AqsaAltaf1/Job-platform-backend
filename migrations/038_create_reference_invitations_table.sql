-- Create reference_invitations table
CREATE TABLE IF NOT EXISTS reference_invitations (
    id SERIAL PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_email VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    declined_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reference_invitations_candidate_id ON reference_invitations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_reference_invitations_reviewer_email ON reference_invitations(reviewer_email);
CREATE INDEX IF NOT EXISTS idx_reference_invitations_token ON reference_invitations(token);
CREATE INDEX IF NOT EXISTS idx_reference_invitations_status ON reference_invitations(status);
CREATE INDEX IF NOT EXISTS idx_reference_invitations_expires_at ON reference_invitations(expires_at);
