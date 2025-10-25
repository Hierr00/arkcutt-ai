/**
 * Test script for Sentry integration
 */

require('dotenv').config({ path: '.env.local' });

// Set test mode
process.env.SENTRY_TEST_MODE = 'true';

// Import after env is loaded
const { log } = require('../lib/logger');

async function main() {
  console.log('🧪 Testing Sentry integration...\n');

  // Test 1: Info log (should not go to Sentry)
  console.log('1️⃣ Testing info log (won\'t appear in Sentry)...');
  log.info('Test info message', { test: true });
  await sleep(1000);

  // Test 2: Warning (should appear in Sentry)
  console.log('2️⃣ Testing warning (will appear in Sentry)...');
  log.warn('Test warning message', { test: true, warningType: 'test' });
  await sleep(1000);

  // Test 3: Error with message (should appear in Sentry)
  console.log('3️⃣ Testing error with message (will appear in Sentry)...');
  log.error('Test error message', { test: true, errorCode: 'TEST_ERROR' });
  await sleep(1000);

  // Test 4: Error with exception (should appear in Sentry)
  console.log('4️⃣ Testing error with exception (will appear in Sentry)...');
  const testError = new Error('This is a test error from script');
  testError.stack = 'Error: This is a test error\n    at test-sentry.js:42:20';
  log.error('Test exception', { test: true, error: testError });
  await sleep(2000);

  console.log('\n✅ Test completed!');
  console.log('📊 Check your Sentry dashboard at: https://sentry.io/');
  console.log(`   Organization: ${process.env.SENTRY_ORG}`);
  console.log(`   Project: ${process.env.SENTRY_PROJECT}`);
  console.log('\n⏱️  Events may take 10-30 seconds to appear in Sentry.');

  process.exit(0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
