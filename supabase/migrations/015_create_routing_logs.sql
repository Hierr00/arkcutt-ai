-- Migration: Create routing_logs table for Fin email classification
-- Purpose: Track all email routing decisions for monitoring and optimization
-- Author: AI System
-- Date: 2025-11-01

-- Create routing_logs table
CREATE TABLE IF NOT EXISTS routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_from VARCHAR(255) NOT NULL,
  email_subject TEXT,
  thread_id VARCHAR(255),
  routing_decision VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reason VARCHAR(255) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_routing_logs_email_from ON routing_logs(email_from);
CREATE INDEX idx_routing_logs_thread_id ON routing_logs(thread_id);
CREATE INDEX idx_routing_logs_routing_decision ON routing_logs(routing_decision);
CREATE INDEX idx_routing_logs_action ON routing_logs(action);
CREATE INDEX idx_routing_logs_created_at ON routing_logs(created_at DESC);
CREATE INDEX idx_routing_logs_confidence ON routing_logs(confidence);

-- Create composite index for common queries
CREATE INDEX idx_routing_logs_decision_created
  ON routing_logs(routing_decision, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE routing_logs IS 'Logs all email routing decisions made by Fin classify-and-route endpoint';
COMMENT ON COLUMN routing_logs.routing_decision IS 'Type of email: CUSTOMER_INQUIRY, CUSTOMER_FOLLOWUP, PROVIDER_RESPONSE, OUT_OF_SCOPE, UNCERTAIN';
COMMENT ON COLUMN routing_logs.action IS 'Action taken: CONTINUE_WITH_FIN, CLOSE_AND_PROCESS_EXTERNALLY, ESCALATE_TO_HUMAN, IGNORE';
COMMENT ON COLUMN routing_logs.confidence IS 'Confidence score 0.0-1.0 of the routing decision';
COMMENT ON COLUMN routing_logs.response_time_ms IS 'Time taken to make routing decision in milliseconds';
COMMENT ON COLUMN routing_logs.metadata IS 'Additional context: provider info, customer history, etc.';

-- Enable Row Level Security (RLS)
ALTER TABLE routing_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access)
CREATE POLICY "Service role can manage routing_logs"
  ON routing_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users (read-only)
CREATE POLICY "Authenticated users can read routing_logs"
  ON routing_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create view for routing metrics (useful for dashboard)
CREATE OR REPLACE VIEW routing_metrics AS
SELECT
  routing_decision,
  action,
  COUNT(*) as total_count,
  AVG(confidence) as avg_confidence,
  AVG(response_time_ms) as avg_response_time_ms,
  COUNT(*) FILTER (WHERE response_time_ms > 1000) as slow_responses,
  DATE_TRUNC('day', created_at) as date
FROM routing_logs
GROUP BY routing_decision, action, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

COMMENT ON VIEW routing_metrics IS 'Aggregated metrics for email routing performance';

-- Grant access to the view
GRANT SELECT ON routing_metrics TO authenticated;
GRANT SELECT ON routing_metrics TO service_role;
