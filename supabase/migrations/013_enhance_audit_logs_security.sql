/**
 * Migration 013: Enhance Audit Logs for Security
 * Adds security-specific columns and event types to existing audit_logs table
 */

-- Add new columns for security audit logging
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Create index for severity and success for quick filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs (success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);

-- Add index for user_email for failed login tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs (user_email);

-- Create view for security events
CREATE OR REPLACE VIEW security_events AS
SELECT
  id,
  created_at,
  timestamp,
  event_type,
  severity,
  user_id,
  user_email,
  ip_address,
  user_agent,
  success,
  error_message,
  metadata
FROM audit_logs
WHERE event_type LIKE 'auth.%'
   OR event_type LIKE 'security.%'
ORDER BY created_at DESC;

-- Create view for failed authentication attempts
CREATE OR REPLACE VIEW failed_auth_attempts AS
SELECT
  id,
  created_at,
  event_type,
  user_email,
  ip_address,
  user_agent,
  error_message
FROM audit_logs
WHERE event_type IN ('auth.failed_login', 'auth.account_locked', 'auth.permission_denied')
  AND success = false
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Create function to get failed login count
CREATE OR REPLACE FUNCTION get_failed_login_count(
  p_identifier TEXT,
  p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '15 minutes'
)
RETURNS INTEGER AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO failed_count
  FROM audit_logs
  WHERE event_type = 'auth.failed_login'
    AND (user_email = p_identifier OR ip_address = p_identifier)
    AND created_at >= p_since;

  RETURN failed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if account should be locked
CREATE OR REPLACE FUNCTION should_lock_account(
  p_email TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO failed_count
  FROM audit_logs
  WHERE event_type = 'auth.failed_login'
    AND user_email = p_email
    AND created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  RETURN failed_count >= p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for high severity events
CREATE OR REPLACE VIEW critical_security_events AS
SELECT
  id,
  created_at,
  event_type,
  severity,
  user_id,
  user_email,
  ip_address,
  error_message,
  metadata
FROM audit_logs
WHERE severity IN ('error', 'critical')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Create function to get user audit trail
CREATE OR REPLACE FUNCTION get_user_audit_trail(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  event_type TEXT,
  severity TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  success BOOLEAN,
  ip_address TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.created_at,
    a.event_type,
    a.severity,
    a.action,
    a.resource_type,
    a.resource_id,
    a.success,
    a.ip_address,
    a.metadata AS details
  FROM audit_logs a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Audit logs are viewable by authenticated users" ON audit_logs;
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON audit_logs;

-- Allow authenticated users to view audit logs
CREATE POLICY "Audit logs are viewable by authenticated users"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert audit logs (for client-side logging)
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role to do everything
CREATE POLICY "Service role has full access to audit logs"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments for new columns
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.user_email IS 'Email of the user who performed the action';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action was successful';
COMMENT ON COLUMN audit_logs.timestamp IS 'Timestamp of the event (can be different from created_at)';

-- Create a trigger to automatically set timestamp if not provided
CREATE OR REPLACE FUNCTION set_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp := NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_timestamp_trigger ON audit_logs;
CREATE TRIGGER audit_logs_timestamp_trigger
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_timestamp();

-- Grant permissions
GRANT SELECT ON security_events TO authenticated;
GRANT SELECT ON failed_auth_attempts TO authenticated;
GRANT SELECT ON critical_security_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_failed_login_count(TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION should_lock_account(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_audit_trail(TEXT, INTEGER, INTEGER) TO authenticated;
