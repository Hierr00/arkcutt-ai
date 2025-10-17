/**
 * 🧪 CONTEXT ENGINEERING INTEGRATION TEST
 * Tests completos del sistema RAG + Tools + Agents
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateRAGContext } from '@/lib/services/rag.service';
import { materialAgent } from '@/mastra/agents/material.agent';
import { proveedoresAgent } from '@/mastra/agents/proveedores.agent';
import { ingenieriaAgent } from '@/mastra/agents/ingenieria.agent';

describe('Context Engineering Integration', () => {
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('SUPABASE_URL not configured');
    }
  });

  describe('RAG Context Generation', () => {
    it('should generate optimized context vs full database', async () => {
      const query = 'Necesito información sobre aluminio 7075';

      // Generar contexto RAG (optimizado)
      const ragContext = await generateRAGContext(query, 'material', {
        max_results: 5,
        match_threshold: 0.6,
        max_tokens: 1500,
      });

      // Verificar optimización
      expect(ragContext.token_count).toBeLessThan(2000);
      expect(ragContext.token_count).toBeGreaterThan(0);
      expect(ragContext.retrieved_docs.length).toBeGreaterThan(0);

      // Verificar que el contexto es relevante
      expect(ragContext.formatted_context.toLowerCase()).toContain('7075');

      console.log(`\n📊 Token Optimization:`);
      console.log(`   RAG Context: ~${ragContext.token_count} tokens`);
      console.log(`   Full DB: ~8000 tokens (estimated)`);
      console.log(
        `   Reduction: ${Math.round((1 - ragContext.token_count / 8000) * 100)}%`
      );
    });

    it('should retrieve context for different agent types', async () => {
      const queries = [
        { query: 'propiedades aluminio 7075', agent_type: 'material' as const },
        { query: 'tolerancias de mecanizado', agent_type: 'engineering' as const },
        { query: 'proveedores anodizado', agent_type: 'providers' as const },
      ];

      for (const { query, agent_type } of queries) {
        const context = await generateRAGContext(query, agent_type, {
          max_results: 3,
          match_threshold: 0.5,
        });

        expect(context.agent_type).toBe(agent_type);
        expect(context.retrieved_docs.length).toBeGreaterThan(0);

        // Todos los docs deben ser del agent_type correcto
        context.retrieved_docs.forEach((doc) => {
          expect(doc.agent_type).toBe(agent_type);
        });
      }
    });

    it('should be fast even with multiple concurrent requests', async () => {
      const start = Date.now();

      const promises = [
        generateRAGContext('aluminio 7075', 'material'),
        generateRAGContext('tolerancias cnc', 'engineering'),
        generateRAGContext('anodizado titanio', 'providers'),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(3000); // < 3 segundos para 3 búsquedas
    });
  });

  describe('Material Agent with RAG', () => {
    it('should use RAG to answer material query', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: '¿Qué propiedades tiene el aluminio 7075?',
        },
      ];

      const response = await materialAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(50);

      // Debería mencionar propiedades del AA7075
      const lowerResponse = response.toLowerCase();
      expect(
        lowerResponse.includes('7075') ||
          lowerResponse.includes('resistencia') ||
          lowerResponse.includes('aeronáutico')
      ).toBe(true);
    });

    it('should handle queries about material availability', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: '¿Tenéis material disponible para aplicaciones aeronáuticas?',
        },
      ];

      const response = await materialAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
    });

    it('should provide technical specifications', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Necesito especificaciones técnicas del acero inoxidable',
        },
      ];

      const response = await materialAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('Proveedores Agent with RAG', () => {
    it('should identify external services correctly', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Necesito anodizar piezas de aluminio',
        },
      ];

      const response = await proveedoresAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();

      const lowerResponse = response.toLowerCase();

      // Debe indicar que es servicio externo
      expect(
        lowerResponse.includes('no realizamos') ||
          lowerResponse.includes('no hacemos') ||
          lowerResponse.includes('externo') ||
          lowerResponse.includes('proveedor')
      ).toBe(true);
    });

    it('should use RAG to find provider information', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: '¿Conocéis algún proveedor de tratamientos superficiales?',
        },
      ];

      const response = await proveedoresAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(30);
    });

    it('should clarify Arkcutt only does CNC machining', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: '¿Hacéis soldadura y pintura?',
        },
      ];

      const response = await proveedoresAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();

      const lowerResponse = response.toLowerCase();
      expect(
        lowerResponse.includes('solo') ||
          lowerResponse.includes('únicamente') ||
          lowerResponse.includes('mecanizado') ||
          lowerResponse.includes('cnc')
      ).toBe(true);
    });
  });

  describe('Ingeniería Agent with RAG', () => {
    it('should use RAG for technical validation', async () => {
      const messages = [
        {
          role: 'user' as const,
          content:
            'Necesito 100 piezas de aluminio con tolerancia de ±0.01mm',
        },
      ];

      const response = await ingenieriaAgent.execute({
        messages,
        context: {
          classification: {
            entities: {
              material: 'aluminio',
              cantidad: 100,
              tolerancia: '±0.01mm',
            },
          },
        },
      });

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(30);
    });

    it('should handle budget request gathering', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Quiero solicitar un presupuesto',
        },
      ];

      const response = await ingenieriaAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();

      // Debería solicitar información
      const lowerResponse = response.toLowerCase();
      expect(
        lowerResponse.includes('necesit') ||
          lowerResponse.includes('información') ||
          lowerResponse.includes('datos')
      ).toBe(true);
    });
  });

  describe('End-to-End Workflows', () => {
    it('should handle: material query → properties → supplier', async () => {
      // 1. Usuario pregunta por material
      const query1 = [
        {
          role: 'user' as const,
          content: '¿Qué características tiene el aluminio para aeronáutica?',
        },
      ];

      const response1 = await materialAgent.execute({
        messages: query1,
        context: {},
      });

      expect(response1).toBeDefined();
      expect(response1.length).toBeGreaterThan(50);

      // 2. Usuario pregunta por disponibilidad
      const query2 = [
        ...query1,
        { role: 'assistant' as const, content: response1 },
        {
          role: 'user' as const,
          content: '¿Lo tenéis en stock?',
        },
      ];

      const response2 = await materialAgent.execute({
        messages: query2,
        context: {},
      });

      expect(response2).toBeDefined();
    });

    it('should handle: external service → find provider → generate email', async () => {
      // 1. Usuario solicita servicio externo
      const query1 = [
        {
          role: 'user' as const,
          content: 'Necesito anodizar 50 piezas de titanio',
        },
      ];

      const response1 = await proveedoresAgent.execute({
        messages: query1,
        context: {},
      });

      expect(response1).toBeDefined();

      // Debe identificar como externo
      expect(
        response1.toLowerCase().includes('no') ||
          response1.toLowerCase().includes('externo')
      ).toBe(true);
    });

    it('should handle: budget request → gather info → complete', async () => {
      // Flujo completo de solicitud de presupuesto
      const messages = [
        {
          role: 'user' as const,
          content: 'Quiero un presupuesto para 100 piezas de aluminio 7075',
        },
      ];

      const response = await ingenieriaAgent.execute({
        messages,
        context: {
          classification: {
            entities: {
              material: 'aluminio 7075',
              cantidad: 100,
            },
          },
        },
      });

      expect(response).toBeDefined();

      // Debería pedir más información o confirmar
      const lowerResponse = response.toLowerCase();
      expect(
        lowerResponse.includes('tolerancia') ||
          lowerResponse.includes('plazo') ||
          lowerResponse.includes('contacto') ||
          lowerResponse.includes('email')
      ).toBe(true);
    });
  });

  describe('Performance & Token Optimization', () => {
    it('should complete agent execution in reasonable time', async () => {
      const start = Date.now();

      await materialAgent.execute({
        messages: [
          {
            role: 'user',
            content: '¿Qué es el aluminio 7075?',
          },
        ],
        context: {},
      });

      const duration = Date.now() - start;

      // Debe completar en < 10 segundos (incluyendo llamada a OpenAI)
      expect(duration).toBeLessThan(10000);
    });

    it('should demonstrate token savings', async () => {
      // Simular consulta que antes usaría toda la DB
      const query = 'información sobre materiales';

      const ragContext = await generateRAGContext(query, 'material', {
        max_results: 5,
        max_tokens: 1500,
      });

      // Token savings comparison
      const oldApproach = 8000; // Toda la base de datos
      const newApproach = ragContext.token_count;
      const savings = Math.round((1 - newApproach / oldApproach) * 100);

      console.log(`\n💰 Token Savings:`);
      console.log(`   Old approach: ${oldApproach} tokens`);
      console.log(`   New approach: ${newApproach} tokens`);
      console.log(`   Savings: ${savings}%`);

      expect(savings).toBeGreaterThan(70); // Al menos 70% ahorro
    });

    it('should handle multiple agents concurrently', async () => {
      const start = Date.now();

      const promises = [
        materialAgent.execute({
          messages: [{ role: 'user', content: 'aluminio 7075' }],
          context: {},
        }),
        proveedoresAgent.execute({
          messages: [{ role: 'user', content: 'anodizado' }],
          context: {},
        }),
        ingenieriaAgent.execute({
          messages: [{ role: 'user', content: 'tolerancias' }],
          context: {},
        }),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      // Concurrente debe ser más rápido que secuencial
      expect(duration).toBeLessThan(15000); // < 15 segundos para 3 agentes
    });
  });

  describe('Quality Assurance', () => {
    it('should return relevant answers (not generic)', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Dime sobre el aluminio 7075',
        },
      ];

      const response = await materialAgent.execute({
        messages,
        context: {},
      });

      // La respuesta debe ser específica, no genérica
      const lowerResponse = response.toLowerCase();

      // Debe mencionar propiedades específicas
      expect(
        lowerResponse.includes('resistencia') ||
          lowerResponse.includes('mpa') ||
          lowerResponse.includes('dureza') ||
          lowerResponse.includes('aeronáutico')
      ).toBe(true);

      // No debe ser una respuesta corta y genérica
      expect(response.length).toBeGreaterThan(100);
    });

    it('should cite source documents when available', async () => {
      const query = 'propiedades del aluminio 7075';

      const ragContext = await generateRAGContext(query, 'material', {
        max_results: 3,
        match_threshold: 0.6,
      });

      // Verificar que recuperó documentos
      expect(ragContext.retrieved_docs.length).toBeGreaterThan(0);

      // Verificar que el contexto formateado incluye los documentos
      expect(ragContext.formatted_context).toContain('Documento');
      expect(ragContext.formatted_context).toContain('Relevancia');
    });

    it('should handle multilingual queries gracefully', async () => {
      // Sistema está en español, pero debería manejar inglés también
      const messages = [
        {
          role: 'user' as const,
          content: 'What properties does aluminum 7075 have?',
        },
      ];

      const response = await materialAgent.execute({
        messages,
        context: {},
      });

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
    });
  });
});
