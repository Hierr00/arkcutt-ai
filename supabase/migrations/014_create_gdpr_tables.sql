/**
 * Migration 014: GDPR Compliance Tables
 * Creates tables for user consent management and data deletion requests
 */

-- =====================================================
-- User Consents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies', 'analytics', 'marketing', 'data_processing')),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_consents
CREATE INDEX idx_user_consents_user_id ON user_consents (user_id);
CREATE INDEX idx_user_consents_consent_type ON user_consents (consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents (granted);
CREATE INDEX idx_user_consents_created_at ON user_consents (created_at DESC);

-- RLS for user_consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only view their own consents
CREATE POLICY "Users can view their own consents"
  ON user_consents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can insert their own consents
CREATE POLICY "Users can insert their own consents"
  ON user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own consents
CREATE POLICY "Users can update their own consents"
  ON user_consents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Service role has full access
CREATE POLICY "Service role has full access to consents"
  ON user_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Data Deletion Requests Table
-- =====================================================

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reason TEXT,
  data_categories TEXT[] DEFAULT ARRAY['all'],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for data_deletion_requests
CREATE INDEX idx_data_deletion_user_id ON data_deletion_requests (user_id);
CREATE INDEX idx_data_deletion_status ON data_deletion_requests (status);
CREATE INDEX idx_data_deletion_requested_at ON data_deletion_requests (requested_at DESC);

-- RLS for data_deletion_requests
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can create their own deletion requests
CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Service role has full access
CREATE POLICY "Service role has full access to deletion requests"
  ON data_deletion_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Functions
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS user_consents_updated_at ON user_consents;
CREATE TRIGGER user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS data_deletion_requests_updated_at ON data_deletion_requests;
CREATE TRIGGER data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's current consent status
CREATE OR REPLACE FUNCTION get_user_consent_status(
  p_user_id TEXT,
  p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_granted BOOLEAN;
BEGIN
  SELECT granted
  INTO consent_granted
  FROM user_consents
  WHERE user_id = p_user_id
    AND consent_type = p_consent_type
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(consent_granted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has pending deletion request
CREATE OR REPLACE FUNCTION has_pending_deletion_request(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_pending BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM data_deletion_requests
    WHERE user_id = p_user_id
      AND status IN ('pending', 'processing')
  ) INTO has_pending;

  RETURN has_pending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Views
-- =====================================================

-- View for active consents
CREATE OR REPLACE VIEW active_user_consents AS
SELECT DISTINCT ON (user_id, consent_type)
  id,
  user_id,
  consent_type,
  granted,
  granted_at,
  revoked_at,
  created_at
FROM user_consents
ORDER BY user_id, consent_type, created_at DESC;

-- View for pending deletion requests
CREATE OR REPLACE VIEW pending_deletion_requests AS
SELECT
  id,
  user_id,
  requested_at,
  reason,
  data_categories,
  created_at
FROM data_deletion_requests
WHERE status = 'pending'
ORDER BY requested_at ASC;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE user_consents IS 'Stores user consent records for GDPR compliance';
COMMENT ON TABLE data_deletion_requests IS 'Stores requests for data deletion (right to be forgotten)';

COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent: cookies, analytics, marketing, data_processing';
COMMENT ON COLUMN user_consents.granted IS 'Whether the consent was granted or revoked';
COMMENT ON COLUMN user_consents.granted_at IS 'Timestamp when consent was granted';
COMMENT ON COLUMN user_consents.revoked_at IS 'Timestamp when consent was revoked';

COMMENT ON COLUMN data_deletion_requests.status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN data_deletion_requests.data_categories IS 'Categories of data to delete (or [all])';

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT SELECT ON active_user_consents TO authenticated;
GRANT SELECT ON pending_deletion_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_consent_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_deletion_request(TEXT) TO authenticated;
