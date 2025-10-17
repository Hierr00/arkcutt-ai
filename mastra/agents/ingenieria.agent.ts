/**
 * 🤖 AGENT: Ingeniería
 * Especialista en gestión de presupuestos
 */

import { AgentExecutionContext } from '@/types/agents.types';
import { generateResponse, log } from '../index';
import { AGENTS_CONFIG } from '../config/agents.config';
import { validateBudgetData, validateContactData, extractContactInfo } from '@/lib/validators';
import { saveBudgetRequest } from '@/lib/supabase';

export const ingenieriaAgent = {
  ...AGENTS_CONFIG.ingenieria,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const { classification, fileInfo, userMemory, memoryContext } = context || {};

    log('info', `🤖 [Ingeniería Agent] Executing`);

    // Extraer entidades técnicas y de contacto del historial
    const lastMessage = messages[messages.length - 1].content;
    const technicalEntities = classification?.entities || {};
    const contactInfo = extractContactInfo(lastMessage);

    // Validar completitud de datos
    const technicalValidation = validateBudgetData(technicalEntities);
    const contactValidation = validateContactData(contactInfo);

    const systemPrompt = `${AGENTS_CONFIG.ingenieria.system}

DATOS TÉCNICOS ACTUALES:
${JSON.stringify(technicalEntities, null, 2)}
Completitud: ${technicalValidation.isValid ? 'COMPLETA' : 'INCOMPLETA'}
Campos faltantes: ${technicalValidation.missingFields.join(', ') || 'Ninguno'}

DATOS DE CONTACTO ACTUALES:
${JSON.stringify(contactInfo, null, 2)}
Completitud: ${contactValidation.isValid ? 'COMPLETA' : 'INCOMPLETA'}
Campos faltantes: ${contactValidation.missingFields.join(', ') || 'Ninguno'}

ARCHIVO ADJUNTO:
${fileInfo ? `Sí - ${fileInfo.filename}` : 'No'}

${memoryContext ? `\n🧠 CONTEXTO DE MEMORIA:\n${memoryContext}\n` : ''}

INSTRUCCIONES:
1. Si faltan datos técnicos críticos (material, cantidad): SOLICÍTALOS de forma amigable
2. Si faltan datos de contacto (email, nombre): SOLICÍTALOS
3. Si hay información de memoria sobre el usuario, úsala para rellenar campos faltantes o hacer sugerencias
4. Si TODO está completo: Genera [SOLICITUD_COMPLETA] con resumen profesional
5. Sé meticuloso pero amable
6. Explica POR QUÉ necesitas cada dato
7. Máximo 300 palabras

FORMATO CUANDO TODO ESTÉ COMPLETO:
[SOLICITUD_COMPLETA]

Resumen de su solicitud:
- Material: [material]
- Cantidad: [cantidad] piezas
- Tolerancia: [tolerancia]
- Plazo: [plazo] semanas
- Tratamientos: [tratamientos]
- Archivo: [si/no]

Datos de contacto:
- Nombre: [nombre]
- Empresa: [empresa]
- Email: [email]
- Teléfono: [teléfono]

Hemos recibido su solicitud correctamente. Nuestro equipo técnico la revisará y enviará el presupuesto a [email] en un plazo de 24-48 horas.`;

    try {
      const response = await generateResponse({
        model: 'standard',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3, // Más bajo para consistencia
        maxTokens: 2000,
      });

      // Si la respuesta contiene [SOLICITUD_COMPLETA], guardar en DB
      if (response.includes('[SOLICITUD_COMPLETA]')) {
        log('info', '📝 Complete budget request detected, saving to DB');

        try {
          await saveBudgetRequest({
            sessionId: 'current-session', // TODO: Get from context
            userId: userMemory?.user_id || 'anonymous',
            status: 'pending',
            datosTecnicos: technicalEntities,
            datosContacto: contactInfo,
            archivos: fileInfo ? [fileInfo] : undefined,
          });

          log('info', '✅ Budget request saved successfully');
        } catch (error) {
          log('error', 'Failed to save budget request', error);
        }
      }

      log('debug', `✅ Ingeniería Agent response generated`);
      return response;
    } catch (error) {
      log('error', 'Ingeniería Agent error', error);
      return 'Disculpe, ha ocurrido un error procesando su solicitud. Por favor, inténtelo de nuevo.';
    }
  },
};
