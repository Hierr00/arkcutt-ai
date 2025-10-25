/**
 * Script para generar un PDF técnico de prueba
 * Simula un plano técnico de mecanizado CNC
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateTechnicalPDF() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const outputPath = path.join(__dirname, '..', 'test-technical-drawing.pdf');

  // Crear stream de salida
  doc.pipe(fs.createWriteStream(outputPath));

  // Título
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('PLANO TÉCNICO - PIEZA MECANIZADA', { align: 'center' });

  doc.moveDown();

  // Información del proyecto
  doc
    .fontSize(12)
    .font('Helvetica')
    .text('CLIENTE: Industrias Ejemplo S.A.', { continued: false });

  doc.text('PROYECTO: Sistema de Transmisión', { continued: false });
  doc.text('FECHA: ' + new Date().toLocaleDateString('es-ES'), { continued: false });

  doc.moveDown();

  // Tabla de especificaciones
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('ESPECIFICACIONES TÉCNICAS', { underline: true });

  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica');

  const specs = [
    { label: 'Código de pieza:', value: 'ARC-CNC-2024-001' },
    { label: 'Nombre:', value: 'Eje de transmisión principal' },
    { label: 'Material:', value: 'Aluminio 6061-T6' },
    { label: 'Cantidad:', value: '50 unidades' },
    { label: 'Dimensiones principales:', value: '120mm x 80mm x 25mm' },
    { label: 'Peso aproximado:', value: '0.35 kg por pieza' },
  ];

  specs.forEach((spec) => {
    doc.text(`${spec.label} `, { continued: true, width: 200 });
    doc.font('Helvetica-Bold').text(spec.value, { continued: false });
    doc.font('Helvetica');
  });

  doc.moveDown();

  // Tolerancias
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('TOLERANCIAS DIMENSIONALES', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');

  doc.text('• Tolerancia general: ±0.1 mm');
  doc.text('• Diámetros críticos: ±0.05 mm');
  doc.text('• Roscas: ISO 2768-mH');
  doc.text('• Planicidad: 0.02 mm');

  doc.moveDown();

  // Acabado superficial
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('ACABADO SUPERFICIAL', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');

  doc.text('• Tratamiento: Anodizado tipo II');
  doc.text('• Color: Negro mate');
  doc.text('• Espesor de capa: 15-20 μm');
  doc.text('• Rugosidad superficial (Ra): 1.6 μm');

  doc.moveDown();

  // Operaciones de mecanizado
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('OPERACIONES DE MECANIZADO REQUERIDAS', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');

  doc.text('1. Fresado de caras principales');
  doc.text('2. Taladrado de 4 agujeros Ø8mm');
  doc.text('3. Roscado M10x1.5 (2 posiciones)');
  doc.text('4. Chaflanes en aristas vivas (0.5mm x 45°)');
  doc.text('5. Desbarbado general');

  doc.moveDown();

  // Notas
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('NOTAS IMPORTANTES', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');

  doc.text('• Todas las aristas deben estar desbarbadas');
  doc.text('• Inspección dimensional 100% requerida');
  doc.text('• Certificado de material necesario');
  doc.text('• Plazo de entrega: 3 semanas desde confirmación');
  doc.text('• Embalaje individual en bolsa antiestática');

  doc.moveDown();

  // Pie de página
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(
      '____________________________________________________________________________________________________',
      { align: 'center' }
    );
  doc.fontSize(8).text('Documento generado automáticamente para testing', {
    align: 'center',
  });

  // Finalizar documento
  doc.end();

  console.log('\n✅ PDF técnico generado exitosamente!');
  console.log(`📄 Ubicación: ${outputPath}`);
  console.log('\n📧 Ahora puedes:');
  console.log('1. Abrir el archivo PDF generado');
  console.log('2. Enviar un email a tu cuenta de Gmail configurada con:');
  console.log('   - Asunto: "Solicitud de presupuesto - 50 piezas aluminio"');
  console.log('   - Cuerpo: "Estimados, necesito cotizar las piezas según plano adjunto. Saludos."');
  console.log('   - Adjuntar: test-technical-drawing.pdf');
  console.log('\n3. Ejecutar el cron job para procesar el email\n');
}

// Ejecutar
generateTechnicalPDF();
