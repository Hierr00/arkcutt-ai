/**
 * Test script for structured logging
 */

require('dotenv').config({ path: '.env.local' });
const { log } = require('../mastra.ts');

async function main() {
  console.log('🧪 Testing structured logger...\n');

  // Test different log levels
  log('debug', 'This is a debug message', { userId: 123, action: 'test' });
  log('info', '✅ Application started successfully');
  log('warn', 'Memory usage is high', { memoryMB: 512, threshold: 400 });
  log('error', 'Failed to connect to database', {
    error: 'Connection timeout',
    host: 'db.example.com',
    retries: 3
  });

  console.log('\n✅ Logger test completed!');
  console.log('📁 Check logs/ directory for log files (in production mode)');
}

main();
