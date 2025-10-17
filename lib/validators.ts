/**
 * 🛡️ VALIDADORES Y GUARDRAILS
 */

import { z } from 'zod';
import { BudgetData, ContactData, TechnicalValidation } from '@/types/agents.types';

/**
 * Validar datos técnicos para presupuesto
 */
export function validateBudgetData(data: Partial<BudgetData>): TechnicalValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validar campos obligatorios
  if (!data.material) {
    missingFields.push('Material');
    suggestions.push('Por favor, especifique el material requerido (ej: Aluminio 6061)');
  }

  if (!data.cantidad || data.cantidad <= 0) {
    missingFields.push('Cantidad');
    suggestions.push('Por favor, indique la cantidad de piezas requeridas');
  }

  if (!data.tolerancia) {
    warnings.push('No se especificó tolerancia, se asumirá ISO 2768-m (media)');
  }

  if (!data.plazo_semanas) {
    warnings.push('No se especificó plazo, se contactará para acordar fecha de entrega');
  }

  // Validaciones de coherencia
  if (data.cantidad && data.cantidad > 1000) {
    suggestions.push(
      'Para cantidades grandes (>1000 piezas), considere consultar por descuentos por volumen'
    );
  }

  if (data.plazo_semanas && data.plazo_semanas < 2) {
    warnings.push(
      'El plazo solicitado es muy corto. Plazos menores a 2 semanas pueden tener recargo por urgencia'
    );
  }

  if (data.tratamientos && data.tratamientos.length > 0) {
    suggestions.push(
      `Tratamientos solicitados: ${data.tratamientos.join(', ')}. Estos añadirán tiempo al plazo de entrega`
    );
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    suggestions,
  };
}

/**
 * Validar datos de contacto
 */
export function validateContactData(data: Partial<ContactData>): TechnicalValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Email es obligatorio
  if (!data.email) {
    missingFields.push('Email');
    suggestions.push('Por favor, proporcione su email para enviar el presupuesto');
  } else {
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      warnings.push('El formato del email parece incorrecto, por favor verifíquelo');
    }
  }

  if (!data.nombre) {
    missingFields.push('Nombre');
    suggestions.push('Por favor, indique su nombre');
  }

  if (!data.empresa) {
    warnings.push('No se especificó empresa, se asumirá cliente particular');
  }

  if (!data.telefono) {
    warnings.push(
      'No se proporcionó teléfono, pero puede ser útil para coordinar detalles técnicos'
    );
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    suggestions,
  };
}

/**
 * Validar entrada del usuario (guardrails de entrada)
 */
export function validateUserInput(message: string): {
  isValid: boolean;
  reason?: string;
} {
  // Validar longitud mínima
  if (message.trim().length === 0) {
    return {
      isValid: false,
      reason: 'El mensaje no puede estar vacío',
    };
  }

  // Validar longitud máxima (prevenir spam)
  if (message.length > 5000) {
    return {
      isValid: false,
      reason: 'El mensaje es demasiado largo (máximo 5000 caracteres)',
    };
  }

  // Detectar contenido spam/malicioso
  const spamPatterns = [
    /viagra/gi,
    /casino/gi,
    /\$\$\$/g,
    /click here/gi,
    /buy now/gi,
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(message)) {
      return {
        isValid: false,
        reason: 'Mensaje detectado como spam',
      };
    }
  }

  // Detectar intentos de injection
  const injectionPatterns = [
    /<script/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onclick=/gi,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(message)) {
      return {
        isValid: false,
        reason: 'Contenido no permitido detectado',
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitizar salida del agente (guardrails de salida)
 */
export function sanitizeAgentOutput(response: string): string {
  // Remover potenciales tags HTML
  let sanitized = response.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Limitar longitud de respuesta
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '\n\n[Respuesta truncada por longitud]';
  }

  return sanitized;
}

/**
 * Extraer email de texto
 */
export function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Extraer información de contacto de texto
 */
export function extractContactInfo(text: string): Partial<ContactData> {
  const contact: Partial<ContactData> = {};

  // Email
  const email = extractEmail(text);
  if (email) contact.email = email;

  // Teléfono (formatos: +XX XXX XXX XXX, XXX-XXX-XXX, etc.)
  const phoneRegex = /(\+?[\d\s-()]{9,20})/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) contact.telefono = phoneMatch[0].trim();

  // Nombre (si hay "soy X", "me llamo X", etc.)
  const namePatterns = [
    /(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      contact.nombre = match[1];
      break;
    }
  }

  // Empresa (si hay "de empresa X", "trabajo en X", etc.)
  const companyPatterns = [
    /(?:de|empresa|trabajo en|represento a)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ\s&]+(?:S\.?[AL]\.?|Ltd\.?|Inc\.?)?)/i,
  ];

  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      contact.empresa = match[1].trim();
      break;
    }
  }

  return contact;
}
