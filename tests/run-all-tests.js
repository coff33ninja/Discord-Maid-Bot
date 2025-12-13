#!/usr/bin/env node

/**
 * Test Runner - Executes all test suites
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  { name: 'Database Tests', file: 'test-database.js', critical: true },
  { name: 'Network Scanner Tests', file: 'test-network-scanner.js', critical: true },
  { name: 'Home Assistant Connection', file: 'test-homeassistant.js', critical: false },
  { name: 'ESP Device Detection', file: 'test-esp-detection.js', critical: false },
];

console.log('🧪 Running All Test Suites\n');
console.log('='.repeat(80));

let totalPassed = 0;
let totalFailed = 0;

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('-'.repeat(80));
    
    const testPath = path.join(__dirname, test.file);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.name} PASSED`);
        totalPassed++;
      } else {
        console.log(`❌ ${test.name} FAILED (exit code: ${code})`);
        totalFailed++;
        
        if (test.critical) {
          console.log(`\n⚠️  Critical test failed! Stopping test suite.`);
          process.exit(1);
        }
      }
      resolve(code);
    });
    
    child.on('error', (error) => {
      console.error(`❌ Error running ${test.name}:`, error.message);
      totalFailed++;
      resolve(1);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  
  for (const test of tests) {
    await runTest(test);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Final Results');
  console.log('='.repeat(80));
  console.log(`
Total Tests:    ${tests.length}
Passed:         ${totalPassed} ✅
Failed:         ${totalFailed} ❌
Time:           ${elapsed}s
`);
  
  if (totalFailed === 0) {
    console.log('🎉 All test suites passed!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${totalFailed} test suite(s) failed\n`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
