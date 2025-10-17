import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    MASTRA_ENV: process.env.NODE_ENV || 'development',
    MASTRA_LOG_LEVEL: process.env.MASTRA_LOG_LEVEL || 'info',
    MASTRA_ENABLE_TRACING: process.env.MASTRA_ENABLE_TRACING || 'true',
  },

  // Optimizaciones para producción
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
