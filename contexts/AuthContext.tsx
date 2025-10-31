'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, LoginCredentials, RegisterData, AuthState } from '@/types/auth';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getCurrentUser,
  updateUserProfile,
  createClient,
} from '@/lib/auth/supabase';

// =====================================================
// Auth Context Type
// =====================================================

interface AuthContextType extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

// =====================================================
// Create Context
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Auth Provider Component
// =====================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    fetchUser();

    // Set up auth state listener
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        await fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (credentials: LoginCredentials) => {
    try {
      const response = await authSignIn(credentials);

      if (response.success && response.user) {
        setUser(response.user);
        router.push('/dashboard');
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const signUp = async (userData: RegisterData) => {
    try {
      const response = await authSignUp(userData);

      if (response.success && response.user) {
        setUser(response.user);
        router.push('/dashboard');
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Registration failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const signOut = async () => {
    try {
      await authSignOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return {
        success: false,
        error: 'No user logged in',
      };
    }

    try {
      const response = await updateUserProfile(user.id, updates);

      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Profile update failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    session: null, // We can add session tracking later if needed
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =====================================================
// useAuth Hook
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// =====================================================
// useRequireAuth Hook (for protected pages)
// =====================================================

export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  return { user, isLoading };
}

// =====================================================
// usePermission Hook
// =====================================================

import { hasPermission } from '@/lib/auth/permissions';
import type { Resource, Action } from '@/types/auth';

export function usePermission(resource: Resource, action: Action) {
  const { user } = useAuth();

  return hasPermission(user, resource, action);
}

export function useRole() {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin' && user.is_active,
    isOperator: user?.role === 'operator' && user.is_active,
    isViewer: user?.role === 'viewer' && user.is_active,
    role: user?.role,
  };
}
