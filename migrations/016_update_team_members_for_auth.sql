-- Migration: Update team_members table for authentication system
-- Date: 2025-09-30

-- Add user_id column to link team members to user accounts
ALTER TABLE team_members 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add invitation system fields
ALTER TABLE team_members 
ADD COLUMN invitation_token VARCHAR(255),
ADD COLUMN invitation_expires_at TIMESTAMP,
ADD COLUMN invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'cancelled'));

-- Add index for invitation token
CREATE INDEX idx_team_members_invitation_token ON team_members(invitation_token);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_invitation_status ON team_members(invitation_status);

-- Update users table to support team_member role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'employer', 'candidate', 'team_member'));
-- Date: 2025-09-30

-- Add user_id column to link team members to user accounts
ALTER TABLE team_members 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add invitation system fields
ALTER TABLE team_members 
ADD COLUMN invitation_token VARCHAR(255),
ADD COLUMN invitation_expires_at TIMESTAMP,
ADD COLUMN invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'cancelled'));

-- Add index for invitation token
CREATE INDEX idx_team_members_invitation_token ON team_members(invitation_token);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_invitation_status ON team_members(invitation_status);

-- Update users table to support team_member role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'employer', 'candidate', 'team_member'));
