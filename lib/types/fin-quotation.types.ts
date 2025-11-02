/**
 * 📋 FIN QUOTATION REQUEST TYPES - ARKCUTT CORTE LÁSER
 * Tipos para el endpoint de creación de quotation requests desde Fin
 * Adaptado para servicios de corte láser en Barcelona y Madrid
 */

import { z } from 'zod';

/**
 * Schema para crear quotation request desde Fin - Arkcutt Corte Láser
 */
export const CreateQuotationFromFinSchema = z.object({
  // ===== INFORMACIÓN DEL CLIENTE =====
  customer_email: z.string().email('Email inválido'),
  customer_name: z.string().optional(),
  customer_company: z.string().optional(),

  // ===== UBICACIÓN DEL SERVICIO =====
  city: z.enum(['Madrid', 'Barcelona'], {
    errorMap: () => ({ message: 'Ciudad debe ser Madrid o Barcelona' })
  }),

  // ===== MATERIAL =====
  material_provider: z.enum(['arkcutt', 'cliente'], {
    errorMap: () => ({ message: 'Proveedor debe ser "arkcutt" o "cliente"' })
  }),
  material: z.string().min(2, 'Material requerido'),
  // Si material_provider es "arkcutt": DM, Contrachapado, Metacrilato, Cartón Gris, Balsa
  // Si es "cliente": debe ser compatible con CO2

  // ===== DISEÑO =====
  design_file_url: z.string().url('URL de archivo inválida').optional(),
  design_description: z.string().optional(), // Si no tiene archivo DXF
  design_measurements: z.string().optional(), // Medidas si no tiene archivo
  design_reference_images: z.array(z.string().url()).optional(), // URLs de imágenes de referencia

  // ===== ENTREGA =====
  delivery_method: z.enum(['recogida_madrid', 'recogida_barcelona', 'envio_domicilio'], {
    errorMap: () => ({ message: 'Método de entrega inválido' })
  }),
  delivery_address: z.string().optional(), // Obligatorio si delivery_method = 'envio_domicilio'
  delivery_date_preference: z.string().optional(), // Fecha preferida de entrega/recogida

  // ===== TRACKING =====
  conversation_id: z.string().optional(), // Intercom conversation ID
  thread_id: z.string().optional(), // Email thread ID si existe

  // ===== ARCHIVOS ADJUNTOS =====
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    content_type: z.string(),
  })).optional(),

  // ===== NOTAS ADICIONALES =====
  additional_notes: z.string().optional(),
}).refine(
  (data) => {
    // Si método de entrega es envío a domicilio, dirección es obligatoria
    if (data.delivery_method === 'envio_domicilio') {
      return !!data.delivery_address && data.delivery_address.length > 10;
    }
    return true;
  },
  {
    message: 'Dirección de entrega requerida para envío a domicilio',
    path: ['delivery_address'],
  }
).refine(
  (data) => {
    // Si no tiene archivo de diseño, debe tener descripción o imágenes
    if (!data.design_file_url) {
      return !!data.design_description || (data.design_reference_images && data.design_reference_images.length > 0);
    }
    return true;
  },
  {
    message: 'Se requiere archivo DXF/DWG, descripción detallada o imágenes de referencia',
    path: ['design_file_url'],
  }
);

export type CreateQuotationFromFinRequest = z.infer<typeof CreateQuotationFromFinSchema>;

/**
 * Respuesta del endpoint - Arkcutt Corte Láser
 */
export interface CreateQuotationFromFinResponse {
  success: boolean;
  quotation_request_id: string;
  status: 'created' | 'pending_review' | 'error';
  message: string;

  // Resumen del pedido
  order_summary?: {
    city: 'Madrid' | 'Barcelona';
    material_provider: 'arkcutt' | 'cliente';
    material: string;
    has_design_file: boolean;
    delivery_method: 'recogida_madrid' | 'recogida_barcelona' | 'envio_domicilio';
  };

  // Info para que Fin sepa qué decirle al cliente
  customer_message?: string;
  estimated_response_time?: string; // "24 horas laborables"

  // Información de recogida (si aplica)
  pickup_info?: {
    address: string;
    schedule: string;
  };
}
