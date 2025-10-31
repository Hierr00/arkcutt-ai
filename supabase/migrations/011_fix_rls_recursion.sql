-- =====================================================
-- Fix RLS Infinite Recursion
-- =====================================================

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;

DROP POLICY IF EXISTS "Anyone authenticated can read permissions" ON role_permissions;
DROP POLICY IF EXISTS "Only admins can modify permissions" ON role_permissions;

-- =====================================================
-- NEW POLICIES WITHOUT RECURSION
-- =====================================================

-- user_profiles policies
-- Everyone authenticated can read all profiles (simplified)
CREATE POLICY "Allow authenticated users to read profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile (for signup)
CREATE POLICY "Allow users to insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (for trigger)
CREATE POLICY "Allow service role to insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "Allow users to update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can update any profile
CREATE POLICY "Allow service role to update profiles"
  ON user_profiles FOR UPDATE
  TO service_role
  WITH CHECK (true);

-- Service role can delete profiles
CREATE POLICY "Allow service role to delete profiles"
  ON user_profiles FOR DELETE
  TO service_role
  USING (true);

-- =====================================================
-- user_sessions policies (simplified)
-- =====================================================

-- Anyone authenticated can manage their own sessions
CREATE POLICY "Allow users to manage own sessions"
  ON user_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all sessions
CREATE POLICY "Allow service role to manage sessions"
  ON user_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- role_permissions policies (simplified)
-- =====================================================

-- Everyone authenticated can read permissions
CREATE POLICY "Allow authenticated to read permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage permissions
CREATE POLICY "Allow service role to manage permissions"
  ON role_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Grant necessary permissions to authenticated users
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed - recursion removed';
  RAISE NOTICE '📋 Simplified policies for user_profiles, user_sessions, role_permissions';
  RAISE NOTICE '🔓 Signup should work now';
END $$;
