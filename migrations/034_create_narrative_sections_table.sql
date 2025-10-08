-- Create narrative_sections table
CREATE TABLE narrative_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_narrative_sections_user_id ON narrative_sections(user_id);
CREATE INDEX idx_narrative_sections_is_visible ON narrative_sections(is_visible);
CREATE INDEX idx_narrative_sections_order ON narrative_sections(order_index);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_narrative_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_narrative_sections_updated_at
    BEFORE UPDATE ON narrative_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_narrative_sections_updated_at();
