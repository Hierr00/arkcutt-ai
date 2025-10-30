import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasPermission,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  isAdmin,
  isOperator,
  isViewer,
  requirePermission,
  requireRole,
  getRolePermissions,
  canAccessResource,
  getAccessibleResources,
} from '../permissions';
import type { User, UserRole } from '@/types/auth';

describe('Permission System', () => {
  // Mock users for testing
  const adminUser: User = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin',
    full_name: 'Admin User',
    is_active: true,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const operatorUser: User = {
    id: 'operator-1',
    email: 'operator@test.com',
    role: 'operator',
    full_name: 'Operator User',
    is_active: true,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const viewerUser: User = {
    id: 'viewer-1',
    email: 'viewer@test.com',
    role: 'viewer',
    full_name: 'Viewer User',
    is_active: true,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const inactiveUser: User = {
    ...operatorUser,
    id: 'inactive-1',
    is_active: false,
  };

  describe('hasPermission', () => {
    it('should grant all permissions to admin', () => {
      expect(hasPermission(adminUser, 'quotations', 'read')).toBe(true);
      expect(hasPermission(adminUser, 'quotations', 'create')).toBe(true);
      expect(hasPermission(adminUser, 'quotations', 'update')).toBe(true);
      expect(hasPermission(adminUser, 'quotations', 'delete')).toBe(true);
      expect(hasPermission(adminUser, 'users', 'delete')).toBe(true);
    });

    it('should grant correct permissions to operator', () => {
      expect(hasPermission(operatorUser, 'quotations', 'read')).toBe(true);
      expect(hasPermission(operatorUser, 'quotations', 'create')).toBe(true);
      expect(hasPermission(operatorUser, 'quotations', 'update')).toBe(true);
      expect(hasPermission(operatorUser, 'quotations', 'delete')).toBe(false);
      expect(hasPermission(operatorUser, 'users', 'read')).toBe(false);
    });

    it('should grant only read permissions to viewer', () => {
      expect(hasPermission(viewerUser, 'quotations', 'read')).toBe(true);
      expect(hasPermission(viewerUser, 'quotations', 'create')).toBe(false);
      expect(hasPermission(viewerUser, 'quotations', 'update')).toBe(false);
      expect(hasPermission(viewerUser, 'quotations', 'delete')).toBe(false);
    });

    it('should deny all permissions to inactive user', () => {
      expect(hasPermission(inactiveUser, 'quotations', 'read')).toBe(false);
      expect(hasPermission(inactiveUser, 'quotations', 'create')).toBe(false);
    });

    it('should deny all permissions to null user', () => {
      expect(hasPermission(null, 'quotations', 'read')).toBe(false);
      expect(hasPermission(null, 'quotations', 'create')).toBe(false);
    });
  });

  describe('Permission helper functions', () => {
    describe('canRead', () => {
      it('should allow admin to read any resource', () => {
        expect(canRead(adminUser, 'quotations')).toBe(true);
        expect(canRead(adminUser, 'users')).toBe(true);
      });

      it('should allow operator to read allowed resources', () => {
        expect(canRead(operatorUser, 'quotations')).toBe(true);
        expect(canRead(operatorUser, 'rfqs')).toBe(true);
      });

      it('should allow viewer to read allowed resources', () => {
        expect(canRead(viewerUser, 'quotations')).toBe(true);
      });
    });

    describe('canCreate', () => {
      it('should allow admin to create any resource', () => {
        expect(canCreate(adminUser, 'quotations')).toBe(true);
        expect(canCreate(adminUser, 'users')).toBe(true);
      });

      it('should allow operator to create some resources', () => {
        expect(canCreate(operatorUser, 'quotations')).toBe(true);
        expect(canCreate(operatorUser, 'users')).toBe(false);
      });

      it('should not allow viewer to create resources', () => {
        expect(canCreate(viewerUser, 'quotations')).toBe(false);
      });
    });

    describe('canUpdate', () => {
      it('should allow admin to update any resource', () => {
        expect(canUpdate(adminUser, 'quotations')).toBe(true);
      });

      it('should allow operator to update some resources', () => {
        expect(canUpdate(operatorUser, 'quotations')).toBe(true);
      });

      it('should not allow viewer to update resources', () => {
        expect(canUpdate(viewerUser, 'quotations')).toBe(false);
      });
    });

    describe('canDelete', () => {
      it('should allow admin to delete any resource', () => {
        expect(canDelete(adminUser, 'quotations')).toBe(true);
      });

      it('should not allow operator to delete resources', () => {
        expect(canDelete(operatorUser, 'quotations')).toBe(false);
      });

      it('should not allow viewer to delete resources', () => {
        expect(canDelete(viewerUser, 'quotations')).toBe(false);
      });
    });
  });

  describe('Role checking functions', () => {
    describe('isAdmin', () => {
      it('should return true for admin user', () => {
        expect(isAdmin(adminUser)).toBe(true);
      });

      it('should return false for non-admin user', () => {
        expect(isAdmin(operatorUser)).toBe(false);
        expect(isAdmin(viewerUser)).toBe(false);
      });

      it('should return false for inactive admin', () => {
        expect(isAdmin({ ...adminUser, is_active: false })).toBe(false);
      });

      it('should return false for null user', () => {
        expect(isAdmin(null)).toBe(false);
      });
    });

    describe('isOperator', () => {
      it('should return true for operator user', () => {
        expect(isOperator(operatorUser)).toBe(true);
      });

      it('should return false for non-operator user', () => {
        expect(isOperator(adminUser)).toBe(false);
        expect(isOperator(viewerUser)).toBe(false);
      });
    });

    describe('isViewer', () => {
      it('should return true for viewer user', () => {
        expect(isViewer(viewerUser)).toBe(true);
      });

      it('should return false for non-viewer user', () => {
        expect(isViewer(adminUser)).toBe(false);
        expect(isViewer(operatorUser)).toBe(false);
      });
    });
  });

  describe('requirePermission', () => {
    it('should authorize when user has permission', () => {
      const result = requirePermission(adminUser, 'quotations', 'delete');
      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny when user lacks permission', () => {
      const result = requirePermission(operatorUser, 'quotations', 'delete');
      expect(result.authorized).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain("don't have permission");
    });

    it('should deny when user is inactive', () => {
      const result = requirePermission(inactiveUser, 'quotations', 'read');
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Account is inactive');
    });

    it('should deny when user is null', () => {
      const result = requirePermission(null, 'quotations', 'read');
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('requireRole', () => {
    it('should authorize when user has allowed role', () => {
      const result = requireRole(adminUser, ['admin', 'operator']);
      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny when user lacks allowed role', () => {
      const result = requireRole(viewerUser, ['admin', 'operator']);
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });

    it('should deny when user is inactive', () => {
      const result = requireRole(inactiveUser, ['operator']);
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Account is inactive');
    });

    it('should deny when user is null', () => {
      const result = requireRole(null, ['admin']);
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('getRolePermissions', () => {
    it('should return correct permissions for admin', () => {
      const permissions = getRolePermissions('admin');
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions[0].resource).toBe('*');
    });

    it('should return correct permissions for operator', () => {
      const permissions = getRolePermissions('operator');
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return correct permissions for viewer', () => {
      const permissions = getRolePermissions('viewer');
      expect(permissions).toBeDefined();
      expect(permissions.every((p) => p.action === 'read')).toBe(true);
    });
  });

  describe('canAccessResource', () => {
    it('should allow access when user has read permission', () => {
      expect(canAccessResource(adminUser, 'quotations')).toBe(true);
      expect(canAccessResource(operatorUser, 'quotations')).toBe(true);
      expect(canAccessResource(viewerUser, 'quotations')).toBe(true);
    });

    it('should deny access when user is inactive', () => {
      expect(canAccessResource(inactiveUser, 'quotations')).toBe(false);
    });

    it('should deny access when user is null', () => {
      expect(canAccessResource(null, 'quotations')).toBe(false);
    });
  });

  describe('getAccessibleResources', () => {
    it('should return all resources for admin', () => {
      const resources = getAccessibleResources(adminUser);
      expect(resources.length).toBeGreaterThan(0);
      expect(resources).toContain('quotations');
      expect(resources).toContain('users');
    });

    it('should return limited resources for operator', () => {
      const resources = getAccessibleResources(operatorUser);
      expect(resources).toContain('quotations');
      expect(resources).toContain('rfqs');
      expect(resources).toContain('providers');
    });

    it('should return read-only resources for viewer', () => {
      const resources = getAccessibleResources(viewerUser);
      expect(resources).toContain('quotations');
      expect(resources).toContain('rfqs');
    });

    it('should return empty array for inactive user', () => {
      const resources = getAccessibleResources(inactiveUser);
      expect(resources).toEqual([]);
    });

    it('should return empty array for null user', () => {
      const resources = getAccessibleResources(null);
      expect(resources).toEqual([]);
    });
  });
});
