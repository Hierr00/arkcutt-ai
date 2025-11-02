/**
 * 📋 FIN QUOTATION REQUEST TYPES
 * Tipos para el endpoint de creación de quotation requests desde Fin
 */

import { z } from 'zod';

/**
 * Schema para crear quotation request desde Fin
 */
export const CreateQuotationFromFinSchema = z.object({
  // Información del cliente
  customer_email: z.string().email('Email inválido'),
  customer_name: z.string().optional(),
  customer_company: z.string().optional(),

  // Información de la pieza/servicio
  parts_description: z.string().min(10, 'Descripción muy corta'),
  quantity: z.coerce.number().int().positive('Cantidad debe ser positiva'), // coerce convierte strings a números
  material_requested: z.string().min(2, 'Material requerido'),

  // Servicios solicitados (puede incluir mecanizado + servicios externos)
  services: z.array(z.object({
    service_type: z.string(),
    description: z.string().optional(),
  })).min(1, 'Al menos un servicio requerido'),

  // Especificaciones técnicas (opcional)
  tolerances: z.string().optional(),
  surface_finish: z.string().optional(),
  delivery_deadline: z.string().optional(),

  // Tracking
  conversation_id: z.string().optional(), // Intercom conversation ID
  thread_id: z.string().optional(), // Email thread ID si existe

  // Archivos adjuntos (Fin puede enviar URLs a attachments)
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    content_type: z.string(),
  })).optional(),
});

export type CreateQuotationFromFinRequest = z.infer<typeof CreateQuotationFromFinSchema>;

/**
 * Respuesta del endpoint
 */
export interface CreateQuotationFromFinResponse {
  success: boolean;
  quotation_request_id: string;
  status: 'created' | 'searching_providers' | 'error';
  message: string;

  // Detalles de los servicios identificados
  services_breakdown?: {
    internal_services: string[]; // Servicios que Arkcutt hace internamente
    external_services: Array<{
      service: string;
      providers_found: number;
      rfqs_sent: number;
    }>;
  };

  // Info para que Fin sepa qué decirle al cliente
  customer_message?: string;
  estimated_response_time?: string; // "2-3 días laborables"
}
