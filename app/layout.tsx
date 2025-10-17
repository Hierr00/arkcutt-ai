import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arkcutt AI - Sistema de Presupuestos Industriales',
  description: 'Sistema multi-agente determinista para mecanizado industrial CNC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
