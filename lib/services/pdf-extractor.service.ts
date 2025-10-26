/**
 * 📄 PDF EXTRACTOR SERVICE
 * Extrae información técnica de planos y documentos PDF
 */

import { openai } from '../llm';
import { log } from '../logger';
import { PDFParse } from 'pdf-parse';

export interface PDFExtractedData {
  text: string;
  pageCount: number;
  technicalInfo: {
    material?: string;
    quantity?: number;
    dimensions?: string[];
    tolerances?: string[];
    surfaceFinish?: string;
    partName?: string;
    specifications?: string[];
  };
  confidence: number;
}

/**
 * Extrae texto de un PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{
  text: string;
  pages: number;
}> {
  try {
    log.info('📄 Extrayendo texto del PDF...');

    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    const pageCount = Array.isArray(result.pages) ? result.pages.length : result.pages;
    log.info(`✅ PDF procesado: ${pageCount} páginas, ${result.text.length} caracteres`);

    return {
      text: result.text,
      pages: pageCount,
    };
  } catch (error: any) {
    log.error('❌ Error extrayendo texto del PDF', { error });
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

/**
 * Analiza el texto del PDF para extraer información técnica
 */
export async function analyzePDFContent(pdfText: string): Promise<PDFExtractedData['technicalInfo'] & { confidence: number }> {
  try {
    log.info('🤖 Analizando contenido técnico del PDF con LLM...');

    const prompt = `Analiza el siguiente texto extraído de un plano técnico o documento PDF.
Extrae SOLO la información técnica relevante para fabricación CNC.

TEXTO DEL PDF:
${pdfText.substring(0, 3000)}
${pdfText.length > 3000 ? '...(texto truncado)' : ''}

Extrae y estructura la siguiente información (si está presente):
- Material: tipo de material (aluminio, acero, titanio, etc.)
- Cantidad: número de piezas a fabricar
- Dimensiones: dimensiones principales de las piezas
- Tolerancias: tolerancias dimensionales requeridas
- Acabado superficial: tipo de acabado (anodizado, pintado, etc.)
- Nombre de la pieza: nombre o código de la pieza
- Especificaciones adicionales: cualquier otra especificación técnica relevante

Responde SOLO con un JSON con esta estructura:
{
  "material": "string o null",
  "quantity": "number o null",
  "dimensions": ["array de strings con dimensiones"] o [],
  "tolerances": ["array de strings con tolerancias"] o [],
  "surfaceFinish": "string o null",
  "partName": "string o null",
  "specifications": ["array de otras specs"] o [],
  "confidence": 0-100 (tu nivel de confianza en la información extraída)
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Baja temperatura para respuestas más determinísticas
    });

    const text = response.choices[0].message.content || '';

    // Parse el JSON de respuesta
    let parsedData: any;
    try {
      // Limpiar el texto para extraer solo el JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(text);
      }
    } catch (parseError) {
      log.warn('⚠️ No se pudo parsear la respuesta del LLM como JSON', { response: text });
      parsedData = {
        specifications: [text],
        confidence: 30,
      };
    }

    log.info('✅ Información técnica extraída del PDF', {
      material: parsedData.material,
      quantity: parsedData.quantity,
      confidence: parsedData.confidence,
    });

    return {
      material: parsedData.material || undefined,
      quantity: parsedData.quantity || undefined,
      dimensions: parsedData.dimensions || [],
      tolerances: parsedData.tolerances || [],
      surfaceFinish: parsedData.surfaceFinish || undefined,
      partName: parsedData.partName || undefined,
      specifications: parsedData.specifications || [],
      confidence: parsedData.confidence || 50,
    };
  } catch (error: any) {
    log.error('❌ Error analizando contenido del PDF', { error });
    throw new Error(`Failed to analyze PDF content: ${error.message}`);
  }
}

/**
 * Procesa un PDF completo: extrae texto y analiza contenido
 */
export async function processPDF(pdfBuffer: Buffer): Promise<PDFExtractedData> {
  try {
    log.info('🚀 Iniciando procesamiento completo de PDF...');

    // 1. Extraer texto
    const { text, pages } = await extractTextFromPDF(pdfBuffer);

    // 2. Si el PDF está vacío o muy corto, retornar sin analizar
    if (!text || text.trim().length < 50) {
      log.warn('⚠️ PDF vacío o con muy poco texto', { textLength: text.length });
      return {
        text,
        pageCount: pages,
        technicalInfo: {},
        confidence: 0,
      };
    }

    // 3. Analizar contenido técnico
    const { confidence, ...technicalInfo } = await analyzePDFContent(text);

    log.info('✅ PDF procesado completamente', {
      pages,
      textLength: text.length,
      confidence,
      hasInfo: Object.keys(technicalInfo).some(key => {
        const value = (technicalInfo as any)[key];
        return value && (Array.isArray(value) ? value.length > 0 : true);
      }),
    });

    return {
      text,
      pageCount: pages,
      technicalInfo,
      confidence,
    };
  } catch (error: any) {
    log.error('❌ Error procesando PDF', { error });
    throw error;
  }
}
