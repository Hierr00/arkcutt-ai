/**
 * Types for Fin AI routing and classification
 */

export type RoutingAction =
  | 'CONTINUE_WITH_FIN'
  | 'CLOSE_AND_PROCESS_EXTERNALLY'
  | 'ESCALATE_TO_HUMAN'
  | 'IGNORE';

export type RoutingDecision =
  | 'CUSTOMER_INQUIRY'
  | 'CUSTOMER_FOLLOWUP'
  | 'PROVIDER_RESPONSE'
  | 'OUT_OF_SCOPE'
  | 'UNCERTAIN';

export interface ClassifyEmailRequest {
  from: string;
  subject: string;
  body: string;
  thread_id: string;
  has_attachments: boolean;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size?: number;
  }>;
}

export interface CustomerContext {
  existing_customer: boolean;
  previous_quotation_id?: string;
  customer_history?: {
    total_quotations: number;
    last_interaction_date: Date;
    successful_orders: number;
  };
}

export interface ProviderContext {
  provider_id: string;
  provider_name: string;
  rfq_id?: string;
  quotation_request_id?: string;
}

export interface ClassifyEmailResponse {
  routing_decision: RoutingDecision;
  action: RoutingAction;
  confidence: number;
  reason: string;

  // Optional based on decision
  automated_reply?: string;
  escalation_message?: string;
  context?: CustomerContext | ProviderContext;
  metadata?: Record<string, any>;
}

export interface RoutingLog {
  id: string;
  email_from: string;
  email_subject: string;
  thread_id: string;
  routing_decision: RoutingDecision;
  action: RoutingAction;
  confidence: number;
  reason: string;
  response_time_ms: number;
  metadata?: Record<string, any>;
  created_at: Date;
}
