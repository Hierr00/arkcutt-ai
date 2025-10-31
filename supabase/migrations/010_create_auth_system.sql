-- =====================================================
-- Migration 010: Authentication & Authorization System
-- =====================================================
-- Created: 2025-10-29
-- Description: Complete auth system with RBAC
-- =====================================================

-- =====================================================
-- 1. USER ROLES ENUM
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');

-- =====================================================
-- 2. USER PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- =====================================================
-- 3. USER SESSIONS TABLE (for audit)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- =====================================================
-- 4. PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource TEXT NOT NULL, -- 'quotations', 'rfqs', 'providers', 'settings', etc.
  action TEXT NOT NULL,   -- 'read', 'create', 'update', 'delete'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Seed default permissions
INSERT INTO role_permissions (role, resource, action) VALUES
  -- Admin: Full access
  ('admin', '*', '*'),

  -- Operator: Read all, Write specific
  ('operator', 'quotations', 'read'),
  ('operator', 'quotations', 'create'),
  ('operator', 'quotations', 'update'),
  ('operator', 'rfqs', 'read'),
  ('operator', 'rfqs', 'create'),
  ('operator', 'rfqs', 'update'),
  ('operator', 'providers', 'read'),
  ('operator', 'providers', 'create'),
  ('operator', 'providers', 'update'),
  ('operator', 'integrations', 'read'),
  ('operator', 'settings', 'read'),

  -- Viewer: Read only
  ('viewer', 'quotations', 'read'),
  ('viewer', 'rfqs', 'read'),
  ('viewer', 'providers', 'read'),
  ('viewer', 'integrations', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC PROFILE CREATION
-- =====================================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    'viewer', -- Default role
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own role
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = role
  );

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read permissions (needed for authorization checks)
CREATE POLICY "Anyone authenticated can read permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify permissions
CREATE POLICY "Only admins can modify permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_role
  FROM user_profiles
  WHERE id = p_user_id AND is_active = true;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Admin has all permissions
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = v_role
      AND (resource = p_resource OR resource = '*')
      AND (action = p_action OR action = '*')
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM user_profiles
  WHERE id = p_user_id AND is_active = true;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user login
CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id UUID,
  p_session_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update last login time
  UPDATE user_profiles
  SET last_login_at = NOW()
  WHERE id = p_user_id;

  -- Insert session record
  INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
  VALUES (
    p_user_id,
    p_session_token,
    p_ip_address,
    p_user_agent,
    NOW() + INTERVAL '7 days'
  );

  -- Clean up expired sessions
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active users with full info
CREATE OR REPLACE VIEW active_users AS
SELECT
  up.id,
  up.email,
  up.role,
  up.full_name,
  up.company_name,
  up.phone,
  up.avatar_url,
  up.email_verified,
  up.last_login_at,
  up.created_at,
  COUNT(us.id) as active_sessions
FROM user_profiles up
LEFT JOIN user_sessions us ON up.id = us.user_id AND us.expires_at > NOW()
WHERE up.is_active = true
GROUP BY up.id;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.last_login_at,
  COUNT(DISTINCT us.id) as total_sessions,
  COUNT(DISTINCT al.id) as total_actions
FROM user_profiles up
LEFT JOIN user_sessions us ON up.id = us.user_id
LEFT JOIN audit_logs al ON up.id::text = al.actor_id
WHERE up.is_active = true
GROUP BY up.id;

-- =====================================================
-- 9. CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. INITIAL ADMIN USER (OPTIONAL - CONFIGURE MANUALLY)
-- =====================================================

-- You'll need to create the first admin manually after signup:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 completed successfully';
  RAISE NOTICE '📋 Created tables: user_profiles, user_sessions, role_permissions';
  RAISE NOTICE '🔐 RLS policies enabled and configured';
  RAISE NOTICE '⚡ Helper functions created';
  RAISE NOTICE '👤 Remember to set your first admin user manually!';
END $$;
