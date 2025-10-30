import { createBrowserClient } from '@supabase/ssr';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';

// =====================================================
// Supabase Client Configuration
// =====================================================

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =====================================================
// Authentication Functions
// =====================================================

export async function signIn(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No user data returned',
      };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Failed to fetch user profile',
      };
    }

    // Log the login
    if (data.session) {
      await logUserLogin(data.user.id, data.session.access_token);
    }

    return {
      success: true,
      user: profile as User,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signUp(userData: RegisterData): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          company_name: userData.company_name,
          phone: userData.phone,
        },
      },
    });

    if (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No user data returned',
      };
    }

    // Wait a bit for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // The trigger will automatically create the user profile
    // Try to fetch the created profile (with retries)
    let profile = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!profile && attempts < maxAttempts) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileData) {
        profile = profileData;
      } else if (attempts === maxAttempts - 1) {
        // On last attempt, create profile manually if trigger failed
        console.warn('Trigger failed, creating profile manually');
        const { data: manualProfile, error: manualError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: userData.email,
            role: 'viewer',
            full_name: userData.full_name,
            company_name: userData.company_name,
            phone: userData.phone,
            email_verified: false,
          })
          .select()
          .single();

        if (manualProfile) {
          profile = manualProfile;
        } else {
          console.error('Manual profile creation failed:', manualError);
        }
      }

      attempts++;
      if (!profile && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (!profile) {
      return {
        success: false,
        error: 'Failed to create user profile. Please contact support.',
      };
    }

    return {
      success: true,
      user: profile as User,
    };
  } catch (error) {
    console.error('Signup exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile as User;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    // Remove fields that shouldn't be updated directly
    const { id, email, role, created_at, updated_at, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data as User,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// Session Management
// =====================================================

async function logUserLogin(userId: string, sessionToken: string): Promise<void> {
  try {
    const supabase = createClient();

    // Call the database function
    await supabase.rpc('log_user_login', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_ip_address: null, // Will be set by backend if needed
      p_user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error logging user login:', error);
  }
}

export async function getUserSessions(userId: string) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}
