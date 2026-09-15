const test = require('node:test');
const assert = require('node:assert/strict');
const { SafetyManager } = require('../packages/core/dist/safety.js');

test('SafetyManager blocks termination of critical system processes', () => {
  const mockProvider = {
    findPort: async () => null,
    killProcess: async () => true,
  };
  const safety = new SafetyManager(mockProvider);

  assert.ok(safety.isCriticalProcess('System', 4));
  assert.ok(safety.isCriticalProcess('system idle process', 0));
  assert.ok(safety.isCriticalProcess('init', 1));
  assert.ok(safety.isCriticalProcess('csrss.exe', 99));
  assert.ok(safety.isCriticalProcess('systemd', 1));

  // Normal processes should not be blocked
  assert.equal(safety.isCriticalProcess('node.exe', 12345), false);
  assert.equal(safety.isCriticalProcess('python', 9876), false);
  assert.equal(safety.isCriticalProcess('vite', 4567), false);
});

test('SafetyManager freePort returns alreadyFree if port not in use', async () => {
  const mockProvider = {
    findPort: async () => null,
    killProcess: async () => true,
  };
  const safety = new SafetyManager(mockProvider);

  const result = await safety.freePort(9999);
  assert.ok(result.success);
  assert.ok(result.alreadyFree);
  assert.ok(result.freed);
});

test('SafetyManager rejects freeing port with critical process owner', async () => {
  const mockProvider = {
    findPort: async () => ({
      port: 135,
      protocol: 'tcp',
      pid: 4,
      processName: 'System',
      localAddress: '0.0.0.0',
      state: 'LISTENING'
    }),
    killProcess: async () => true,
  };
  const safety = new SafetyManager(mockProvider);

  const result = await safety.freePort(135);
  assert.equal(result.success, false);
  assert.ok(result.message.includes('Safety Block'));
});

test('SafetyManager polls socket state until release is verified', async () => {
  let callCount = 0;
  const mockProvider = {
    findPort: async () => {
      callCount++;
      // Return occupied on initial check, free on subsequent poll
      if (callCount <= 1) {
        return {
          port: 3000,
          protocol: 'tcp',
          pid: 18342,
          processName: 'node',
          localAddress: '127.0.0.1',
          state: 'LISTENING',
        };
      }
      return null; // released!
    },
    killProcess: async () => true,
  };

  const safety = new SafetyManager(mockProvider);
  const result = await safety.freePort(3000, { timeoutMs: 1000 });
  assert.equal(result.success, true);
  assert.equal(result.freed, true);
  assert.equal(result.pid, 18342);
  assert.ok(result.message.includes('successfully freed'));
});

test('SafetyManager reports failure when process cannot be killed', async () => {
  const mockProvider = {
    findPort: async () => ({
      port: 5432,
      protocol: 'tcp',
      pid: 2000,
      processName: 'postgres',
      localAddress: '127.0.0.1',
      state: 'LISTENING',
    }),
    killProcess: async () => false, // Permission denied or kill failed
  };

  const safety = new SafetyManager(mockProvider);
  const result = await safety.freePort(5432);
  assert.equal(result.success, false);
  assert.equal(result.freed, false);
  assert.ok(result.message.includes('Failed to terminate'));
});
