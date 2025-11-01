/**
 * DEBUG ENDPOINT - Temporal para diagnosticar problemas de autenticación
 * DELETE después de resolver el problema
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body = null;
  try {
    body = await req.json();
  } catch (e) {
    body = 'Error parsing body';
  }

  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.FIN_API_TOKEN;

  return NextResponse.json({
    debug: {
      timestamp: new Date().toISOString(),
      headers: headers,
      authHeader: authHeader,
      authHeaderExists: !!authHeader,
      authHeaderFormat: authHeader?.substring(0, 20) + '...',
      expectedTokenExists: !!expectedToken,
      expectedTokenFormat: expectedToken?.substring(0, 20) + '...',
      tokensMatch: authHeader?.replace('Bearer ', '') === expectedToken,
      body: body,
      url: req.url,
      method: req.method,
    },
    message: 'Debug info above',
  });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'Debug endpoint is working',
    timestamp: new Date().toISOString(),
    env_token_exists: !!process.env.FIN_API_TOKEN,
    env_token_preview: process.env.FIN_API_TOKEN?.substring(0, 20) + '...',
  });
}
