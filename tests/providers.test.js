const test = require('node:test');
const assert = require('node:assert/strict');
const { getPlatformProvider } = require('../packages/core/dist/providers/detector.js');
const { WindowsPortProvider } = require('../packages/core/dist/providers/windows.js');
const { FallbackPortProvider } = require('../packages/core/dist/providers/fallback.js');
const { MacOSPortProvider } = require('../packages/core/dist/providers/macos.js');

test('getPlatformProvider returns valid provider for current OS', () => {
  const provider = getPlatformProvider();
  assert.ok(provider);
  assert.ok(typeof provider.platformName === 'string');
  assert.ok(typeof provider.listPorts === 'function');
  assert.ok(typeof provider.findPort === 'function');
  assert.ok(typeof provider.inspect === 'function');
  assert.ok(typeof provider.killProcess === 'function');
  assert.ok(typeof provider.getDiagnostics === 'function');
});

test('WindowsPortProvider parses address and port correctly for IPv4 and IPv6', () => {
  const wp = new WindowsPortProvider();
  
  // IPv4 standard
  const r1 = wp.parseAddressPort('127.0.0.1:3000');
  assert.equal(r1.address, '127.0.0.1');
  assert.equal(r1.port, 3000);

  // IPv4 wildcard
  const r2 = wp.parseAddressPort('0.0.0.0:8080');
  assert.equal(r2.address, '0.0.0.0');
  assert.equal(r2.port, 8080);

  // IPv6 localhost
  const r3 = wp.parseAddressPort('[::1]:5173');
  assert.equal(r3.address, '[::1]');
  assert.equal(r3.port, 5173);

  // IPv6 wildcard
  const r4 = wp.parseAddressPort('[::]:443');
  assert.equal(r4.address, '[::]');
  assert.equal(r4.port, 443);

  // Invalid
  const r5 = wp.parseAddressPort('invalid_address');
  assert.equal(r5.port, 0);
});

test('MacOSPortProvider parses lsof address formats correctly', () => {
  const mp = new MacOSPortProvider();

  // Wildcard
  const r1 = mp.parseLsofAddress('*:3000');
  assert.equal(r1.address, '0.0.0.0');
  assert.equal(r1.port, 3000);

  // IP explicit
  const r2 = mp.parseLsofAddress('127.0.0.1:5432');
  assert.equal(r2.address, '127.0.0.1');
  assert.equal(r2.port, 5432);

  // IPv6
  const r3 = mp.parseLsofAddress('[::1]:8000');
  assert.equal(r3.address, '[::1]');
  assert.equal(r3.port, 8000);
});

test('Process tree handles cyclic process maps safely without infinite recursion', async () => {
  const wp = new WindowsPortProvider();
  // Mock listProcesses with a cycle: 100 -> 200 -> 100
  wp.inspect = async (pid) => ({ pid, name: `proc-${pid}` });
  wp.listProcesses = async () => [
    { pid: 100, name: 'proc-100', parentPid: 200 },
    { pid: 200, name: 'proc-200', parentPid: 100 },
  ];

  const tree = await wp.getProcessTree(100);
  assert.ok(tree);
  assert.equal(tree.pid, 100);
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].pid, 200);
  // Cycle must be broken: children of 200 must not loop back to 100
  assert.equal(tree.children[0].children.length, 0);
});
