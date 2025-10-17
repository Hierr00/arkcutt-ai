/**
 * 🧪 PROVIDERS TOOLS TESTS
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchProviders,
  getProviderInfo,
  generateProviderEmail,
  getMaterialSupplierEmail,
  checkIfServiceIsExternal,
} from '@/lib/tools/providers.tools';

describe('Providers Tools', () => {
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('SUPABASE_URL not configured');
    }
  });

  describe('searchProviders', () => {
    it('should find providers for anodizado', async () => {
      const result = await searchProviders({
        service_type: 'anodizado',
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const firstProvider = result[0];
      expect(firstProvider).toHaveProperty('provider_name');
      expect(firstProvider).toHaveProperty('services');
      expect(firstProvider).toHaveProperty('relevance_score');

      expect(firstProvider.relevance_score).toBeGreaterThan(0);
      expect(firstProvider.relevance_score).toBeLessThanOrEqual(1);
    });

    it('should filter by material compatibility', async () => {
      const result = await searchProviders({
        service_type: 'anodizado',
        material: 'titanio',
      });

      expect(result).toBeInstanceOf(Array);

      // Si encuentra proveedores, verificar relevancia
      if (result.length > 0) {
        expect(result[0].relevance_score).toBeGreaterThan(0.5);
      }
    });

    it('should return provider contact information', async () => {
      const result = await searchProviders({
        service_type: 'tratamiento térmico',
      });

      result.forEach((provider) => {
        expect(provider.provider_name).toBeDefined();
        expect(provider.services).toBeInstanceOf(Array);
        expect(typeof provider.relevance_score).toBe('number');

        // Debe tener al menos notas con información
        expect(provider.notes).toBeDefined();
      });
    });

    it('should handle service with no providers', async () => {
      const result = await searchProviders({
        service_type: 'servicio completamente inexistente xyz123',
      });

      expect(result).toBeInstanceOf(Array);
      // Puede estar vacío o tener resultados con baja relevancia
    });

    it('should order by relevance', async () => {
      const result = await searchProviders({
        service_type: 'anodizado',
      });

      if (result.length > 1) {
        // Verificar que están ordenados por relevancia descendente
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].relevance_score).toBeGreaterThanOrEqual(
            result[i + 1].relevance_score
          );
        }
      }
    });
  });

  describe('getProviderInfo', () => {
    it('should get info for TreatMetal Pro', async () => {
      const result = await getProviderInfo({
        provider_name: 'TreatMetal Pro',
      });

      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('provider_name');

      if (result.found) {
        expect(result.description).toBeDefined();
        expect(result.services).toBeInstanceOf(Array);

        // Debe tener información de contacto
        expect(
          result.contact_email || result.contact_phone
        ).toBeDefined();
      }
    });

    it('should return proper structure', async () => {
      const result = await getProviderInfo({
        provider_name: 'TreatMetal',
      });

      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('provider_name');

      if (result.found) {
        expect(result).toHaveProperty('description');
        expect(result).toHaveProperty('services');
        expect(result).toHaveProperty('contact_email');
        expect(result).toHaveProperty('contact_phone');
      }
    });

    it('should handle unknown provider', async () => {
      const result = await getProviderInfo({
        provider_name: 'Proveedor Inexistente XYZ',
      });

      expect(result.found).toBe(false);
      expect(result.provider_name).toBe('Proveedor Inexistente XYZ');
    });

    it('should be case-insensitive', async () => {
      const result1 = await getProviderInfo({
        provider_name: 'TreatMetal Pro',
      });

      const result2 = await getProviderInfo({
        provider_name: 'treatmetal pro',
      });

      // Ambos deberían encontrar el mismo proveedor
      expect(result1.found).toBe(result2.found);
    });
  });

  describe('generateProviderEmail', () => {
    it('should generate email for anodizado service', async () => {
      const result = await generateProviderEmail({
        provider_name: 'TreatMetal Pro',
        service_requested: 'Anodizado tipo II',
        material: 'Aluminio 7075',
        quantity: 50,
        deadline: '2 semanas',
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');

      // Verificar contenido del subject
      expect(result.subject).toContain('Solicitud de Cotización');
      expect(result.subject).toContain('Anodizado');
      expect(result.subject).toContain('Aluminio 7075');

      // Verificar contenido del body
      expect(result.body).toContain('TreatMetal Pro');
      expect(result.body).toContain('Arkcutt');
      expect(result.body).toContain('Anodizado tipo II');
      expect(result.body).toContain('Aluminio 7075');
      expect(result.body).toContain('50');
      expect(result.body).toContain('2 semanas');

      // Verificar que incluye CC
      expect(result.cc_emails).toContain('ingenieria@arkcutt.com');
    });

    it('should include technical specs if provided', async () => {
      const result = await generateProviderEmail({
        provider_name: 'Provider X',
        service_requested: 'Tratamiento térmico',
        material: 'Acero',
        technical_specs: 'Dureza requerida: HRC 58-62',
      });

      expect(result.body).toContain('ESPECIFICACIONES TÉCNICAS');
      expect(result.body).toContain('HRC 58-62');
    });

    it('should work without optional parameters', async () => {
      const result = await generateProviderEmail({
        provider_name: 'Provider Y',
        service_requested: 'Servicio X',
        material: 'Material Y',
      });

      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body.length).toBeGreaterThan(100);
    });

    it('should include provider email if found', async () => {
      const result = await generateProviderEmail({
        provider_name: 'TreatMetal Pro',
        service_requested: 'Anodizado',
        material: 'Aluminio',
      });

      // Si el proveedor existe, debe incluir email
      if (result.to_email) {
        expect(result.to_email).toMatch(/@/);
      }
    });

    it('should be professional and well-formatted', async () => {
      const result = await generateProviderEmail({
        provider_name: 'Test Provider',
        service_requested: 'Test Service',
        material: 'Test Material',
      });

      // Verificar formato profesional
      expect(result.body).toContain('Estimados señores');
      expect(result.body).toContain('Saludos cordiales');
      expect(result.body).toContain('Arkcutt');

      // Verificar secciones importantes
      expect(result.body).toContain('SERVICIO REQUERIDO');
      expect(result.body).toContain('MATERIAL');
      expect(result.body).toContain('Quedamos atentos');
    });
  });

  describe('getMaterialSupplierEmail', () => {
    it('should generate material order email', async () => {
      const result = await getMaterialSupplierEmail({
        material_code: 'AA7075',
        material_name: 'Aluminio 7075-T6',
        quantity_kg: 150,
        dimensions: '200x100x50mm',
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('supplier_name');

      // Verificar contenido
      expect(result.subject).toContain('Pedido de Material');
      expect(result.subject).toContain('AA7075');

      expect(result.body).toContain('Arkcutt');
      expect(result.body).toContain('AA7075');
      expect(result.body).toContain('150 kg');
      expect(result.body).toContain('200x100x50mm');
    });

    it('should include certification requirements', async () => {
      const result = await getMaterialSupplierEmail({
        material_code: 'SS316L',
        material_name: 'Acero Inoxidable 316L',
      });

      expect(result.body).toContain('Certificado de material');
      expect(result.body).toContain('Certificado de trazabilidad');
    });

    it('should work with minimal parameters', async () => {
      const result = await getMaterialSupplierEmail({
        material_code: 'TEST',
        material_name: 'Test Material',
      });

      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body.length).toBeGreaterThan(100);
    });

    it('should find supplier email from knowledge base', async () => {
      const result = await getMaterialSupplierEmail({
        material_code: 'AA7075',
        material_name: 'Aluminio 7075',
      });

      // Si encuentra el proveedor en KB, debe incluir email
      if (result.supplier_email) {
        expect(result.supplier_email).toMatch(/@/);
      }

      expect(result.supplier_name).toBeDefined();
    });
  });

  describe('checkIfServiceIsExternal', () => {
    it('should identify mecanizado as internal', async () => {
      const services = [
        'mecanizado CNC',
        'fresado',
        'torneado',
        'taladrado',
      ];

      for (const service of services) {
        const result = await checkIfServiceIsExternal({
          service_description: service,
        });

        expect(result.is_external).toBe(false);
        expect(result.reason).toContain('Arkcutt realiza');
      }
    });

    it('should identify anodizado as external', async () => {
      const result = await checkIfServiceIsExternal({
        service_description: 'anodizado de piezas de aluminio',
      });

      expect(result.is_external).toBe(true);
      expect(result.reason).toContain('NO realiza');
      expect(result.suggested_action).toContain('proveedor externo');
    });

    it('should identify tratamientos as external', async () => {
      const externalServices = [
        'tratamiento térmico',
        'temple',
        'cromado',
        'niquelado',
        'pintura',
      ];

      for (const service of externalServices) {
        const result = await checkIfServiceIsExternal({
          service_description: service,
        });

        expect(result.is_external).toBe(true);
      }
    });

    it('should identify soldadura as external', async () => {
      const result = await checkIfServiceIsExternal({
        service_description: 'soldadura TIG de acero inoxidable',
      });

      expect(result.is_external).toBe(true);
      expect(result.reason).toContain('NO realiza');
    });

    it('should return proper structure', async () => {
      const result = await checkIfServiceIsExternal({
        service_description: 'test service',
      });

      expect(result).toHaveProperty('is_external');
      expect(result).toHaveProperty('service_type');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('suggested_action');

      expect(typeof result.is_external).toBe('boolean');
      expect(typeof result.service_type).toBe('string');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.suggested_action).toBe('string');
    });

    it('should be case-insensitive', async () => {
      const result1 = await checkIfServiceIsExternal({
        service_description: 'ANODIZADO',
      });

      const result2 = await checkIfServiceIsExternal({
        service_description: 'anodizado',
      });

      expect(result1.is_external).toBe(result2.is_external);
    });

    it('should handle complex service descriptions', async () => {
      const result = await checkIfServiceIsExternal({
        service_description:
          'Necesito mecanizar y luego anodizar piezas de aluminio',
      });

      // Debe detectar que incluye anodizado (externo)
      expect(result.is_external).toBe(true);
    });

    it('should default to external for unknown services', async () => {
      const result = await checkIfServiceIsExternal({
        service_description: 'servicio completamente desconocido xyz',
      });

      // Por seguridad, debe asumir externo si no está seguro
      expect(result.is_external).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work together: classify service, search providers, generate email', async () => {
      // 1. Clasificar servicio
      const classification = await checkIfServiceIsExternal({
        service_description: 'anodizado de aluminio',
      });

      expect(classification.is_external).toBe(true);

      // 2. Buscar proveedores
      const providers = await searchProviders({
        service_type: 'anodizado',
        material: 'aluminio',
      });

      expect(providers.length).toBeGreaterThan(0);

      // 3. Obtener info del primer proveedor
      const providerInfo = await getProviderInfo({
        provider_name: providers[0].provider_name,
      });

      expect(providerInfo.found).toBe(true);

      // 4. Generar email
      const email = await generateProviderEmail({
        provider_name: providers[0].provider_name,
        service_requested: 'Anodizado tipo II',
        material: 'Aluminio 7075',
        quantity: 50,
      });

      expect(email.subject).toBeDefined();
      expect(email.body).toBeDefined();
      expect(email.body.length).toBeGreaterThan(200);
    });

    it('should handle workflow: material order needed', async () => {
      // 1. Generar email de pedido de material
      const email = await getMaterialSupplierEmail({
        material_code: 'AA7075',
        material_name: 'Aluminio 7075-T6',
        quantity_kg: 200,
      });

      expect(email.subject).toContain('AA7075');
      expect(email.body).toContain('200 kg');
      expect(email.supplier_name).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should be fast: check service classification', async () => {
      const start = Date.now();

      await checkIfServiceIsExternal({
        service_description: 'anodizado',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // < 2 segundos
    });

    it('should be fast: search providers', async () => {
      const start = Date.now();

      await searchProviders({
        service_type: 'anodizado',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('should be fast: generate email', async () => {
      const start = Date.now();

      await generateProviderEmail({
        provider_name: 'Test',
        service_requested: 'Test',
        material: 'Test',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });
});
