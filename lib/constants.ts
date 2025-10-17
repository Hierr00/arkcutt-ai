/**
 * 📊 CONSTANTES DE LA APLICACIÓN
 */

import { MaterialInfo, ServiceInfo } from '@/types/agents.types';

// Base de datos de materiales industriales
export const MATERIALS_DB: Record<string, MaterialInfo> = {
  'aluminio-6061': {
    nombre: 'Aluminio 6061',
    categoria: 'aluminio',
    propiedades: {
      resistencia_traccion: '310 MPa',
      dureza: '95 HB',
      densidad: '2.70 g/cm³',
      resistencia_corrosion: 'Excelente',
      maquinabilidad: 'Buena',
      soldabilidad: 'Excelente',
    },
    aplicaciones: [
      'Estructuras aeronáuticas',
      'Componentes marinos',
      'Piezas mecanizadas de precisión',
      'Aplicaciones generales',
    ],
    ventajas: [
      'Excelente relación resistencia/peso',
      'Muy buena resistencia a la corrosión',
      'Fácil de mecanizar',
      'Buena soldabilidad',
    ],
    limitaciones: ['Resistencia media comparada con 7075', 'No apto para altas temperaturas'],
    precio_relativo: 'medio',
  },
  'aluminio-7075': {
    nombre: 'Aluminio 7075',
    categoria: 'aluminio',
    propiedades: {
      resistencia_traccion: '572 MPa',
      dureza: '150 HB',
      densidad: '2.81 g/cm³',
      resistencia_corrosion: 'Media',
      maquinabilidad: 'Buena',
      soldabilidad: 'Difícil',
    },
    aplicaciones: [
      'Industria aeroespacial',
      'Componentes estructurales de alta resistencia',
      'Piezas de aviación',
      'Equipamiento deportivo de alto rendimiento',
    ],
    ventajas: [
      'Máxima resistencia entre aluminios',
      'Excelente relación resistencia/peso',
      'Buena maquinabilidad',
    ],
    limitaciones: [
      'Menor resistencia a corrosión que 6061',
      'Difícil de soldar',
      'Más caro que 6061',
    ],
    precio_relativo: 'alto',
  },
  'acero-f1140': {
    nombre: 'Acero F-1140',
    categoria: 'acero',
    propiedades: {
      resistencia_traccion: '620 MPa',
      dureza: '200 HB',
      densidad: '7.85 g/cm³',
      resistencia_corrosion: 'Baja (requiere tratamiento)',
      maquinabilidad: 'Excelente',
      soldabilidad: 'Buena',
    },
    aplicaciones: [
      'Ejes',
      'Pernos',
      'Piezas de alta precisión',
      'Componentes mecanizados',
    ],
    ventajas: [
      'Excelente maquinabilidad',
      'Alta resistencia mecánica',
      'Buena soldabilidad',
      'Económico',
    ],
    limitaciones: [
      'Requiere tratamiento anticorrosivo',
      'No apto para ambientes corrosivos sin tratamiento',
    ],
    precio_relativo: 'bajo',
  },
  'acero-inox-304': {
    nombre: 'Acero Inoxidable 304',
    categoria: 'inoxidable',
    propiedades: {
      resistencia_traccion: '515 MPa',
      dureza: '201 HB',
      densidad: '8.00 g/cm³',
      resistencia_corrosion: 'Excelente',
      maquinabilidad: 'Media',
      soldabilidad: 'Excelente',
    },
    aplicaciones: [
      'Industria alimentaria',
      'Equipos médicos',
      'Aplicaciones marinas',
      'Arquitectura',
    ],
    ventajas: [
      'Excelente resistencia a la corrosión',
      'Higiénico',
      'Fácil de limpiar',
      'Estética',
    ],
    limitaciones: ['Más difícil de mecanizar', 'Más caro que aceros al carbono'],
    precio_relativo: 'medio',
  },
  'acero-inox-316': {
    nombre: 'Acero Inoxidable 316',
    categoria: 'inoxidable',
    propiedades: {
      resistencia_traccion: '515 MPa',
      dureza: '217 HB',
      densidad: '8.00 g/cm³',
      resistencia_corrosion: 'Superior (marino)',
      maquinabilidad: 'Media',
      soldabilidad: 'Excelente',
    },
    aplicaciones: [
      'Ambientes marinos',
      'Industria química',
      'Equipos médicos',
      'Aplicaciones con cloruros',
    ],
    ventajas: [
      'Máxima resistencia a corrosión',
      'Resistencia a picadura',
      'Apto para ambientes salinos',
    ],
    limitaciones: ['Más caro que 304', 'Maquinabilidad moderada'],
    precio_relativo: 'alto',
  },
  'titanio-gr5': {
    nombre: 'Titanio Grado 5 (Ti-6Al-4V)',
    categoria: 'titanio',
    propiedades: {
      resistencia_traccion: '895 MPa',
      dureza: '334 HB',
      densidad: '4.43 g/cm³',
      resistencia_corrosion: 'Excelente',
      maquinabilidad: 'Difícil',
      soldabilidad: 'Difícil (requiere atmósfera inerte)',
    },
    aplicaciones: [
      'Industria aeroespacial',
      'Implantes médicos',
      'Componentes de alto rendimiento',
      'Racing',
    ],
    ventajas: [
      'Máxima relación resistencia/peso',
      'Excelente resistencia a corrosión',
      'Biocompatible',
      'Soporta altas temperaturas',
    ],
    limitaciones: [
      'Muy difícil de mecanizar',
      'Muy caro',
      'Requiere herramientas especiales',
    ],
    precio_relativo: 'muy-alto',
  },
};

// Servicios externos disponibles
export const SERVICES_DB: Record<string, ServiceInfo> = {
  anodizado: {
    nombre: 'Anodizado',
    categoria: 'tratamiento_superficial',
    descripcion:
      'Proceso electroquímico que crea una capa de óxido protectora en aluminio. Mejora resistencia a corrosión y estética.',
    materiales_aplicables: ['Aluminio 6061', 'Aluminio 7075'],
    tiempo_estimado: '3-5 días',
    notas: 'Disponible en varios colores',
  },
  cromado: {
    nombre: 'Cromado',
    categoria: 'tratamiento_superficial',
    descripcion: 'Recubrimiento de cromo para alta dureza y resistencia a desgaste.',
    materiales_aplicables: ['Aceros', 'Aceros inoxidables'],
    tiempo_estimado: '5-7 días',
  },
  temple: {
    nombre: 'Temple y Revenido',
    categoria: 'tratamiento_termico',
    descripcion: 'Tratamiento térmico para aumentar dureza y resistencia mecánica.',
    materiales_aplicables: ['Aceros al carbono', 'Aceros aleados'],
    tiempo_estimado: '2-4 días',
  },
  nitrurado: {
    nombre: 'Nitrurado',
    categoria: 'tratamiento_termico',
    descripcion:
      'Endurecimiento superficial por difusión de nitrógeno. Máxima dureza superficial.',
    materiales_aplicables: ['Aceros aleados'],
    tiempo_estimado: '3-5 días',
  },
  soldadura_tig: {
    nombre: 'Soldadura TIG',
    categoria: 'soldadura',
    descripcion: 'Soldadura de alta calidad para piezas críticas.',
    materiales_aplicables: ['Aluminio', 'Aceros inoxidables', 'Titanio'],
    tiempo_estimado: 'Variable según proyecto',
  },
  galvanizado: {
    nombre: 'Galvanizado',
    categoria: 'tratamiento_superficial',
    descripcion: 'Recubrimiento de zinc para protección anticorrosiva.',
    materiales_aplicables: ['Aceros al carbono'],
    tiempo_estimado: '3-5 días',
  },
};

// Tolerancias ISO comunes
export const ISO_TOLERANCES = [
  'ISO 2768-f (fina)',
  'ISO 2768-m (media)',
  'ISO 2768-c (grosera)',
  'ISO 2768-v (muy grosera)',
  'Personalizada',
];

// Rangos de precios relativos (para estimaciones rápidas)
export const PRICE_MULTIPLIERS = {
  'bajo': 1.0,
  'medio': 1.5,
  'alto': 2.5,
  'muy-alto': 5.0,
} as const;

// Rate limiting
export const RATE_LIMIT = {
  PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20'),
  PER_HOUR: 100,
};

// Configuración de timeouts
export const TIMEOUTS = {
  WORKFLOW: 30000, // 30 segundos
  AGENT: 15000, // 15 segundos
  TOOL: 5000, // 5 segundos
  LLM: 10000, // 10 segundos
};
