/**
 * Unit Tests for Prefix Handler
 * 
 * @module plugins/conversational-ai/router/prefix-handler.test
 */

import { PrefixHandler } from './prefix-handler.js';

console.log('🧪 Running Prefix Handler Unit Tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNull(actual, message = '') {
  if (actual !== null) {
    throw new Error(`${message} Expected null, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(actual, message = '') {
  if (!actual) {
    throw new Error(`${message} Expected true, got ${actual}`);
  }
}

function assertFalse(actual, message = '') {
  if (actual) {
    throw new Error(`${message} Expected false, got ${actual}`);
  }
}

const handler = new PrefixHandler();

// Test: Parse ! prefix
console.log('\n📋 Prefix Parsing Tests');
test('Parse !help command', () => {
  const result = handler.parse('!help');
  assertEqual(result.prefix, '!');
  assertEqual(result.type, 'command');
  assertEqual(result.command, 'help');
  assertDeepEqual(result.args, []);
});

test('Parse !status with args', () => {
  const result = handler.parse('!status all verbose');
  assertEqual(result.prefix, '!');
  assertEqual(result.type, 'command');
  assertEqual(result.command, 'status');
  assertDeepEqual(result.args, ['all', 'verbose']);
});

// Test: Parse ? prefix
test('Parse ?weather query', () => {
  const result = handler.parse('?weather');
  assertEqual(result.prefix, '?');
  assertEqual(result.type, 'query');
  assertEqual(result.command, 'weather');
});

test('Parse ?devices with location', () => {
  const result = handler.parse('?devices living room');
  assertEqual(result.prefix, '?');
  assertEqual(result.type, 'query');
  assertEqual(result.command, 'devices');
  assertDeepEqual(result.args, ['living', 'room']);
});

// Test: Parse . prefix
test('Parse .scan quick action', () => {
  const result = handler.parse('.scan');
  assertEqual(result.prefix, '.');
  assertEqual(result.type, 'quick');
  assertEqual(result.command, 'scan');
});

test('Parse .wake with device', () => {
  const result = handler.parse('.wake server');
  assertEqual(result.prefix, '.');
  assertEqual(result.type, 'quick');
  assertEqual(result.command, 'wake');
  assertDeepEqual(result.args, ['server']);
});

// Test: Invalid inputs
console.log('\n📋 Invalid Input Tests');
test('Return null for empty string', () => {
  assertNull(handler.parse(''));
});

test('Return null for single character', () => {
  assertNull(handler.parse('!'));
});

test('Return null for no prefix', () => {
  assertNull(handler.parse('hello world'));
});

test('Return null for unknown prefix', () => {
  assertNull(handler.parse('#hashtag'));
});

test('Return null for prefix with only spaces', () => {
  assertNull(handler.parse('!   '));
});

// Test: Command extraction
console.log('\n📋 Command Extraction Tests');
test('Extract command with extra spaces', () => {
  const result = handler.parse('!  help  me  ');
  assertEqual(result.command, 'help');
  assertDeepEqual(result.args, ['me']);
});

test('Command is lowercase', () => {
  const result = handler.parse('!HELP');
  assertEqual(result.command, 'help');
});

test('Args preserve case', () => {
  const result = handler.parse('!search MyDevice');
  assertDeepEqual(result.args, ['MyDevice']);
});

// Test: Command lookup
console.log('\n📋 Command Lookup Tests');
test('hasCommand returns true for existing command', () => {
  assertTrue(handler.hasCommand('help'));
});

test('hasCommand returns true for alias', () => {
  assertTrue(handler.hasCommand('h'));
});

test('hasCommand returns false for unknown command', () => {
  assertFalse(handler.hasCommand('nonexistent'));
});

test('getCommand returns command info', () => {
  const cmd = handler.getCommand('help');
  assertEqual(cmd.name, 'help');
  assertEqual(cmd.type, 'command');
});

// Test: Suggestions
console.log('\n📋 Suggestion Tests');
test('Get suggestions for partial match', () => {
  const suggestions = handler.getSuggestions('hel');
  assertTrue(suggestions.includes('help'));
});

test('Get suggestions for typo', () => {
  const suggestions = handler.getSuggestions('hlep');
  assertTrue(suggestions.includes('help'));
});

test('Get suggestions for similar command', () => {
  const suggestions = handler.getSuggestions('stat');
  assertTrue(suggestions.includes('status'));
});

test('Suggestions are limited to 5', () => {
  const suggestions = handler.getSuggestions('s');
  assertTrue(suggestions.length <= 5);
});

// Test: Command registration
console.log('\n📋 Command Registration Tests');
test('Register custom command', () => {
  handler.registerCommand('custom', {
    type: 'command',
    description: 'Custom command',
    aliases: ['cust']
  }, async () => 'executed');
  
  assertTrue(handler.hasCommand('custom'));
  assertTrue(handler.hasCommand('cust'));
});

// Test: Help text
console.log('\n📋 Help Text Tests');
test('Get help text', () => {
  const help = handler.getHelpText();
  assertTrue(help.includes('Commands (!)'));
  assertTrue(help.includes('Queries (?)'));
  assertTrue(help.includes('Quick Actions (.)'));
  assertTrue(help.includes('!help'));
});

// Test: Execute
console.log('\n📋 Execution Tests');
test('Execute unknown command returns suggestions', async () => {
  const parsed = handler.parse('!unknowncommand');
  const result = await handler.execute(parsed, {});
  assertFalse(result.success);
  assertEqual(result.error, 'unknown_command');
  assertTrue(Array.isArray(result.suggestions));
});

test('Execute with wrong prefix returns hint', async () => {
  const parsed = handler.parse('?help'); // help is a ! command
  const result = await handler.execute(parsed, {});
  assertFalse(result.success);
  assertEqual(result.error, 'wrong_prefix');
  assertTrue(result.message.includes('!help'));
});

// Summary
console.log('\n' + '═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
