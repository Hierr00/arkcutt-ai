/**
 * 🧪 MATERIAL TOOLS TESTS
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkMaterialStock,
  getMaterialProperties,
  findMaterialSupplier,
  suggestAlternatives,
} from '@/lib/tools/material.tools';

describe('Material Tools', () => {
  beforeAll(() => {
    // Verificar configuración
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('SUPABASE_URL not configured');
    }
  });

  describe('checkMaterialStock', () => {
    it('should check stock for existing material', async () => {
      const result = await checkMaterialStock({
        material_code: 'AA7075',
      });

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('material_code', 'AA7075');
      expect(result).toHaveProperty('material_name');

      // Puede estar disponible o no, pero debe tener la estructura correcta
      if (result.available) {
        expect(result.quantity_kg).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle non-existent material', async () => {
      const result = await checkMaterialStock({
        material_code: 'NONEXISTENT999',
      });

      expect(result.available).toBe(false);
      expect(result.material_code).toBe('NONEXISTENT999');
      expect(result.notes).toContain('no encontrado');
    });

    it('should return proper structure', async () => {
      const result = await checkMaterialStock({
        material_code: 'AA6061',
      });

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('material_code');
      expect(result).toHaveProperty('material_name');

      // Verificar tipos
      expect(typeof result.available).toBe('boolean');
      expect(typeof result.material_code).toBe('string');
      expect(typeof result.material_name).toBe('string');
    });
  });

  describe('getMaterialProperties', () => {
    it('should get properties for aluminum 7075', async () => {
      const result = await getMaterialProperties({
        material_query: 'aluminio 7075',
      });

      expect(result).toHaveProperty('material_name');
      expect(result).toHaveProperty('properties');
      expect(result).toHaveProperty('applications');
      expect(result).toHaveProperty('source_docs');

      expect(result.source_docs.length).toBeGreaterThan(0);

      // Verificar que encontró info relevante
      const firstDoc = result.source_docs[0];
      expect(firstDoc).toHaveProperty('content');
      expect(firstDoc).toHaveProperty('similarity');
      expect(firstDoc.similarity).toBeGreaterThan(0.5); // Buena similitud
    });

    it('should extract technical properties', async () => {
      const result = await getMaterialProperties({
        material_query: 'aluminio 7075 aeronáutico',
      });

      // Si encontró docs, debería tener propiedades
      if (result.source_docs.length > 0) {
        expect(result.properties).toBeDefined();

        // Verificar que los documentos contienen info de AA7075
        const content = result.source_docs[0].content.toLowerCase();
        expect(
          content.includes('7075') ||
            content.includes('aa7075') ||
            content.includes('aeronáutico')
        ).toBe(true);
      }
    });

    it('should handle unknown material', async () => {
      const result = await getMaterialProperties({
        material_query: 'material inexistente xyz123',
      });

      expect(result.material_name).toBeDefined();
      expect(result.source_docs).toBeInstanceOf(Array);
      expect(result.source_docs.length).toBe(0);
    });

    it('should return structured properties', async () => {
      const result = await getMaterialProperties({
        material_query: 'acero inoxidable 316L',
      });

      expect(result.properties).toBeTypeOf('object');
      expect(result.applications).toBeInstanceOf(Array);
      expect(result.advantages).toBeInstanceOf(Array);
      expect(result.limitations).toBeInstanceOf(Array);
    });
  });

  describe('findMaterialSupplier', () => {
    it('should find supplier for AA7075', async () => {
      const result = await findMaterialSupplier({
        material_code: 'AA7075',
      });

      expect(result).toHaveProperty('found');

      if (result.found) {
        expect(result).toHaveProperty('supplier_name');
        expect(result).toHaveProperty('notes');
        expect(result.supplier_name).toBeDefined();

        // Debería tener al menos email o teléfono
        expect(
          result.contact_email || result.contact_phone
        ).toBeDefined();
      }
    });

    it('should return supplier contact info', async () => {
      const result = await findMaterialSupplier({
        material_code: 'AA7075',
      });

      if (result.found) {
        expect(typeof result.supplier_name).toBe('string');
        expect(result.source_relevance).toBeGreaterThan(0);
        expect(result.source_relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should handle material without supplier', async () => {
      const result = await findMaterialSupplier({
        material_code: 'UNKNOWN_MATERIAL',
      });

      expect(result.found).toBe(false);
      expect(result.notes).toContain('No se encontró proveedor');
    });

    it('should be fast (< 2 seconds)', async () => {
      const start = Date.now();

      await findMaterialSupplier({
        material_code: 'AA7075',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('suggestAlternatives', () => {
    it('should suggest alternatives to AA7075', async () => {
      const result = await suggestAlternatives({
        original_material: 'AA7075',
        requirements: 'alta resistencia para aplicaciones estructurales',
        max_alternatives: 3,
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(3);

      result.forEach((alternative) => {
        expect(alternative).toHaveProperty('material_name');
        expect(alternative).toHaveProperty('similarity_score');
        expect(alternative).toHaveProperty('advantages');
        expect(alternative).toHaveProperty('trade_offs');
        expect(alternative).toHaveProperty('recommended');

        expect(alternative.similarity_score).toBeGreaterThan(0);
        expect(alternative.similarity_score).toBeLessThanOrEqual(1);
        expect(alternative.advantages).toBeInstanceOf(Array);
        expect(alternative.trade_offs).toBeInstanceOf(Array);
      });
    });

    it('should not suggest the same material', async () => {
      const result = await suggestAlternatives({
        original_material: 'AA7075',
        requirements: 'aplicaciones generales',
        max_alternatives: 5,
      });

      // Ninguna alternativa debe ser el mismo material
      result.forEach((alternative) => {
        expect(alternative.material_code).not.toBe('AA7075');
        expect(alternative.material_name.toLowerCase()).not.toContain(
          '7075'
        );
      });
    });

    it('should respect max_alternatives limit', async () => {
      const result = await suggestAlternatives({
        original_material: 'AA6061',
        requirements: 'mecanizado general',
        max_alternatives: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should mark highly similar alternatives as recommended', async () => {
      const result = await suggestAlternatives({
        original_material: 'AA7075',
        requirements: 'aeronáutica alta resistencia',
        max_alternatives: 5,
      });

      // Al menos una alternativa debería estar recomendada (similarity > 0.7)
      const hasRecommended = result.some((alt) => alt.recommended);

      if (result.length > 0) {
        // Si hay resultados relevantes, debería haber al menos una recomendación
        const maxSimilarity = Math.max(
          ...result.map((alt) => alt.similarity_score)
        );
        if (maxSimilarity > 0.7) {
          expect(hasRecommended).toBe(true);
        }
      }
    });

    it('should provide trade-offs information', async () => {
      const result = await suggestAlternatives({
        original_material: 'SS316L',
        requirements: 'resistencia a la corrosión',
        max_alternatives: 3,
      });

      if (result.length > 0) {
        result.forEach((alternative) => {
          // Verificar estructura
          expect(alternative.advantages).toBeInstanceOf(Array);
          expect(alternative.trade_offs).toBeInstanceOf(Array);
        });
      }
    });
  });

  describe('Integration', () => {
    it('should work together: check stock, get properties, find supplier', async () => {
      const materialCode = 'AA7075';

      // 1. Check stock
      const stock = await checkMaterialStock({ material_code: materialCode });
      expect(stock).toBeDefined();

      // 2. Get properties
      const properties = await getMaterialProperties({
        material_query: 'aluminio 7075',
      });
      expect(properties.source_docs.length).toBeGreaterThan(0);

      // 3. Find supplier
      const supplier = await findMaterialSupplier({ material_code: materialCode });
      expect(supplier).toBeDefined();
    });

    it('should handle workflow: material not in stock, suggest alternatives, find supplier', async () => {
      // 1. Check stock for rare material
      const stock = await checkMaterialStock({
        material_code: 'RARE_MATERIAL_999',
      });

      expect(stock.available).toBe(false);

      // 2. Suggest alternatives
      const alternatives = await suggestAlternatives({
        original_material: 'RARE_MATERIAL_999',
        requirements: 'alta resistencia',
        max_alternatives: 2,
      });

      expect(alternatives).toBeInstanceOf(Array);

      // 3. If alternatives found, check their suppliers
      if (alternatives.length > 0 && alternatives[0].material_code) {
        const supplier = await findMaterialSupplier({
          material_code: alternatives[0].material_code,
        });

        expect(supplier).toBeDefined();
      }
    });
  });
});
