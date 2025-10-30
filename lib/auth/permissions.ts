import type { User, UserRole, Resource, Action, PermissionCheck } from '@/types/auth';
import { ROLE_PERMISSIONS } from '@/types/auth';
import { createClient } from './supabase';

// =====================================================
// Permission Checking Functions
// =====================================================

export function hasPermission(
  user: User | null,
  resource: Resource,
  action: Action
): boolean {
  if (!user || !user.is_active) {
    return false;
  }

  // Admin has all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check if user's role has the specific permission
  const rolePermissions = ROLE_PERMISSIONS[user.role];

  return rolePermissions.some(
    (perm) =>
      (perm.resource === resource || perm.resource === '*') &&
      (perm.action === action || perm.action === '*')
  );
}

export async function checkPermissionInDB(
  userId: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_resource: resource,
      p_action: action,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export function canRead(user: User | null, resource: Resource): boolean {
  return hasPermission(user, resource, 'read');
}

export function canCreate(user: User | null, resource: Resource): boolean {
  return hasPermission(user, resource, 'create');
}

export function canUpdate(user: User | null, resource: Resource): boolean {
  return hasPermission(user, resource, 'update');
}

export function canDelete(user: User | null, resource: Resource): boolean {
  return hasPermission(user, resource, 'delete');
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' && user.is_active;
}

export function isOperator(user: User | null): boolean {
  return user?.role === 'operator' && user.is_active;
}

export function isViewer(user: User | null): boolean {
  return user?.role === 'viewer' && user.is_active;
}

// =====================================================
// Role Management
// =====================================================

export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_user_role', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data as UserRole;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);

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
// Permission Utilities
// =====================================================

export function getRolePermissions(role: UserRole): PermissionCheck[] {
  return ROLE_PERMISSIONS[role];
}

export function canAccessResource(user: User | null, resource: Resource): boolean {
  if (!user || !user.is_active) {
    return false;
  }

  // Check if user has at least read permission
  return hasPermission(user, resource, 'read');
}

export function getAccessibleResources(user: User | null): Resource[] {
  if (!user || !user.is_active) {
    return [];
  }

  const resources: Resource[] = [
    'quotations',
    'rfqs',
    'providers',
    'integrations',
    'settings',
    'users',
  ];

  return resources.filter((resource) => canAccessResource(user, resource));
}

// =====================================================
// Authorization Middleware Helper
// =====================================================

export function requirePermission(
  user: User | null,
  resource: Resource,
  action: Action
): { authorized: boolean; error?: string } {
  if (!user) {
    return {
      authorized: false,
      error: 'Authentication required',
    };
  }

  if (!user.is_active) {
    return {
      authorized: false,
      error: 'Account is inactive',
    };
  }

  if (!hasPermission(user, resource, action)) {
    return {
      authorized: false,
      error: `You don't have permission to ${action} ${resource}`,
    };
  }

  return {
    authorized: true,
  };
}

export function requireRole(
  user: User | null,
  allowedRoles: UserRole[]
): { authorized: boolean; error?: string } {
  if (!user) {
    return {
      authorized: false,
      error: 'Authentication required',
    };
  }

  if (!user.is_active) {
    return {
      authorized: false,
      error: 'Account is inactive',
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      error: 'Insufficient permissions',
    };
  }

  return {
    authorized: true,
  };
}
