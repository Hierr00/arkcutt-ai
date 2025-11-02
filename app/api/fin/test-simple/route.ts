import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'POST working',
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
