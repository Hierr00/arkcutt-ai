import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  updateUserProfile,
  resetPassword,
  getUserSessions,
} from '../supabase';
import { createMockSupabaseClient, mockUser } from '@/tests/mocks';

//Mock the Supabase client
vi.mock('../supabase', async () => {
  const actual = await vi.importActual('../supabase');
  return {
    ...actual,
    createClient: () => createMockSupabaseClient(),
  };
});

describe('Authentication Functions', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      // Mock successful authentication
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: mockUser.id, email: mockUser.email },
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      // Mock profile fetch
      mockClient.from('user_profiles').single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(mockUser.email);
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid credentials', async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
      expect(result.user).toBeUndefined();
    });

    it('should handle missing user data', async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user data returned');
    });

    it('should handle profile fetch errors', async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      mockClient.from('user_profiles').single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      const result = await signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch user profile');
    });

    it('should handle exceptions', async () => {
      mockClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('signUp', () => {
    it('should successfully register a new user', async () => {
      mockClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: mockUser.id, email: mockUser.email },
          session: null,
        },
        error: null,
      });

      mockClient.from('user_profiles').single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await signUp({
        email: 'newuser@example.com',
        password: 'StrongPass123',
        full_name: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'StrongPass123',
        options: {
          data: {
            full_name: 'New User',
            company_name: undefined,
            phone: undefined,
          },
        },
      });
    });

    it('should fail with existing email', async () => {
      mockClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered');
    });

    it('should handle weak passwords', async () => {
      mockClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      });

      const result = await signUp({
        email: 'test@example.com',
        password: 'weak',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      mockClient.auth.signOut.mockResolvedValue({
        error: { message: 'Session expired' },
      });

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id, email: mockUser.email } },
        error: null,
      });

      mockClient.from('user_profiles').single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return null when not authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null on error', async () => {
      mockClient.auth.getUser.mockRejectedValue(new Error('Auth error'));

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      const updates = {
        full_name: 'Updated Name',
        company_name: 'New Company',
      };

      mockClient.from('user_profiles').single.mockResolvedValue({
        data: { ...mockUser, ...updates },
        error: null,
      });

      const result = await updateUserProfile(mockUser.id, updates);

      expect(result.success).toBe(true);
      expect(result.user?.full_name).toBe('Updated Name');
      expect(result.user?.company_name).toBe('New Company');
    });

    it('should not update protected fields', async () => {
      const updates = {
        id: 'new-id',
        email: 'newemail@test.com',
        role: 'admin' as const,
        full_name: 'Updated Name',
      };

      mockClient.from('user_profiles').single.mockResolvedValue({
        data: { ...mockUser, full_name: 'Updated Name' },
        error: null,
      });

      const result = await updateUserProfile(mockUser.id, updates);

      expect(result.success).toBe(true);
      // Protected fields should not be in the update call
      expect(result.user?.id).toBe(mockUser.id); // Original ID preserved
      expect(result.user?.email).toBe(mockUser.email); // Original email preserved
    });

    it('should handle update errors', async () => {
      mockClient.from('user_profiles').single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateUserProfile(mockUser.id, {
        full_name: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      );
    });

    it('should handle reset errors', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'User not found' },
      });

      const result = await resetPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      ];

      mockClient.from('user_sessions').then.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const sessions = await getUserSessions(mockUser.id);

      expect(sessions).toEqual(mockSessions);
      expect(sessions.length).toBe(1);
    });

    it('should return empty array on error', async () => {
      mockClient.from('user_sessions').then.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      const sessions = await getUserSessions(mockUser.id);

      expect(sessions).toEqual([]);
    });

    it('should handle exceptions', async () => {
      mockClient.from('user_sessions').then.mockRejectedValue(
        new Error('DB error')
      );

      const sessions = await getUserSessions(mockUser.id);

      expect(sessions).toEqual([]);
    });
  });
});
