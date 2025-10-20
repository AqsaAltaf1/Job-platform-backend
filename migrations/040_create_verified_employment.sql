-- Create table for Verified Employment records
CREATE TABLE IF NOT EXISTS verified_employments (
  id SERIAL PRIMARY KEY,
  candidate_profile_id UUID NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  employment_type VARCHAR(64),
  start_date DATE NOT NULL,
  end_date DATE,
  responsibilities TEXT,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  verification_method VARCHAR(64),
  verifier_contact_email VARCHAR(255),
  verifier_name VARCHAR(255),
  review_token VARCHAR(255),
  review_token_expires_at TIMESTAMP WITH TIME ZONE,
  evidence_urls TEXT[],
  evidence_text_extracted JSONB,
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_verified_emp_candidate_profile
    FOREIGN KEY (candidate_profile_id)
    REFERENCES candidate_profiles(id)
    ON DELETE CASCADE
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_verified_employments_candidate_profile_id ON verified_employments(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_verified_employments_verification_status ON verified_employments(verification_status);

