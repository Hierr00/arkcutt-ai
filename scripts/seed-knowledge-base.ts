/**
 * 🌱 SEED KNOWLEDGE BASE
 * Script para popular la base de conocimiento inicial del sistema RAG
 */

import { addKnowledgeBatch } from '../lib/services/rag.service';
import { CreateKnowledgeInput } from '../types/rag.types';

// ==================== MATERIAL KNOWLEDGE ====================

const materialKnowledge: CreateKnowledgeInput[] = [
  // Aluminio 7075
  {
    agent_type: 'material',
    category: 'properties',
    content: `Aluminio 7075-T6 (AA7075): Material aeronáutico de alta resistencia. Propiedades: Resistencia a la tracción 570 MPa, límite elástico 500 MPa, dureza 150 HB, densidad 2.81 g/cm³. Excelente relación resistencia/peso. Aplicaciones: Componentes estructurales aeronáuticos, piezas deportivas de alto rendimiento, moldes de inyección. Mecanizado: Requiere herramientas de carburo, alta velocidad de corte, refrigeración abundante. Tratamientos compatibles: Anodizado tipo II y III.`,
    metadata: {
      material_code: 'AA7075',
      grade: 'T6',
      category: 'aluminum_aerospace',
      tensile_strength_mpa: 570,
      yield_strength_mpa: 500,
      hardness_hb: 150,
      density: 2.81,
      applications: ['aeronautica', 'deportivo', 'moldes'],
    },
    importance_score: 1.0,
    verified: true,
  },

  // Aluminio 6061
  {
    agent_type: 'material',
    category: 'properties',
    content: `Aluminio 6061-T6 (AA6061): Material versátil de uso general. Propiedades: Resistencia a la tracción 310 MPa, límite elástico 275 MPa, dureza 95 HB, densidad 2.70 g/cm³. Excelente soldabilidad y resistencia a la corrosión. Aplicaciones: Estructuras mecánicas, componentes automotrices, muebles, perfiles arquitectónicos. Mecanizado: Fácil mecanizado, buena acabado superficial. Tratamientos compatibles: Anodizado, cromado, pintura.`,
    metadata: {
      material_code: 'AA6061',
      grade: 'T6',
      category: 'aluminum_general',
      tensile_strength_mpa: 310,
      yield_strength_mpa: 275,
      hardness_hb: 95,
      density: 2.70,
      applications: ['general', 'automocion', 'arquitectura'],
    },
    importance_score: 1.0,
    verified: true,
  },

  // Acero inoxidable 316L
  {
    agent_type: 'material',
    category: 'properties',
    content: `Acero Inoxidable 316L: Acero austenítico con excelente resistencia a la corrosión. Propiedades: Resistencia a la tracción 515 MPa, límite elástico 205 MPa, dureza 217 HB, densidad 8.0 g/cm³. Superior resistencia a ambientes marinos y químicos por contenido de molibdeno. Aplicaciones: Industria alimentaria, marina, médica, química. Mecanizado: Genera calor, requiere bajas velocidades, herramientas resistentes al desgaste. Tratamientos: Pasivado, electrobrillado.`,
    metadata: {
      material_code: 'SS316L',
      category: 'stainless_steel',
      tensile_strength_mpa: 515,
      yield_strength_mpa: 205,
      hardness_hb: 217,
      density: 8.0,
      applications: ['alimentaria', 'marina', 'medica', 'quimica'],
    },
    importance_score: 1.0,
    verified: true,
  },

  // Titanio Grado 5
  {
    agent_type: 'material',
    category: 'properties',
    content: `Titanio Grado 5 (Ti-6Al-4V): Aleación de titanio más utilizada. Propiedades: Resistencia a la tracción 900 MPa, límite elástico 830 MPa, dureza 334 HB, densidad 4.43 g/cm³. Excelente relación resistencia/peso, resistencia a corrosión y altas temperaturas. Aplicaciones: Aeroespacial, biomédico, motorsport, componentes de alto rendimiento. Mecanizado: DIFÍCIL - requiere bajas velocidades, herramientas especiales de carburo, refrigeración constante. IMPORTANTE: Es caro y el mecanizado es lento. Tratamientos: Anodizado (diferentes colores), pasivado.`,
    metadata: {
      material_code: 'Ti-6Al-4V',
      grade: '5',
      category: 'titanium',
      tensile_strength_mpa: 900,
      yield_strength_mpa: 830,
      hardness_hb: 334,
      density: 4.43,
      applications: ['aeroespacial', 'biomedico', 'motorsport'],
      machining_difficulty: 'high',
      cost_level: 'high',
    },
    importance_score: 1.0,
    verified: true,
  },

  // Dimensiones disponibles
  {
    agent_type: 'material',
    category: 'dimensions',
    content: `Dimensiones máximas de mecanizado en nuestras máquinas CNC: Mesa de trabajo 1000x600x500mm. Capacidades: Piezas hasta 900x550x450mm de forma segura. Precisión posicional: ±0.01mm. Tolerancias alcanzables: Estándar ±0.1mm, Fina ±0.05mm, Muy fina ±0.02mm (según geometría). LIMITACIÓN IMPORTANTE: No podemos mecanizar piezas mayores a estas dimensiones - requeriría subcontratación.`,
    metadata: {
      max_x_mm: 900,
      max_y_mm: 550,
      max_z_mm: 450,
      precision_mm: 0.01,
      standard_tolerance_mm: 0.1,
      fine_tolerance_mm: 0.05,
    },
    importance_score: 0.9,
    verified: true,
  },

  // Proveedores de materiales
  {
    agent_type: 'material',
    category: 'suppliers',
    content: `MetalStock Pro: Proveedor principal de aluminios aeronáuticos (AA7075, AA2024, AA6061). Contacto: ventas@metalstock.es, Tel: +34 91 123 4567. IMPORTANTE: Siempre solicitar con 2 semanas de antelación, pedido mínimo 100kg. Excelente calidad con certificaciones EN 485, AMS 4045. Entrega: 14 días laborables. Cobertura: Península. Precio orientativo AA7075: 8-12€/kg según cantidad. Historia: Proveedor de confianza desde 2020, >50 pedidos, 0 incidencias.`,
    metadata: {
      provider_name: 'MetalStock Pro',
      provider_id: 'msp_001',
      materials: ['AA7075', 'AA2024', 'AA6061'],
      lead_time_days: 14,
      min_order_kg: 100,
      contact_email: 'ventas@metalstock.es',
      phone: '+34 91 123 4567',
      trust_level: 'preferred',
    },
    importance_score: 1.0,
    verified: true,
  },

  {
    agent_type: 'material',
    category: 'suppliers',
    content: `TitanSupply España: Especialista en aleaciones de titanio grado aeroespacial y médico. Contacto: compras@titansupply.es, Tel: +34 93 456 7890. Materiales: Ti-6Al-4V (Grado 5), Ti CP (Grados 1-4), Ti-6Al-7Nb (biomédico). IMPORTANTE: Requiere 3 semanas de plazo, certificados médicos/aero incluidos. Pedido mínimo: 50kg. Precio Ti-6Al-4V: 35-45€/kg. Excelente servicio técnico, asesoramiento en selección de grado. Historia: Partner desde 2019, especialistas en titanio.`,
    metadata: {
      provider_name: 'TitanSupply España',
      provider_id: 'tse_001',
      materials: ['Ti-6Al-4V', 'Ti-CP', 'Ti-6Al-7Nb'],
      lead_time_days: 21,
      min_order_kg: 50,
      contact_email: 'compras@titansupply.es',
      phone: '+34 93 456 7890',
      trust_level: 'preferred',
    },
    importance_score: 1.0,
    verified: true,
  },
];

// ==================== ENGINEERING KNOWLEDGE ====================

const engineeringKnowledge: CreateKnowledgeInput[] = [
  {
    agent_type: 'engineering',
    category: 'capabilities',
    content: `Servicios que SÍ realizamos en Arkcutt: Mecanizado CNC de 3 ejes en metales (aluminio, acero inoxidable, titanio, latón, cobre). Operaciones: Fresado, taladrado, roscado, ranurado, contorneado. Tolerancias: ±0.1mm estándar, ±0.05mm fina, ±0.02mm muy fina. Acabado superficial: Ra 3.2 estándar, Ra 1.6 fino, Ra 0.8 pulido. Capacidad: Prototipos y series cortas (1-500 piezas). Materiales NO trabajamos: Plásticos, madera, compuestos.`,
    metadata: {
      services: ['fresado_cnc', 'taladrado', 'roscado'],
      axes: 3,
      materials_supported: ['aluminum', 'stainless_steel', 'titanium', 'brass', 'copper'],
      materials_not_supported: ['plastics', 'wood', 'composites'],
      min_quantity: 1,
      max_quantity: 500,
    },
    importance_score: 1.0,
    verified: true,
  },

  {
    agent_type: 'engineering',
    category: 'limitations',
    content: `Servicios que NO realizamos (requieren subcontratación a proveedores): Tratamientos superficiales (anodizado, cromado, niquelado, pintura), Tratamientos térmicos, Soldadura, Corte láser, Corte por agua, Electroerosión, Impresión 3D, Certificaciones (ISO, aeronáuticas), Control dimensional externo, Metrología avanzada. IMPORTANTE: Cuando un cliente pide estos servicios, debemos identificarlos y gestionar con proveedores externos.`,
    metadata: {
      external_services: [
        'anodizado',
        'cromado',
        'tratamiento_termico',
        'soldadura',
        'corte_laser',
        'certificaciones',
      ],
    },
    importance_score: 1.0,
    verified: true,
  },

  {
    agent_type: 'engineering',
    category: 'tolerances',
    content: `Tolerancias alcanzables según tipo de mecanizado: ESTÁNDAR (±0.1mm): Fresado general, taladrados estándar, 95% de piezas. FINA (±0.05mm): Ajustes precisos, superficies de referencia, requiere verificación dimensional, +20% coste. MUY FINA (±0.02mm): Ajustes críticos, superficies funcionales premium, requiere temperatura controlada y metrología, +40% coste, no garantizable en todas las geometrías. Factores: Material (titanio más difícil), dimensiones (piezas grandes más difícil), geometría (paredes delgadas límite).`,
    metadata: {
      standard_tolerance_mm: 0.1,
      fine_tolerance_mm: 0.05,
      very_fine_tolerance_mm: 0.02,
      standard_cost_multiplier: 1.0,
      fine_cost_multiplier: 1.2,
      very_fine_cost_multiplier: 1.4,
    },
    importance_score: 0.9,
    verified: true,
  },

  {
    agent_type: 'engineering',
    category: 'best_practices',
    content: `Mejores prácticas de diseño para mecanizado CNC: 1) Evitar paredes muy delgadas (<1.5mm en aluminio, <2mm en acero, <3mm en titanio). 2) Radios internos: Mínimo R2mm para acabado estándar, R1mm posible pero más caro. 3) Roscas: M3 mínimo en aluminio, M4 en titanio. 4) Profundidad de cavidades: Máximo 4x el diámetro de herramienta. 5) Tolerancias: No especificar ±0.05mm si ±0.1mm es suficiente (ahorro de coste). 6) Acabado: Ra 3.2 suficiente para la mayoría, Ra 1.6 solo donde sea necesario funcional.`,
    metadata: {
      min_wall_thickness_aluminum_mm: 1.5,
      min_wall_thickness_steel_mm: 2.0,
      min_wall_thickness_titanium_mm: 3.0,
      min_internal_radius_mm: 2.0,
      min_thread_aluminum: 'M3',
      min_thread_titanium: 'M4',
    },
    importance_score: 0.8,
    verified: true,
  },
];

// ==================== PROVIDERS KNOWLEDGE ====================

const providersKnowledge: CreateKnowledgeInput[] = [
  {
    agent_type: 'providers',
    category: 'provider_info',
    content: `TreatMetal Pro: Especialista en tratamientos superficiales de aluminio y titanio. Servicios: Anodizado tipo II y III, colores disponibles (natural, negro, azul, rojo, oro), pasivado de titanio (colores arcoíris). Contacto: tratamientos@treatmetal.com, Tel: +34 96 789 0123. Lead time: 7-10 días. Calidad: Certificado ISO 9001, especializados en piezas aeronáuticas. IMPORTANTE: Para titanio, consultar siempre espesor requerido. Pedido mínimo: 50€. Historia: Excelente calidad, >100 pedidos, recomendado para proyectos críticos.`,
    metadata: {
      provider_name: 'TreatMetal Pro',
      provider_id: 'tmp_001',
      services: ['anodizado_tipo_2', 'anodizado_tipo_3', 'pasivado_titanio'],
      materials: ['aluminum', 'titanium'],
      lead_time_days: 8,
      min_order_value: 50,
      contact_email: 'tratamientos@treatmetal.com',
      phone: '+34 96 789 0123',
      trust_level: 'preferred',
      certifications: ['ISO_9001', 'NADCAP'],
    },
    importance_score: 1.0,
    verified: true,
  },

  {
    agent_type: 'providers',
    category: 'provider_info',
    content: `CertLab Madrid: Laboratorio de certificación y control dimensional. Servicios: Certificados materiales EN 10204 3.1, inspecciones dimensionales, informes FAI (First Article Inspection), certificaciones aeronáuticas. Contacto: certificaciones@certlab.es, Tel: +34 91 234 5678. Lead time: 5-7 días laborables. IMPORTANTE: Enviar plano con tolerancias claramente marcadas. Costo aprox: 150-300€ según complejidad. Indispensable para clientes sector aero/médico. Historia: Partner certificado, acreditación ENAC.`,
    metadata: {
      provider_name: 'CertLab Madrid',
      provider_id: 'clm_001',
      services: ['certificados_material', 'inspeccion_dimensional', 'FAI', 'certificacion_aero'],
      lead_time_days: 6,
      cost_range_min: 150,
      cost_range_max: 300,
      contact_email: 'certificaciones@certlab.es',
      phone: '+34 91 234 5678',
      trust_level: 'trusted',
      certifications: ['ENAC', 'ISO_17025'],
    },
    importance_score: 0.9,
    verified: true,
  },

  {
    agent_type: 'providers',
    category: 'provider_notes',
    content: `IMPORTANTE - Proceso de gestión de proveedores: 1) Identificar servicio requerido que no hacemos internamente. 2) Buscar proveedor apropiado en base de datos. 3) Revisar notas especiales del proveedor (plazos, requisitos). 4) Generar email de solicitud con especificaciones técnicas detalladas. 5) Adjuntar planos/archivos necesarios. 6) Especificar fecha límite requerida (considerar sus lead times). 7) Solicitar presupuesto detallado. Plantilla de email: Saludo profesional, referencia a proyecto, especificaciones técnicas, cantidad, plazo, solicitud de presupuesto y lead time.`,
    metadata: {
      process_type: 'provider_management',
    },
    importance_score: 0.8,
    verified: true,
  },

  {
    agent_type: 'providers',
    category: 'services',
    content: `Catálogo de servicios externos disponibles: TRATAMIENTOS SUPERFICIALES: Anodizado (TreatMetal Pro), Cromado (MetalFinish), Niquelado (MetalFinish), Pintura industrial (CoatingTech). TRATAMIENTOS TÉRMICOS: Temple, revenido, normalizado (ThermoTech). UNIÓN: Soldadura TIG (WeldPro), Soldadura MIG (WeldPro). CORTE: Láser (LaserCut España), Waterjet (WaterCut). CERTIFICACIÓN: Control dimensional (CertLab Madrid), Certificados material (CertLab Madrid), Certificación aeronáutica (AeroQuality). Cada servicio tiene proveedor preferido listado.`,
    metadata: {
      service_categories: [
        'surface_treatment',
        'heat_treatment',
        'welding',
        'cutting',
        'certification',
      ],
    },
    importance_score: 0.9,
    verified: true,
  },
];

// ==================== MAIN FUNCTION ====================

async function seedKnowledgeBase() {
  console.log('🌱 Starting knowledge base seeding...\n');

  try {
    // Seed Material Knowledge
    console.log('📦 Seeding material knowledge...');
    const materialResults = await addKnowledgeBatch(materialKnowledge);
    console.log(`✅ Added ${materialResults.length} material documents\n`);

    // Seed Engineering Knowledge
    console.log('🔧 Seeding engineering knowledge...');
    const engineeringResults = await addKnowledgeBatch(engineeringKnowledge);
    console.log(`✅ Added ${engineeringResults.length} engineering documents\n`);

    // Seed Providers Knowledge
    console.log('🤝 Seeding providers knowledge...');
    const providersResults = await addKnowledgeBatch(providersKnowledge);
    console.log(`✅ Added ${providersResults.length} providers documents\n`);

    // Summary
    const total =
      materialResults.length + engineeringResults.length + providersResults.length;

    console.log('🎉 Knowledge base seeding completed!');
    console.log(`\nSummary:`);
    console.log(`- Material documents: ${materialResults.length}`);
    console.log(`- Engineering documents: ${engineeringResults.length}`);
    console.log(`- Providers documents: ${providersResults.length}`);
    console.log(`- Total documents: ${total}`);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedKnowledgeBase()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { seedKnowledgeBase };
