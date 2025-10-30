import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

// =====================================================
// Audit Event Types
// =====================================================

export type AuditEventType =
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_reset'
  | 'auth.password_change'
  | 'auth.failed_login'
  | 'auth.account_locked'
  // Authorization events
  | 'auth.permission_denied'
  | 'auth.role_changed'
  // Data events
  | 'data.create'
  | 'data.read'
  | 'data.update'
  | 'data.delete'
  | 'data.export'
  | 'data.import'
  // System events
  | 'system.config_changed'
  | 'system.integration_enabled'
  | 'system.integration_disabled'
  // Security events
  | 'security.rate_limit_exceeded'
  | 'security.suspicious_activity'
  | 'security.csrf_detected';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  id?: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  details?: Record<string, any>;
  success: boolean;
  error_message?: string;
  timestamp?: string;
}

// =====================================================
// Audit Logging Functions
// =====================================================

/**
 * Logs an audit event to the database
 */
export async function logAuditEvent(
  entry: AuditLogEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('audit_logs').insert({
      event_type: entry.event_type,
      severity: entry.severity,
      user_id: entry.user_id,
      user_email: entry.user_email,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      action: entry.action,
      details: entry.details,
      success: entry.success,
      error_message: entry.error_message,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error('[Audit] Failed to log event:', error);
      return { success: false, error: error.message };
    }

    // Also log to console for immediate visibility
    const logLevel = getSeverityLogLevel(entry.severity);
    console[logLevel]('[Audit]', {
      type: entry.event_type,
      user: entry.user_email || entry.user_id,
      success: entry.success,
      details: entry.details,
    });

    return { success: true };
  } catch (error) {
    console.error('[Audit] Exception while logging:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets the appropriate console log level for a severity
 */
function getSeverityLogLevel(
  severity: AuditSeverity
): 'info' | 'warn' | 'error' {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warning':
      return 'warn';
    case 'error':
    case 'critical':
      return 'error';
    default:
      return 'info';
  }
}

// =====================================================
// Convenience Functions for Common Events
// =====================================================

/**
 * Logs a successful login
 */
export async function logLogin(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logAuditEvent({
    event_type: 'auth.login',
    severity: 'info',
    user_id: userId,
    user_email: email,
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Logs a failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
) {
  return logAuditEvent({
    event_type: 'auth.failed_login',
    severity: 'warning',
    user_email: email,
    ip_address: ipAddress,
    user_agent: userAgent,
    success: false,
    error_message: reason,
  });
}

/**
 * Logs a logout
 */
export async function logLogout(userId: string, email: string) {
  return logAuditEvent({
    event_type: 'auth.logout',
    severity: 'info',
    user_id: userId,
    user_email: email,
    success: true,
  });
}

/**
 * Logs a new user registration
 */
export async function logRegistration(
  userId: string,
  email: string,
  ipAddress?: string
) {
  return logAuditEvent({
    event_type: 'auth.register',
    severity: 'info',
    user_id: userId,
    user_email: email,
    ip_address: ipAddress,
    success: true,
  });
}

/**
 * Logs a password change
 */
export async function logPasswordChange(userId: string, email: string) {
  return logAuditEvent({
    event_type: 'auth.password_change',
    severity: 'info',
    user_id: userId,
    user_email: email,
    success: true,
  });
}

/**
 * Logs a permission denied event
 */
export async function logPermissionDenied(
  userId: string,
  email: string,
  resource: string,
  action: string
) {
  return logAuditEvent({
    event_type: 'auth.permission_denied',
    severity: 'warning',
    user_id: userId,
    user_email: email,
    resource_type: resource,
    action,
    success: false,
  });
}

/**
 * Logs a role change
 */
export async function logRoleChange(
  userId: string,
  email: string,
  oldRole: string,
  newRole: string,
  changedBy: string
) {
  return logAuditEvent({
    event_type: 'auth.role_changed',
    severity: 'warning',
    user_id: userId,
    user_email: email,
    details: {
      old_role: oldRole,
      new_role: newRole,
      changed_by: changedBy,
    },
    success: true,
  });
}

/**
 * Logs data creation
 */
export async function logDataCreate(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  return logAuditEvent({
    event_type: 'data.create',
    severity: 'info',
    user_id: userId,
    user_email: email,
    resource_type: resourceType,
    resource_id: resourceId,
    action: 'create',
    details,
    success: true,
  });
}

/**
 * Logs data update
 */
export async function logDataUpdate(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  return logAuditEvent({
    event_type: 'data.update',
    severity: 'info',
    user_id: userId,
    user_email: email,
    resource_type: resourceType,
    resource_id: resourceId,
    action: 'update',
    details,
    success: true,
  });
}

/**
 * Logs data deletion
 */
export async function logDataDelete(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  return logAuditEvent({
    event_type: 'data.delete',
    severity: 'warning',
    user_id: userId,
    user_email: email,
    resource_type: resourceType,
    resource_id: resourceId,
    action: 'delete',
    details,
    success: true,
  });
}

/**
 * Logs data export
 */
export async function logDataExport(
  userId: string,
  email: string,
  resourceType: string,
  recordCount: number
) {
  return logAuditEvent({
    event_type: 'data.export',
    severity: 'info',
    user_id: userId,
    user_email: email,
    resource_type: resourceType,
    details: { record_count: recordCount },
    success: true,
  });
}

/**
 * Logs rate limit exceeded
 */
export async function logRateLimitExceeded(
  ipAddress: string,
  userAgent?: string,
  userId?: string
) {
  return logAuditEvent({
    event_type: 'security.rate_limit_exceeded',
    severity: 'warning',
    user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    success: false,
  });
}

/**
 * Logs suspicious activity
 */
export async function logSuspiciousActivity(
  description: string,
  ipAddress?: string,
  userId?: string,
  details?: Record<string, any>
) {
  return logAuditEvent({
    event_type: 'security.suspicious_activity',
    severity: 'critical',
    user_id: userId,
    ip_address: ipAddress,
    details: {
      description,
      ...details,
    },
    success: false,
  });
}

// =====================================================
// Audit Log Query Functions
// =====================================================

/**
 * Retrieves audit logs with filters
 */
export async function getAuditLogs(filters: {
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      userId,
      eventType,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[Audit] Failed to retrieve logs:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Audit] Exception while retrieving logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
}

/**
 * Counts failed login attempts for an email or IP
 */
export async function getFailedLoginAttempts(
  emailOrIp: string,
  since: Date = new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count, error } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'auth.failed_login')
      .or(`user_email.eq.${emailOrIp},ip_address.eq.${emailOrIp}`)
      .gte('timestamp', since.toISOString());

    if (error) {
      console.error('[Audit] Failed to count failed logins:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[Audit] Exception while counting failed logins:', error);
    return 0;
  }
}
