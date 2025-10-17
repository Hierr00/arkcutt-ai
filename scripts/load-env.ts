/**
 * Helper to load environment variables from .env.local
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');

try {
  const envFile = readFileSync(envPath, 'utf-8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      process.env[key.trim()] = value;
    }
  }

  console.log('✅ Environment variables loaded from .env.local');
} catch (error: any) {
  console.error('⚠️ Could not load .env.local:', error.message);
  console.log('Make sure .env.local exists with your credentials');
}
