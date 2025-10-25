/**
 * 📋 AUDIT LOG SERVICE
 * Sistema de auditoría para tracking de operaciones críticas
 */

import { supabase } from '@/lib/supabase';
import { log } from '@/lib/logger';

/**
 * Event types - tipos específicos de eventos
 */
export const AuditEventType = {
  // Quotations
  QUOTATION_CREATED: 'quotation_created',
  QUOTATION_UPDATED: 'quotation_updated',
  QUOTATION_STATUS_CHANGED: 'quotation_status_changed',
  QUOTATION_INFO_REQUESTED: 'quotation_info_requested',
  QUOTATION_INFO_RECEIVED: 'quotation_info_received',

  // Emails
  EMAIL_SENT: 'email_sent',
  EMAIL_RECEIVED: 'email_received',
  EMAIL_CLASSIFIED: 'email_classified',
  EMAIL_FAILED: 'email_failed',

  // RFQs
  RFQ_CREATED: 'rfq_created',
  RFQ_SENT: 'rfq_sent',
  RFQ_RESPONSE_RECEIVED: 'rfq_response_received',
  RFQ_DECLINED: 'rfq_declined',
  RFQ_EXPIRED: 'rfq_expired',

  // Providers
  PROVIDER_SEARCH_PERFORMED: 'provider_search_performed',
  PROVIDER_CONTACTED: 'provider_contacted',
  PROVIDER_ADDED: 'provider_added',
  PROVIDER_UPDATED: 'provider_updated',

  // External services
  EXTERNAL_SERVICE_DETECTED: 'external_service_detected',

  // Interactions
  INTERACTION_CREATED: 'interaction_created',

  // System
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_COMPLETED: 'workflow_completed',
  WORKFLOW_FAILED: 'workflow_failed',
} as const;

/**
 * Event categories - categorías generales
 */
export const AuditEventCategory = {
  QUOTATION: 'quotation',
  EMAIL: 'email',
  RFQ: 'rfq',
  PROVIDER: 'provider',
  USER: 'user',
  SYSTEM: 'system',
} as const;

/**
 * Actor types - quién realizó la acción
 */
export const AuditActorType = {
  USER: 'user',
  SYSTEM: 'system',
  AGENT: 'agent',
  CRON: 'cron',
  API: 'api',
} as const;

/**
 * Status types - resultado de la operación
 */
export const AuditStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
} as const;

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  eventType: string;
  eventCategory: string;
  action: string;
  resourceType: string;
  resourceId: string;
  status?: string;
  actorType?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * Log audit event to database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      event_type: entry.eventType,
      event_category: entry.eventCategory,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      status: entry.status || AuditStatus.SUCCESS,
      actor_type: entry.actorType,
      actor_id: entry.actorId,
      metadata: entry.metadata,
      changes: entry.changes,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      error_message: entry.errorMessage,
      error_stack: entry.errorStack,
    });

    if (error) {
      // Log error but don't throw - auditing shouldn't break the app
      log.error('Failed to log audit event', {
        error: error.message,
        eventType: entry.eventType,
      });
    }
  } catch (error: any) {
    log.error('Exception while logging audit event', {
      error: error.message,
      eventType: entry.eventType,
    });
  }
}

/**
 * Convenience functions for common operations
 */

export async function logQuotationCreated(
  quotationId: string,
  customerEmail: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.QUOTATION_CREATED,
    eventCategory: AuditEventCategory.QUOTATION,
    action: 'created',
    resourceType: 'quotation_request',
    resourceId: quotationId,
    actorType: AuditActorType.SYSTEM,
    actorId: 'quotation-coordinator',
    metadata: {
      customerEmail,
      ...metadata,
    },
  });
}

export async function logQuotationStatusChanged(
  quotationId: string,
  oldStatus: string,
  newStatus: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.QUOTATION_STATUS_CHANGED,
    eventCategory: AuditEventCategory.QUOTATION,
    action: 'updated',
    resourceType: 'quotation_request',
    resourceId: quotationId,
    changes: {
      before: { status: oldStatus },
      after: { status: newStatus },
    },
    actorType: AuditActorType.SYSTEM,
    actorId: 'quotation-coordinator',
    metadata,
  });
}

export async function logEmailSent(
  emailId: string,
  to: string,
  subject: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.EMAIL_SENT,
    eventCategory: AuditEventCategory.EMAIL,
    action: 'sent',
    resourceType: 'email',
    resourceId: emailId,
    actorType: AuditActorType.SYSTEM,
    actorId: 'email-service',
    metadata: {
      to,
      subject,
      ...metadata,
    },
  });
}

export async function logEmailFailed(
  emailId: string,
  to: string,
  error: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.EMAIL_FAILED,
    eventCategory: AuditEventCategory.EMAIL,
    action: 'sent',
    resourceType: 'email',
    resourceId: emailId,
    status: AuditStatus.FAILED,
    actorType: AuditActorType.SYSTEM,
    actorId: 'email-service',
    errorMessage: error.message,
    errorStack: error.stack,
    metadata: {
      to,
      ...metadata,
    },
  });
}

export async function logRFQCreated(
  rfqId: string,
  providerId: string,
  providerName: string,
  service: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.RFQ_CREATED,
    eventCategory: AuditEventCategory.RFQ,
    action: 'created',
    resourceType: 'rfq',
    resourceId: rfqId,
    actorType: AuditActorType.SYSTEM,
    actorId: 'quotation-coordinator',
    metadata: {
      providerId,
      providerName,
      service,
      ...metadata,
    },
  });
}

export async function logRFQSent(
  rfqId: string,
  providerEmail: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.RFQ_SENT,
    eventCategory: AuditEventCategory.RFQ,
    action: 'sent',
    resourceType: 'rfq',
    resourceId: rfqId,
    actorType: AuditActorType.SYSTEM,
    actorId: 'email-service',
    metadata: {
      providerEmail,
      ...metadata,
    },
  });
}

export async function logProviderSearchPerformed(
  service: string,
  resultsCount: number,
  metadata?: Record<string, any>
): Promise<void> {
  // Use a timestamp as resource ID for searches
  const searchId = `search_${Date.now()}`;

  await logAuditEvent({
    eventType: AuditEventType.PROVIDER_SEARCH_PERFORMED,
    eventCategory: AuditEventCategory.PROVIDER,
    action: 'searched',
    resourceType: 'provider_search',
    resourceId: searchId,
    actorType: AuditActorType.SYSTEM,
    actorId: 'provider-search',
    metadata: {
      service,
      resultsCount,
      ...metadata,
    },
  });
}

export async function logWorkflowStarted(
  workflowName: string,
  quotationId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.WORKFLOW_STARTED,
    eventCategory: AuditEventCategory.SYSTEM,
    action: 'started',
    resourceType: 'workflow',
    resourceId: `${workflowName}_${quotationId}`,
    actorType: AuditActorType.AGENT,
    actorId: workflowName,
    metadata,
  });
}

export async function logWorkflowCompleted(
  workflowName: string,
  quotationId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.WORKFLOW_COMPLETED,
    eventCategory: AuditEventCategory.SYSTEM,
    action: 'completed',
    resourceType: 'workflow',
    resourceId: `${workflowName}_${quotationId}`,
    actorType: AuditActorType.AGENT,
    actorId: workflowName,
    metadata,
  });
}

export async function logWorkflowFailed(
  workflowName: string,
  quotationId: string,
  error: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.WORKFLOW_FAILED,
    eventCategory: AuditEventCategory.SYSTEM,
    action: 'completed',
    resourceType: 'workflow',
    resourceId: `${workflowName}_${quotationId}`,
    status: AuditStatus.FAILED,
    actorType: AuditActorType.AGENT,
    actorId: workflowName,
    errorMessage: error.message,
    errorStack: error.stack,
    metadata,
  });
}

/**
 * Query helpers
 */

export async function getRecentAuditLogs(
  limit: number = 100,
  category?: string
): Promise<any[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('event_category', category);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Failed to fetch audit logs', { error: error.message });
    return [];
  }

  return data || [];
}

export async function getAuditLogsForResource(
  resourceType: string,
  resourceId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: true });

  if (error) {
    log.error('Failed to fetch audit logs for resource', {
      error: error.message,
      resourceType,
      resourceId,
    });
    return [];
  }

  return data || [];
}

export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('recent_errors')
    .select('*')
    .limit(limit);

  if (error) {
    log.error('Failed to fetch recent errors', { error: error.message });
    return [];
  }

  return data || [];
}

export default {
  logAuditEvent,
  logQuotationCreated,
  logQuotationStatusChanged,
  logEmailSent,
  logEmailFailed,
  logRFQCreated,
  logRFQSent,
  logProviderSearchPerformed,
  logWorkflowStarted,
  logWorkflowCompleted,
  logWorkflowFailed,
  getRecentAuditLogs,
  getAuditLogsForResource,
  getRecentErrors,
};
