-- Create portfolio_items table
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('project', 'article', 'video', 'presentation', 'certificate')),
    url VARCHAR(500),
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    technologies TEXT[], -- Array of technology strings
    is_visible BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_samples table
CREATE TABLE work_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('writing', 'design', 'code', 'presentation', 'analysis', 'research')),
    url VARCHAR(500),
    file_url VARCHAR(500),
    skills_demonstrated TEXT[], -- Array of skill strings
    is_visible BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_portfolio_items_user_id ON portfolio_items(user_id);
CREATE INDEX idx_portfolio_items_type ON portfolio_items(type);
CREATE INDEX idx_portfolio_items_is_visible ON portfolio_items(is_visible);
CREATE INDEX idx_portfolio_items_order_index ON portfolio_items(order_index);

CREATE INDEX idx_work_samples_user_id ON work_samples(user_id);
CREATE INDEX idx_work_samples_type ON work_samples(type);
CREATE INDEX idx_work_samples_is_visible ON work_samples(is_visible);
CREATE INDEX idx_work_samples_order_index ON work_samples(order_index);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to call the function before update
CREATE TRIGGER update_portfolio_items_updated_at
BEFORE UPDATE ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_samples_updated_at
BEFORE UPDATE ON work_samples
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
