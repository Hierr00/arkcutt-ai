import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

// =====================================================
// GDPR Compliance Types
// =====================================================

export interface UserDataExport {
  user_profile: any;
  audit_logs: any[];
  created_rfqs: any[];
  created_quotations: any[];
  provider_interactions: any[];
  settings: any;
  consent_records: any[];
  export_metadata: {
    requested_at: string;
    generated_at: string;
    data_version: string;
  };
}

export interface ConsentRecord {
  id?: string;
  user_id: string;
  consent_type: 'cookies' | 'analytics' | 'marketing' | 'data_processing';
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface DataDeletionRequest {
  user_id: string;
  requested_at: string;
  reason?: string;
  data_categories: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// =====================================================
// User Data Export (GDPR Article 15 & 20)
// =====================================================

/**
 * Exports all user data for GDPR compliance
 * Implements the right to data portability (Article 20)
 */
export async function exportUserData(
  userId: string
): Promise<{ success: boolean; data?: UserDataExport; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      return { success: false, error: 'Failed to fetch user profile' };
    }

    // Fetch audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId);

    // Fetch RFQs created by user
    const { data: rfqs } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('created_by', userId);

    // Fetch quotations
    const { data: quotations } = await supabase
      .from('quotations')
      .select('*')
      .eq('created_by', userId);

    // Fetch provider interactions
    const { data: interactions } = await supabase
      .from('provider_interactions')
      .select('*')
      .eq('user_id', userId);

    // Fetch consent records
    const { data: consents } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId);

    const exportData: UserDataExport = {
      user_profile: userProfile,
      audit_logs: auditLogs || [],
      created_rfqs: rfqs || [],
      created_quotations: quotations || [],
      provider_interactions: interactions || [],
      settings: {}, // Add if you have a settings table
      consent_records: consents || [],
      export_metadata: {
        requested_at: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        data_version: '1.0',
      },
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('[GDPR] Error exporting user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generates a downloadable JSON file of user data
 */
export function generateDataExportFile(data: UserDataExport): Blob {
  const jsonString = JSON.stringify(data, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

// =====================================================
// User Consent Management (GDPR Article 7)
// =====================================================

/**
 * Records user consent
 */
export async function recordConsent(
  consent: ConsentRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('user_consents').insert({
      user_id: consent.user_id,
      consent_type: consent.consent_type,
      granted: consent.granted,
      granted_at: consent.granted ? new Date().toISOString() : null,
      revoked_at: !consent.granted ? new Date().toISOString() : null,
      ip_address: consent.ip_address,
      user_agent: consent.user_agent,
    });

    if (error) {
      console.error('[GDPR] Failed to record consent:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[GDPR] Error recording consent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revokes user consent
 */
export async function revokeConsent(
  userId: string,
  consentType: ConsentRecord['consent_type']
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('user_consents')
      .update({
        granted: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('granted', true);

    if (error) {
      console.error('[GDPR] Failed to revoke consent:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[GDPR] Error revoking consent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets user consent status
 */
export async function getUserConsents(
  userId: string
): Promise<{ success: boolean; consents?: ConsentRecord[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('[GDPR] Failed to fetch consents:', error);
      return { success: false, error: error.message };
    }

    return { success: true, consents: data || [] };
  } catch (error) {
    console.error('[GDPR] Error fetching consents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// Right to be Forgotten (GDPR Article 17)
// =====================================================

/**
 * Requests deletion of user data
 */
export async function requestDataDeletion(
  userId: string,
  reason?: string,
  dataCategories?: string[]
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        requested_at: new Date().toISOString(),
        reason,
        data_categories: dataCategories || ['all'],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[GDPR] Failed to create deletion request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, requestId: data.id };
  } catch (error) {
    console.error('[GDPR] Error creating deletion request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Anonymizes user data (soft delete)
 */
export async function anonymizeUserData(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Update user profile to remove PII
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: `deleted_${userId}@anonymous.local`,
        full_name: 'Deleted User',
        company_name: null,
        phone: null,
        avatar_url: null,
        is_active: false,
      })
      .eq('id', userId);

    if (profileError) {
      return { success: false, error: 'Failed to anonymize user profile' };
    }

    // Anonymize audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .update({
        user_email: `deleted_${userId}@anonymous.local`,
        ip_address: '0.0.0.0',
        user_agent: 'Anonymized',
      })
      .eq('user_id', userId);

    if (auditError) {
      console.warn('[GDPR] Warning: Failed to anonymize audit logs');
    }

    return { success: true };
  } catch (error) {
    console.error('[GDPR] Error anonymizing user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// Data Retention Policy
// =====================================================

/**
 * Cleans up old data according to retention policy
 */
export async function cleanupOldData(
  retentionDays: number = 90
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old audit logs
    const { count, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('[GDPR] Failed to cleanup old data:', error);
      return { success: false, error: error.message };
    }

    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error('[GDPR] Error cleaning up old data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// Cookie Consent Management
// =====================================================

export interface CookieConsent {
  necessary: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

/**
 * Gets default cookie consent
 */
export function getDefaultCookieConsent(): CookieConsent {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  };
}

/**
 * Validates cookie consent object
 */
export function validateCookieConsent(
  consent: Partial<CookieConsent>
): CookieConsent {
  return {
    necessary: true, // Always required
    analytics: consent.analytics ?? false,
    marketing: consent.marketing ?? false,
    preferences: consent.preferences ?? false,
  };
}
