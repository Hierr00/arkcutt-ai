// =====================================================
// Authentication & Authorization Types
// =====================================================

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  company_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
}

export interface Permission {
  id: string;
  role: UserRole;
  resource: string;
  action: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  session: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: UserSession;
  error?: string;
}

export interface PermissionCheck {
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete' | '*';
}

// Role permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, PermissionCheck[]> = {
  admin: [
    { resource: '*', action: 'read' },
    { resource: '*', action: 'create' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
  ],
  operator: [
    { resource: 'quotations', action: 'read' },
    { resource: 'quotations', action: 'create' },
    { resource: 'quotations', action: 'update' },
    { resource: 'rfqs', action: 'read' },
    { resource: 'rfqs', action: 'create' },
    { resource: 'rfqs', action: 'update' },
    { resource: 'providers', action: 'read' },
    { resource: 'providers', action: 'create' },
    { resource: 'providers', action: 'update' },
    { resource: 'integrations', action: 'read' },
    { resource: 'settings', action: 'read' },
  ],
  viewer: [
    { resource: 'quotations', action: 'read' },
    { resource: 'rfqs', action: 'read' },
    { resource: 'providers', action: 'read' },
    { resource: 'integrations', action: 'read' },
  ],
};

// Resource types
export type Resource =
  | 'quotations'
  | 'rfqs'
  | 'providers'
  | 'integrations'
  | 'settings'
  | 'users';

export type Action = 'read' | 'create' | 'update' | 'delete' | '*';
