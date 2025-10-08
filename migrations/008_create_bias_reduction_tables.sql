-- Migration: Create bias reduction tracking tables
-- This migration creates tables to track bias reduction analytics and reviewer consistency

-- Table to track bias reduction processing
CREATE TABLE IF NOT EXISTS bias_reduction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endorsement_id UUID NOT NULL,
    original_text TEXT,
    anonymized_text TEXT,
    normalized_text TEXT,
    processing_type VARCHAR(50) NOT NULL, -- 'anonymization', 'sentiment_normalization', 'full_pipeline'
    processing_status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'failed', 'skipped'
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track reviewer consistency analytics
CREATE TABLE IF NOT EXISTS reviewer_consistency_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_email TEXT NOT NULL,
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    standard_deviation DECIMAL(3,2),
    consistency_score INTEGER, -- 0-100
    is_consistent BOOLEAN DEFAULT true,
    issues_detected TEXT[], -- Array of detected issues
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track bias reduction metrics
CREATE TABLE IF NOT EXISTS bias_reduction_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL, -- 'anonymization_rate', 'consistency_score', 'sentiment_balance'
    metric_value DECIMAL(10,4),
    metric_period VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    total_processed INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bias_reduction_logs_endorsement_id ON bias_reduction_logs(endorsement_id);
CREATE INDEX IF NOT EXISTS idx_bias_reduction_logs_processing_type ON bias_reduction_logs(processing_type);
CREATE INDEX IF NOT EXISTS idx_bias_reduction_logs_created_at ON bias_reduction_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_reviewer_consistency_reviewer_email ON reviewer_consistency_analytics(reviewer_email);
CREATE INDEX IF NOT EXISTS idx_reviewer_consistency_last_analyzed ON reviewer_consistency_analytics(last_analyzed_at);

CREATE INDEX IF NOT EXISTS idx_bias_metrics_type_period ON bias_reduction_metrics(metric_type, metric_period);
CREATE INDEX IF NOT EXISTS idx_bias_metrics_created_at ON bias_reduction_metrics(created_at);

-- Add foreign key constraints
ALTER TABLE bias_reduction_logs 
ADD CONSTRAINT fk_bias_reduction_logs_endorsement 
FOREIGN KEY (endorsement_id) REFERENCES peer_endorsements(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE bias_reduction_logs IS 'Tracks all bias reduction processing activities on endorsement text';
COMMENT ON TABLE reviewer_consistency_analytics IS 'Analytics on reviewer rating consistency and patterns';
COMMENT ON TABLE bias_reduction_metrics IS 'Aggregated metrics on bias reduction effectiveness';

COMMENT ON COLUMN bias_reduction_logs.processing_type IS 'Type of bias reduction applied: anonymization, sentiment_normalization, or full_pipeline';
COMMENT ON COLUMN reviewer_consistency_analytics.consistency_score IS 'Score from 0-100 indicating reviewer consistency (higher is better)';
COMMENT ON COLUMN bias_reduction_metrics.metric_value IS 'The actual metric value (e.g., average consistency score, anonymization rate)';
