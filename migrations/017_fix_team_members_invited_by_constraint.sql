-- Migration: Fix team_members invited_by foreign key constraint
-- Date: 2025-09-30
-- Issue: invited_by should reference users(id) not team_members(id)

-- Drop the incorrect foreign key constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_invited_by_fkey;

-- Add the correct foreign key constraint to reference users table
ALTER TABLE team_members ADD CONSTRAINT team_members_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;
