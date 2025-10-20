-- Add is_outdated column to professional_references table
ALTER TABLE professional_references 
ADD COLUMN is_outdated BOOLEAN NOT NULL DEFAULT FALSE;
